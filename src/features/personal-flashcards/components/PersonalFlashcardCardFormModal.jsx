import { useMemo, useRef, useState } from "react";
import { Modal } from "@/shared/components/ui";
import {
  FlashcardCardEditorModal,
  FlashcardPreview,
} from "@/features/flashcards-shared";
import { personalFlashcardCardSchema } from "../schemas/personal-flashcard-schemas";
import { getErrorMessage } from "../utils/personal-flashcard-utils";

const EMPTY_CARD = {
  frontText: "",
  frontImageUrl: "",
  backText: "",
  backImageUrl: "",
  hint: "",
  explanation: "",
};

const DRAFT_PREVIEW_CARD_ID = "__personal-flashcard-draft-preview__";

function toCardDraft(card) {
  return {
    ...EMPTY_CARD,
    frontText: card?.frontText || "",
    frontImageUrl: card?.frontImageUrl || "",
    backText: card?.backText || "",
    backImageUrl: card?.backImageUrl || "",
    hint: card?.hint || "",
    explanation: card?.explanation || "",
  };
}

function hasFrontContent(draft) {
  return Boolean(String(draft?.frontText || "").trim() || draft?.frontImageUrl);
}

function hasBackContent(draft) {
  return Boolean(String(draft?.backText || "").trim() || draft?.backImageUrl);
}

function getFieldError(result, field) {
  return result.error?.issues?.find((issue) => issue.path?.[0] === field)
    ?.message;
}

export function PersonalFlashcardCardFormModal({
  open,
  card,
  onClose,
  onSave,
  onUpload,
}) {
  const initialDraft = useMemo(() => toCardDraft(card), [card]);
  const [draft, setDraft] = useState(() => initialDraft);
  const [frontError, setFrontError] = useState("");
  const [backError, setBackError] = useState("");
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const submittingRef = useRef(false);
  const previewTriggerRef = useRef(null);
  const editing = Boolean(card?.id);
  const busy = saving || uploading;
  const closeDisabled = busy || previewOpen;

  function handleDraftChange(nextDraft) {
    const frontChanged =
      nextDraft.frontText !== draft.frontText ||
      nextDraft.frontImageUrl !== draft.frontImageUrl;
    const backChanged =
      nextDraft.backText !== draft.backText ||
      nextDraft.backImageUrl !== draft.backImageUrl;

    setDraft(nextDraft);
    if (frontChanged && hasFrontContent(nextDraft)) {
      setFrontError("");
    }
    if (backChanged && hasBackContent(nextDraft)) {
      setBackError("");
    }
  }

  function closeModal() {
    if (closeDisabled) return;
    onClose();
  }

  function closePreview() {
    setPreviewOpen(false);
    window.requestAnimationFrame(() => {
      previewTriggerRef.current?.focus({ preventScroll: true });
    });
  }

  async function handleSave(nextDraft) {
    if (submittingRef.current || busy) return;

    const validationResult = personalFlashcardCardSchema.safeParse(nextDraft);
    if (!validationResult.success) {
      setFrontError(getFieldError(validationResult, "frontText") || "");
      setBackError(getFieldError(validationResult, "backText") || "");
      return;
    }

    submittingRef.current = true;
    setSaving(true);
    setServerError("");
    try {
      await onSave(validationResult.data);
      onClose();
    } catch (error) {
      setServerError(getErrorMessage(error, "Unable to save this flashcard."));
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }

  const previewCard = {
    ...draft,
    id: card?.id || DRAFT_PREVIEW_CARD_ID,
    orderIndex: card?.orderIndex ?? 0,
  };

  return (
    <FlashcardCardEditorModal
      open={open}
      title={editing ? "Edit card" : "Add card"}
      description="Each side needs text or an uploaded image."
      formId="personal-flashcard-card-form"
      saving={saving}
      uploading={uploading}
      closeDisabled={closeDisabled}
      submitLabel={editing ? "Save changes" : "Add card"}
      savingLabel={editing ? "Saving changes..." : "Adding card..."}
      statusText={
        uploading
          ? "Uploading image..."
          : saving
            ? "Saving..."
            : "Ready"
      }
      statusTone={uploading ? "uploading" : saving ? "saving" : "clean"}
      onClose={closeModal}
      onCancel={closeModal}
      onPreview={() => setPreviewOpen(true)}
      previewDisabled={busy}
      previewTriggerRef={previewTriggerRef}
      errorContent={
        serverError ? (
          <p className="personal-flashcard-form-error" role="alert">
            {serverError}
          </p>
        ) : null
      }
      editorProps={{
        draft,
        mode: editing ? "edit" : "create",
        titleId: "personal-flashcard-card-editor",
        onDraftChange: handleDraftChange,
        onSave: handleSave,
        onUploadImage: onUpload,
        onUploadingChange: setUploading,
        onError: (message) => setServerError(message),
        fieldErrors: {
          frontText: frontError,
          backText: backError,
        },
      }}
      afterEditor={
        previewOpen ? (
          <Modal
            open
            title="Preview"
            description="Preview the current draft."
            size="lg"
            onClose={closePreview}
          >
            <div className="flashcard-current-editor__preview">
              <FlashcardPreview
                cards={[previewCard]}
                activeCardId={previewCard.id}
                emptyMessage="Add content to preview this flashcard."
                contentLayout="management"
                showNavigation={false}
              />
            </div>
          </Modal>
        ) : null
      }
    />
  );
}
