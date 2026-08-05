import { FileText } from "lucide-react";
import { StagingReviewPanel } from "./FlashcardStagingReviewPanel";
import "./Flashcards.css";

/** Điều phối màn hình staging và yêu cầu lưu set trước khi cho phép import/review. */
export function FlashcardStagingWorkspace({
  setId,
  existingCards = [],
  notify,
  onUploadImage,
  onApproved,
  refreshKey = 0,
  onImport,
  onModalOpen,
  importDisabled = false,
}) {
  if (!setId) {
    return (
      <div className="flashcard-empty">
        <FileText size={28} />
        <p>Save the flashcard set before using staging.</p>
      </div>
    );
  }

  return (
    <StagingReviewPanel
      setId={setId}
      existingCards={existingCards}
      notify={notify}
      refreshKey={refreshKey}
      onApproved={onApproved}
      onUploadImage={onUploadImage}
      onImport={onImport}
      onModalOpen={onModalOpen}
      importDisabled={importDisabled}
    />
  );
}

export { ImportedBatchReviewPanel } from "./FlashcardImportedBatchReviewPanel";
