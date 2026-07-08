import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Captions,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import { getHlsConfig, getHlsPlayback } from "@/services/hls.service";
import "./HlsVideoPlayer.css";

const HLS_MIME_TYPE = "application/vnd.apple.mpegurl";
const SEEK_SECONDS = 5;
const VOLUME_STEP = 0.05;
const CONTROLS_HIDE_DELAY_MS = 2600;
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatTime(value) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";

  const totalSeconds = Math.floor(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatQualityLabel(level) {
  if (!level) return "Auto";
  if (level.height) return `${level.height}p`;
  if (level.bitrate) return `${Math.round(level.bitrate / 1000)} kbps`;
  return `Level ${level.index + 1}`;
}

function normalizeCaptionTrack(track, index) {
  if (!track) return null;

  if (typeof track === "string") {
    return {
      src: track,
      label: `Caption ${index + 1}`,
      srcLang: "en",
      kind: "captions",
      default: false,
    };
  }

  const src =
    track.src ||
    track.url ||
    track.fileUrl ||
    track.captionUrl ||
    track.subtitleUrl;

  if (!src) return null;

  return {
    src,
    label:
      track.label ||
      track.languageLabel ||
      track.language ||
      track.lang ||
      `Caption ${index + 1}`,
    srcLang: track.srcLang || track.lang || track.language || "en",
    kind: track.kind || "captions",
    default: Boolean(track.default),
  };
}

function playbackErrorMessage(error) {
  const status =
    error?.response?.status || error?.originalError?.response?.status;
  if (status === 401) {
    return "Please sign in to watch this lesson.";
  }
  if (status === 403) {
    return "You do not have access to this lesson.";
  }
  if (error?.details === "manifestLoadError") {
    return "The video playlist could not be loaded.";
  }
  return error?.message || "The video could not be loaded.";
}

export function HlsVideoPlayer({
  lessonId,
  onError,
  className = "",
  captions = [],
}) {
  const playerRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimerRef = useRef(null);
  const recoveryAttemptsRef = useRef({ network: 0, media: 0 });
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [levels, setLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPanel, setSettingsPanel] = useState("main");
  const [controlsVisible, setControlsVisible] = useState(true);
  const [activeCaptionIndex, setActiveCaptionIndex] = useState(-1);

  const captionTracks = useMemo(
    () =>
      (Array.isArray(captions) ? captions : [])
        .map(normalizeCaptionTrack)
        .filter(Boolean),
    [captions],
  );
  const selectedQualityLabel = useMemo(() => {
    if (selectedLevel === -1) return "Auto";
    return formatQualityLabel(levels.find((level) => level.index === selectedLevel));
  }, [levels, selectedLevel]);
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration ? (bufferedEnd / duration) * 100 : 0;
  const hasActiveCaption =
    activeCaptionIndex >= 0 && activeCaptionIndex < captionTracks.length;
  const activeCaptionLabel = hasActiveCaption
    ? captionTracks[activeCaptionIndex]?.label
    : "Off";

  const clearControlsTimer = useCallback(() => {
    if (controlsTimerRef.current) {
      window.clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
  }, []);

  const showControls = useCallback(
    (persist = false) => {
      clearControlsTimer();
      setControlsVisible(true);

      if (!persist && videoRef.current && !videoRef.current.paused && !settingsOpen) {
        controlsTimerRef.current = window.setTimeout(() => {
          setControlsVisible(false);
        }, CONTROLS_HIDE_DELAY_MS);
      }
    },
    [clearControlsTimer, settingsOpen],
  );

  useEffect(() => {
    let cancelled = false;
    let nativeLoadedHandler;
    let nativeErrorHandler;
    const videoElement = videoRef.current;

    async function initialize() {
      try {
        setIsLoading(true);
        setError("");
        setLevels([]);
        setSelectedLevel(-1);
        setCurrentTime(0);
        setDuration(0);
        setBufferedEnd(0);
        setSettingsOpen(false);
        recoveryAttemptsRef.current = { network: 0, media: 0 };

        const playback = await getHlsPlayback(lessonId);
        if (cancelled || !videoElement) return;

        const video = videoElement;
        const { default: Hls } = await import("hls.js");
        if (cancelled) return;

        if (Hls.isSupported()) {
          const hls = new Hls(getHlsConfig());
          hlsRef.current = hls;

          hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            if (cancelled) return;
            recoveryAttemptsRef.current = { network: 0, media: 0 };
            setLevels(
              (data?.levels || []).map((level, index) => ({
                index,
                height: level.height,
                bitrate: level.bitrate,
              })),
            );
            setIsLoading(false);
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (cancelled || !data?.fatal) return;

            if (
              data.type === Hls.ErrorTypes.NETWORK_ERROR &&
              recoveryAttemptsRef.current.network < 2
            ) {
              recoveryAttemptsRef.current.network += 1;
              hls.startLoad();
              return;
            }
            if (
              data.type === Hls.ErrorTypes.MEDIA_ERROR &&
              recoveryAttemptsRef.current.media < 2
            ) {
              recoveryAttemptsRef.current.media += 1;
              hls.recoverMediaError();
              return;
            }

            const message = playbackErrorMessage(data);
            setError(message);
            setIsLoading(false);
            onError?.(data);
          });

          hls.attachMedia(video);
          hls.loadSource(playback.playlistUrl);
          return;
        }

        if (video.canPlayType(HLS_MIME_TYPE)) {
          nativeLoadedHandler = () => {
            if (!cancelled) setIsLoading(false);
          };
          nativeErrorHandler = () => {
            if (cancelled) return;
            const nativeError = new Error("The video could not be loaded.");
            setError(nativeError.message);
            setIsLoading(false);
            onError?.(nativeError);
          };
          video.addEventListener("loadedmetadata", nativeLoadedHandler);
          video.addEventListener("error", nativeErrorHandler);
          video.src = playback.playlistUrl;
          video.load();
          return;
        }

        throw new Error("This browser does not support HLS video.");
      } catch (initializationError) {
        if (cancelled) return;
        setError(playbackErrorMessage(initializationError));
        setIsLoading(false);
        onError?.(initializationError);
      }
    }

    initialize();

    return () => {
      cancelled = true;
      if (videoElement && nativeLoadedHandler) {
        videoElement.removeEventListener("loadedmetadata", nativeLoadedHandler);
      }
      if (videoElement && nativeErrorHandler) {
        videoElement.removeEventListener("error", nativeErrorHandler);
      }
      hlsRef.current?.destroy();
      hlsRef.current = null;
      if (videoElement) {
        videoElement.removeAttribute("src");
        videoElement.load();
      }
    };
  }, [lessonId, onError, reloadKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const syncTime = () => {
      setCurrentTime(video.currentTime || 0);
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    };
    const syncPlayback = () => {
      setIsPlaying(!video.paused && !video.ended);
    };
    const syncVolume = () => {
      setVolume(video.volume);
      setMuted(video.muted || video.volume === 0);
    };
    const syncBuffered = () => {
      if (!video.buffered?.length) {
        setBufferedEnd(0);
        return;
      }

      setBufferedEnd(video.buffered.end(video.buffered.length - 1));
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setControlsVisible(true);
    };

    video.volume = volume;
    video.addEventListener("timeupdate", syncTime);
    video.addEventListener("durationchange", syncTime);
    video.addEventListener("loadedmetadata", syncTime);
    video.addEventListener("play", syncPlayback);
    video.addEventListener("pause", syncPlayback);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("volumechange", syncVolume);
    video.addEventListener("progress", syncBuffered);

    return () => {
      video.removeEventListener("timeupdate", syncTime);
      video.removeEventListener("durationchange", syncTime);
      video.removeEventListener("loadedmetadata", syncTime);
      video.removeEventListener("play", syncPlayback);
      video.removeEventListener("pause", syncPlayback);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("volumechange", syncVolume);
      video.removeEventListener("progress", syncBuffered);
    };
  }, [volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video?.textTracks) return;

    Array.from(video.textTracks).forEach((track, index) => {
      track.mode = index === activeCaptionIndex ? "showing" : "disabled";
    });
  }, [activeCaptionIndex, captionTracks.length, reloadKey]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === playerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => clearControlsTimer, [clearControlsTimer]);

  function focusPlayer() {
    playerRef.current?.focus({ preventScroll: true });
  }

  function retry() {
    setError("");
    setIsLoading(true);
    setLevels([]);
    setSelectedLevel(-1);
    recoveryAttemptsRef.current = { network: 0, media: 0 };
    setReloadKey((current) => current + 1);
  }

  async function togglePlay() {
    const video = videoRef.current;
    if (!video || error || isLoading) return;

    try {
      if (video.paused || video.ended) {
        await video.play();
        showControls();
      } else {
        video.pause();
        setControlsVisible(true);
      }
    } catch (playError) {
      const message = playbackErrorMessage(playError);
      setError(message);
      onError?.(playError);
    }
  }

  function seekBy(seconds) {
    const video = videoRef.current;
    if (!video || !duration) return;

    video.currentTime = clamp(video.currentTime + seconds, 0, duration);
    setCurrentTime(video.currentTime);
    showControls(true);
  }

  function changeSeek(event) {
    const video = videoRef.current;
    if (!video) return;

    const nextTime = Number(event.target.value);
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
    showControls(true);
  }

  function setVideoVolume(nextVolume) {
    const video = videoRef.current;
    if (!video) return;

    const safeVolume = clamp(nextVolume, 0, 1);
    video.volume = safeVolume;
    video.muted = safeVolume === 0;
    setVolume(safeVolume);
    setMuted(video.muted);
    showControls(true);
  }

  function changeVolume(event) {
    setVideoVolume(Number(event.target.value) / 100);
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;

    if (video.muted || video.volume === 0) {
      video.muted = false;
      if (video.volume === 0) {
        video.volume = volume > 0 ? volume : 0.8;
      }
    } else {
      video.muted = true;
    }

    setVolume(video.volume);
    setMuted(video.muted || video.volume === 0);
    showControls(true);
  }

  async function toggleFullscreen() {
    const player = playerRef.current;
    if (!player) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
      return;
    }

    await player.requestFullscreen?.();
  }

  function changeQuality(level) {
    setSelectedLevel(level);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
    }
    setSettingsOpen(false);
    setSettingsPanel("main");
    focusPlayer();
    showControls(true);
  }

  function changePlaybackRate(rate) {
    setPlaybackRate(rate);
    setSettingsOpen(false);
    setSettingsPanel("main");
    focusPlayer();
    showControls(true);
  }

  function changeCaption(index) {
    setActiveCaptionIndex(index);
    setSettingsOpen(false);
    setSettingsPanel("main");
    focusPlayer();
    showControls(true);
  }

  function cycleCaptions() {
    if (!captionTracks.length) return;

    setActiveCaptionIndex((current) => {
      if (current >= captionTracks.length - 1) return -1;
      return current + 1;
    });
    showControls(true);
  }

  function isEditableShortcutTarget(target) {
    const tagName = target?.tagName?.toLowerCase();
    if (!tagName || target?.isContentEditable) return Boolean(target?.isContentEditable);
    if (tagName === "textarea" || tagName === "select") return true;
    if (tagName !== "input") return false;

    const inputType = (target.getAttribute("type") || "text").toLowerCase();
    return !["range", "button", "checkbox", "radio"].includes(inputType);
  }

  function handleKeyboard(event) {
    if (isEditableShortcutTarget(event.target)) return;

    let handled = true;

    switch (event.key) {
      case " ":
      case "k":
      case "K":
        event.preventDefault();
        togglePlay();
        break;
      case "ArrowLeft":
        event.preventDefault();
        seekBy(-SEEK_SECONDS);
        break;
      case "ArrowRight":
        event.preventDefault();
        seekBy(SEEK_SECONDS);
        break;
      case "ArrowUp":
        event.preventDefault();
        setVideoVolume(volume + VOLUME_STEP);
        break;
      case "ArrowDown":
        event.preventDefault();
        setVideoVolume(volume - VOLUME_STEP);
        break;
      case "m":
      case "M":
        event.preventDefault();
        toggleMute();
        break;
      case "f":
      case "F":
        event.preventDefault();
        toggleFullscreen();
        break;
      case "c":
      case "C":
        event.preventDefault();
        cycleCaptions();
        break;
      default:
        handled = false;
        break;
    }

    if (handled) {
      event.stopPropagation();
    }
  }

  function handleShortcutKeyUp(event) {
    if (isEditableShortcutTarget(event.target)) return;

    const shortcutKeys = [" ", "k", "K", "m", "M", "f", "F", "c", "C"];
    if (shortcutKeys.includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function toggleSettings() {
    setSettingsOpen((current) => !current);
    setSettingsPanel("main");
    showControls(true);
  }

  const playerClassName = [
    "hls-player",
    className,
    isPlaying ? "hls-player--playing" : "",
    controlsVisible || settingsOpen ? "hls-player--controls-visible" : "hls-player--controls-hidden",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={playerRef}
      className={playerClassName}
      role="region"
      aria-label="Secure video player"
      tabIndex={0}
      onKeyDownCapture={handleKeyboard}
      onKeyUpCapture={handleShortcutKeyUp}
      onMouseMove={() => showControls()}
      onMouseLeave={() => {
        if (isPlaying && !settingsOpen) setControlsVisible(false);
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <video
        ref={videoRef}
        className="hls-player__video"
        controls={false}
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        playsInline
        preload="metadata"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onDragStart={(event) => event.preventDefault()}
      >
        {captionTracks.map((track) => (
          <track
            key={track.src}
            kind={track.kind}
            src={track.src}
            srcLang={track.srcLang}
            label={track.label}
            default={track.default}
          />
        ))}
      </video>

      {!isLoading && !error && !isPlaying && (
        <button
          type="button"
          className="hls-player__center-play"
          onClick={togglePlay}
          aria-label="Play video"
        >
          <Play size={42} fill="currentColor" />
        </button>
      )}

      {isLoading && !error && (
        <div className="hls-player__loading" role="status">
          <div className="hls-player__spinner" />
          <span>Loading video...</span>
        </div>
      )}

      {error && (
        <div className="hls-player__error" role="alert">
          <AlertCircle size={42} />
          <p>{error}</p>
          <button type="button" onClick={retry}>
            <RotateCcw size={16} />
            Retry
          </button>
        </div>
      )}

      {!error && (
        <div className="hls-player__controls" aria-label="Video controls">
          <div
            className="hls-player__progress"
            style={{
              "--hls-progress": `${clamp(progressPercent, 0, 100)}%`,
              "--hls-buffered": `${clamp(bufferedPercent, 0, 100)}%`,
            }}
          >
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.1"
              value={duration ? currentTime : 0}
              onChange={changeSeek}
              disabled={!duration}
              aria-label="Seek video"
            />
          </div>

          <div className="hls-player__controls-row">
            <div className="hls-player__controls-left">
              <button
                type="button"
                className="hls-player__control-btn"
                onClick={togglePlay}
                disabled={isLoading}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={22} /> : <Play size={22} fill="currentColor" />}
              </button>

              <button
                type="button"
                className="hls-player__control-btn hls-player__control-btn--desktop"
                onClick={() => seekBy(-SEEK_SECONDS)}
                disabled={!duration}
                aria-label={`Back ${SEEK_SECONDS} seconds`}
              >
                <RotateCcw size={19} />
              </button>
              <button
                type="button"
                className="hls-player__control-btn hls-player__control-btn--desktop"
                onClick={() => seekBy(SEEK_SECONDS)}
                disabled={!duration}
                aria-label={`Forward ${SEEK_SECONDS} seconds`}
              >
                <RotateCw size={19} />
              </button>

              <div className="hls-player__volume">
                <button
                  type="button"
                  className="hls-player__control-btn"
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={muted ? 0 : Math.round(volume * 100)}
                  onChange={changeVolume}
                  aria-label="Volume"
                />
              </div>

              <span className="hls-player__time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="hls-player__controls-right">
              <button
                type="button"
                className="hls-player__pill"
                onClick={() => {
                  setSettingsOpen(true);
                  setSettingsPanel("quality");
                  showControls(true);
                }}
                disabled={!levels.length}
              >
                {selectedQualityLabel}
              </button>
              <button
                type="button"
                className="hls-player__pill"
                onClick={() => {
                  setSettingsOpen(true);
                  setSettingsPanel("speed");
                  showControls(true);
                }}
              >
                {playbackRate}x
              </button>
              <button
                type="button"
                className={`hls-player__control-btn ${hasActiveCaption ? "hls-player__control-btn--active" : ""}`}
                onClick={() => {
                  if (captionTracks.length) {
                    setSettingsOpen(true);
                    setSettingsPanel("captions");
                  }
                  showControls(true);
                }}
                disabled={!captionTracks.length}
                aria-label="Captions"
              >
                <Captions size={22} />
              </button>
              <div className="hls-player__settings">
                <button
                  type="button"
                  className="hls-player__control-btn"
                  onClick={toggleSettings}
                  aria-label="Player settings"
                >
                  <Settings size={22} />
                </button>

                {settingsOpen && (
                  <div className="hls-player__settings-menu" role="menu">
                    {settingsPanel === "main" && (
                      <>
                        <button
                          type="button"
                          className="hls-player__settings-item"
                          onClick={() => setSettingsPanel("quality")}
                        >
                          <span>Quality</span>
                          <strong>{selectedQualityLabel}</strong>
                        </button>
                        <button
                          type="button"
                          className="hls-player__settings-item"
                          onClick={() => setSettingsPanel("speed")}
                        >
                          <span>Speed</span>
                          <strong>{playbackRate}x</strong>
                        </button>
                        <button
                          type="button"
                          className="hls-player__settings-item"
                          onClick={() => setSettingsPanel("captions")}
                          disabled={!captionTracks.length}
                        >
                          <span>Captions</span>
                          <strong>{activeCaptionLabel}</strong>
                        </button>
                      </>
                    )}

                    {settingsPanel === "quality" && (
                      <>
                        <button
                          type="button"
                          className={`hls-player__settings-item ${selectedLevel === -1 ? "hls-player__settings-item--active" : ""}`}
                          onClick={() => changeQuality(-1)}
                        >
                          Auto
                        </button>
                        {levels.map((level) => (
                          <button
                            type="button"
                            key={level.index}
                            className={`hls-player__settings-item ${selectedLevel === level.index ? "hls-player__settings-item--active" : ""}`}
                            onClick={() => changeQuality(level.index)}
                          >
                            {formatQualityLabel(level)}
                          </button>
                        ))}
                      </>
                    )}

                    {settingsPanel === "speed" && (
                      <>
                        {PLAYBACK_RATES.map((rate) => (
                          <button
                            type="button"
                            key={rate}
                            className={`hls-player__settings-item ${playbackRate === rate ? "hls-player__settings-item--active" : ""}`}
                            onClick={() => changePlaybackRate(rate)}
                          >
                            {rate}x
                          </button>
                        ))}
                      </>
                    )}

                    {settingsPanel === "captions" && (
                      <>
                        <button
                          type="button"
                          className={`hls-player__settings-item ${!hasActiveCaption ? "hls-player__settings-item--active" : ""}`}
                          onClick={() => changeCaption(-1)}
                        >
                          Off
                        </button>
                        {captionTracks.map((track, index) => (
                          <button
                            type="button"
                            key={track.src}
                            className={`hls-player__settings-item ${hasActiveCaption && activeCaptionIndex === index ? "hls-player__settings-item--active" : ""}`}
                            onClick={() => changeCaption(index)}
                          >
                            {track.label}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="hls-player__control-btn"
                onClick={toggleFullscreen}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
