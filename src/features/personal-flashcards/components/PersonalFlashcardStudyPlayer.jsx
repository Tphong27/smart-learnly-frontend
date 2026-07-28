import { useCallback, useMemo, useState } from "react";
import { Maximize2, Minimize2, Shuffle } from "lucide-react";
import {
  FlashcardPreview,
  FlashcardStudyCardList,
  FlashcardStudyControls,
  FlashcardStudyFocusMode,
  shuffleCards,
  useFlashcardStudyKeyboard,
} from "@/features/flashcards-shared";

function cardKey(id) {
  return id == null ? "" : String(id);
}

function cardsKey(cards) {
  return cards.map((card) => cardKey(card.id)).join("|");
}

function sameCardOrder(firstCards, secondCards) {
  if (firstCards.length !== secondCards.length) return false;
  return firstCards.every(
    (card, index) => cardKey(card.id) === cardKey(secondCards[index]?.id),
  );
}

function orderCards(cards, orderIds) {
  const cardById = new Map(cards.map((card) => [cardKey(card.id), card]));
  const ordered = orderIds
    .map((id) => cardById.get(cardKey(id)))
    .filter(Boolean);
  const orderedKeys = new Set(ordered.map((card) => cardKey(card.id)));
  return [
    ...ordered,
    ...cards.filter((card) => !orderedKeys.has(cardKey(card.id))),
  ];
}

function createSessionOrder(cards) {
  return cards.map((card) => card.id);
}

function shuffledSessionCards(cards) {
  if (cards.length <= 1) return cards;
  const shuffled = shuffleCards(cards);
  if (!sameCardOrder(cards, shuffled)) return shuffled;
  return [...cards.slice(1), cards[0]];
}

function resolveActiveCardId(cards, selectedCardId) {
  if (!cards.length) return null;
  return cards.some((card) => cardKey(card.id) === cardKey(selectedCardId))
    ? selectedCardId
    : cards[0].id;
}

function PersonalStudyControls({
  controls,
  keyboardEnabled,
  onOpenFocus,
  onShuffle,
}) {
  useFlashcardStudyKeyboard({
    enabled: keyboardEnabled,
    canGoPrevious: controls.canGoPrevious,
    canGoNext: controls.canGoNext,
    onPrevious: controls.goPrevious,
    onNext: controls.goNext,
    onFlip: controls.flipCard,
  });

  return (
    <FlashcardStudyControls
      controls={controls}
      auxiliaryAction={{
        icon: <Shuffle size={16} />,
        label: "Shuffle",
        onClick: () => onShuffle(controls),
        disabled: controls.cardCount <= 1,
      }}
      trailingAction={{
        ariaLabel: "Open focus mode",
        className: "flashcard-btn flashcard-btn--icon flashcard-focus-toggle",
        icon: <Maximize2 size={16} />,
        onClick: onOpenFocus,
        title: "Open focus mode",
      }}
    />
  );
}

function PersonalFocusControls({ controls, onClose, onShuffle }) {
  useFlashcardStudyKeyboard({
    enabled: true,
    allowWhenDialogOpen: true,
    canGoPrevious: controls.canGoPrevious,
    canGoNext: controls.canGoNext,
    onPrevious: controls.goPrevious,
    onNext: controls.goNext,
    onFlip: controls.flipCard,
    onExitFocus: onClose,
  });

  return (
    <FlashcardStudyControls
      controls={controls}
      className="flashcard-focus-mode__controls"
      auxiliaryAction={{
        icon: <Shuffle size={16} />,
        label: "Shuffle",
        onClick: () => onShuffle(controls),
        disabled: controls.cardCount <= 1,
      }}
      trailingAction={{
        icon: <Minimize2 size={16} />,
        label: "Exit focus",
        onClick: onClose,
      }}
    />
  );
}

export function PersonalFlashcardStudyPlayer({ cards, title }) {
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [sessionOrder, setSessionOrder] = useState(() => ({
    sourceKey: cardsKey(cards),
    ids: createSessionOrder(cards),
  }));
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);
  const sourceKey = useMemo(() => cardsKey(cards), [cards]);
  const sessionOrderIds = useMemo(() => {
    if (sessionOrder.sourceKey === sourceKey) return sessionOrder.ids;
    return createSessionOrder(orderCards(cards, sessionOrder.ids));
  }, [cards, sessionOrder.ids, sessionOrder.sourceKey, sourceKey]);

  const orderedCards = useMemo(
    () => orderCards(cards, sessionOrderIds),
    [cards, sessionOrderIds],
  );
  const orderedCardIds = useMemo(
    () => createSessionOrder(orderedCards),
    [orderedCards],
  );
  const activeCardId = resolveActiveCardId(orderedCards, selectedCardId);
  const contextKey = `personal-study:${orderedCardIds.map(cardKey).join("|")}`;

  const handleActiveCardChange = useCallback((cardId) => {
    setSelectedCardId(cardId);
  }, []);

  const handleShuffle = useCallback(
    (controls) => {
      const sourceCards = controls?.orderedCards?.length
        ? controls.orderedCards
        : orderedCards;
      if (sourceCards.length <= 1) return;
      const nextCards = shuffledSessionCards(sourceCards);
      const nextIds = createSessionOrder(nextCards);
      setSessionOrder({ sourceKey, ids: nextIds });
      setSelectedCardId(nextIds[0] ?? null);
      controls?.setFlipped?.(false);
    },
    [orderedCards, sourceKey],
  );

  return (
    <section
      className="personal-flashcard-study-player"
      aria-label="Flashcard study player"
    >
      <FlashcardPreview
        key={cardKey(activeCardId)}
        cards={orderedCards}
        activeCardId={activeCardId}
        orderedCardIds={orderedCardIds}
        onActiveCardChange={handleActiveCardChange}
        emptyMessage="Add cards to this set before starting a study session."
        className="flashcard-study-preview"
        suppressGenericGeneratedExplanation={false}
        renderControls={(controls) => (
          <PersonalStudyControls
            controls={controls}
            keyboardEnabled={!isFocusModeOpen}
            onOpenFocus={() => setIsFocusModeOpen(true)}
            onShuffle={handleShuffle}
          />
        )}
      />

      <FlashcardStudyCardList
        cards={orderedCards}
        activeCardId={activeCardId}
        onSelect={handleActiveCardChange}
        contextKey={contextKey}
      />

      {isFocusModeOpen && (
        <FlashcardStudyFocusMode
          title={title || "Flashcards"}
          cards={orderedCards}
          activeCardId={activeCardId}
          orderedCardIds={orderedCardIds}
          onActiveCardChange={handleActiveCardChange}
          onClose={() => setIsFocusModeOpen(false)}
          emptyMessage="Add cards to this set before starting a study session."
          suppressGenericGeneratedExplanation={false}
          renderControls={(controls) => (
            <PersonalFocusControls
              controls={controls}
              onClose={() => setIsFocusModeOpen(false)}
              onShuffle={handleShuffle}
            />
          )}
        />
      )}
    </section>
  );
}
