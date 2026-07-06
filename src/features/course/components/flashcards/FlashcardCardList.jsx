import {
  ArrowDown,
  ArrowUp,
  Edit3,
  GripVertical,
  Image,
  ListOrdered,
  Trash2,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
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
  selectionMode = false,
  selectedCardIds = [],
  onToggleSelect,
  onSelect,
  onEdit,
  onDelete,
  onMove,
}) {
  const normalizedCards = normalizeCards(cards);
  const selectedSet = new Set(selectedCardIds);

  if (normalizedCards.length === 0) {
    return (
      <div className="flashcard-empty">
        <ListOrdered size={28} />
        <p>No cards yet.</p>
      </div>
    );
  }

  function handleDragEnd(result) {
    if (!result.destination || disabled) return;
    onMove?.(result.source.index, result.destination.index);
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="flashcard-card-list">
        {(dropProvided) => (
          <div
            className="flashcard-list"
            ref={dropProvided.innerRef}
            {...dropProvided.droppableProps}
          >
            {normalizedCards.map((card, index) => (
              <Draggable
                key={card.id || index}
                draggableId={String(card.id || index)}
                index={index}
                isDragDisabled={disabled}
              >
                {(dragProvided, dragSnapshot) => (
                  <div
                    className={[
                      "flashcard-list-item",
                      activeCardId === card.id ? "flashcard-list-item--active" : "",
                      selectionMode ? "flashcard-list-item--selecting" : "",
                      selectedSet.has(card.id) ? "is-selected" : "",
                      dragSnapshot.isDragging ? "is-dragging" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    onClick={() => {
                      if (disabled) return;
                      if (selectionMode) {
                        onToggleSelect?.(card);
                      } else {
                        onSelect?.(card);
                      }
                    }}
                    onDoubleClick={() => {
                      if (!disabled && !selectionMode) onEdit?.(card);
                    }}
                  >
                    <button
                      type="button"
                      className="flashcard-list-item__drag-handle"
                      title="Drag to reorder"
                      aria-label={`Drag card ${index + 1} to reorder`}
                      disabled={disabled}
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                      {...dragProvided.dragHandleProps}
                    >
                      <GripVertical size={16} />
                    </button>
                    <span className="flashcard-list-item__selection-slot">
                      {selectionMode && (
                        <input
                          type="checkbox"
                          className="flashcard-list-item__checkbox"
                          checked={selectedSet.has(card.id)}
                          onClick={(event) => event.stopPropagation()}
                          onDoubleClick={(event) => event.stopPropagation()}
                          onChange={() => onToggleSelect?.(card)}
                          disabled={disabled}
                          aria-label={`Select card ${index + 1}`}
                        />
                      )}
                    </span>
                    <span
                      className="flashcard-list-item__number"
                    >
                      {index + 1}
                    </span>
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
                        onClick={(event) => {
                          event.stopPropagation();
                          onMove?.(index, index - 1);
                        }}
                        disabled={disabled || index === 0}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        className="flashcard-btn flashcard-btn--icon"
                        title="Move down"
                        onClick={(event) => {
                          event.stopPropagation();
                          onMove?.(index, index + 1);
                        }}
                        disabled={disabled || index === normalizedCards.length - 1}
                      >
                        <ArrowDown size={15} />
                      </button>
                      <button
                        type="button"
                        className="flashcard-btn flashcard-btn--icon"
                        title="Edit card"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit?.(card);
                        }}
                        disabled={disabled}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        className="flashcard-btn flashcard-btn--icon flashcard-btn--danger"
                        title="Delete card"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete?.(card);
                        }}
                        disabled={disabled}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </Draggable>
            ))}
            {dropProvided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
