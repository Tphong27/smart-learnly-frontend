import { Eye } from "lucide-react";
import "../flashcards-shared.css";

export function FlashcardPreviewBar({
  activeCard,
  activeIndex,
  totalCards,
  onOpenPreview,
  disabled = false,
  triggerRef,
  labels = {},
  ariaLabel = "Current flashcard preview action",
}) {
  const resolvedTotal = Number(totalCards) || 0;
  const resolvedIndex = Number.isFinite(activeIndex) ? activeIndex : -1;
  const hasActiveCard = Boolean(activeCard);
  const activeLabel = labels.active || "Active card";
  const emptyLabel = labels.empty || "No active card selected";
  const previewLabel = labels.preview || "Preview";

  return (
    <div className="flashcard-current-preview-bar" aria-label={ariaLabel}>
      <div className="flashcard-current-preview-bar__status" aria-live="polite">
        {hasActiveCard ? (
          <>
            <span>{activeLabel}</span>
            <strong>
              {Math.max(1, resolvedIndex + 1)} of {resolvedTotal}
            </strong>
          </>
        ) : (
          <span>{emptyLabel}</span>
        )}
      </div>
      <button
        type="button"
        className="flashcard-btn"
        ref={triggerRef}
        onClick={onOpenPreview}
        disabled={disabled || !hasActiveCard}
      >
        <Eye size={16} />
        {previewLabel}
      </button>
    </div>
  );
}
