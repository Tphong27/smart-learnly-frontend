import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { Button, useToast } from "@/shared/components/ui";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

export function QuestionImageUploader({ value, disabled, onFileSelected, onRemove }) {
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
      toast.error("Only JPEG, PNG, or WebP images are accepted.");
      return false;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Question image cannot exceed 5MB.");
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
    <div className="question-image-uploader">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        disabled={disabled}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <div className={`question-image-uploader__preview ${previewUrl ? "has-image" : ""}`}>
        {previewUrl ? (
          <img src={previewUrl} alt="Question attachment preview" />
        ) : (
          <div className="question-image-uploader__empty">
            <ImagePlus size={22} />
            <span>No image attached</span>
          </div>
        )}
      </div>
      <div className="question-image-uploader__actions">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          leftIcon={<Upload size={14} />}
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          {previewUrl ? "Replace image" : "Upload image"}
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
      <p className="question-image-uploader__hint">PNG, JPEG, or WebP. Max 5MB.</p>
    </div>
  );
}
