import { useProgressiveVisibleItems } from "../hooks/useProgressiveVisibleItems";
import "../flashcards-shared.css";

function cardKey(id) {
  return id == null ? "" : String(id);
}

function CardSideSummary({ label, text, imageUrl }) {
  const hasText = Boolean(text);
  const hasImage = Boolean(imageUrl);

  return (
    <div className="flashcard-compact-item__side">
      <span className="flashcard-compact-item__side-label">{label}</span>
      {hasImage && (
        <img
          src={imageUrl}
          alt=""
          className="flashcard-compact-item__image"
          loading="lazy"
        />
      )}
      {hasText ? (
        <div className="flashcard-compact-item__text">{text}</div>
      ) : (
        !hasImage && (
          <div className="flashcard-compact-item__empty">No content</div>
        )
      )}
    </div>
  );
}

export function FlashcardStudyCardList({
  cards,
  activeCardId,
  onSelect,
  contextKey,
  pageSize = 40,
  heading = "Cards",
  renderItemMeta,
}) {
  const {
    visibleItems,
    remainingCount,
    showMore,
  } = useProgressiveVisibleItems(cards, contextKey, pageSize);

  if (!cards.length) return null;

  const activeKey = cardKey(activeCardId);

  return (
    <div className="flashcard-compact">
      <div className="flashcard-compact__header">
        <h3>{heading}</h3>
        <span>
          {cards.length} card{cards.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flashcard-compact-list">
        {visibleItems.map((card, index) => {
          const itemMeta = renderItemMeta?.(card, index);
          const isActive = cardKey(card.id) === activeKey;

          return (
            <button
              key={card.id}
              type="button"
              className={[
                "flashcard-compact-item",
                isActive ? "is-active" : "",
                itemMeta ? "" : "flashcard-compact-item--without-meta",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelect?.(card.id, card)}
              aria-current={isActive ? "true" : undefined}
            >
              <span className="flashcard-compact-item__number">
                {index + 1}
              </span>
              <div className="flashcard-compact-item__content">
                <div className="flashcard-compact-item__sides">
                  <CardSideSummary
                    label="Front"
                    text={card.frontText}
                    imageUrl={card.frontImageUrl}
                  />
                  <CardSideSummary
                    label="Back"
                    text={card.backText}
                    imageUrl={card.backImageUrl}
                  />
                </div>
              </div>
              {itemMeta}
            </button>
          );
        })}
      </div>
      {remainingCount > 0 && (
        <div className="flashcard-compact__more">
          <button type="button" className="flashcard-btn" onClick={showMore}>
            Show more ({Math.min(remainingCount, pageSize)} of {remainingCount})
          </button>
        </div>
      )}
    </div>
  );
}
