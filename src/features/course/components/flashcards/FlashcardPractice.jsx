import { useCallback, useEffect, useMemo, useState } from "react";
import { Brain, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import { flashcardService } from "@/services/flashcard.service";
import { FlashcardPreview } from "./FlashcardPreview";
import { getErrorMessage, normalizeSet } from "./flashcard-utils";
import "./Flashcards.css";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "learning", label: "Learning" },
  { key: "known", label: "Known" },
];

const STATUS_META = {
  new: { label: "New" },
  learning: { label: "Learning" },
  known: { label: "Known" },
};

function progressStatus(card) {
  const status = String(card?.progress?.learningStatus || "").toLowerCase();
  if (status === "known") return "known";
  if (status === "learning") return "learning";
  return "new";
}

function progressLabel(cards) {
  const knownCount = cards.filter((card) => progressStatus(card) === "known")
    .length;
  return `${knownCount}/${cards.length} known`;
}

function filterEmptyMessage(selectedFilter) {
  if (selectedFilter === "all") {
    return "No flashcards are available for this lesson.";
  }
  const label = STATUS_META[selectedFilter]?.label || "matching";
  return `No ${label} cards in this set.`;
}

export function FlashcardPractice({
  lessonId,
  setId,
  adminMode = false,
  readOnly = false,
}) {
  const [flashcardSet, setFlashcardSet] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [submittingCardId, setSubmittingCardId] = useState(null);
  const [error, setError] = useState(null);

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
      setFlashcardSet(normalizeSet(payload));
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

  const cards = useMemo(
    () => flashcardSet?.cards || [],
    [flashcardSet?.cards],
  );

  const progressCounts = useMemo(() => {
    const counts = { all: cards.length, new: 0, learning: 0, known: 0 };
    cards.forEach((card) => {
      counts[progressStatus(card)] += 1;
    });
    return counts;
  }, [cards]);

  const filteredCards = useMemo(() => {
    if (selectedFilter === "all") return cards;
    return cards.filter((card) => progressStatus(card) === selectedFilter);
  }, [cards, selectedFilter]);

  const submitProgress = async (card, result) => {
    if (!card?.id || readOnly) return;

    setSubmittingCardId(card.id);
    try {
      const savedProgress = await flashcardService.submitProgress(
        card.id,
        result,
      );
      setFlashcardSet((currentSet) => ({
        ...currentSet,
        cards: currentSet.cards.map((currentCard) =>
          currentCard.id === card.id
            ? {
                ...currentCard,
                progress: {
                  learningStatus: savedProgress.learningStatus,
                  lastReviewResult: savedProgress.lastReviewResult,
                  repetitions: savedProgress.repetitions,
                  intervalDays: savedProgress.intervalDays,
                  lastReviewedAt: savedProgress.lastReviewedAt,
                  nextReviewAt: savedProgress.nextReviewAt,
                },
              }
            : currentCard,
        ),
      }));
    } catch (submitError) {
      setError(
        getErrorMessage(submitError, "Failed to save flashcard progress."),
      );
    } finally {
      setSubmittingCardId(null);
    }
  };

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
              onClick={() => setSelectedFilter(filter.key)}
            >
              {filter.label}
              <span>{progressCounts[filter.key]}</span>
            </button>
          ))}
        </div>
      )}

      <FlashcardPreview
        cards={filteredCards}
        emptyMessage={filterEmptyMessage(selectedFilter)}
        renderActions={({ card, goNext }) => {
          if (!card) return null;
          const status = progressStatus(card);
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
                    disabled={submittingCardId === card.id}
                    onClick={() => submitProgress(card, "still_learning")}
                  >
                    <Clock3 size={16} />
                    Still learning
                  </button>
                  <button
                    type="button"
                    className="flashcard-btn flashcard-btn--success"
                    disabled={submittingCardId === card.id}
                    onClick={async () => {
                      await submitProgress(card, "known");
                      goNext();
                    }}
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
    </div>
  );
}