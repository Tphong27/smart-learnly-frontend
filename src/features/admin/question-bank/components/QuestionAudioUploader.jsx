import { useEffect, useRef, useState } from "react";
import { FileAudio, Trash2, Upload } from "lucide-react";
import { Button, useToast } from "@/shared/components/ui";

const ALLOWED_TYPES = ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav"];
const MAX_SIZE = 20 * 1024 * 1024;

export function QuestionAudioUploader({ value, disabled, onFileSelected, onRemove }) {
  const inputRef = useRef(null);
  const toast = useToast();
  const [localPreview, setLocalPreview] = useState(null);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  function validateFile(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only MP3, M4A, or WAV audio files are accepted.");
      return false;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Question audio cannot exceed 20MB.");
      return false;
    }
    return true;
  }

  function handleFile(file) {
    if (!file || !validateFile(file)) return;
    if (localPreview) URL.revokeObjectURL(localPreview);
    const nextPreview = URL.createObjectURL(file);
    setLocalPreview(nextPreview);
    onFileSelected?.(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleRemove() {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
    if (inputRef.current) inputRef.current.value = "";
    onRemove?.();
  }

  const previewUrl = localPreview || value || null;

  return (
    <div className="question-audio-uploader">
      <input
        ref={inputRef}
        type="file"
        accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav"
        hidden
        disabled={disabled}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <div className={`question-audio-uploader__preview ${previewUrl ? "has-audio" : ""}`}>
        {previewUrl ? (
          <audio controls preload="metadata" src={previewUrl}>
            <track kind="captions" />
          </audio>
        ) : (
          <div className="question-audio-uploader__empty">
            <FileAudio size={22} />
            <span>No audio attached</span>
          </div>
        )}
      </div>
      <div className="question-audio-uploader__actions">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          leftIcon={<Upload size={14} />}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {previewUrl ? "Replace audio" : "Upload audio"}
        </Button>
        {previewUrl && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            leftIcon={<Trash2 size={14} />}
            disabled={disabled}
            onClick={handleRemove}
          >
            Remove
          </Button>
        )}
      </div>
      <p className="question-audio-uploader__hint">MP3, M4A, or WAV. Max 20MB.</p>
    </div>
  );
}
