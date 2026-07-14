import {
  Edit3,
  GripVertical,
  Image,
  ListOrdered,
  Trash2,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { normalizeCards } from "./flashcard-utils";
import "./Flashcards.css";

function isInteractiveTarget(target) {
  return Boolean(
    target?.closest?.(
      [
        "input",
        "textarea",
        "button",
        "a",
        "img",
        "[contenteditable='true']",
        ".flashcard-image-input",
        ".flashcard-inline-editor__optional-field",
        ".flashcard-inline-editor__optional-action",
      ].join(","),
    ),
  );
}

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
  activeCardId,
  disabled = false,
  selectionMode = false,
  selectedCardIds = [],
  onToggleSelect,
  onSelect,
  onEdit,
  onDelete,
  onMove,
  renderCardBody,
  dragDisabled = disabled,
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
    if (!result.destination || disabled || dragDisabled) return;
    const movedCard = normalizedCards[result.source.index];
    if (!movedCard?.id) return;
    onMove?.({
      cardId: movedCard.id,
      fromVisibleIndex: pageStartIndex + result.source.index,
      toVisibleIndex: pageStartIndex + result.destination.index,
    });
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
                key={card.id}
                draggableId={String(card.id)}
                index={index}
                isDragDisabled={dragDisabled || !card.id}
              >
                {(dragProvided, dragSnapshot) => {
                  const customBody = renderCardBody?.(card);
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
                      {...(!customBody ? {} : { "data-inline-editing": "true" })}
                      onClick={(event) => {
                        if (disabled) return;
                        if (isInteractiveTarget(event.target)) return;
                        if (selectionMode) {
                          onToggleSelect?.(card);
                        } else {
                          onSelect?.(card);
                        }
                      }}
                      onDoubleClick={(event) => {
                        if (isInteractiveTarget(event.target)) return;
                      }}
                    >
                      <div
                        className="flashcard-list-item__drag-handle"
                        title="Drag to reorder"
                        aria-label="Drag to reorder"
                        onClick={(event) => event.stopPropagation()}
                        onDoubleClick={(event) => event.stopPropagation()}
                        {...dragProvided.dragHandleProps}
                      >
                        <GripVertical size={16} />
                      </div>
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
                            aria-label="Select card"
                          />
                        )}
                      </span>
                      <div className="flashcard-list-item__body">
                        {customBody ? (
                          customBody
                        ) : (
                          <>
                            <CardSidePreview
                              label="Front"
                              content={getSideContent(card, "front")}
                            />
                            <CardSidePreview
                              label="Back"
                              content={getSideContent(card, "back")}
                            />
                            {(card.hint || card.explanation) && (
                              <div className="flashcard-list-item__meta">
                                {card.hint && (
                                  <p>
                                    <strong>Hint:</strong> {card.hint}
                                  </p>
                                )}
                                {card.explanation && (
                                  <p>
                                    <strong>Explanation:</strong> {card.explanation}
                                  </p>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      {!customBody && (
                        <div className="flashcard-list-item__actions">
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
                      )}
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
