import { ChevronLeft, ChevronRight } from "lucide-react";
import "../flashcards-shared.css";

function StudyAction({ action }) {
  if (!action) return null;

  return (
    <button
      type="button"
      className={action.className || "flashcard-btn"}
      onClick={action.onClick}
      disabled={action.disabled}
      aria-label={action.ariaLabel}
      title={action.title}
    >
      {action.icon}
      {action.label}
    </button>
  );
}

export function FlashcardStudyControls({
  controls,
  auxiliaryAction,
  trailingAction,
  className = "",
}) {
  if (!controls) return null;

  return (
    <div
      className={["flashcard-preview__controls", className]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="flashcard-btn"
        onClick={controls.goPrevious}
        disabled={!controls.canGoPrevious}
      >
        <ChevronLeft size={16} />
        Previous
      </button>
      <span className="flashcard-preview__counter">
        {controls.index + 1} / {controls.cardCount}
      </span>
      <button
        type="button"
        className="flashcard-btn"
        onClick={controls.goNext}
        disabled={!controls.canGoNext}
      >
        Next
        <ChevronRight size={16} />
      </button>
      <StudyAction action={auxiliaryAction} />
      <StudyAction action={trailingAction} />
    </div>
  );
}
