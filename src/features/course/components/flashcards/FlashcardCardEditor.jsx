import { useState } from "react";
import { ImagePlus, Save, X } from "lucide-react";
import { FlashcardImageInput } from "./FlashcardImageInput";
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

export function FlashcardCardEditor({
  value,
  mode = "create",
  title: titleOverride,
  submitLabel = "Save Card",
  savingLabel = "Saving",
  saving = false,
  onSave,
  onCancel,
  onUploadImage,
  onError,
  titleId,
  validate = validateCardDraft,
}) {
  const [draft, setDraft] = useState(() => toDraft(value));
  const [openSections, setOpenSections] = useState(() =>
    getOpenSections(toDraft(value)),
  );
  const [uploadingField, setUploadingField] = useState(null);

  const updateDraft = (field, nextValue) => {
    setDraft((current) => ({
      ...current,
      [field]: nextValue,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const validationError = validate(draft);
    if (validationError) {
      onError?.(validationError);
      return;
    }
    onSave?.(draft);
  };

  const toggleSection = (section) => {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const handleImageUploadingChange = (field, uploading) => {
    setUploadingField((current) => {
      if (uploading) return field;
      return current === field ? null : current;
    });
  };

  const imageInputDisabled = (field) => {
    return !onUploadImage || Boolean(uploadingField && uploadingField !== field);
  };

  const title = titleOverride || (mode === "edit" ? "Edit Card" : "Add Card");
  const idPrefix = titleId || "flashcard-card-editor";
  const frontTextId = `${idPrefix}-front-text`;
  const backTextId = `${idPrefix}-back-text`;
  const frontHintId = `${idPrefix}-front-hint`;
  const backExplanationId = `${idPrefix}-back-explanation`;

  return (
    <form className="flashcard-form flashcard-card-editor" onSubmit={handleSubmit}>
      <div className="flashcard-panel">
        <div className="flashcard-panel__header">
          <h3 id={titleId} className="flashcard-panel__title">{title}</h3>
        </div>
        <div className="flashcard-panel__body">
          <div className="flashcard-card-editor__grid">
            <section className="flashcard-card-editor__side">
              <div className="flashcard-field">
                <label htmlFor={frontTextId} className="flashcard-sr-only">
                  Front text
                </label>
                <textarea
                  id={frontTextId}
                  value={draft.frontText}
                  onChange={(event) =>
                    updateDraft("frontText", event.target.value)
                  }
                  placeholder="Term, prompt, or question"
                />
              </div>

              <div className="flashcard-card-editor__accessory-row">
                <div className="flashcard-card-editor__media-slot">
                  {!openSections.frontImage && (
                    <button
                      type="button"
                      className="flashcard-card-editor__optional-trigger flashcard-card-editor__optional-trigger--media"
                      onClick={() => toggleSection("frontImage")}
                      disabled={saving}
                      aria-label="Add front image"
                    >
                      <ImagePlus size={14} />
                      + Image
                    </button>
                  )}
                  {openSections.frontImage && (
                    <div className="flashcard-card-editor__optional-field flashcard-card-editor__optional-field--image">
                      <FlashcardImageInput
                        id={`${idPrefix}-front-image`}
                        label="Front image"
                        value={draft.frontImageUrl}
                        disabled={imageInputDisabled("frontImageUrl")}
                        onChange={(nextValue) => updateDraft("frontImageUrl", nextValue)}
                        onUploadImage={onUploadImage}
                        onError={onError}
                        onUploadingChange={(uploading) =>
                          handleImageUploadingChange("frontImageUrl", uploading)
                        }
                      />
                    </div>
                  )}
                </div>
                <div className="flashcard-card-editor__detail-slot">
                  {!openSections.frontHint && (
                    <button
                      type="button"
                      className="flashcard-card-editor__optional-trigger"
                      onClick={() => toggleSection("frontHint")}
                      disabled={saving}
                      aria-label="Add hint"
                    >
                      + Hint
                    </button>
                  )}
                  {openSections.frontHint && (
                    <label
                      htmlFor={frontHintId}
                      className="flashcard-field flashcard-card-editor__optional-field"
                    >
                      <textarea
                        id={frontHintId}
                        value={draft.hint}
                        onChange={(event) => updateDraft("hint", event.target.value)}
                        placeholder="Optional hint for the front side"
                        disabled={saving}
                      />
                      <span>Hint</span>
                    </label>
                  )}
                </div>
              </div>
            </section>

            <section className="flashcard-card-editor__side">
              <div className="flashcard-field">
                <label htmlFor={backTextId} className="flashcard-sr-only">
                  Back text
                </label>
                <textarea
                  id={backTextId}
                  value={draft.backText}
                  onChange={(event) =>
                    updateDraft("backText", event.target.value)
                  }
                  placeholder="Definition, answer, or explanation"
                />
              </div>

              <div className="flashcard-card-editor__accessory-row">
                <div className="flashcard-card-editor__media-slot">
                  {!openSections.backImage && (
                    <button
                      type="button"
                      className="flashcard-card-editor__optional-trigger flashcard-card-editor__optional-trigger--media"
                      onClick={() => toggleSection("backImage")}
                      disabled={saving}
                      aria-label="Add back image"
                    >
                      <ImagePlus size={14} />
                      + Image
                    </button>
                  )}
                  {openSections.backImage && (
                    <div className="flashcard-card-editor__optional-field flashcard-card-editor__optional-field--image">
                      <FlashcardImageInput
                        id={`${idPrefix}-back-image`}
                        label="Back image"
                        value={draft.backImageUrl}
                        disabled={imageInputDisabled("backImageUrl")}
                        onChange={(nextValue) => updateDraft("backImageUrl", nextValue)}
                        onUploadImage={onUploadImage}
                        onError={onError}
                        onUploadingChange={(uploading) =>
                          handleImageUploadingChange("backImageUrl", uploading)
                        }
                      />
                    </div>
                  )}
                </div>
                <div className="flashcard-card-editor__detail-slot">
                  {!openSections.backExplanation && (
                    <button
                      type="button"
                      className="flashcard-card-editor__optional-trigger"
                      onClick={() => toggleSection("backExplanation")}
                      disabled={saving}
                      aria-label="Add explanation"
                    >
                      + Explanation
                    </button>
                  )}
                  {openSections.backExplanation && (
                    <label
                      htmlFor={backExplanationId}
                      className="flashcard-field flashcard-card-editor__optional-field"
                    >
                      <textarea
                        id={backExplanationId}
                        value={draft.explanation}
                        onChange={(event) =>
                          updateDraft("explanation", event.target.value)
                        }
                        placeholder="Optional explanation after reveal"
                        disabled={saving}
                      />
                      <span>Explanation</span>
                    </label>
                  )}
                </div>
              </div>
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
          {saving ? savingLabel : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            className="flashcard-btn"
            onClick={onCancel}
            disabled={saving || Boolean(uploadingField)}
          >
            <X size={16} />
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
