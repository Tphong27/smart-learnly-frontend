/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Maximize2,
  Minimize2,
  RefreshCw,
  Shuffle,
} from "lucide-react";
import { flashcardService } from "@/services/flashcard.service";
import {
  FlashcardStudyCardList,
  FlashcardStudyControls,
} from "@/features/flashcards-shared";
import { FlashcardPreview } from "./FlashcardPreview";
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

const TRACK_PROGRESS_STORAGE_PREFIX = "smartLearnly:flashcards:trackProgress";
const CARD_POSITION_STORAGE_PREFIX = "smartLearnly:flashcards:lastCard";

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

function cardPositionStorageKey({ userKey, courseId, lessonId, setId }) {
  if (!userKey || !courseId || !setId) return null;
  const lessonPart = lessonId == null ? "lesson:none" : `lesson:${lessonId}`;
  return `${CARD_POSITION_STORAGE_PREFIX}:${userKey}:${courseId}:${lessonPart}:set:${setId}`;
}

function trackProgressStorageKey(userKey) {
  return userKey ? `${TRACK_PROGRESS_STORAGE_PREFIX}:${userKey}` : null;
}

function readStoredTrackProgress(storageKey) {
  if (!storageKey || typeof window === "undefined") return true;

  try {
    const storedValue = window.localStorage.getItem(storageKey);
    if (storedValue == null) return true;
    return storedValue !== "false";
  } catch {
    return true;
  }
}

function writeStoredTrackProgress(storageKey, enabled) {
  if (!storageKey || typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, enabled ? "true" : "false");
  } catch {
    // Preference storage is best-effort.
  }
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
  return findCardById(cards, savedCardId)?.id ?? cards[0]?.id ?? null;
}

function isTypingShortcutTarget(target) {
  if (!(target instanceof Element)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    Boolean(target.closest("[contenteditable]")) ||
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    tagName === "button" ||
    Boolean(target.closest("button"))
  );
}

function lockedStudyControls(controls, locked) {
  if (!locked) return controls;

  return {
    ...controls,
    canGoPrevious: false,
    canGoNext: false,
    goPrevious: () => {},
    goNext: () => {},
    shuffle: () => {},
  };
}

function FlashcardReviewActions({
  card,
  trackProgress,
  submittingCardId,
  onSubmitProgress,
  className = "",
}) {
  if (!card || !trackProgress) return null;

  const status = progressStatus(card);
  const isSubmitting = submittingCardId != null;

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
    </div>
  );
}

function FlashcardTrackProgressToggle({ checked, onChange }) {
  return (
    <label className="flashcard-practice__track-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>Track progress</span>
    </label>
  );
}

function useKeyboardControlsRegistration({
  controls,
  enabled,
  scope,
  onKeyboardControlsChange,
}) {
  useEffect(() => {
    if (!enabled) return undefined;

    onKeyboardControlsChange(scope, controls);
    return () => onKeyboardControlsChange(scope, null);
  }, [controls, enabled, onKeyboardControlsChange, scope]);
}

function FlashcardPracticeControls({
  controls,
  canOpenFocusMode,
  keyboardEnabled,
  navigationLocked,
  onOpenFocusMode,
  onKeyboardControlsChange,
}) {
  const resolvedControls = lockedStudyControls(controls, navigationLocked);

  useKeyboardControlsRegistration({
    controls: resolvedControls,
    enabled: keyboardEnabled,
    scope: "normal",
    onKeyboardControlsChange,
  });

  return (
    <FlashcardStudyControls
      controls={resolvedControls}
      className="flashcard-practice__controls"
      auxiliaryAction={{
        icon: <Shuffle size={16} />,
        label: "Shuffle",
        onClick: resolvedControls.shuffle,
        disabled: navigationLocked,
      }}
      trailingAction={
        canOpenFocusMode
          ? {
              ariaLabel: "Open focus mode",
              className: "flashcard-btn flashcard-btn--icon flashcard-focus-toggle",
              disabled: navigationLocked,
              icon: <Maximize2 size={16} />,
              onClick: navigationLocked ? undefined : onOpenFocusMode,
              title: "Open focus mode",
            }
          : null
      }
    />
  );
}

function FlashcardFocusControls({
  controls,
  navigationLocked,
  onKeyboardControlsChange,
}) {
  const resolvedControls = lockedStudyControls(controls, navigationLocked);

  useKeyboardControlsRegistration({
    controls: resolvedControls,
    enabled: true,
    scope: "focus",
    onKeyboardControlsChange,
  });

  return (
    <div className="flashcard-preview__controls flashcard-focus-mode__controls">
      <button
        type="button"
        className="flashcard-btn"
        onClick={resolvedControls.goPrevious}
        disabled={!resolvedControls.canGoPrevious}
      >
        <ChevronLeft size={16} />
        Previous
      </button>
      <span className="flashcard-preview__counter flashcard-focus-mode__counter">
        {resolvedControls.index + 1} / {resolvedControls.cardCount}
      </span>
      <button
        type="button"
        className="flashcard-btn"
        onClick={resolvedControls.goNext}
        disabled={!resolvedControls.canGoNext}
      >
        Next
        <ChevronRight size={16} />
      </button>
      <button
        type="button"
        className="flashcard-btn"
        onClick={resolvedControls.shuffle}
        disabled={navigationLocked}
      >
        <Shuffle size={16} />
        Shuffle
      </button>
    </div>
  );
}

function FlashcardFocusProgressCounts({ progressCounts }) {
  const learningCount = progressCounts?.still_learning ?? 0;
  const knownCount = progressCounts?.known ?? 0;

  return (
    <div
      className="flashcard-focus-mode__progress-counts"
      aria-label="Flashcard progress counts"
    >
      <div className="flashcard-focus-mode__progress-chip flashcard-focus-mode__progress-chip--learning">
        <Clock3 size={16} aria-hidden="true" />
        <span>Still learning</span>
        <strong>{learningCount}</strong>
      </div>
      <div className="flashcard-focus-mode__progress-chip flashcard-focus-mode__progress-chip--known">
        <CheckCircle2 size={16} aria-hidden="true" />
        <span>Known</span>
        <strong>{knownCount}</strong>
      </div>
    </div>
  );
}

function FlashcardFocusMode({
  title,
  selectedFilter,
  cards,
  activeCardId,
  orderedCardIds,
  progressCounts,
  trackingAvailable,
  trackProgress,
  submittingCardId,
  onActiveCardChange,
  onClose,
  onKeyboardControlsChange,
  onShuffle,
  onSubmitProgress,
  onTrackProgressChange,
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
          <div className="flashcard-focus-mode__header-actions">
            {trackingAvailable && (
              <FlashcardTrackProgressToggle
                checked={trackProgress}
                onChange={onTrackProgressChange}
              />
            )}
            <button
              type="button"
              className="flashcard-btn flashcard-btn--icon flashcard-focus-mode__close"
              onClick={onClose}
              aria-label="Exit focus mode"
              title="Exit focus mode"
            >
              <Minimize2 size={18} />
            </button>
          </div>
        </header>

        <div className="flashcard-focus-mode__body">
          <div className="flashcard-focus-mode__study">
            {trackProgress && (
              <FlashcardFocusProgressCounts progressCounts={progressCounts} />
            )}
            <FlashcardPreview
              cards={cards}
              activeCardId={activeCardId}
              orderedCardIds={orderedCardIds}
              onActiveCardChange={onActiveCardChange}
              onShuffle={onShuffle}
              emptyMessage={filterEmptyMessage(selectedFilter)}
              className="flashcard-preview--focus"
              renderControls={(controls) => (
                <FlashcardFocusControls
                  controls={controls}
                  navigationLocked={submittingCardId != null}
                  onKeyboardControlsChange={onKeyboardControlsChange}
                />
              )}
              renderActions={({ card }) => (
                <FlashcardReviewActions
                  card={card}
                  trackProgress={trackProgress}
                  submittingCardId={submittingCardId}
                  onSubmitProgress={onSubmitProgress}
                  className="flashcard-focus-mode__review"
                />
              )}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export function FlashcardPractice({
  lessonId,
  courseId,
  classId,
  setId,
  adminMode = false,
  readOnly = false,
  progressUserKey,
  positionUserKey,
  onCompleted,
}) {
  const trackingPreferenceKey = useMemo(
    () => trackProgressStorageKey(progressUserKey),
    [progressUserKey],
  );
  const [flashcardSet, setFlashcardSet] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [trackProgressPreference, setTrackProgressPreference] = useState(
    () => ({
      storageKey: trackingPreferenceKey,
      enabled: readStoredTrackProgress(trackingPreferenceKey),
    }),
  );
  const [activeCardId, setActiveCardId] = useState(null);
  const [lastActiveCardByFilter, setLastActiveCardByFilter] = useState({});
  const [orderedIdsByFilter, setOrderedIdsByFilter] = useState({});
  const [loading, setLoading] = useState(true);
  const [submittingCardId, setSubmittingCardId] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [progressError, setProgressError] = useState(null);
  const [completionNotified, setCompletionNotified] = useState(false);
  const [isFocusModeOpen, setIsFocusModeOpen] = useState(false);

  const cardsRef = useRef([]);
  const initializedSetKeyRef = useRef(null);
  const restoredSetKeyRef = useRef(null);
  const submittingCardIdRef = useRef(null);
  const keyboardControlsRef = useRef(null);
  const keyboardStateRef = useRef(null);
  const trackProgress =
    trackProgressPreference.storageKey === trackingPreferenceKey
      ? trackProgressPreference.enabled
      : readStoredTrackProgress(trackingPreferenceKey);
  const trackingAvailable = !readOnly && !adminMode && Boolean(progressUserKey);
  const canTrackProgress = trackingAvailable && trackProgress;
  const activeFilter = canTrackProgress ? selectedFilter : "all";
  const progressNavigationLocked = canTrackProgress && submittingCardId != null;

  const loadPractice = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setProgressError(null);
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
      setLoadError(getErrorMessage(loadError, "Failed to load flashcards."));
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
  const resolvedCourseId = courseId ?? flashcardSet?.courseId ?? null;
  const resolvedLessonId = lessonId ?? flashcardSet?.lessonId ?? null;
  const cardResumeStorageKey = cardPositionStorageKey({
    userKey: positionUserKey,
    courseId: resolvedCourseId,
    lessonId: resolvedLessonId,
    setId: practiceSetKey,
  });
  const legacySetResumeStorageKey = resumeStorageKeyForSet(practiceSetKey);
  const legacyLessonResumeStorageKey =
    lessonId == null ? null : resumeStorageKeyForSet(lessonId);
  const resumeWriteStorageKeys = useMemo(
    () => [cardResumeStorageKey].filter(Boolean),
    [cardResumeStorageKey],
  );
  const resumeReadStorageKeys = useMemo(
    () =>
      [
        cardResumeStorageKey,
        legacySetResumeStorageKey,
        legacyLessonResumeStorageKey,
      ].filter(
        (storageKey, index, storageKeys) =>
          storageKey && storageKeys.indexOf(storageKey) === index,
      ),
    [
      cardResumeStorageKey,
      legacyLessonResumeStorageKey,
      legacySetResumeStorageKey,
    ],
  );

  const queues = useMemo(() => buildQueues(cards), [cards]);

  const currentQueue = useMemo(
    () => getQueueForFilter(queues, activeFilter, orderedIdsByFilter),
    [activeFilter, orderedIdsByFilter, queues],
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
    (cardId, filterKey = activeFilter) => {
      if (cardId == null) return;
      setActiveCardId(cardId);
      setLastActiveCardByFilter((currentActiveCards) => ({
        ...currentActiveCards,
        [filterKey]: cardId,
      }));
    },
    [activeFilter],
  );

  const submitProgressForCard = useCallback(async (card, result) => {
    const response = await flashcardService.submitProgress(card.id, result);
    return normalizeProgressPayload(response, result);
  }, []);

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
      setActiveCardForFilter(currentQueue[0].id, activeFilter);
      return;
    }

    if (!findCardById(currentQueue, activeCardId)) {
      const rememberedCard = findCardById(
        currentQueue,
        lastActiveCardByFilter[activeFilter],
      );
      const nextCard = rememberedCard || currentQueue[0];
      setActiveCardForFilter(nextCard.id, activeFilter);
    }
  }, [
    activeCardId,
    activeFilter,
    cards.length,
    currentQueue,
    lastActiveCardByFilter,
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
    if (!canTrackProgress || !lessonId || completionNotified || !allCardsKnown) {
      return;
    }

    setCompletionNotified(true);
    onCompleted?.(lessonId);
  }, [allCardsKnown, canTrackProgress, completionNotified, lessonId, onCompleted]);

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
  const canOpenFocusMode = currentQueue.length > 0;

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
      setActiveCardForFilter,
    ],
  );

  const handleTrackProgressChange = useCallback(
    (enabled) => {
      setTrackProgressPreference({
        storageKey: trackingPreferenceKey,
        enabled,
      });
      writeStoredTrackProgress(trackingPreferenceKey, enabled);

      if (!enabled) {
        setSelectedFilter("all");
      }
    },
    [trackingPreferenceKey],
  );

  const handleShuffle = useCallback(
    (shuffledIds) => {
      setOrderedIdsByFilter((currentOrders) => ({
        ...currentOrders,
        [activeFilter]: shuffledIds,
      }));
    },
    [activeFilter],
  );

  const handleActiveCardChange = useCallback(
    (cardId) => {
      setActiveCardForFilter(cardId);
    },
    [setActiveCardForFilter],
  );

  const handleSubmitProgress = useCallback(
    async (card, result) => {
      if (
        card?.id == null ||
        !canTrackProgress ||
        submittingCardIdRef.current != null
      ) {
        return;
      }

      const previousQueue = currentQueue;

      submittingCardIdRef.current = card.id;
      setSubmittingCardId(card.id);
      setProgressError(null);

      try {
        const savedProgress = await submitProgressForCard(card, result);
        const nextCards = applyProgressToCards(
          cardsRef.current,
          card.id,
          savedProgress,
        );

        const nextQueues = buildQueues(nextCards);
        const nextQueue = getQueueForFilter(
          nextQueues,
          activeFilter,
          orderedIdsByFilter,
        );
        const nextCard = findNextCardAfterAction(
          card.id,
          previousQueue,
          nextQueue,
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

        if (nextCard) {
          setActiveCardForFilter(nextCard.id, activeFilter);
        } else {
          const currentCardAfterUpdate = findCardById(nextQueue, card.id);
          const stableCard =
            currentCardAfterUpdate || nextQueue[nextQueue.length - 1] || null;

          if (stableCard) {
            setActiveCardForFilter(stableCard.id, activeFilter);
          } else {
            setActiveCardId(null);
            setIsFocusModeOpen(false);
          }
        }
      } catch (submitError) {
        setProgressError(
          getErrorMessage(submitError, "Failed to save flashcard progress."),
        );
      } finally {
        submittingCardIdRef.current = null;
        setSubmittingCardId(null);
      }
    },
    [
      activeFilter,
      canTrackProgress,
      currentQueue,
      orderedIdsByFilter,
      setActiveCardForFilter,
      submitProgressForCard,
    ],
  );

  const handleKeyboardControlsChange = useCallback((scope, controls) => {
    if (controls) {
      keyboardControlsRef.current = { scope, controls };
      return;
    }

    if (keyboardControlsRef.current?.scope === scope) {
      keyboardControlsRef.current = null;
    }
  }, []);

  useEffect(() => {
    keyboardStateRef.current = {
      enabled: !loading && !loadError,
      isFocusModeOpen,
      submitting: submittingCardIdRef.current != null,
      submitProgress: handleSubmitProgress,
      trackProgress: canTrackProgress,
    };
  });

  useEffect(() => {
    function handleKeyDown(event) {
      const state = keyboardStateRef.current;
      const controls = keyboardControlsRef.current?.controls;

      if (!state?.enabled || !controls || event.defaultPrevented) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingShortcutTarget(event.target)) return;

      if (
        event.key === " " ||
        event.key === "Enter" ||
        event.key === "Spacebar"
      ) {
        if (!controls.card) return;
        event.preventDefault();
        controls.flipCard();
        return;
      }

      if (event.key === "ArrowRight") {
        if (state.trackProgress) {
          if (!controls.card) return;
          event.preventDefault();
          if (!event.repeat && !state.submitting) {
            state.submitProgress(controls.card, "known");
          }
          return;
        }

        if (controls.canGoNext) {
          event.preventDefault();
          controls.goNext();
        }
        return;
      }

      if (event.key === "ArrowLeft") {
        if (state.trackProgress) {
          if (!controls.card) return;
          event.preventDefault();
          if (!event.repeat && !state.submitting) {
            state.submitProgress(controls.card, "still_learning");
          }
          return;
        }

        if (controls.canGoPrevious) {
          event.preventDefault();
          controls.goPrevious();
        }
        return;
      }

      if (
        state.isFocusModeOpen &&
        (event.key === "Escape" || event.key === "Esc")
      ) {
        event.preventDefault();
        closeFocusMode();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeFocusMode]);

  if (loading) {
    return (
      <div className="flashcard-practice__loading">
        <span className="flashcard-spinner" />
        Loading flashcards...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flashcard-practice__error">
        <span>{loadError}</span>
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
        {(trackingAvailable || (canTrackProgress && cards.length > 0)) && (
          <div className="flashcard-practice__header-actions">
            {trackingAvailable && (
              <FlashcardTrackProgressToggle
                checked={trackProgress}
                onChange={handleTrackProgressChange}
              />
            )}
            {canTrackProgress && cards.length > 0 && (
              <span className="flashcard-practice__status">
                <Brain size={14} />
                {progressLabel(cards)}
                {submittingCardId != null && (
                  <>
                    <RefreshCw size={13} className="flashcard-spin-icon" />
                    Saving progress...
                  </>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {canTrackProgress && cards.length > 0 && (
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

      {progressError && (
        <div className="flashcard-practice__inline-error" role="alert">
          <span>{progressError}</span>
        </div>
      )}

      <FlashcardPreview
        cards={currentQueue}
        activeCardId={activeCardIdForCurrentFilter}
        orderedCardIds={currentQueueIds}
        onActiveCardChange={handleActiveCardChange}
        onShuffle={handleShuffle}
        emptyMessage={filterEmptyMessage(activeFilter)}
        renderControls={(controls) => (
          <FlashcardPracticeControls
            controls={controls}
            canOpenFocusMode={canOpenFocusMode}
            keyboardEnabled={!isFocusModeOpen}
            navigationLocked={progressNavigationLocked}
            onOpenFocusMode={openFocusMode}
            onKeyboardControlsChange={handleKeyboardControlsChange}
          />
        )}
        renderActions={({ card }) => (
          <FlashcardReviewActions
            card={card}
            trackProgress={canTrackProgress}
            submittingCardId={submittingCardId}
            onSubmitProgress={handleSubmitProgress}
          />
        )}
      />

      <FlashcardStudyCardList
        cards={currentQueue}
        activeCardId={activeCardIdForCurrentFilter}
        onSelect={handleActiveCardChange}
        contextKey={`practice:${currentQueue.map((card) => cardKey(card.id)).join("|")}`}
        renderItemMeta={
          canTrackProgress
            ? (card) => {
                const status = progressStatus(card);
                return (
                  <span
                    className={`flashcard-progress-badge flashcard-progress-badge--${status}`}
                  >
                    {STATUS_META[status].label}
                  </span>
                );
              }
            : undefined
        }
      />

      {isFocusModeOpen && (
        <FlashcardFocusMode
          title={flashcardSet?.title || "Flashcards"}
          selectedFilter={activeFilter}
          cards={currentQueue}
          activeCardId={activeCardIdForCurrentFilter}
          orderedCardIds={currentQueueIds}
          progressCounts={progressCounts}
          trackingAvailable={trackingAvailable}
          trackProgress={canTrackProgress}
          submittingCardId={submittingCardId}
          onActiveCardChange={handleActiveCardChange}
          onClose={closeFocusMode}
          onKeyboardControlsChange={handleKeyboardControlsChange}
          onShuffle={handleShuffle}
          onSubmitProgress={handleSubmitProgress}
          onTrackProgressChange={handleTrackProgressChange}
        />
      )}
    </div>
  );
}
