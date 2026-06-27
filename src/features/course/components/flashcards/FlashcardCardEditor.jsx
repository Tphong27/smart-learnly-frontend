import { useEffect, useRef, useState } from "react";
import { ImagePlus, Save, X } from "lucide-react";
import { validateCardDraft } from "./flashcard-utils";
import "./Flashcards.css";

const EMPTY_CARD = {
  frontText: "",
  frontImageUrl: "",
  backText: "",
  backImageUrl: "",
  hint: "",
  explanation: "",
};

function toDraft(value) {
  return {
    ...EMPTY_CARD,
    ...value,
    frontText: value?.frontText || "",
    frontImageUrl: value?.frontImageUrl || "",
    backText: value?.backText || "",
    backImageUrl: value?.backImageUrl || "",
    hint: value?.hint || "",
    explanation: value?.explanation || "",
  };
}

export function FlashcardCardEditor({
  value,
  mode = "create",
  saving = false,
  onSave,
  onCancel,
  onUploadImage,
  onError,
}) {
  const [draft, setDraft] = useState(() => toDraft(value));
  const [uploadingField, setUploadingField] = useState(null);
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  useEffect(() => {
    setDraft(toDraft(value));
  }, [value]);

  const updateDraft = (field, nextValue) => {
    setDraft((current) => ({
      ...current,
      [field]: nextValue,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationError = validateCardDraft(draft);
    if (validationError) {
      onError?.(validationError);
      return;
    }
    onSave?.(draft);
  };

  const handleUpload = async (field, file) => {
    if (!file || !onUploadImage) return;

    if (file.type && !file.type.startsWith("image/")) {
      onError?.("Please upload an image file.");
      return;
    }

    setUploadingField(field);
    try {
      const uploaded = await onUploadImage(file);
      const uploadedUrl = uploaded?.url || uploaded?.data?.url || uploaded;
      if (!uploadedUrl) {
        throw new Error("Upload response did not include a URL.");
      }
      updateDraft(field, uploadedUrl);
    } catch (error) {
      onError?.(error?.message || "Image upload failed.");
    } finally {
      setUploadingField(null);
    }
  };

  const title = mode === "edit" ? "Edit Card" : "Add Card";

  return (
    <form className="flashcard-form" onSubmit={handleSubmit}>
      <div className="flashcard-panel">
        <div className="flashcard-panel__header">
          <h3 className="flashcard-panel__title">{title}</h3>
        </div>
        <div className="flashcard-panel__body">
          <div className="flashcard-form">
            <div className="flashcard-form__row">
              <div className="flashcard-field">
                <label htmlFor="flashcard-front-text">Front text</label>
                <textarea
                  id="flashcard-front-text"
                  value={draft.frontText}
                  onChange={(event) =>
                    updateDraft("frontText", event.target.value)
                  }
                  placeholder="Term, prompt, or question"
                />
              </div>

              <div className="flashcard-field">
                <label htmlFor="flashcard-back-text">Back text</label>
                <textarea
                  id="flashcard-back-text"
                  value={draft.backText}
                  onChange={(event) =>
                    updateDraft("backText", event.target.value)
                  }
                  placeholder="Definition, answer, or explanation"
                />
              </div>
            </div>

            <div className="flashcard-form__row">
              <div className="flashcard-field">
                <label htmlFor="flashcard-front-image">Front image URL</label>
                <div className="flashcard-image-input">
                  <input
                    id="flashcard-front-image"
                    type="url"
                    value={draft.frontImageUrl}
                    onChange={(event) =>
                      updateDraft("frontImageUrl", event.target.value)
                    }
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    className="flashcard-btn"
                    onClick={() => frontInputRef.current?.click()}
                    disabled={!onUploadImage || uploadingField === "frontImageUrl"}
                  >
                    <ImagePlus size={16} />
                    {uploadingField === "frontImageUrl" ? "Uploading" : "Upload"}
                  </button>
                  <input
                    ref={frontInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      handleUpload("frontImageUrl", file);
                    }}
                  />
                </div>
                {draft.frontImageUrl && (
                  <img
                    src={draft.frontImageUrl}
                    alt=""
                    className="flashcard-image-preview"
                    loading="lazy"
                  />
                )}
              </div>

              <div className="flashcard-field">
                <label htmlFor="flashcard-back-image">Back image URL</label>
                <div className="flashcard-image-input">
                  <input
                    id="flashcard-back-image"
                    type="url"
                    value={draft.backImageUrl}
                    onChange={(event) =>
                      updateDraft("backImageUrl", event.target.value)
                    }
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    className="flashcard-btn"
                    onClick={() => backInputRef.current?.click()}
                    disabled={!onUploadImage || uploadingField === "backImageUrl"}
                  >
                    <ImagePlus size={16} />
                    {uploadingField === "backImageUrl" ? "Uploading" : "Upload"}
                  </button>
                  <input
                    ref={backInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      handleUpload("backImageUrl", file);
                    }}
                  />
                </div>
                {draft.backImageUrl && (
                  <img
                    src={draft.backImageUrl}
                    alt=""
                    className="flashcard-image-preview"
                    loading="lazy"
                  />
                )}
              </div>
            </div>

            <div className="flashcard-form__row">
              <div className="flashcard-field">
                <label htmlFor="flashcard-hint">Hint</label>
                <textarea
                  id="flashcard-hint"
                  value={draft.hint}
                  onChange={(event) => updateDraft("hint", event.target.value)}
                  placeholder="Optional hint for the front side"
                />
              </div>

              <div className="flashcard-field">
                <label htmlFor="flashcard-explanation">Explanation</label>
                <textarea
                  id="flashcard-explanation"
                  value={draft.explanation}
                  onChange={(event) =>
                    updateDraft("explanation", event.target.value)
                  }
                  placeholder="Optional explanation after reveal"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flashcard-actions">
        <button
          type="submit"
          className="flashcard-btn flashcard-btn--primary"
          disabled={saving || Boolean(uploadingField)}
        >
          <Save size={16} />
          {saving ? "Saving" : "Save Card"}
        </button>
        {onCancel && (
          <button
            type="button"
            className="flashcard-btn"
            onClick={onCancel}
            disabled={saving}
          >
            <X size={16} />
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
