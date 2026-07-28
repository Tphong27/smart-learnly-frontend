import { CheckSquare, Trash2 } from "lucide-react";
import "../flashcards-shared.css";

export function FlashcardSelectionToolbar({
  selectionMode = false,
  selectedCount = 0,
  totalSelectableCount = 0,
  bulkDeleteCount = selectedCount,
  disabled = false,
  onEnterSelection,
  onExitSelection,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  idleActions = null,
  labels = {},
  totalCountLabel,
  statusContent,
  selectAllDisabled,
  clearDisabled,
  bulkDeleteDisabled,
}) {
  const selectedLabel = labels.selected || "selected";
  const visibleStatus =
    totalCountLabel && totalSelectableCount > 0
      ? ` (${totalSelectableCount} ${totalCountLabel})`
      : "";
  const bulkDeleteLabel =
    labels.bulkDeletePrefix === ""
      ? `(${bulkDeleteCount})`
      : `${labels.bulkDeletePrefix || "Delete"} (${bulkDeleteCount})`;

  return (
    <div className="flashcard-selection-toolbar">
      {selectionMode && (
        <div className="flashcard-selection-toolbar__status">
          {statusContent ?? (
            <>
              {selectedCount} {selectedLabel}
              {visibleStatus}
            </>
          )}
        </div>
      )}

      <div className="flashcard-actions flashcard-selection-toolbar__actions">
        {!selectionMode && idleActions}

        {selectionMode ? (
          <>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--compact"
              onClick={onSelectAll}
              disabled={
                disabled ||
                selectAllDisabled ||
                totalSelectableCount === 0 ||
                selectedCount >= totalSelectableCount
              }
              aria-label={labels.selectAllAria || "Select all flashcards"}
              title={labels.selectAllTitle || "Select all flashcards"}
            >
              {labels.selectAll || "All"}
            </button>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--compact"
              onClick={onClearSelection}
              disabled={disabled || clearDisabled || selectedCount === 0}
            >
              {labels.clear || "Clear"}
            </button>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--danger flashcard-btn--compact"
              onClick={onBulkDelete}
              disabled={disabled || bulkDeleteDisabled || bulkDeleteCount === 0}
              aria-label={
                labels.bulkDeleteAria ||
                `Delete ${bulkDeleteCount} selected flashcards`
              }
            >
              <Trash2 size={16} />
              {bulkDeleteLabel}
            </button>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--compact"
              onClick={onExitSelection}
              disabled={disabled}
              aria-pressed={selectionMode}
            >
              {labels.cancel || "Cancel"}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="flashcard-btn"
            onClick={onEnterSelection}
            disabled={disabled}
            aria-pressed={selectionMode}
          >
            <CheckSquare size={16} />
            {labels.select || "Select"}
          </button>
        )}
      </div>
    </div>
  );
}
