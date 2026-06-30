import { useEffect, useRef, useState } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { getHlsConfig, getHlsPlayback } from "@/services/hls.service";
import "./HlsVideoPlayer.css";

const HLS_MIME_TYPE = "application/vnd.apple.mpegurl";

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

export function HlsVideoPlayer({ lessonId, onError, className = "" }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const recoveryAttemptsRef = useRef({ network: 0, media: 0 });
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [levels, setLevels] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(-1);

  useEffect(() => {
    let cancelled = false;
    let nativeLoadedHandler;
    let nativeErrorHandler;
    const videoElement = videoRef.current;

    async function initialize() {
      try {
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
    };
  }, [lessonId, onError, reloadKey]);

  function retry() {
    setError("");
    setIsLoading(true);
    setLevels([]);
    setSelectedLevel(-1);
    recoveryAttemptsRef.current = { network: 0, media: 0 };
    setReloadKey((current) => current + 1);
  }

  function changeQuality(event) {
    const level = Number(event.target.value);
    setSelectedLevel(level);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
    }
  }

  return (
    <div className={`hls-player ${className}`.trim()}>
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        className="hls-player__video"
      />

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

      {!error && levels.length > 1 && (
        <label className="hls-player__quality">
          Quality
          <select value={selectedLevel} onChange={changeQuality}>
            <option value={-1}>Auto</option>
            {levels.map((level) => (
              <option key={level.index} value={level.index}>
                {level.height
                  ? `${level.height}p`
                  : `${Math.round(level.bitrate / 1000)} kbps`}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
