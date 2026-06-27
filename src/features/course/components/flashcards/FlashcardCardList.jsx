import {
  ArrowDown,
  ArrowUp,
  Edit3,
  Image,
  ListOrdered,
  Trash2,
} from "lucide-react";
import { normalizeCards } from "./flashcard-utils";
import "./Flashcards.css";

function cardSummary(card, side) {
  const text = side === "front" ? card.frontText : card.backText;
  const imageUrl = side === "front" ? card.frontImageUrl : card.backImageUrl;

  if (text) return text;
  if (imageUrl) return "Image";
  return "Empty";
}

export function FlashcardCardList({
  cards,
  activeCardId,
  disabled = false,
  onEdit,
  onDelete,
  onMove,
}) {
  const normalizedCards = normalizeCards(cards);

  if (normalizedCards.length === 0) {
    return (
      <div className="flashcard-empty">
        <ListOrdered size={28} />
        <p>No cards yet.</p>
      </div>
    );
  }

  return (
    <div className="flashcard-list">
      {normalizedCards.map((card, index) => (
        <div
          key={card.id || index}
          className={`flashcard-list-item ${
            activeCardId === card.id ? "flashcard-list-item--active" : ""
          }`}
        >
          <span className="flashcard-list-item__number">{index + 1}</span>
          <div className="flashcard-list-item__body">
            <div className="flashcard-list-item__front">
              {card.frontImageUrl && <Image size={13} />}{" "}
              {cardSummary(card, "front")}
            </div>
            <div className="flashcard-list-item__back">
              {card.backImageUrl && <Image size={12} />}{" "}
              {cardSummary(card, "back")}
            </div>
          </div>
          <div className="flashcard-list-item__actions">
            <button
              type="button"
              className="flashcard-btn flashcard-btn--icon"
              title="Move up"
              onClick={() => onMove?.(index, index - 1)}
              disabled={disabled || index === 0}
            >
              <ArrowUp size={15} />
            </button>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--icon"
              title="Move down"
              onClick={() => onMove?.(index, index + 1)}
              disabled={disabled || index === normalizedCards.length - 1}
            >
              <ArrowDown size={15} />
            </button>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--icon"
              title="Edit card"
              onClick={() => onEdit?.(card)}
              disabled={disabled}
            >
              <Edit3 size={15} />
            </button>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--icon flashcard-btn--danger"
              title="Delete card"
              onClick={() => onDelete?.(card)}
              disabled={disabled}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
