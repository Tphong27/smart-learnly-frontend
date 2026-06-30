import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brain, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import { flashcardService } from "@/services/flashcard.service";
import { FlashcardPreview, shuffleCards } from "./FlashcardPreview";
import { getErrorMessage, normalizeSet } from "./flashcard-utils";
import "./Flashcards.css";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "new", label: "Not studied" },
  { key: "still_learning", label: "Learning" },
  { key: "known", label: "Known" },
];

const STATUS_META = {
  new: { label: "Not studied" },
  still_learning: { label: "Learning" },
  known: { label: "Known" },
};

function cardKey(id) {
  return id == null ? "" : String(id);
}

function normalizeLearningStatus(value) {
  const status = String(value || "").toLowerCase();
  if (status === "known") return "known";
  if (status === "learning" || status === "still_learning") {
    return "still_learning";
  }
  return "new";
}

function progressStatus(card) {
  const candidates = [
    card?.progress?.learningStatus,
    card?.learningStatus,
    card?.progressStatus,
    card?.progress?.lastReviewResult,
    card?.lastReviewResult,
    card?.progress?.status,
    card?.status,
  ];

  for (const candidate of candidates) {
    const status = String(candidate || "").toLowerCase();
    if (status === "known") return "known";
    if (status === "learning" || status === "still_learning") {
      return "still_learning";
    }
    if (status === "new" || status === "not_studied") return "new";
  }

  return "new";
}

function progressLabel(cards) {
  const knownCount = cards.filter(
    (card) => progressStatus(card) === "known",
  ).length;
  return `${knownCount}/${cards.length} known`;
}

function filterEmptyMessage(selectedFilter) {
  if (selectedFilter === "all") {
    return "No flashcards are available for this lesson.";
  }
  const label = STATUS_META[selectedFilter]?.label.toLowerCase() || "matching";
  return `No ${label} cards in this set.`;
}

function buildQueues(cards) {
  return {
    all: cards,
    new: cards.filter((card) => progressStatus(card) === "new"),
    still_learning: cards.filter(
      (card) => progressStatus(card) === "still_learning",
    ),
    known: cards.filter((card) => progressStatus(card) === "known"),
  };
}

function orderCardsByIds(cards, orderedIds) {
  if (!orderedIds?.length) return cards;

  const cardById = new Map(cards.map((card) => [cardKey(card.id), card]));
  const orderedCards = orderedIds
    .map((id) => cardById.get(cardKey(id)))
    .filter(Boolean);
  const orderedCardIds = new Set(orderedCards.map((card) => cardKey(card.id)));

  return [
    ...orderedCards,
    ...cards.filter((card) => !orderedCardIds.has(cardKey(card.id))),
  ];
}

function getQueueForFilter(queues, selectedFilter, orderedIdsByFilter) {
  const queue = queues[selectedFilter] || queues.all;
  return orderCardsByIds(queue, orderedIdsByFilter[selectedFilter]);
}

function findCardById(cards, cardId) {
  const targetKey = cardKey(cardId);
  if (!targetKey) return null;
  return cards.find((card) => cardKey(card.id) === targetKey) || null;
}

function isFinalCardInQueue(cardId, queue) {
  if (!queue.length) return false;
  return cardKey(queue[queue.length - 1]?.id) === cardKey(cardId);
}

function getPracticeSetId(flashcardSet, explicitSetId, cards = []) {
  const firstCard = cards[0] || {};

  return (
    flashcardSet?.id ??
    flashcardSet?.setId ??
    flashcardSet?.flashcardSetId ??
    flashcardSet?.flashcard_set_id ??
    flashcardSet?.set?.id ??
    firstCard?.setId ??
    firstCard?.flashcardSetId ??
    firstCard?.flashcard_set_id ??
    firstCard?.set?.id ??
    explicitSetId ??
    null
  );
}

function resumeStorageKeyForSet(setId) {
  return setId == null ? null : `flashcard:lastActiveCard:${setId}`;
}

function normalizeProgressPayload(payload, fallbackResult) {
  const data = payload?.data ?? payload ?? {};
  return {
    learningStatus: normalizeLearningStatus(
      data.learningStatus ?? data.status ?? fallbackResult,
    ),
    lastReviewResult: data.lastReviewResult ?? data.result ?? fallbackResult,
    repetitions: data.repetitions,
    intervalDays: data.intervalDays,
    lastReviewedAt: data.lastReviewedAt,
    nextReviewAt: data.nextReviewAt,
  };
}

function omitUndefinedValues(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  );
}

function applyProgressToCards(cards, cardId, savedProgress) {
  const targetKey = cardKey(cardId);

  return cards.map((card) =>
    cardKey(card.id) === targetKey
      ? {
          ...card,
          progress: {
            ...(card.progress || {}),
            ...omitUndefinedValues(savedProgress),
          },
        }
      : card,
  );
}

function findNextCardAfterAction(cardId, previousQueue, nextQueue) {
  const previousIndex = previousQueue.findIndex(
    (card) => cardKey(card.id) === cardKey(cardId),
  );

  if (previousIndex < 0 || previousIndex >= previousQueue.length - 1) {
    return null;
  }

  const nextCardsById = new Map(
    nextQueue.map((card) => [cardKey(card.id), card]),
  );

  for (let index = previousIndex + 1; index < previousQueue.length; index += 1) {
    const nextCard = nextCardsById.get(cardKey(previousQueue[index].id));
    if (nextCard) return nextCard;
  }

  return null;
}

function readStoredCardId(storageKey) {
  if (!storageKey || typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function readFirstStoredCardId(storageKeys) {
  for (const storageKey of storageKeys) {
    const storedCardId = readStoredCardId(storageKey);
    if (storedCardId) return storedCardId;
  }
  return null;
}

function writeStoredCardId(storageKey, cardId) {
  if (!storageKey || cardId == null || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, String(cardId));
  } catch {
    // Resume is best-effort; practice should continue when storage is blocked.
  }
}

function writeStoredCardIds(storageKeys, cardId) {
  storageKeys.forEach((storageKey) => writeStoredCardId(storageKey, cardId));
}

function getResumeCardId(cards, savedCardId) {
  return (
    findCardById(cards, savedCardId)?.id ??
    cards.find((card) => progressStatus(card) === "still_learning")?.id ??
    cards.find((card) => progressStatus(card) === "new")?.id ??
    cards[0]?.id ??
    null
  );
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

function FlashcardCompactList({ cards, activeCardId, onSelect }) {
  if (!cards.length) return null;

  const activeKey = cardKey(activeCardId);

  return (
    <div className="flashcard-compact">
      <div className="flashcard-compact__header">
        <h3>Cards</h3>
        <span>
          {cards.length} card{cards.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flashcard-compact-list">
        {cards.map((card, index) => {
          const status = progressStatus(card);
          const isActive = cardKey(card.id) === activeKey;

          return (
            <button
              key={card.id}
              type="button"
              className={`flashcard-compact-item ${
                isActive ? "is-active" : ""
              }`}
              onClick={() => onSelect(card.id)}
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
              <span
                className={`flashcard-progress-badge flashcard-progress-badge--${status}`}
              >
                {STATUS_META[status].label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FlashcardPractice({
  lessonId,
  setId,
  adminMode = false,
  readOnly = false,
  onCompleted,
}) {
  const [flashcardSet, setFlashcardSet] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [activeCardId, setActiveCardId] = useState(null);
  const [lastActiveCardByFilter, setLastActiveCardByFilter] = useState({});
  const [orderedIdsByFilter, setOrderedIdsByFilter] = useState({});
  const [loading, setLoading] = useState(true);
  const [submittingCardId, setSubmittingCardId] = useState(null);
  const [error, setError] = useState(null);
  const [completionNotified, setCompletionNotified] = useState(false);

  const cardsRef = useRef([]);
  const initializedSetKeyRef = useRef(null);
  const restoredSetKeyRef = useRef(null);
  const autoSubmittedCardIdsRef = useRef(new Set());
  const passCompletionRunningRef = useRef(false);

  const loadPractice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let payload;
      if (adminMode && lessonId) {
        payload = await flashcardService.getAdminSetByLesson(lessonId);
      } else if (setId) {
        payload = await flashcardService.getSetPractice(setId);
      } else {
        payload = await flashcardService.getLessonPractice(lessonId);
      }
      const normalizedSet = normalizeSet(payload);
      setFlashcardSet(normalizedSet);
      cardsRef.current = normalizedSet.cards || [];
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load flashcards."));
    } finally {
      setLoading(false);
    }
  }, [adminMode, lessonId, setId]);

  useEffect(() => {
    if (lessonId || setId) {
      loadPractice();
    }
  }, [lessonId, loadPractice, setId]);

  const cards = useMemo(() => flashcardSet?.cards || [], [flashcardSet?.cards]);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  const practiceSetKey = getPracticeSetId(flashcardSet, setId, cards);
  const resumeStorageKey = resumeStorageKeyForSet(practiceSetKey);
  const legacyLessonResumeStorageKey =
    lessonId == null ? null : resumeStorageKeyForSet(lessonId);
  const resumeWriteStorageKeys = useMemo(
    () => [resumeStorageKey || legacyLessonResumeStorageKey].filter(Boolean),
    [legacyLessonResumeStorageKey, resumeStorageKey],
  );
  const resumeReadStorageKeys = useMemo(
    () =>
      [resumeStorageKey, legacyLessonResumeStorageKey].filter(
        (storageKey, index, storageKeys) =>
          storageKey && storageKeys.indexOf(storageKey) === index,
      ),
    [legacyLessonResumeStorageKey, resumeStorageKey],
  );

  const queues = useMemo(() => buildQueues(cards), [cards]);

  const currentQueue = useMemo(
    () => getQueueForFilter(queues, selectedFilter, orderedIdsByFilter),
    [orderedIdsByFilter, queues, selectedFilter],
  );

  const currentQueueIds = useMemo(
    () => currentQueue.map((card) => card.id),
    [currentQueue],
  );

  useEffect(() => {
    const setKey = practiceSetKey == null ? null : String(practiceSetKey);
    const activeCardIsValid = Boolean(findCardById(cards, activeCardId));

    if (
      activeCardId != null &&
      resumeWriteStorageKeys.length > 0 &&
      setKey &&
      restoredSetKeyRef.current === setKey &&
      activeCardIsValid
    ) {
      writeStoredCardIds(resumeWriteStorageKeys, activeCardId);
    }
  }, [activeCardId, cards, practiceSetKey, resumeWriteStorageKeys]);

  const setActiveCardForFilter = useCallback(
    (cardId, filterKey = selectedFilter) => {
      if (cardId == null) return;
      setActiveCardId(cardId);
      setLastActiveCardByFilter((currentActiveCards) => ({
        ...currentActiveCards,
        [filterKey]: cardId,
      }));
    },
    [selectedFilter],
  );

  const submitProgressForCard = useCallback(async (card, result) => {
    const response = await flashcardService.submitProgress(card.id, result);
    const savedProgress = normalizeProgressPayload(response, result);
    const nextCards = applyProgressToCards(
      cardsRef.current,
      card.id,
      savedProgress,
    );

    cardsRef.current = nextCards;
    setFlashcardSet((currentSet) =>
      currentSet
        ? {
            ...currentSet,
            cards: applyProgressToCards(
              currentSet.cards || [],
              card.id,
              savedProgress,
            ),
          }
        : currentSet,
    );

    return nextCards;
  }, []);

  const completeAllPass = useCallback(
    async (triggerCardId, sourceCards, allQueueAtTrigger) => {
      const passCards = sourceCards?.length ? sourceCards : cardsRef.current;
      const allQueue = allQueueAtTrigger?.length
        ? allQueueAtTrigger
        : getQueueForFilter(buildQueues(passCards), "all", orderedIdsByFilter);

      if (
        readOnly ||
        !allQueue.length ||
        passCompletionRunningRef.current ||
        !isFinalCardInQueue(triggerCardId, allQueue)
      ) {
        return false;
      }

      passCompletionRunningRef.current = true;

      try {
        let workingCards = passCards;
        const cardsWithoutProgress = workingCards.filter((card) => {
          const key = cardKey(card.id);
          return (
            progressStatus(card) === "new" &&
            !autoSubmittedCardIdsRef.current.has(key)
          );
        });

        for (const card of cardsWithoutProgress) {
          autoSubmittedCardIdsRef.current.add(cardKey(card.id));
          workingCards = await submitProgressForCard(card, "still_learning");
        }

        const learningCards = workingCards.filter(
          (card) => progressStatus(card) === "still_learning",
        );

        if (learningCards.length > 0) {
          const shuffledLearningCards = shuffleCards(learningCards);
          const shuffledLearningIds = shuffledLearningCards.map(
            (card) => card.id,
          );

          setOrderedIdsByFilter((currentOrders) => ({
            ...currentOrders,
            still_learning: shuffledLearningIds,
          }));
          setSelectedFilter("still_learning");
          setActiveCardForFilter(
            shuffledLearningCards[0].id,
            "still_learning",
          );
        } else {
          setOrderedIdsByFilter((currentOrders) => ({
            ...currentOrders,
            still_learning: [],
          }));
        }

        return true;
      } catch (completionError) {
        setError(
          getErrorMessage(
            completionError,
            "Failed to prepare the flashcard review round.",
          ),
        );
        return false;
      } finally {
        passCompletionRunningRef.current = false;
      }
    },
    [
      orderedIdsByFilter,
      readOnly,
      setActiveCardForFilter,
      submitProgressForCard,
    ],
  );

  useEffect(() => {
    if (!cards.length) {
      setActiveCardId(null);
      return;
    }

    if (!practiceSetKey) return;

    const setKey = String(practiceSetKey);
    if (initializedSetKeyRef.current === setKey) return;

    initializedSetKeyRef.current = setKey;
    restoredSetKeyRef.current = null;
    autoSubmittedCardIdsRef.current = new Set();
    passCompletionRunningRef.current = false;
    setSelectedFilter("all");
    setLastActiveCardByFilter({});
    setOrderedIdsByFilter({});
    setCompletionNotified(false);

    const storedCardId = readFirstStoredCardId(resumeReadStorageKeys);
    const initialCardId = getResumeCardId(cards, storedCardId);

    if (initialCardId != null) {
      setActiveCardForFilter(initialCardId, "all");
    }
    restoredSetKeyRef.current = setKey;
  }, [cards, practiceSetKey, resumeReadStorageKeys, setActiveCardForFilter]);

  useEffect(() => {
    if (!cards.length) return;

    if (!currentQueue.length) {
      if (activeCardId != null) {
        setActiveCardId(null);
      }
      return;
    }

    if (activeCardId == null) return;

    if (!findCardById(currentQueue, activeCardId)) {
      const rememberedCard = findCardById(
        currentQueue,
        lastActiveCardByFilter[selectedFilter],
      );
      const nextCard = rememberedCard || currentQueue[0];
      setActiveCardForFilter(nextCard.id, selectedFilter);
    }
  }, [
    activeCardId,
    cards.length,
    currentQueue,
    lastActiveCardByFilter,
    selectedFilter,
    setActiveCardForFilter,
  ]);

  useEffect(() => {
    const learningIds = new Set(
      queues.still_learning.map((card) => cardKey(card.id)),
    );

    setOrderedIdsByFilter((currentOrders) => {
      const learningOrder = currentOrders.still_learning || [];
      const nextLearningOrder = learningOrder.filter((id) =>
        learningIds.has(cardKey(id)),
      );

      if (nextLearningOrder.length === learningOrder.length) {
        return currentOrders;
      }

      return {
        ...currentOrders,
        still_learning: nextLearningOrder,
      };
    });
  }, [queues.still_learning]);

  const allCardsKnown = useMemo(() => {
    return (
      cards.length > 0 &&
      cards.every((card) => progressStatus(card) === "known")
    );
  }, [cards]);

  useEffect(() => {
    if (readOnly || !lessonId || completionNotified || !allCardsKnown) return;

    setCompletionNotified(true);
    onCompleted?.(lessonId);
  }, [allCardsKnown, completionNotified, lessonId, onCompleted, readOnly]);

  const progressCounts = useMemo(
    () => ({
      all: queues.all.length,
      new: queues.new.length,
      still_learning: queues.still_learning.length,
      known: queues.known.length,
    }),
    [queues],
  );

  const handleFilterChange = useCallback((filterKey) => {
    const targetQueue = getQueueForFilter(
      queues,
      filterKey,
      orderedIdsByFilter,
    );
    const rememberedCard = findCardById(
      targetQueue,
      lastActiveCardByFilter[filterKey],
    );
    const currentCard = findCardById(targetQueue, activeCardId);
    const nextCard = rememberedCard || currentCard || targetQueue[0] || null;

    setSelectedFilter(filterKey);
    if (nextCard) {
      setActiveCardForFilter(nextCard.id, filterKey);
    } else {
      setActiveCardId(null);
    }
  }, [
    activeCardId,
    lastActiveCardByFilter,
    orderedIdsByFilter,
    queues,
    setActiveCardForFilter,
  ]);

  const handleShuffle = useCallback(
    (shuffledIds) => {
      setOrderedIdsByFilter((currentOrders) => ({
        ...currentOrders,
        [selectedFilter]: shuffledIds,
      }));
    },
    [selectedFilter],
  );

  const handleActiveCardChange = useCallback(
    (cardId) => {
      setActiveCardForFilter(cardId);
    },
    [setActiveCardForFilter],
  );

  const handleAdvancePastEnd = useCallback(
    (card, orderedCards) => {
      if (selectedFilter !== "all" || card?.id == null) return;
      void completeAllPass(card.id, cardsRef.current, orderedCards);
    },
    [completeAllPass, selectedFilter],
  );

  const handleSubmitProgress = useCallback(
    async (card, result) => {
      if (card?.id == null || readOnly) return;

      const previousQueue = currentQueue;
      const wasFinalAllCard =
        selectedFilter === "all" && isFinalCardInQueue(card.id, previousQueue);

      setSubmittingCardId(card.id);
      setError(null);

      try {
        const nextCards = await submitProgressForCard(card, result);
        const completedPass = wasFinalAllCard
          ? await completeAllPass(card.id, nextCards, previousQueue)
          : false;

        if (completedPass) return;

        const nextQueues = buildQueues(nextCards);
        const nextQueue = getQueueForFilter(
          nextQueues,
          selectedFilter,
          orderedIdsByFilter,
        );
        const nextCard = findNextCardAfterAction(
          card.id,
          previousQueue,
          nextQueue,
        );

        if (nextCard) {
          setActiveCardForFilter(nextCard.id, selectedFilter);
        } else {
          const currentCardAfterUpdate = findCardById(nextQueue, card.id);
          const stableCard =
            currentCardAfterUpdate || nextQueue[nextQueue.length - 1] || null;

          if (stableCard) {
            setActiveCardForFilter(stableCard.id, selectedFilter);
          } else {
            setActiveCardId(null);
          }
        }
      } catch (submitError) {
        setError(
          getErrorMessage(submitError, "Failed to save flashcard progress."),
        );
      } finally {
        setSubmittingCardId(null);
      }
    },
    [
      completeAllPass,
      currentQueue,
      orderedIdsByFilter,
      readOnly,
      selectedFilter,
      setActiveCardForFilter,
      submitProgressForCard,
    ],
  );

  if (loading) {
    return (
      <div className="flashcard-practice__loading">
        <span className="flashcard-spinner" />
        Loading flashcards...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flashcard-practice__error">
        <span>{error}</span>
        <button type="button" className="flashcard-btn" onClick={loadPractice}>
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flashcard-practice">
      <div className="flashcard-practice__header">
        <div>
          <h2 className="flashcard-practice__title">
            {flashcardSet?.title || "Flashcards"}
          </h2>
          {flashcardSet?.description && (
            <p className="flashcard-practice__description">
              {flashcardSet.description}
            </p>
          )}
        </div>
        {cards.length > 0 && (
          <span className="flashcard-practice__status">
            <Brain size={14} />
            {progressLabel(cards)}
          </span>
        )}
      </div>

      {cards.length > 0 && (
        <div
          className="flashcard-practice__filters"
          aria-label="Filter flashcards by progress"
        >
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`flashcard-practice__filter ${
                selectedFilter === filter.key ? "is-active" : ""
              }`}
              onClick={() => handleFilterChange(filter.key)}
            >
              {filter.label}
              <span>{progressCounts[filter.key]}</span>
            </button>
          ))}
        </div>
      )}

      <FlashcardPreview
        cards={currentQueue}
        activeCardId={activeCardId}
        orderedCardIds={currentQueueIds}
        onActiveCardChange={handleActiveCardChange}
        onAdvancePastEnd={
          selectedFilter === "all" ? handleAdvancePastEnd : undefined
        }
        onShuffle={handleShuffle}
        emptyMessage={filterEmptyMessage(selectedFilter)}
        renderActions={({ card }) => {
          if (!card) return null;
          const status = progressStatus(card);
          const isSubmitting =
            cardKey(submittingCardId) === cardKey(card.id);

          return (
            <div className="flashcard-practice__review">
              <span
                className={`flashcard-progress-badge flashcard-progress-badge--${status}`}
              >
                {STATUS_META[status].label}
              </span>
              {!readOnly && (
                <div className="flashcard-practice__results">
                  <button
                    type="button"
                    className="flashcard-btn flashcard-btn--warning"
                    disabled={isSubmitting}
                    onClick={() => handleSubmitProgress(card, "still_learning")}
                  >
                    <Clock3 size={16} />
                    Still learning
                  </button>
                  <button
                    type="button"
                    className="flashcard-btn flashcard-btn--success"
                    disabled={isSubmitting}
                    onClick={() => handleSubmitProgress(card, "known")}
                  >
                    <CheckCircle2 size={16} />
                    Know
                  </button>
                </div>
              )}
            </div>
          );
        }}
      />

      <FlashcardCompactList
        cards={currentQueue}
        activeCardId={activeCardId}
        onSelect={handleActiveCardChange}
      />
    </div>
  );
}
