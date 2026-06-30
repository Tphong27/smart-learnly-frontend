import { useEffect, useMemo, useState } from "react";
import {
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Shuffle,
} from "lucide-react";
import { normalizeCards } from "./flashcard-utils";
import "./Flashcards.css";

export function shuffleCards(cards) {
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

function cardKey(id) {
  return id == null ? "" : String(id);
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
  activeCardId,
  orderedCardIds,
  onActiveCardChange,
  onAdvancePastEnd,
  onShuffle,
  emptyMessage = "No cards available.",
  renderActions,
}) {
  const normalizedCards = useMemo(() => normalizeCards(cards), [cards]);
  const [internalActiveCardId, setInternalActiveCardId] = useState(null);
  const [internalOrderIds, setInternalOrderIds] = useState([]);
  const [flipped, setFlipped] = useState(false);

  const orderedCards = useMemo(() => {
    if (!normalizedCards.length) return [];
    const cardById = new Map(
      normalizedCards.map((card) => [cardKey(card.id), card]),
    );
    const ids = orderedCardIds?.length ? orderedCardIds : internalOrderIds;
    const ordered = ids
      .map((id) => cardById.get(cardKey(id)))
      .filter(Boolean);
    const orderedIds = new Set(ordered.map((card) => cardKey(card.id)));
    return [
      ...ordered,
      ...normalizedCards.filter((card) => !orderedIds.has(cardKey(card.id))),
    ];
  }, [internalOrderIds, normalizedCards, orderedCardIds]);

  const resolvedActiveCardId = activeCardId ?? internalActiveCardId;
  const resolvedActiveCardKey = cardKey(resolvedActiveCardId);

  const currentIndex = useMemo(() => {
    if (!orderedCards.length) return -1;
    const index = orderedCards.findIndex(
      (card) => cardKey(card.id) === resolvedActiveCardKey,
    );
    return index >= 0 ? index : 0;
  }, [orderedCards, resolvedActiveCardKey]);

  const currentCard = orderedCards[currentIndex] || null;

  const cardCount = orderedCards.length;

  const setActiveCard = (card) => {
    if (card?.id == null) return;
    if (activeCardId === undefined) {
      setInternalActiveCardId(card.id);
    }
    onActiveCardChange?.(card.id, card);
    setFlipped(false);
  };

  useEffect(() => {
    if (!normalizedCards.length) {
      setInternalActiveCardId(null);
      setInternalOrderIds([]);
      return;
    }

    setInternalOrderIds((currentIds) =>
      currentIds.filter((id) =>
        normalizedCards.some((card) => cardKey(card.id) === cardKey(id)),
      ),
    );

    const hasActiveCard = normalizedCards.some(
      (card) => cardKey(card.id) === resolvedActiveCardKey,
    );

    if (!hasActiveCard && activeCardId === undefined) {
      setActiveCard(normalizedCards[0]);
    }
  }, [activeCardId, normalizedCards, resolvedActiveCardKey]);

  const goPrevious = () => {
    const previousCard = orderedCards[Math.max(0, currentIndex - 1)];
    setActiveCard(previousCard);
  };

  const goNext = () => {
    if (currentIndex >= cardCount - 1) {
      onAdvancePastEnd?.(currentCard, orderedCards);
      setFlipped(false);
      return;
    }

    const nextCard = orderedCards[Math.min(cardCount - 1, currentIndex + 1)];
    setActiveCard(nextCard);
  };

  const shuffle = () => {
    const shuffledCards = shuffleCards(orderedCards);
    const shuffledIds = shuffledCards.map((card) => card.id);
    if (onShuffle) {
      onShuffle(shuffledIds, shuffledCards);
    } else {
      setInternalOrderIds(shuffledIds);
    }
    setActiveCard(shuffledCards[0]);
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
          disabled={currentIndex >= cardCount - 1 && !onAdvancePastEnd}
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
        orderedCards,
      })}
    </div>
  );
}
