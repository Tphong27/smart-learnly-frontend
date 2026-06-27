import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, CheckCircle2, Clock3, Layers, RefreshCw } from "lucide-react";
import { flashcardService } from "@/services/flashcard.service";
import "./LearningFlashcardsPage.css";

function formatDate(value) {
  if (!value) return "Not reviewed yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not reviewed yet";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function progressPercent(item) {
  const total = Number(item.cardCount || 0);
  if (total <= 0) return 0;
  return Math.round((Number(item.knownCount || 0) / total) * 100);
}

function actionLabel(item) {
  const started = Number(item.knownCount || 0) + Number(item.stillLearningCount || 0);
  return started > 0 ? "Continue" : "Study";
}

export function LearningFlashcardsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadFlashcards() {
    setLoading(true);
    setError(null);
    try {
      setItems(await flashcardService.listLearningFlashcards());
    } catch (loadError) {
      setError(loadError?.message || "Failed to load flashcards.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFlashcards();
  }, []);

  const totalCards = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.cardCount || 0), 0),
    [items],
  );

  const goToSet = (item) => {
    if (!item?.courseId || !item?.lessonId) return;
    navigate(`/learning/courses/${item.courseId}?lessonId=${item.lessonId}`);
  };

  return (
    <section className="learning-flashcards-page">
      <header className="learning-flashcards-hero">
        <div>
          <span className="learning-flashcards-hero__eyebrow">Flashcards</span>
          <h1>Review your flashcard lessons</h1>
          <p>
            Practice sets from your enrolled courses, with progress carried into
            each lesson workspace.
          </p>
        </div>
        <div className="learning-flashcards-hero__stats">
          <span>{items.length} sets</span>
          <span>{totalCards} cards</span>
        </div>
      </header>

      {loading ? (
        <div className="learning-flashcards-state">
          <span className="learning-flashcards-spinner" />
          Loading flashcards...
        </div>
      ) : error ? (
        <div className="learning-flashcards-state learning-flashcards-state--error">
          <span>{error}</span>
          <button type="button" onClick={loadFlashcards}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="learning-flashcards-empty">
          <Layers size={34} />
          <h2>No flashcards yet</h2>
          <p>Flashcard lessons from your enrolled courses will appear here.</p>
        </div>
      ) : (
        <div className="learning-flashcards-grid">
          {items.map((item) => {
            const percent = progressPercent(item);
            return (
              <article key={item.setId} className="learning-flashcard-card">
                <div className="learning-flashcard-card__topline">
                  <span>{item.courseTitle}</span>
                  <span>{item.cardCount || 0} cards</span>
                </div>
                <h2>{item.setTitle || item.lessonTitle}</h2>
                <p className="learning-flashcard-card__lesson">
                  {item.sectionTitle} / {item.lessonTitle}
                </p>

                <div className="learning-flashcard-progress" aria-label={`${percent}% known`}>
                  <div
                    className="learning-flashcard-progress__bar"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="learning-flashcard-card__counts">
                  <span>
                    <CheckCircle2 size={14} /> {item.knownCount || 0} known
                  </span>
                  <span>
                    <Clock3 size={14} /> {item.stillLearningCount || 0} learning
                  </span>
                  <span>
                    <BookOpen size={14} /> {item.notStartedCount || 0} new
                  </span>
                </div>

                <div className="learning-flashcard-card__footer">
                  <span>Last reviewed: {formatDate(item.lastReviewedAt)}</span>
                  <button type="button" onClick={() => goToSet(item)}>
                    {actionLabel(item)}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}