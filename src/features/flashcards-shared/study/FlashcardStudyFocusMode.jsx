import { useEffect } from "react";
import { Minimize2 } from "lucide-react";
import { FlashcardPreview } from "../components/FlashcardPreview";
import "../flashcards-shared.css";

export function FlashcardStudyFocusMode({
  title,
  subtitle,
  cards,
  activeCardId,
  orderedCardIds,
  onActiveCardChange,
  onAdvancePastEnd,
  onShuffle,
  onClose,
  emptyMessage,
  renderControls,
  renderActions,
  suppressGenericGeneratedExplanation = true,
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="flashcard-focus-mode" role="presentation">
      <section
        className="flashcard-focus-mode__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flashcard-focus-mode-title"
      >
        <header className="flashcard-focus-mode__header">
          <div>
            <span className="flashcard-focus-mode__eyebrow">Focus mode</span>
            <h2 id="flashcard-focus-mode-title">{title || "Flashcards"}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            type="button"
            className="flashcard-btn flashcard-btn--icon flashcard-focus-mode__close"
            onClick={onClose}
            aria-label="Exit focus mode"
            title="Exit focus mode"
          >
            <Minimize2 size={18} />
          </button>
        </header>

        <div className="flashcard-focus-mode__body">
          <FlashcardPreview
            cards={cards}
            activeCardId={activeCardId}
            orderedCardIds={orderedCardIds}
            onActiveCardChange={onActiveCardChange}
            onAdvancePastEnd={onAdvancePastEnd}
            onShuffle={onShuffle}
            emptyMessage={emptyMessage}
            className="flashcard-preview--focus"
            renderControls={renderControls}
            renderActions={renderActions}
            suppressGenericGeneratedExplanation={suppressGenericGeneratedExplanation}
          />
        </div>
      </section>
    </div>
  );
}
