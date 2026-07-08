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

function getSideContent(card, side) {
  const text = side === "front" ? card.frontText : card.backText;
  const imageUrl = side === "front" ? card.frontImageUrl : card.backImageUrl;

  return {
    text: text || "",
    imageUrl: imageUrl || "",
    fallback: imageUrl ? "Image only" : "Empty",
  };
}

function CardSidePreview({ label, content }) {
  const hasText = Boolean(content.text);
  const hasImage = Boolean(content.imageUrl);

  return (
    <div className="flashcard-list-item__side">
      <div className="flashcard-list-item__side-label">
        <span>{label}</span>
        {hasImage && (
          <span className="flashcard-list-item__image-pill">
            <Image size={12} />
            Image
          </span>
        )}
      </div>
      <div className="flashcard-list-item__side-content">
        {hasImage && (
          <img
            src={content.imageUrl}
            alt=""
            className="flashcard-list-item__thumbnail"
            loading="lazy"
          />
        )}
        <p className={hasText ? "" : "is-muted"}>
          {hasText ? content.text : content.fallback}
        </p>
      </div>
    </div>
  );
}

export function FlashcardCardList({
  cards,
  pageStartIndex = 0,
  totalCards,
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
  const resolvedTotalCards = totalCards ?? normalizedCards.length;

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
    onMove?.(
      pageStartIndex + result.source.index,
      pageStartIndex + result.destination.index,
    );
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
                {(dragProvided, dragSnapshot) => {
                  const globalIndex = pageStartIndex + index;
                  return (
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
                        aria-label={`Drag card ${globalIndex + 1} to reorder`}
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
                            aria-label={`Select card ${globalIndex + 1}`}
                          />
                        )}
                      </span>
                      <span className="flashcard-list-item__number">
                        {globalIndex + 1}
                      </span>
                      <div className="flashcard-list-item__body">
                        <CardSidePreview
                          label="Front"
                          content={getSideContent(card, "front")}
                        />
                        <CardSidePreview
                          label="Back"
                          content={getSideContent(card, "back")}
                        />
                      </div>
                      <div className="flashcard-list-item__actions">
                        <button
                          type="button"
                          className="flashcard-btn flashcard-btn--icon"
                          title="Move up"
                          onClick={(event) => {
                            event.stopPropagation();
                            onMove?.(globalIndex, globalIndex - 1);
                          }}
                          disabled={disabled || globalIndex === 0}
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          type="button"
                          className="flashcard-btn flashcard-btn--icon"
                          title="Move down"
                          onClick={(event) => {
                            event.stopPropagation();
                            onMove?.(globalIndex, globalIndex + 1);
                          }}
                          disabled={disabled || globalIndex >= resolvedTotalCards - 1}
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
                  );
                }}
              </Draggable>
            ))}
            {dropProvided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
