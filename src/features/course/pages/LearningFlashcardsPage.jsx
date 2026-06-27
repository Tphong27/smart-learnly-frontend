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

function courseFilterKey(item) {
  return String(item?.courseId ?? item?.courseTitle ?? "");
}

function searchableText(item) {
  return [
    item?.courseTitle,
    item?.sectionTitle,
    item?.lessonTitle,
    item?.setTitle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function LearningFlashcardsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
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

  const uniqueCourses = useMemo(() => {
    const coursesById = new Map();

    items.forEach((item) => {
      const id = courseFilterKey(item);
      if (!id || coursesById.has(id)) return;
      coursesById.set(id, {
        id,
        title: item.courseTitle || "Untitled course",
      });
    });

    return Array.from(coursesById.values()).sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const matchesCourse =
        !selectedCourseId || courseFilterKey(item) === selectedCourseId;
      const matchesSearch = !query || searchableText(item).includes(query);
      return matchesCourse && matchesSearch;
    });
  }, [items, searchQuery, selectedCourseId]);

  const filteredStats = useMemo(
    () => ({
      sets: filteredItems.length,
      cards: filteredItems.reduce(
        (sum, item) => sum + Number(item.cardCount || 0),
        0,
      ),
    }),
    [filteredItems],
  );

  const hasActiveFilters = Boolean(searchQuery.trim() || selectedCourseId);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCourseId("");
  };

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
          <span>{filteredStats.sets} sets</span>
          <span>{filteredStats.cards} cards</span>
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
        <>
          <div className="learning-flashcards-filters">
            <div className="learning-flashcards-filters__controls">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by course or flashcard..."
                aria-label="Search flashcards"
              />
              <select
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                aria-label="Filter by course"
              >
                <option value="">All courses</option>
                {uniqueCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </div>
            <p>
              Showing {filteredItems.length} of {items.length} sets
            </p>
          </div>

          {filteredItems.length === 0 ? (
            <div className="learning-flashcards-empty learning-flashcards-empty--filtered">
              <Layers size={34} />
              <h2>No flashcards match your filters.</h2>
              <button type="button" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="learning-flashcards-grid">
              {filteredItems.map((item) => {
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
        </>
      )}
    </section>
  );
}
