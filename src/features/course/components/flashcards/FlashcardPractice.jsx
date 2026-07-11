import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FlipHorizontal2,
  Maximize2,
  RefreshCw,
  Shuffle,
  X,
} from "lucide-react";
import { flashcardService } from "@/services/flashcard.service";
import { useToast } from "@/shared/components/ui";
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

const AUTO_LEARNING_PROGRESS = {
  learningStatus: "still_learning",
  lastReviewResult: "still_learning",
};

const BACKGROUND_SAVE_CONCURRENCY = 5;

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

function filterLabel(selectedFilter) {
  return (
    FILTERS.find((filter) => filter.key === selectedFilter)?.label || "All"
  );
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

function applyProgressToMultipleCards(cards, progressByCardKey) {
  return cards.map((card) => {
    const savedProgress = progressByCardKey.get(cardKey(card.id));
    if (!savedProgress) return card;

    return {
      ...card,
      progress: {
        ...(card.progress || {}),
        ...omitUndefinedValues(savedProgress),
      },
    };
  });
}

function applyAutoSavedProgressToCards(cards, progressByCardKey) {
  return cards.map((card) => {
    const savedProgress = progressByCardKey.get(cardKey(card.id));
    if (!savedProgress || progressStatus(card) === "known") return card;

    return {
      ...card,
      progress: {
        ...(card.progress || {}),
        ...omitUndefinedValues(savedProgress),
      },
    };
  });
}

async function settleWithConcurrency(items, limit, task) {
  if (!items.length) return [];

  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(limit, items.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;

      try {
        results[index] = {
          status: "fulfilled",
          value: await task(items[index], index),
        };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  });

  await Promise.all(workers);
  return results;
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

  for (
    let index = previousIndex + 1;
    index < previousQueue.length;
    index += 1
  ) {
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

function isTypingShortcutTarget(target) {
  if (!(target instanceof Element)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select"
  );
}

function FlashcardPracticeControls({
  controls,
  showFocusButton,
  onOpenFocusMode,
}) {
  return (
    <div className="flashcard-preview__controls flashcard-practice__controls">
      <button
        type="button"
        className="flashcard-btn"
        onClick={controls.goPrevious}
        disabled={!controls.canGoPrevious}
      >
        <ChevronLeft size={16} />
        Previous
      </button>
      <span className="flashcard-preview__counter">
        {controls.index + 1} / {controls.cardCount}
      </span>
      <button
        type="button"
        className="flashcard-btn"
        onClick={controls.goNext}
        disabled={!controls.canGoNext}
      >
        Next
        <ChevronRight size={16} />
      </button>
      <button
        type="button"
        className="flashcard-btn"
        onClick={controls.shuffle}
      >
        <Shuffle size={16} />
        Shuffle
      </button>
      {showFocusButton && (
        <button
          type="button"
          className="flashcard-btn flashcard-btn--primary"
          onClick={onOpenFocusMode}
        >
          <Maximize2 size={16} />
          Focus mode
        </button>
      )}
    </div>
  );
}

function FlashcardReviewActions({
  card,
  readOnly,
  submittingCardId,
  onSubmitProgress,
  className = "",
}) {
  if (!card) return null;

  const status = progressStatus(card);
  const isSubmitting = cardKey(submittingCardId) === cardKey(card.id);

  return (
    <div
      className={["flashcard-practice__review", className]
        .filter(Boolean)
        .join(" ")}
    >
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
            onClick={() => onSubmitProgress(card, "still_learning")}
          >
            <Clock3 size={16} />
            Still learning
          </button>
          <button
            type="button"
            className="flashcard-btn flashcard-btn--success"
            disabled={isSubmitting}
            onClick={() => onSubmitProgress(card, "known")}
          >
            <CheckCircle2 size={16} />
            Know
          </button>
        </div>
      )}
    </div>
  );
}

function FlashcardFocusControls({
  controls,
  readOnly,
  submittingCardId,
  onClose,
  onSubmitProgress,
}) {
  const isSubmitting = cardKey(submittingCardId) === cardKey(controls.card?.id);
  const canSubmitProgress =
    Boolean(controls.card) && !readOnly && !isSubmitting;

  const submitStillLearning = useCallback(() => {
    if (!canSubmitProgress) return;
    void onSubmitProgress(controls.card, "still_learning");
  }, [canSubmitProgress, controls.card, onSubmitProgress]);

  const submitKnown = useCallback(() => {
    if (!canSubmitProgress) return;
    void onSubmitProgress(controls.card, "known");
  }, [canSubmitProgress, controls.card, onSubmitProgress]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (isTypingShortcutTarget(event.target)) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (controls.canGoNext) controls.goNext();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (controls.canGoPrevious) controls.goPrevious();
        return;
      }

      if (
        event.key === " " ||
        event.key === "Enter" ||
        event.key === "Spacebar"
      ) {
        event.preventDefault();
        controls.flipCard();
        return;
      }

      if (event.key === "1") {
        event.preventDefault();
        if (!event.repeat) submitStillLearning();
        return;
      }

      if (event.key === "2") {
        event.preventDefault();
        if (!event.repeat) submitKnown();
        return;
      }

      if (event.key === "Escape" || event.key === "Esc") {
        event.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [controls, onClose, submitKnown, submitStillLearning]);

  return (
    <div className="flashcard-preview__controls flashcard-focus-mode__controls">
      <button
        type="button"
        className="flashcard-btn"
        onClick={controls.goPrevious}
        disabled={!controls.canGoPrevious}
      >
        <ChevronLeft size={16} />
        Previous
      </button>
      <span className="flashcard-preview__counter flashcard-focus-mode__counter">
        {controls.index + 1} / {controls.cardCount}
      </span>
      <button
        type="button"
        className="flashcard-btn"
        onClick={controls.goNext}
        disabled={!controls.canGoNext}
      >
        Next
        <ChevronRight size={16} />
      </button>
      <button
        type="button"
        className="flashcard-btn"
        onClick={controls.flipCard}
      >
        <FlipHorizontal2 size={16} />
        Flip card
      </button>
      <button
        type="button"
        className="flashcard-btn"
        onClick={controls.shuffle}
      >
        <Shuffle size={16} />
        Shuffle
      </button>
      <button type="button" className="flashcard-btn" onClick={onClose}>
        <X size={16} />
        Exit focus mode
      </button>
    </div>
  );
}

function FlashcardFocusMode({
  title,
  selectedFilter,
  cards,
  activeCardId,
  orderedCardIds,
  readOnly,
  submittingCardId,
  onActiveCardChange,
  onAdvancePastEnd,
  onClose,
  onShuffle,
  onSubmitProgress,
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
            <p>{filterLabel(selectedFilter)}</p>
          </div>
          <button
            type="button"
            className="flashcard-btn flashcard-btn--icon flashcard-focus-mode__close"
            onClick={onClose}
            aria-label="Exit focus mode"
          >
            <X size={18} />
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
            emptyMessage={filterEmptyMessage(selectedFilter)}
            className="flashcard-preview--focus"
            renderControls={(controls) => (
              <FlashcardFocusControls
                controls={controls}
                readOnly={readOnly}
                submittingCardId={submittingCardId}
                onClose={onClose}
                onSubmitProgress={onSubmitProgress}
              />
            )}
            renderActions={({ card }) => (
              <FlashcardReviewActions
                card={card}
                readOnly={readOnly}
                submittingCardId={submittingCardId}
                onSubmitProgress={onSubmitProgress}
                className="flashcard-focus-mode__review"
              />
            )}
          />
        </div>
      </section>
    </div>
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
  classId,
  setId,
  adminMode = false,
  readOnly = false,
  onCompleted,
}) {
  const toast = useToast();
  const [flashcardSet, setFlashcardSet] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [activeCardId, setActiveCardId] = useState(null);
  const [lastActiveCardByFilter, setLastActiveCardByFilter] = useState({});
  const [orderedIdsByFilter, setOrderedIdsByFilter] = useState({});
  const [loading, setLoading] = useState(true);
  const [submittingCardId, setSubmittingCardId] = useState(null);
  const [backgroundSavingCount, setBackgroundSavingCount] = useState(0);
  const [error, setError] = useState(null);
  const [completionNotified, setCompletionNotified] = useState(false);
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);

  const cardsRef = useRef([]);
  const initializedSetKeyRef = useRef(null);
  const restoredSetKeyRef = useRef(null);
  const autoSubmittedCardIdsRef = useRef(new Set());
  const failedAutoSaveCardIdsRef = useRef(new Set());
  const seenCardIdsInAllPassRef = useRef(new Set());
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
        payload = await flashcardService.getLessonPractice(lessonId, classId);
      }
      const normalizedSet = normalizeSet(payload);
      setFlashcardSet(normalizedSet);
      cardsRef.current = normalizedSet.cards || [];
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load flashcards."));
    } finally {
      setLoading(false);
    }
  }, [adminMode, classId, lessonId, setId]);
  
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

  const resetSeenCardsInAllPass = useCallback(() => {
    seenCardIdsInAllPassRef.current = new Set();
  }, []);

  const markCardSeenInAllPass = useCallback((cardId, filterKey) => {
    if (filterKey !== "all" || cardId == null) return;
    seenCardIdsInAllPassRef.current.add(cardKey(cardId));
  }, []);

  const setActiveCardForFilter = useCallback(
    (cardId, filterKey = selectedFilter) => {
      if (cardId == null) return;
      markCardSeenInAllPass(cardId, filterKey);
      setActiveCardId(cardId);
      setLastActiveCardByFilter((currentActiveCards) => ({
        ...currentActiveCards,
        [filterKey]: cardId,
      }));
    },
    [markCardSeenInAllPass, selectedFilter],
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

  const persistAutoLearningProgress = useCallback(
    (cardsToSave) => {
      if (!cardsToSave.length) return;

      setBackgroundSavingCount(
        (currentCount) => currentCount + cardsToSave.length,
      );

      void settleWithConcurrency(
        cardsToSave,
        BACKGROUND_SAVE_CONCURRENCY,
        async (card) => {
          const response = await flashcardService.submitProgress(
            card.id,
            "still_learning",
          );

          return {
            cardId: card.id,
            savedProgress: normalizeProgressPayload(response, "still_learning"),
          };
        },
      )
        .then((results) => {
          const successfulProgressByCardKey = new Map();
          let failedCount = 0;

          results.forEach((result, index) => {
            const card = cardsToSave[index];
            const key = cardKey(card?.id);

            if (result.status === "fulfilled") {
              successfulProgressByCardKey.set(
                cardKey(result.value.cardId),
                result.value.savedProgress,
              );
              failedAutoSaveCardIdsRef.current.delete(
                cardKey(result.value.cardId),
              );
              return;
            }

            failedCount += 1;
            autoSubmittedCardIdsRef.current.delete(key);
            failedAutoSaveCardIdsRef.current.add(key);
          });

          if (successfulProgressByCardKey.size > 0) {
            const nextCards = applyAutoSavedProgressToCards(
              cardsRef.current,
              successfulProgressByCardKey,
            );
            cardsRef.current = nextCards;
            setFlashcardSet((currentSet) =>
              currentSet
                ? {
                    ...currentSet,
                    cards: applyAutoSavedProgressToCards(
                      currentSet.cards || [],
                      successfulProgressByCardKey,
                    ),
                  }
                : currentSet,
            );
          }

          if (failedCount > 0) {
            toast.warning(
              "Some flashcard progress could not be saved. Refresh after reconnecting to verify progress.",
              { duration: 5000 },
            );
          }
        })
        .finally(() => {
          setBackgroundSavingCount((currentCount) =>
            Math.max(0, currentCount - cardsToSave.length),
          );
        });
    },
    [toast],
  );

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
        seenCardIdsInAllPassRef.current.add(cardKey(triggerCardId));
        const cardsWithoutProgress = passCards.filter((card) => {
          const key = cardKey(card.id);
          const status = progressStatus(card);
          return (
            seenCardIdsInAllPassRef.current.has(key) &&
            (status === "new" ||
              (status === "still_learning" &&
                failedAutoSaveCardIdsRef.current.has(key))) &&
            !autoSubmittedCardIdsRef.current.has(key)
          );
        });

        const optimisticProgressByCardKey = new Map();
        for (const card of cardsWithoutProgress) {
          const key = cardKey(card.id);
          autoSubmittedCardIdsRef.current.add(key);
          optimisticProgressByCardKey.set(key, AUTO_LEARNING_PROGRESS);
        }

        const workingCards =
          optimisticProgressByCardKey.size > 0
            ? applyProgressToMultipleCards(
                passCards,
                optimisticProgressByCardKey,
              )
            : passCards;

        if (optimisticProgressByCardKey.size > 0) {
          cardsRef.current = workingCards;
          setFlashcardSet((currentSet) =>
            currentSet
              ? {
                  ...currentSet,
                  cards: applyProgressToMultipleCards(
                    currentSet.cards || [],
                    optimisticProgressByCardKey,
                  ),
                }
              : currentSet,
          );
          persistAutoLearningProgress(cardsWithoutProgress);
        }

        const nextQueues = buildQueues(workingCards);
        const learningCards = getQueueForFilter(
          nextQueues,
          "still_learning",
          orderedIdsByFilter,
        );
        let shouldResetSeenCards = true;

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
          setActiveCardForFilter(shuffledLearningCards[0].id, "still_learning");
        } else {
          const knownCards = getQueueForFilter(
            nextQueues,
            "known",
            orderedIdsByFilter,
          );
          const remainingAllCards = getQueueForFilter(
            nextQueues,
            "all",
            orderedIdsByFilter,
          );

          setOrderedIdsByFilter((currentOrders) => ({
            ...currentOrders,
            still_learning: [],
          }));

          if (knownCards.length > 0) {
            setSelectedFilter("known");
            setActiveCardForFilter(knownCards[0].id, "known");
          } else if (remainingAllCards.length > 0) {
            resetSeenCardsInAllPass();
            setSelectedFilter("all");
            setActiveCardForFilter(remainingAllCards[0].id, "all");
            shouldResetSeenCards = false;
          } else {
            setActiveCardId(null);
          }
        }

        if (shouldResetSeenCards) {
          resetSeenCardsInAllPass();
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
      persistAutoLearningProgress,
      resetSeenCardsInAllPass,
      setActiveCardForFilter,
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
    failedAutoSaveCardIdsRef.current = new Set();
    resetSeenCardsInAllPass();
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
  }, [
    cards,
    practiceSetKey,
    resetSeenCardsInAllPass,
    resumeReadStorageKeys,
    setActiveCardForFilter,
  ]);

  useEffect(() => {
    if (!cards.length) return;

    if (!currentQueue.length) {
      if (activeCardId != null) {
        setActiveCardId(null);
      }
      return;
    }

    if (activeCardId == null) {
      setActiveCardForFilter(currentQueue[0].id, selectedFilter);
      return;
    }

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

  const activeCardForCurrentFilter = useMemo(() => {
    if (!currentQueue.length) return null;
    return findCardById(currentQueue, activeCardId) || currentQueue[0];
  }, [activeCardId, currentQueue]);

  const activeCardIdForCurrentFilter = activeCardForCurrentFilter?.id ?? null;
  const canOpenFocusMode = !readOnly && currentQueue.length > 0;

  const openFocusMode = useCallback(() => {
    if (canOpenFocusMode) {
      setIsFocusModeOpen(true);
    }
  }, [canOpenFocusMode]);

  const closeFocusMode = useCallback(() => {
    setIsFocusModeOpen(false);
  }, []);

  const handleFilterChange = useCallback(
    (filterKey) => {
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

      if (filterKey === "all" && selectedFilter !== "all") {
        resetSeenCardsInAllPass();
      }

      setSelectedFilter(filterKey);
      if (nextCard) {
        setActiveCardForFilter(nextCard.id, filterKey);
      } else {
        setActiveCardId(null);
      }
    },
    [
      activeCardId,
      lastActiveCardByFilter,
      orderedIdsByFilter,
      queues,
      resetSeenCardsInAllPass,
      selectedFilter,
      setActiveCardForFilter,
    ],
  );

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

      markCardSeenInAllPass(card.id, selectedFilter);
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
            setIsFocusModeOpen(false);
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
      markCardSeenInAllPass,
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
            {backgroundSavingCount > 0 && (
              <>
                <RefreshCw size={13} className="flashcard-spin-icon" />
                Saving progress...
              </>
            )}
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
        activeCardId={activeCardIdForCurrentFilter}
        orderedCardIds={currentQueueIds}
        onActiveCardChange={handleActiveCardChange}
        onAdvancePastEnd={
          selectedFilter === "all" ? handleAdvancePastEnd : undefined
        }
        onShuffle={handleShuffle}
        emptyMessage={filterEmptyMessage(selectedFilter)}
        renderControls={
          !readOnly
            ? (controls) => (
                <FlashcardPracticeControls
                  controls={controls}
                  showFocusButton={canOpenFocusMode}
                  onOpenFocusMode={openFocusMode}
                />
              )
            : undefined
        }
        renderActions={({ card }) => (
          <FlashcardReviewActions
            card={card}
            readOnly={readOnly}
            submittingCardId={submittingCardId}
            onSubmitProgress={handleSubmitProgress}
          />
        )}
      />

      <FlashcardCompactList
        cards={currentQueue}
        activeCardId={activeCardIdForCurrentFilter}
        onSelect={handleActiveCardChange}
      />

      {isFocusModeOpen && (
        <FlashcardFocusMode
          title={flashcardSet?.title || "Flashcards"}
          selectedFilter={selectedFilter}
          cards={currentQueue}
          activeCardId={activeCardIdForCurrentFilter}
          orderedCardIds={currentQueueIds}
          readOnly={readOnly}
          submittingCardId={submittingCardId}
          onActiveCardChange={handleActiveCardChange}
          onAdvancePastEnd={
            selectedFilter === "all" ? handleAdvancePastEnd : undefined
          }
          onClose={closeFocusMode}
          onShuffle={handleShuffle}
          onSubmitProgress={handleSubmitProgress}
        />
      )}
    </div>
  );
}
