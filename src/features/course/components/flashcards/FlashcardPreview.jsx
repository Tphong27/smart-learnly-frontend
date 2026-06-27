import { useEffect, useMemo, useState } from "react";
import {
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Shuffle,
} from "lucide-react";
import { normalizeCards } from "./flashcard-utils";
import "./Flashcards.css";

function shuffleCards(cards) {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

function CardFace({ label, text, imageUrl, hint, explanation }) {
  return (
    <div className={`flashcard-preview__face flashcard-preview__face--${label.toLowerCase()}`}>
      <span className="flashcard-preview__label">{label}</span>
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="flashcard-preview__image"
          loading="lazy"
        />
      )}
      {text && <div className="flashcard-preview__text">{text}</div>}
      {hint && <div className="flashcard-preview__hint">{hint}</div>}
      {explanation && (
        <div className="flashcard-preview__explanation">{explanation}</div>
      )}
    </div>
  );
}

export function FlashcardPreview({
  cards,
  emptyMessage = "No cards available.",
  renderActions,
}) {
  const normalizedCards = useMemo(() => normalizeCards(cards), [cards]);
  const [orderedCards, setOrderedCards] = useState(normalizedCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setOrderedCards(normalizedCards);
    setCurrentIndex(0);
    setFlipped(false);
  }, [normalizedCards]);

  const currentCard = orderedCards[currentIndex];
  const cardCount = orderedCards.length;

  const goPrevious = () => {
    setCurrentIndex((index) => Math.max(0, index - 1));
    setFlipped(false);
  };

  const goNext = () => {
    setCurrentIndex((index) => Math.min(cardCount - 1, index + 1));
    setFlipped(false);
  };

  const shuffle = () => {
    setOrderedCards((items) => shuffleCards(items));
    setCurrentIndex(0);
    setFlipped(false);
  };

  if (!cardCount) {
    return (
      <div className="flashcard-empty">
        <ChevronsUpDown size={28} />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flashcard-preview">
      <div className="flashcard-preview__stage">
        <button
          type="button"
          className={`flashcard-preview__card ${flipped ? "is-flipped" : ""}`}
          onClick={() => setFlipped((value) => !value)}
          aria-label={flipped ? "Show front side" : "Show back side"}
        >
          <CardFace
            label="Front"
            text={currentCard.frontText}
            imageUrl={currentCard.frontImageUrl}
            hint={currentCard.hint}
          />
          <CardFace
            label="Back"
            text={currentCard.backText}
            imageUrl={currentCard.backImageUrl}
            explanation={currentCard.explanation}
          />
        </button>
      </div>

      <div className="flashcard-preview__controls">
        <button
          type="button"
          className="flashcard-btn"
          onClick={goPrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        <span className="flashcard-preview__counter">
          {currentIndex + 1} / {cardCount}
        </span>
        <button
          type="button"
          className="flashcard-btn"
          onClick={goNext}
          disabled={currentIndex >= cardCount - 1}
        >
          Next
          <ChevronRight size={16} />
        </button>
        <button type="button" className="flashcard-btn" onClick={shuffle}>
          <Shuffle size={16} />
          Shuffle
        </button>
      </div>

      {renderActions?.({
        card: currentCard,
        index: currentIndex,
        isBackVisible: flipped,
        setFlipped,
        goNext,
      })}
    </div>
  );
}
