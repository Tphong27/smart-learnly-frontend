import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Flame, GraduationCap, Search } from "lucide-react";
import { traineeProgressService } from "@/services";
import { ProgressBar } from "../components/ProgressBar";
import { ProgressStatCard } from "../components/ProgressStatCard";
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

  return (
    <main className="trainee-progress-page">
      {loading && <div className="progress-state">Loading progress...</div>}

      {!loading && error && (
        <div className="progress-state progress-state--error">{error}</div>
      )}

      {!loading && !error && progress && (
        <>
          <section className="overall-progress-card">
            <div>
              <span>Overall Progress</span>
              <strong>{overallProgress}%</strong>
            </div>

            <ProgressBar value={overallProgress} />
          </section>

          <section className="progress-stat-grid">
            <ProgressStatCard
              icon={GraduationCap}
              label="Total Courses"
              value={progress.totalCourses}
              helper="Enrolled courses"
            />

            <ProgressStatCard
              icon={Flame}
              label="In Progress"
              value={progress.inProgressCourses}
              helper="Courses being learned"
            />

            <ProgressStatCard
              icon={CheckCircle2}
              label="Completed"
              value={progress.completedCourses}
              helper="Finished courses"
            />
          </section>

          <section className="progress-tabs-panel">
            <div className="progress-tabs-panel__top">
              <div className="progress-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "inProgress"}
                  className={
                    activeTab === "inProgress"
                      ? "progress-tab progress-tab--active"
                      : "progress-tab"
                  }
                  onClick={() => setActiveTab("inProgress")}
                >
                  In Progress
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "completed"}
                  className={
                    activeTab === "completed"
                      ? "progress-tab progress-tab--active"
                      : "progress-tab"
                  }
                  onClick={() => setActiveTab("completed")}
                >
                  Completed
                </button>
              </div>

              <span className="progress-tabs-panel__count">
                {filteredCourses.length} courses
              </span>
            </div>

            <div className="progress-filter-bar">
              <label className="progress-search">
                <Search size={18} />
                <input
                  type="search"
                  placeholder="Search course name..."
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

            {filteredCourses.length === 0 ? (
              <div className="progress-empty">{currentTab.emptyMessage}</div>
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
          </section>
        </>
      )}
    </main>
  );
}
