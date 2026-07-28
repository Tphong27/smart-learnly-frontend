import { Eye, Save, X } from "lucide-react";
import { Modal } from "@/shared/components/ui";
import { FlashcardCardEditor } from "./FlashcardCardEditor";
import "../flashcards-shared.css";

export function FlashcardCardEditorModal({
  open,
  title,
  description,
  formId,
  editorProps,
  saving = false,
  uploading = false,
  closeDisabled = false,
  submitLabel = "Save changes",
  savingLabel = "Saving...",
  submitDisabled = false,
  statusText,
  statusTone = "clean",
  onClose,
  onCancel,
  onPreview,
  previewDisabled = false,
  previewTriggerRef,
  errorContent,
  afterEditor,
}) {
  const busy = saving || uploading;

  return (
    <Modal
      open={open}
      title={title}
      description={description}
      size="xl"
      className="flashcard-card-editor-modal"
      closeDisabled={closeDisabled}
      onClose={onClose}
      footer={
        <div className="flashcard-current-editor__footer">
          {onPreview && (
            <button
              type="button"
              className="flashcard-btn flashcard-btn--icon"
              ref={previewTriggerRef}
              title="Preview flashcards"
              aria-label="Preview flashcards"
              onClick={onPreview}
              disabled={previewDisabled || busy}
            >
              <Eye size={16} />
            </button>
          )}
          {statusText && (
            <span
              className={[
                "flashcard-current-editor__save-state",
                `flashcard-current-editor__save-state--${statusTone}`,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {statusText}
            </span>
          )}
          <button
            type="button"
            className="flashcard-btn"
            onClick={onCancel || onClose}
            disabled={busy || closeDisabled}
          >
            <X size={16} />
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            className="flashcard-btn flashcard-btn--primary"
            disabled={busy || submitDisabled}
          >
            <Save size={16} />
            {saving ? savingLabel : submitLabel}
          </button>
        </div>
      }
    >
      {errorContent}
      <FlashcardCardEditor
        {...editorProps}
        formId={formId}
        saving={saving}
        hideTitle
        hideDefaultActions
      />
      {afterEditor}
    </Modal>
  );
}
