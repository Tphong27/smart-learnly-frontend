import { useRef, useState } from "react";
import { ChevronDown, ImagePlus, Save, Trash2, X } from "lucide-react";
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

function getOpenSections(value) {
  return {
    frontImage: Boolean(value?.frontImageUrl),
    frontHint: Boolean(value?.hint),
    backImage: Boolean(value?.backImageUrl),
    backExplanation: Boolean(value?.explanation),
  };
}

function CollapsibleEditorSection({ id, title, open, onToggle, children }) {
  return (
    <section className="flashcard-card-editor__section">
      <button
        type="button"
        className="flashcard-card-editor__section-toggle"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={id}
      >
        <span>{open ? title : `+ ${title}`}</span>
        <ChevronDown
          size={16}
          className={
            open
              ? "flashcard-card-editor__chevron is-open"
              : "flashcard-card-editor__chevron"
          }
        />
      </button>
      {open && (
        <div id={id} className="flashcard-card-editor__section-body">
          {children}
        </div>
      )}
    </section>
  );
}

export function FlashcardCardEditor({
  value,
  mode = "create",
  saving = false,
  onSave,
  onCancel,
  onUploadImage,
  onError,
  titleId,
}) {
  const [draft, setDraft] = useState(() => toDraft(value));
  const [openSections, setOpenSections] = useState(() =>
    getOpenSections(toDraft(value)),
  );
  const [uploadingField, setUploadingField] = useState(null);
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

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

  const toggleSection = (section) => {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const handleImageFileChange = (field, event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    handleUpload(field, file);
  };

  const renderImageSection = ({ field, inputRef, label }) => {
    const imageUrl = draft[field];
    const uploading = uploadingField === field;

    return (
      <div className="flashcard-card-editor__image-control">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="flashcard-image-preview flashcard-card-editor__image-preview"
            loading="lazy"
          />
        ) : (
          <div className="flashcard-card-editor__image-empty">
            <ImagePlus size={20} />
            <span>No {label.toLowerCase()} image added.</span>
          </div>
        )}
        <div className="flashcard-card-editor__image-actions">
          <button
            type="button"
            className="flashcard-btn"
            onClick={() => inputRef.current?.click()}
            disabled={!onUploadImage || uploading}
          >
            <ImagePlus size={16} />
            {uploading ? "Uploading" : imageUrl ? "Replace image" : "Upload image"}
          </button>
          {imageUrl && (
            <button
              type="button"
              className="flashcard-btn flashcard-btn--danger"
              onClick={() => updateDraft(field, "")}
              disabled={uploading}
            >
              <Trash2 size={16} />
              Remove
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => handleImageFileChange(field, event)}
          />
        </div>
      </div>
    );
  };

  const title = mode === "edit" ? "Edit Card" : "Add Card";

  return (
    <form className="flashcard-form flashcard-card-editor" onSubmit={handleSubmit}>
      <div className="flashcard-panel">
        <div className="flashcard-panel__header">
          <h3 id={titleId} className="flashcard-panel__title">{title}</h3>
        </div>
        <div className="flashcard-panel__body">
          <div className="flashcard-card-editor__grid">
            <section className="flashcard-card-editor__side">
              <h4>Front side</h4>
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

              <CollapsibleEditorSection
                id="flashcard-front-image-section"
                title="Image"
                open={openSections.frontImage}
                onToggle={() => toggleSection("frontImage")}
              >
                {renderImageSection({
                  field: "frontImageUrl",
                  inputRef: frontInputRef,
                  label: "Front",
                })}
              </CollapsibleEditorSection>

              <CollapsibleEditorSection
                id="flashcard-front-hint-section"
                title="Hint"
                open={openSections.frontHint}
                onToggle={() => toggleSection("frontHint")}
              >
                <div className="flashcard-field">
                  <label htmlFor="flashcard-hint">Hint</label>
                  <textarea
                    id="flashcard-hint"
                    value={draft.hint}
                    onChange={(event) => updateDraft("hint", event.target.value)}
                    placeholder="Optional hint for the front side"
                  />
                </div>
              </CollapsibleEditorSection>
            </section>

            <section className="flashcard-card-editor__side">
              <h4>Back side</h4>
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

              <CollapsibleEditorSection
                id="flashcard-back-image-section"
                title="Image"
                open={openSections.backImage}
                onToggle={() => toggleSection("backImage")}
              >
                {renderImageSection({
                  field: "backImageUrl",
                  inputRef: backInputRef,
                  label: "Back",
                })}
              </CollapsibleEditorSection>

              <CollapsibleEditorSection
                id="flashcard-back-explanation-section"
                title="Explanation"
                open={openSections.backExplanation}
                onToggle={() => toggleSection("backExplanation")}
              >
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
              </CollapsibleEditorSection>
            </section>
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
