import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { traineeProgressService } from "@/services";
import { ProgressBar } from "../components/ProgressBar";
import { CourseProgressCard } from "../components/CourseProgressCard";
import "../TraineeProgressPage.css";

const TAB_CONFIG = {
  inProgress: {
    emptyMessage: "No in-progress courses found.",
  },
  completed: {
    emptyMessage: "No completed courses found.",
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

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

  const filteredCourses = useMemo(() => {
    const keyword = normalizeText(searchTerm);

    return tabCourses.filter((course) => {
      const matchesSearch =
        !keyword ||
        normalizeText(course.title).includes(keyword) ||
        normalizeText(course.categoryName).includes(keyword);

      const matchesCategory =
        selectedCategory === "all" || course.categoryName === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [tabCourses, searchTerm, selectedCategory]);

  const currentTab = TAB_CONFIG[activeTab];
  const hasActiveFilters =
    Boolean(searchTerm.trim()) || selectedCategory !== "all";

  return (
    <main className="trainee-progress-page">
      {loading && <div className="progress-state">Loading progress...</div>}

      {!loading && error && (
        <div className="progress-state progress-state--error">{error}</div>
      )}

      {!loading && !error && progress && (
        <>
          <header className="progress-page-heading">
            <div>
              <h2>Learning progress</h2>
              <p>Review your courses and continue where you left off.</p>
            </div>
            <span>{progress.totalCourses} enrolled courses</span>
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
                <dt>Total courses</dt>
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
                  onClick={() => setActiveTab("inProgress")}
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
                  onClick={() => setActiveTab("completed")}
                >
                  Completed
                  <span>{progress.completedCourses}</span>
                </button>
              </div>

              <span className="progress-tabs-panel__count">
                {filteredCourses.length} courses
              </span>
            </div>

            <div className="progress-filter-bar">
              <label className="progress-search">
                <Search size={18} aria-hidden="true" />
                <span className="sr-only">Search courses</span>
                <input
                  type="search"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </label>

              <label className="progress-category-filter">
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
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
                <div className="course-progress-list">
                  {filteredCourses.map((course) => (
                    <CourseProgressCard
                      key={course.enrollmentId || course.courseId}
                      course={course}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
