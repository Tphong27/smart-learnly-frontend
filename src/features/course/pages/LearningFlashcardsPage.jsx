import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Layers,
  RefreshCw,
  Search,
} from "lucide-react";
import { flashcardService } from "@/services/flashcard.service";
import Pagination from "@/shared/components/Pagination";
import { Button } from "@/shared/components/ui";
import "./LearningFlashcardsPage.css";

const PAGE_SIZE = 8;
const SKELETON_ITEMS = ["one", "two", "three", "four"];

function progressPercent(item) {
  const total = Number(item.cardCount || 0);
  if (total <= 0) return 0;
  const percent = Math.round((Number(item.knownCount || 0) / total) * 100);
  return Math.min(100, Math.max(0, percent));
}

function getCardStatus(item) {
  const percent = progressPercent(item);
  if (percent === 100) return "complete";
  if (percent === 0) return "not-started";
  return "in-progress";
}

function actionLabel(item) {
  const started =
    Number(item.knownCount || 0) + Number(item.stillLearningCount || 0);
  if (started === 0) return "Study";
  if (progressPercent(item) === 100) return "Review";
  return "Continue";
}

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

function FlashcardPageSkeleton() {
  return (
    <div
      className="learning-flashcards-skeleton"
      role="status"
      aria-live="polite"
    >
      <span className="learning-flashcards-visually-hidden">
        Loading flashcards...
      </span>

      <div aria-hidden="true">
        <section className="learning-flashcards-overview learning-flashcards-skeleton__overview">
          <div className="learning-flashcards-overview__progress">
            <div className="learning-flashcards-overview__copy">
              <div>
                <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__label" />
                <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__overview-title" />
              </div>
              <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__percentage" />
            </div>
            <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__progress" />
          </div>

          <div className="learning-flashcards-overview__stats">
            {["sets", "learning", "new"].map((item) => (
              <div key={item}>
                <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__stat-label" />
                <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__stat-value" />
              </div>
            ))}
          </div>
        </section>

        <section className="learning-flashcards-library">
          <div className="learning-flashcards-library__heading learning-flashcards-skeleton__library-heading">
            <div>
              <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__section-title" />
              <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__section-copy" />
            </div>
            <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__result-count" />
          </div>

          <div className="learning-flashcards-toolbar">
            <div className="learning-flashcards-toolbar__controls">
              <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__control" />
              <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__control" />
            </div>
          </div>

          <div className="learning-flashcards-grid">
            {SKELETON_ITEMS.map((item) => (
              <article
                className="learning-flashcard-card learning-flashcards-skeleton__card"
                key={item}
              >
                <div className="learning-flashcard-card__header">
                  <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__course" />
                  <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__badge" />
                </div>
                <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__card-title" />
                <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__lesson" />
                <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__card-progress" />
                <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__progress-copy" />
                <div className="learning-flashcards-skeleton__card-stats">
                  <span className="learning-flashcards-skeleton__block" />
                  <span className="learning-flashcards-skeleton__block" />
                  <span className="learning-flashcards-skeleton__block" />
                </div>
                <div className="learning-flashcard-card__footer learning-flashcards-skeleton__card-footer">
                  <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__date" />
                  <span className="learning-flashcards-skeleton__block learning-flashcards-skeleton__button" />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function FlashcardSetCard({ item, onOpen }) {
  const percent = progressPercent(item);
  const status = getCardStatus(item);
  const buttonText = actionLabel(item);

  return (
    <article className="learning-flashcard-card">
      <div className="learning-flashcard-card__header">
        <span className="learning-flashcard-card__course">
          <Layers size={15} aria-hidden="true" />
          {item.courseTitle || "Course"}
        </span>
        <span
          className={`learning-flashcard-card__badge learning-flashcard-card__badge--${status}`}
        >
          {status === "complete" && "Complete"}
          {status === "in-progress" && "In Progress"}
          {status === "not-started" && `${item.cardCount || 0} cards`}
        </span>
      </div>

      <h2 className="learning-flashcard-card__title">
        {item.setTitle || item.lessonTitle}
      </h2>
      <p className="learning-flashcard-card__lesson">
        {item.sectionTitle} / {item.lessonTitle}
      </p>

      <div
        className={`learning-flashcard-progress ${
          status === "complete" ? "learning-flashcard-progress--complete" : ""
        }`}
        role="progressbar"
        aria-label={`${item.setTitle || item.lessonTitle}: ${percent}% known`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={percent}
      >
        <div
          className="learning-flashcard-progress__bar"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="learning-flashcard-card__progress-text">
        {status === "complete"
          ? "All cards known"
          : status === "not-started"
            ? "Not started"
            : `${percent}% known`}
      </p>

      <div className="learning-flashcard-card__stats">
        <span className="learning-flashcard-card__stat learning-flashcard-card__stat--known">
          <CheckCircle2 size={15} aria-hidden="true" />
          {item.knownCount || 0} known
        </span>
        <span className="learning-flashcard-card__stat learning-flashcard-card__stat--learning">
          <Clock3 size={15} aria-hidden="true" />
          {item.stillLearningCount || 0} learning
        </span>
        <span className="learning-flashcard-card__stat learning-flashcard-card__stat--not-started">
          <BookOpen size={15} aria-hidden="true" />
          {item.notStartedCount || 0} not started
        </span>
      </div>

      <div className="learning-flashcard-card__footer">
        <span>Last reviewed: {formatDate(item.lastReviewedAt)}</span>
        <Button
          variant={buttonText === "Review" ? "secondary" : "primary"}
          size="sm"
          className="learning-flashcard-card__cta"
          onClick={() => onOpen(item)}
        >
          {buttonText}
        </Button>
      </div>
    </article>
  );
}

export function LearningFlashcardsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCourseId = searchParams.get("courseId") || "";
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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
    let isActive = true;

    flashcardService
      .listLearningFlashcards()
      .then((data) => {
        if (isActive) setItems(data);
      })
      .catch((loadError) => {
        if (isActive) {
          setError(loadError?.message || "Failed to load flashcards.");
        }
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });

    return () => {
      isActive = false;
    };
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

  const summary = useMemo(
    () =>
      items.reduce(
        (totals, item) => ({
          sets: totals.sets + 1,
          cards: totals.cards + Number(item.cardCount || 0),
          known: totals.known + Number(item.knownCount || 0),
          learning:
            totals.learning + Number(item.stillLearningCount || 0),
          notStarted: totals.notStarted + Number(item.notStartedCount || 0),
        }),
        { sets: 0, cards: 0, known: 0, learning: 0, notStarted: 0 },
      ),
    [items],
  );

  const overallPercent =
    summary.cards > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((summary.known / summary.cards) * 100)),
        )
      : 0;
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredItems, currentPage]);
  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE) || 1;
  const hasActiveFilters = Boolean(searchQuery.trim() || selectedCourseId);

  function clearFilters() {
    setSearchQuery("");
    setCurrentPage(1);
    setSearchParams({});
  }

  function goToSet(item) {
    if (!item?.courseId || !item?.lessonId) return;
    navigate(`/learning/courses/${item.courseId}?lessonId=${item.lessonId}`);
  }

  return (
    <section className="learning-flashcards-page">
      <header className="learning-flashcards-header">
        <h1>Flashcards</h1>
        <p>
          Strengthen what you have learned and continue each set at your own
          pace.
        </p>
      </header>

      {loading ? (
        <FlashcardPageSkeleton />
      ) : error ? (
        <div
          className="learning-flashcards-state learning-flashcards-state--error"
          role="alert"
        >
          <span>{error}</span>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw size={16} aria-hidden="true" />}
            onClick={loadFlashcards}
          >
            Try again
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="learning-flashcards-empty">
          <Layers size={34} aria-hidden="true" />
          <h2>No flashcards yet</h2>
          <p>Flashcard lessons from your enrolled courses will appear here.</p>
        </div>
      ) : (
        <>
          <section
            className="learning-flashcards-overview"
            aria-labelledby="flashcard-progress-heading"
          >
            <div className="learning-flashcards-overview__progress">
              <div className="learning-flashcards-overview__copy">
                <div>
                  <span>Your study progress</span>
                  <h2 id="flashcard-progress-heading">
                    {summary.known} of {summary.cards} cards known
                  </h2>
                </div>
                <strong>{overallPercent}%</strong>
              </div>
              <div
                className="learning-flashcards-overview__bar"
                role="progressbar"
                aria-label="Overall flashcard progress"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={overallPercent}
              >
                <span style={{ width: `${overallPercent}%` }} />
              </div>
            </div>

            <dl className="learning-flashcards-overview__stats">
              <div>
                <dt>Study sets</dt>
                <dd>{summary.sets}</dd>
              </div>
              <div>
                <dt>Learning</dt>
                <dd>{summary.learning}</dd>
              </div>
              <div>
                <dt>Not started</dt>
                <dd>{summary.notStarted}</dd>
              </div>
            </dl>
          </section>

          <section
            className="learning-flashcards-library"
            aria-labelledby="flashcard-library-heading"
          >
            <div className="learning-flashcards-library__heading">
              <div>
                <h2 id="flashcard-library-heading">Your study sets</h2>
                <p>Choose a set to study, continue, or review.</p>
              </div>
              <span aria-live="polite">
                {filteredItems.length}{" "}
                {filteredItems.length === 1 ? "set" : "sets"}
              </span>
            </div>

            <div className="learning-flashcards-toolbar" role="search">
              <div className="learning-flashcards-toolbar__controls">
                <label className="learning-flashcards-search">
                  <span className="learning-flashcards-visually-hidden">
                    Search flashcards
                  </span>
                  <Search size={18} aria-hidden="true" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by set, lesson, or course"
                  />
                </label>

                <label className="learning-flashcards-course-filter">
                  <span className="learning-flashcards-visually-hidden">
                    Filter by course
                  </span>
                  <select
                    value={selectedCourseId}
                    onChange={(event) => {
                      const nextCourseId = event.target.value;
                      setCurrentPage(1);
                      setSearchParams(
                        nextCourseId ? { courseId: nextCourseId } : {},
                      );
                    }}
                  >
                    <option value="">All courses</option>
                    {uniqueCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </label>

                {hasActiveFilters && (
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="learning-flashcards-empty learning-flashcards-empty--filtered">
                <Layers size={34} aria-hidden="true" />
                <h2>No flashcards match your filters.</h2>
                <p>Try a different keyword or show every course.</p>
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <>
                <div className="learning-flashcards-grid">
                  {paginatedItems.map((item) => (
                    <FlashcardSetCard
                      key={item.setId}
                      item={item}
                      onOpen={goToSet}
                    />
                  ))}
                </div>

                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredItems.length}
                  size={PAGE_SIZE}
                  onPageChange={setCurrentPage}
                  className="learning-flashcards-pagination"
                />
              </>
            )}
          </section>
        </>
      )}
    </section>
  );
}
