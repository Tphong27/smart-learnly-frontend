/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  CheckCircle2,
  Clock3,
  Maximize2,
  RefreshCw,
  Shuffle,
} from "lucide-react";
import {
  FlashcardPreview,
  FlashcardStudyCardList,
  FlashcardStudyControls,
  FlashcardStudyFocusMode,
  shuffleCards,
  useFlashcardStudyKeyboard,
} from "@/features/flashcards-shared";
import { flashcardAuthoringService } from "@/features/flashcard";
import { learningService } from "@/features/learning/services/learningService";
import {
  Alert,
  Button,
  Checkbox,
  ErrorState,
  LoadingState,
  Tabs,
} from "@/shared/components/ui";
import { StatusBadge } from "@/shared/components/status";
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

const STATUS_TONE = {
  known: "success",
  still_learning: "warning",
  new: "neutral",
};

/** Chuẩn hóa ID card thành key ổn định để so sánh. */
function cardKey(id) {
  return id == null ? "" : String(id);
}

/** Chuẩn hóa trạng thái học từ API về ba trạng thái của UI. */
function normalizeLearningStatus(value) {
  const status = String(value || "").toLowerCase();
  if (status === "known") return "known";
  if (status === "learning" || status === "still_learning")
    return "still_learning";
  return "new";
}

/** Đọc trạng thái tiến độ từ các response shape đang được hỗ trợ. */
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
    if (status === "learning" || status === "still_learning")
      return "still_learning";
    if (status === "new" || status === "not_studied") return "new";
  }

  return "new";
}

/** Tạo nhãn tóm tắt số card đã biết. */
function progressLabel(cards) {
  const knownCount = cards.filter(
    (card) => progressStatus(card) === "known",
  ).length;
  return `${knownCount}/${cards.length} known`;
}

/** Chia cards thành các queue theo trạng thái học. */
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

/** Tạo thông báo rỗng phù hợp với filter đang chọn. */
function filterEmptyMessage(selectedFilter) {
  if (selectedFilter === "all")
    return "No flashcards are available for this lesson.";
  const label = STATUS_META[selectedFilter]?.label.toLowerCase() || "matching";
  return `No ${label} cards in this set.`;
}

/** Lấy nhãn hiển thị của filter tiến độ. */
function filterLabel(selectedFilter) {
  return (
    FILTERS.find((filter) => filter.key === selectedFilter)?.label || "All"
  );
}

/** Áp dụng thứ tự ID đã lưu và giữ lại card mới ở cuối. */
function orderCardsByIds(cards, orderedIds) {
  if (!orderedIds?.length) return cards;
  const cardById = new Map(cards.map((card) => [cardKey(card.id), card]));
  const orderedCards = orderedIds
    .map((id) => cardById.get(cardKey(id)))
    .filter(Boolean);
  const orderedCardKeys = new Set(orderedCards.map((card) => cardKey(card.id)));
  return [
    ...orderedCards,
    ...cards.filter((card) => !orderedCardKeys.has(cardKey(card.id))),
  ];
}

/** Lấy queue của filter và áp dụng thứ tự riêng của queue đó. */
function getQueueForFilter(queues, selectedFilter, orderedIdsByFilter) {
  const queue = queues[selectedFilter] || queues.all;
  return orderCardsByIds(queue, orderedIdsByFilter[selectedFilter]);
}

/** Tìm card bằng ID sau khi đã chuẩn hóa kiểu dữ liệu. */
function findCardById(cards, cardId) {
  const targetKey = cardKey(cardId);
  if (!targetKey) return null;
  return cards.find((card) => cardKey(card.id) === targetKey) || null;
}

/** Suy ra set ID từ set, card đầu tiên hoặc giá trị fallback. */
function getPracticeSetId(flashcardSet, explicitSetId, cards = []) {
  const firstCard = cards[0] || {};
  return (
    flashcardSet?.id ??
    flashcardSet?.setId ??
    flashcardSet?.flashcardSetId ??
    firstCard?.setId ??
    firstCard?.flashcardSetId ??
    explicitSetId ??
    null
  );
}

/** Tạo localStorage key lưu vị trí card theo đúng ngữ cảnh học. */
function cardPositionStorageKey({
  userKey,
  courseId,
  classId,
  lessonId,
  setId,
}) {
  if (!userKey || !courseId || !setId) return null;
  const classPart = classId ? `class:${classId}` : "online";
  const lessonPart = lessonId == null ? "lesson:none" : `lesson:${lessonId}`;
  return `${CARD_POSITION_STORAGE_PREFIX}:${userKey}:${courseId}:${classPart}:${lessonPart}:set:${setId}`;
}

/** Tạo localStorage key lưu lựa chọn theo dõi tiến độ của người học. */
function trackProgressStorageKey(userKey) {
  return userKey ? `${TRACK_PROGRESS_STORAGE_PREFIX}:${userKey}` : null;
}

/** Đọc lựa chọn theo dõi tiến độ, mặc định bật khi chưa có dữ liệu. */
function readStoredTrackProgress(storageKey) {
  if (!storageKey || typeof window === "undefined") return true;
  try {
    const storedValue = window.localStorage.getItem(storageKey);
    return storedValue == null ? true : storedValue !== "false";
  } catch {
    return true;
  }
}

/** Lưu lựa chọn theo dõi tiến độ theo cơ chế best-effort. */
function writeStoredTrackProgress(storageKey, enabled) {
  if (!storageKey || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, enabled ? "true" : "false");
  } catch {
    // Preference storage is best-effort.
  }
}

/** Đọc ID card gần nhất để tiếp tục buổi học. */
function readStoredCardId(storageKey) {
  if (!storageKey || typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

/** Lưu ID card hiện tại theo cơ chế best-effort. */
function writeStoredCardId(storageKey, cardId) {
  if (!storageKey || cardId == null || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, String(cardId));
  } catch {
    // Resume is best-effort.
  }
}

/** Chọn card đã lưu nếu còn tồn tại, nếu không dùng card đầu tiên. */
function getResumeCardId(cards, savedCardId) {
  return findCardById(cards, savedCardId)?.id ?? cards[0]?.id ?? null;
}

/** Chuẩn hóa response cập nhật tiến độ về shape dùng trong card. */
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

function isLessonCompletedPayload(payload) {
  const data = payload?.data ?? payload ?? {};
  return data.lessonCompleted === true;
}

/** Áp dụng tiến độ mới cho card đích mà không thay đổi mảng nguồn. */
function applyProgressToCards(cards, cardId, savedProgress) {
  const targetKey = cardKey(cardId);
  return cards.map((card) =>
    cardKey(card.id) === targetKey
      ? { ...card, progress: { ...(card.progress || {}), ...savedProgress } }
      : card,
  );
}

/** Tìm card hợp lệ tiếp theo sau khi một action làm thay đổi queue. */
function findNextCardAfterAction(cardId, previousQueue, nextQueue) {
  const previousIndex = previousQueue.findIndex(
    (card) => cardKey(card.id) === cardKey(cardId),
  );
  if (previousIndex < 0 || previousIndex >= previousQueue.length - 1)
    return null;

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

/** Trộn cards và chỉ trả về thứ tự ID mới. */
function shuffledIds(cards) {
  if (cards.length <= 1) return cards.map((card) => card.id);
  const shuffled = shuffleCards(cards);
  return shuffled.map((card) => card.id);
}

/** Hiển thị trạng thái và hai action tự đánh giá của card hiện tại. */
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
      <StatusBadge
        status={status}
        label={STATUS_META[status].label}
        tone={STATUS_TONE[status]}
      />
      <div className="flashcard-practice__results">
        <Button
          variant="secondary"
          leftIcon={<Clock3 size={16} />}
          disabled={isSubmitting}
          onClick={() => onSubmitProgress(card, "still_learning")}
        >
          Still learning
        </Button>
        <Button
          leftIcon={<CheckCircle2 size={16} />}
          disabled={isSubmitting}
          onClick={() => onSubmitProgress(card, "known")}
        >
          Know
        </Button>
      </div>
    </div>
  );
}

/** Khóa điều hướng trong lúc lưu nhưng giữ nguyên interface controls. */
function resolvedStudyControls(controls, navigationLocked) {
  return {
    ...controls,
    canGoPrevious: navigationLocked ? false : controls.canGoPrevious,
    canGoNext: navigationLocked ? false : controls.canGoNext,
    goPrevious: navigationLocked ? () => {} : controls.goPrevious,
    goNext: navigationLocked ? () => {} : controls.goNext,
  };
}

/** Hiển thị lựa chọn bật hoặc tắt theo dõi tiến độ. */
function FlashcardTrackProgressToggle({ checked, onChange }) {
  return (
    <Checkbox
      className="flashcard-practice__track-toggle"
      label="Track progress"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
  );
}

/** Hiển thị số card đang học và đã biết trong focus mode. */
function FlashcardFocusStatusCounts({ counts }) {
  return (
    <div
      className="flashcard-focus-mode__card-counts"
      aria-label={`Still learning ${counts.still_learning}, Known ${counts.known}`}
    >
      <span className="flashcard-focus-mode__progress-chip flashcard-focus-mode__progress-chip--learning flashcard-focus-mode__card-count-badge">
        Still learning <strong>{counts.still_learning}</strong>
      </span>
      <span className="flashcard-focus-mode__progress-chip flashcard-focus-mode__progress-chip--known flashcard-focus-mode__card-count-badge">
        Known <strong>{counts.known}</strong>
      </span>
    </div>
  );
}

/** Ghép controls chuẩn với shortcut phân loại và action focus mode. */
function FlashcardPracticeControls({
  controls,
  canClassify,
  canOpenFocusMode,
  classificationKeyboardEnabled,
  keyboardEnabled,
  navigationLocked,
  onOpenFocusMode,
  onSubmitProgress,
  onShuffle,
}) {
  const studyControls = resolvedStudyControls(controls, navigationLocked);
  /** Phân loại card là đang học bằng shortcut bàn phím. */
  const handleMarkStillLearning = useCallback(
    (event) => {
      if (event.repeat || !canClassify || !studyControls.card) return;
      onSubmitProgress(studyControls.card, "still_learning");
    },
    [canClassify, onSubmitProgress, studyControls.card],
  );
  /** Phân loại card là đã biết bằng shortcut bàn phím. */
  const handleMarkKnown = useCallback(
    (event) => {
      if (event.repeat || !canClassify || !studyControls.card) return;
      onSubmitProgress(studyControls.card, "known");
    },
    [canClassify, onSubmitProgress, studyControls.card],
  );

  useFlashcardStudyKeyboard({
    enabled: keyboardEnabled,
    ignoreInteractiveTargets: true,
    useArrowNavigation: !classificationKeyboardEnabled,
    canGoPrevious: studyControls.canGoPrevious,
    canGoNext: studyControls.canGoNext,
    onPrevious: studyControls.goPrevious,
    onNext: studyControls.goNext,
    onArrowLeft: classificationKeyboardEnabled
      ? handleMarkStillLearning
      : undefined,
    onArrowRight: classificationKeyboardEnabled ? handleMarkKnown : undefined,
    onFlip: studyControls.flipCard,
  });

  return (
    <FlashcardStudyControls
      controls={studyControls}
      className="flashcard-practice__controls"
      auxiliaryAction={{
        icon: <Shuffle size={16} />,
        label: "Shuffle",
        onClick: () => onShuffle(controls),
        disabled: navigationLocked || controls.cardCount <= 1,
      }}
      trailingAction={
        canOpenFocusMode
          ? {
              ariaLabel: "Open focus mode",
              className:
                "flashcard-btn flashcard-btn--icon flashcard-focus-toggle",
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

/** Điều phối controls và shortcut khi đang ở focus mode. */
function FlashcardFocusControls({
  controls,
  canClassify,
  classificationKeyboardEnabled,
  trackingAvailable,
  trackProgress,
  navigationLocked,
  onClose,
  onSubmitProgress,
  onShuffle,
  onTrackProgressChange,
}) {
  const studyControls = resolvedStudyControls(controls, navigationLocked);
  /** Phân loại card focus hiện tại là đang học. */
  const handleMarkStillLearning = useCallback(
    (event) => {
      if (event.repeat || !canClassify || !studyControls.card) return;
      onSubmitProgress(studyControls.card, "still_learning");
    },
    [canClassify, onSubmitProgress, studyControls.card],
  );
  /** Phân loại card focus hiện tại là đã biết. */
  const handleMarkKnown = useCallback(
    (event) => {
      if (event.repeat || !canClassify || !studyControls.card) return;
      onSubmitProgress(studyControls.card, "known");
    },
    [canClassify, onSubmitProgress, studyControls.card],
  );

  useFlashcardStudyKeyboard({
    enabled: true,
    allowWhenDialogOpen: true,
    ignoreInteractiveTargets: true,
    useArrowNavigation: !classificationKeyboardEnabled,
    canGoPrevious: studyControls.canGoPrevious,
    canGoNext: studyControls.canGoNext,
    onPrevious: studyControls.goPrevious,
    onNext: studyControls.goNext,
    onArrowLeft: classificationKeyboardEnabled
      ? handleMarkStillLearning
      : undefined,
    onArrowRight: classificationKeyboardEnabled ? handleMarkKnown : undefined,
    onFlip: studyControls.flipCard,
    onExitFocus: onClose,
  });

  return (
    <div className="flashcard-focus-mode__controls-row">
      {trackingAvailable && (
        <FlashcardTrackProgressToggle
          checked={trackProgress}
          onChange={onTrackProgressChange}
        />
      )}
      <FlashcardStudyControls
        controls={studyControls}
        className="flashcard-focus-mode__controls"
        auxiliaryAction={{
          icon: <Shuffle size={16} />,
          label: "Shuffle",
          onClick: () => onShuffle(controls),
          disabled: navigationLocked || controls.cardCount <= 1,
        }}
      />
    </div>
  );
}

/** Điều phối tải, lọc, học và lưu tiến độ flashcard của lesson. */
export function FlashcardPractice({
  lessonId,
  courseId,
  classId,
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
  const submittingCardIdRef = useRef(null);
  const trackProgress =
    trackProgressPreference.storageKey === trackingPreferenceKey
      ? trackProgressPreference.enabled
      : readStoredTrackProgress(trackingPreferenceKey);
  const trackingAvailable = !readOnly && !adminMode && Boolean(progressUserKey);
  const canTrackProgress = trackingAvailable && trackProgress;
  const activeFilter = canTrackProgress ? selectedFilter : "all";
  const progressNavigationLocked = canTrackProgress && submittingCardId != null;

  /** Tải set flashcard phù hợp với admin preview hoặc learner context. */
  const loadPractice = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setProgressError(null);
    try {
      let payload;

      if (adminMode && lessonId) {
        payload = await flashcardAuthoringService.getAdminSetByLesson(lessonId);
      } else if (readOnly && lessonId && courseId) {
        payload = await learningService.getPreviewLessonFlashcards(
          courseId,
          lessonId,
          classId,
        );
      } else if (lessonId && courseId) {
        payload = await learningService.getLessonFlashcards(
          courseId,
          lessonId,
          classId,
        );
      } else {
        throw new Error("Flashcard lesson was not found.");
      }
      const normalizedSet = normalizeSet(payload);
      setFlashcardSet(normalizedSet);
      cardsRef.current = normalizedSet.cards || [];
    } catch (error) {
      setLoadError(getErrorMessage(error, "Failed to load flashcards."));
    } finally {
      setLoading(false);
    }
  }, [adminMode, classId, courseId, lessonId, readOnly]);
  
  useEffect(() => {
    if (lessonId && (adminMode || courseId)) {
      loadPractice();
    }
  }, [adminMode, courseId, lessonId, loadPractice]);

  const cards = useMemo(() => flashcardSet?.cards || [], [flashcardSet?.cards]);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  const practiceSetKey = getPracticeSetId(flashcardSet, null, cards);
  const cardResumeStorageKey = cardPositionStorageKey({
    userKey: positionUserKey,
    courseId: courseId ?? flashcardSet?.courseId,
    classId,
    lessonId,
    setId: practiceSetKey,
  });

  const queues = useMemo(() => buildQueues(cards), [cards]);
  const currentQueue = useMemo(
    () => getQueueForFilter(queues, activeFilter, orderedIdsByFilter),
    [activeFilter, orderedIdsByFilter, queues],
  );
  const currentQueueIds = useMemo(
    () => currentQueue.map((card) => card.id),
    [currentQueue],
  );

  /** Ghi nhận card hiện tại cho cả session và filter tương ứng. */
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

  useEffect(() => {
    if (!cards.length) {
      setActiveCardId(null);
      return;
    }
    if (!practiceSetKey) return;

    const setKey = String(practiceSetKey);
    if (initializedSetKeyRef.current === setKey) return;

    initializedSetKeyRef.current = setKey;
    setSelectedFilter("all");
    setLastActiveCardByFilter({});
    setOrderedIdsByFilter({});
    setCompletionNotified(false);

    const initialCardId = getResumeCardId(
      cards,
      readStoredCardId(cardResumeStorageKey),
    );
    if (initialCardId != null) {
      setActiveCardForFilter(initialCardId, "all");
    }
  }, [cardResumeStorageKey, cards, practiceSetKey, setActiveCardForFilter]);

  useEffect(() => {
    if (activeCardId != null && findCardById(cards, activeCardId)) {
      writeStoredCardId(cardResumeStorageKey, activeCardId);
    }
  }, [activeCardId, cardResumeStorageKey, cards]);

  useEffect(() => {
    if (!cards.length) return;
    if (!currentQueue.length) {
      if (activeCardId != null) setActiveCardId(null);
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

  /** Chuyển filter và phục hồi card gần nhất còn hợp lệ trong queue. */
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

  /** Lưu lựa chọn theo dõi tiến độ và reset filter khi tắt. */
  const handleTrackProgressChange = useCallback(
    (enabled) => {
      setTrackProgressPreference({
        storageKey: trackingPreferenceKey,
        enabled,
      });
      writeStoredTrackProgress(trackingPreferenceKey, enabled);
      if (!enabled) setSelectedFilter("all");
    },
    [trackingPreferenceKey],
  );

  /** Trộn queue hiện tại và đưa card đầu tiên của thứ tự mới lên active. */
  const handleShuffle = useCallback(
    (controls) => {
      const sourceCards = controls?.orderedCards?.length
        ? controls.orderedCards
        : currentQueue;
      const nextIds = shuffledIds(sourceCards);
      setOrderedIdsByFilter((currentOrders) => ({
        ...currentOrders,
        [activeFilter]: nextIds,
      }));
      setActiveCardForFilter(nextIds[0], activeFilter);
      controls?.setFlipped?.(false);
    },
    [activeFilter, currentQueue, setActiveCardForFilter],
  );

  /** Đồng bộ card được chọn từ preview hoặc danh sách card. */
  const handleActiveCardChange = useCallback(
    (cardId) => setActiveCardForFilter(cardId),
    [setActiveCardForFilter],
  );

  /** Mở chế độ học tập trung. */
  const openFocusMode = useCallback(() => {
    setIsFocusModeOpen(true);
  }, []);

  /** Đóng chế độ học tập trung. */
  const closeFocusMode = useCallback(() => {
    setIsFocusModeOpen(false);
  }, []);

  /** Lưu phân loại card theo optimistic update và rollback khi lỗi. */
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
      const previousCards = cardsRef.current;
      const optimisticProgress = normalizeProgressPayload(
        { learningStatus: result, lastReviewResult: result },
        result,
      );
      const optimisticCards = applyProgressToCards(
        previousCards,
        card.id,
        optimisticProgress,
      );

      submittingCardIdRef.current = card.id;
      setSubmittingCardId(card.id);
      setProgressError(null);
      cardsRef.current = optimisticCards;
      setFlashcardSet((currentSet) =>
        currentSet
          ? {
              ...currentSet,
              cards: applyProgressToCards(
                currentSet.cards || [],
                card.id,
                optimisticProgress,
              ),
            }
          : currentSet,
      );

      try {
        const response = await learningService.submitFlashcardProgress(
          card.id,
          result,
          classId,
        );
        const savedProgress = normalizeProgressPayload(response, result);
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
            closeFocusMode();
          }
        }

        if (isLessonCompletedPayload(response) && !completionNotified) {
          setCompletionNotified(true);
          onCompleted?.(lessonId);
        }
      } catch (error) {
        cardsRef.current = previousCards;
        setFlashcardSet((currentSet) =>
          currentSet ? { ...currentSet, cards: previousCards } : currentSet,
        );
        setProgressError(
          getErrorMessage(error, "Failed to save flashcard progress."),
        );
      } finally {
        submittingCardIdRef.current = null;
        setSubmittingCardId(null);
      }
    },
    [
      activeFilter,
      canTrackProgress,
      classId,
      completionNotified,
      currentQueue,
      lessonId,
      orderedIdsByFilter,
      closeFocusMode,
      onCompleted,
      setActiveCardForFilter,
    ],
  );

  if (loading) {
    return <LoadingState label="Loading flashcards..." />;
  }

  if (loadError) {
    return (
      <ErrorState
        title="Could not load flashcards"
        description={loadError}
        action={
          <Button
            variant="secondary"
            leftIcon={<RefreshCw size={16} />}
            onClick={loadPractice}
          >
            Retry
          </Button>
        }
      />
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
        <Tabs
          className="flashcard-practice__filters"
          variant="compact"
          ariaLabel="Filter flashcards by progress"
          items={FILTERS.map((filter) => ({
            value: filter.key,
            label: filter.label,
            count: progressCounts[filter.key],
          }))}
          value={selectedFilter}
          onChange={handleFilterChange}
        />
      )}

      {progressError && (
        <Alert tone="danger" title="Progress could not be saved">
          {progressError}
        </Alert>
      )}

      <FlashcardPreview
        cards={currentQueue}
        activeCardId={activeCardIdForCurrentFilter}
        orderedCardIds={currentQueueIds}
        onActiveCardChange={handleActiveCardChange}
        onShuffle={(ids) =>
          setOrderedIdsByFilter((currentOrders) => ({
            ...currentOrders,
            [activeFilter]: ids,
          }))
        }
        emptyMessage={filterEmptyMessage(activeFilter)}
        renderControls={(controls) => (
          <FlashcardPracticeControls
            controls={controls}
            canClassify={canTrackProgress && !progressNavigationLocked}
            canOpenFocusMode={canOpenFocusMode}
            classificationKeyboardEnabled={canTrackProgress}
            keyboardEnabled={!isFocusModeOpen}
            navigationLocked={progressNavigationLocked}
            onOpenFocusMode={openFocusMode}
            onSubmitProgress={handleSubmitProgress}
            onShuffle={handleShuffle}
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
        contextKey={`course-practice:${currentQueue.map((card) => cardKey(card.id)).join("|")}`}
        renderItemMeta={
          canTrackProgress
            ? (card) => {
                const status = progressStatus(card);
                return (
                  <StatusBadge
                    status={status}
                    label={STATUS_META[status].label}
                    tone={STATUS_TONE[status]}
                  />
                );
              }
            : undefined
        }
      />

      {isFocusModeOpen && (
        <FlashcardStudyFocusMode
          title={flashcardSet?.title || "Flashcards"}
          subtitle={filterLabel(activeFilter)}
          cards={currentQueue}
          activeCardId={activeCardIdForCurrentFilter}
          orderedCardIds={currentQueueIds}
          onActiveCardChange={handleActiveCardChange}
          onShuffle={(ids) =>
            setOrderedIdsByFilter((currentOrders) => ({
              ...currentOrders,
              [activeFilter]: ids,
            }))
          }
          onClose={closeFocusMode}
          emptyMessage={filterEmptyMessage(activeFilter)}
          renderCardOverlay={
            canTrackProgress
              ? () => <FlashcardFocusStatusCounts counts={progressCounts} />
              : undefined
          }
          renderControls={(controls) => (
            <FlashcardFocusControls
              controls={controls}
              canClassify={canTrackProgress && !progressNavigationLocked}
              classificationKeyboardEnabled={canTrackProgress}
              trackingAvailable={trackingAvailable}
              trackProgress={trackProgress}
              navigationLocked={progressNavigationLocked}
              onClose={closeFocusMode}
              onSubmitProgress={handleSubmitProgress}
              onShuffle={handleShuffle}
              onTrackProgressChange={handleTrackProgressChange}
            />
          )}
          renderActions={({ card }) => (
            <FlashcardReviewActions
              card={card}
              trackProgress={canTrackProgress}
              submittingCardId={submittingCardId}
              onSubmitProgress={handleSubmitProgress}
              className="flashcard-focus-mode__review"
            />
          )}
        />
      )}
    </div>
  );
}
