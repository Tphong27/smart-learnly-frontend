import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { traineeProgressService } from "@/services";
import { ProgressBar } from "../components/ProgressBar";
import { CourseProgressCard } from "../components/CourseProgressCard";
import { TraineeProgressSkeleton } from "../components/TraineeProgressSkeleton";
import { Pagination } from "@/shared/components/Pagination";
import "../TraineeProgressPage.css";

const TAB_CONFIG = {
  inProgress: {
    emptyMessage: "No in-progress learning items found.",
  },
  completed: {
    emptyMessage: "No completed learning items found.",
  },
};

const PAGE_SIZE = 5;

const LEARNING_TYPES = {
  all: {
    label: "All",
  },
  COURSE: {
    label: "Courses",
  },
  CLASS: {
    label: "Classes",
  },
};

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function TraineeProgressPage() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("inProgress");
  const [learningType, setLearningType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let isActive = true;

    traineeProgressService
      .getMyProgress()
      .then((data) => {
        if (!isActive) return;
        setProgress(data);
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err?.message || "Could not load trainee progress.");
        setProgress(null);
      })
      .finally(() => {
        if (!isActive) return;
        setLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const overallProgress = useMemo(() => {
    if (!progress?.courses?.length) return 0;

    const total = progress.courses.reduce(
      (sum, course) => sum + course.overallPercent,
      0,
    );

    return Math.round(total / progress.courses.length);
  }, [progress]);

  const categoryOptions = useMemo(() => {
    const categories = new Set();

    progress?.courses?.forEach((course) => {
      if (course.categoryName) {
        categories.add(course.categoryName);
      }
    });

    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }, [progress]);

  const tabCourses = useMemo(() => {
    if (!progress) return [];

    return activeTab === "completed"
      ? progress.completedCourseItems || []
      : progress.inProgressCourseItems || [];
  }, [activeTab, progress]);

  const typeCounts = useMemo(() => {
    return {
      all: tabCourses.length,
      COURSE: tabCourses.filter((course) => course.learningType === "COURSE")
        .length,
      CLASS: tabCourses.filter((course) => course.learningType === "CLASS")
        .length,
    };
  }, [tabCourses]);

  const filteredCourses = useMemo(() => {
    const keyword = normalizeText(searchTerm);

    return tabCourses.filter((course) => {
      const matchesType =
        learningType === "all" || course.learningType === learningType;

      const matchesSearch =
        !keyword ||
        normalizeText(course.title).includes(keyword) ||
        normalizeText(course.className).includes(keyword) ||
        normalizeText(course.categoryName).includes(keyword);

      const matchesCategory =
        selectedCategory === "all" || course.categoryName === selectedCategory;

      return matchesType && matchesSearch && matchesCategory;
    });
  }, [tabCourses, learningType, searchTerm, selectedCategory]);
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const paginatedCourses = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;

    return filteredCourses.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredCourses, page]);

  const currentTab = TAB_CONFIG[activeTab];
  const hasActiveFilters =
    Boolean(searchTerm.trim()) || selectedCategory !== "all";

  return (
    <main className="trainee-progress-page">
      {loading && <TraineeProgressSkeleton />}

      {!loading && error && (
        <div className="progress-state progress-state--error">{error}</div>
      )}

      {!loading && !error && progress && (
        <>
          <header className="progress-page-heading">
            <div>
              <h2>Learning progress</h2>
            </div>
            <span>{progress.totalCourses} learning items</span>
          </header>

          <section className="progress-overview" aria-label="Progress summary">
            <div className="progress-overview__main">
              <div className="progress-overview__label">
                <span>Overall progress</span>
                <strong>{overallProgress}%</strong>
              </div>
              <ProgressBar
                value={overallProgress}
                label={`Overall learning progress: ${overallProgress}%`}
              />
            </div>

            <dl className="progress-overview__stats">
              <div>
                <dt>Total </dt>
                <dd>{progress.totalCourses}</dd>
              </div>
              <div>
                <dt>In progress</dt>
                <dd>{progress.inProgressCourses}</dd>
              </div>
              <div>
                <dt>Completed</dt>
                <dd>{progress.completedCourses}</dd>
              </div>
            </dl>
          </section>

          <section className="progress-course-section">
            <div className="progress-tabs-panel__top">
              <div className="progress-tabs" role="tablist">
                <button
                  type="button"
                  id="progress-tab-in-progress"
                  role="tab"
                  aria-controls="progress-course-panel"
                  aria-selected={activeTab === "inProgress"}
                  className={
                    activeTab === "inProgress"
                      ? "progress-tab progress-tab--active"
                      : "progress-tab"
                  }
                  onClick={() => {
                    setActiveTab("inProgress");
                    setPage(1);
                  }}
                >
                  In progress
                  <span>{progress.inProgressCourses}</span>
                </button>

                <button
                  type="button"
                  id="progress-tab-completed"
                  role="tab"
                  aria-controls="progress-course-panel"
                  aria-selected={activeTab === "completed"}
                  className={
                    activeTab === "completed"
                      ? "progress-tab progress-tab--active"
                      : "progress-tab"
                  }
                  onClick={() => {
                    setActiveTab("completed");
                    setPage(1);
                  }}
                >
                  Completed
                  <span>{progress.completedCourses}</span>
                </button>
              </div>

              <span className="progress-tabs-panel__count">
                {filteredCourses.length} learning items
              </span>
            </div>

            <div
              className="progress-type-filter"
              role="group"
              aria-label="Filter progress by learning type"
            >
              {Object.entries(LEARNING_TYPES).map(([value, config]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    learningType === value
                      ? "progress-type-filter__button is-active"
                      : "progress-type-filter__button"
                  }
                  aria-pressed={learningType === value}
                  onClick={() => {
                    setLearningType(value);
                    setPage(1);
                  }}
                >
                  {config.label}
                  <span>{typeCounts[value]}</span>
                </button>
              ))}
            </div>

            <div className="progress-filter-bar">
              <label className="progress-search">
                <Search size={18} aria-hidden="true" />
                <span className="sr-only">Search courses and class</span>
                <input
                  type="search"
                  placeholder="Search course ang class..."
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(1);
                  }}
                />
              </label>

              <label className="progress-category-filter">
                <select
                  value={selectedCategory}
                  onChange={(event) => {
                    setSelectedCategory(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter courses by category"
                >
                  <option value="all">All categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div
              id="progress-course-panel"
              role="tabpanel"
              aria-labelledby={
                activeTab === "completed"
                  ? "progress-tab-completed"
                  : "progress-tab-in-progress"
              }
            >
              {filteredCourses.length === 0 ? (
                <div className="progress-empty">
                  <strong>
                    {hasActiveFilters
                      ? "No courses match your filters."
                      : currentTab.emptyMessage}
                  </strong>
                  <span>
                    {hasActiveFilters
                      ? "Try another keyword or category."
                      : "Courses will appear here when progress is available."}
                  </span>
                </div>
              ) : (
                <>
                  <div className="course-progress-list">
                    {paginatedCourses.map((course) => (
                      <CourseProgressCard
                        key={
                          course.classEnrollmentId ||
                          course.enrollmentId ||
                          `${course.courseId}:${course.classId || "online"}`
                        }
                        course={course}
                      />
                    ))}
                  </div>

                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={filteredCourses.length}
                    size={PAGE_SIZE}
                    pageSizeOptions={[PAGE_SIZE]}
                    onPageChange={setPage}
                    ariaLabel="Learning progress pagination"
                    className="progress-pagination"
                  />
                </>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
