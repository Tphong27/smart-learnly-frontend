import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Pagination } from "@/shared/components/Pagination";
import { CourseProgressCard } from "./CourseProgressCard";
import "../TraineeProgress.css";

const TAB_CONFIG = {
  inProgress: {
    emptyMessage: "No in-progress classes found.",
  },
  completed: {
    emptyMessage: "No completed classes found.",
  },
};

const PAGE_SIZE = 5;

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function TraineeProgress({ progress }) {
  const [activeTab, setActiveTab] = useState("inProgress");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [page, setPage] = useState(1);

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
      // Search by class name only (class-only commerce).
      const matchesSearch =
        !keyword || normalizeText(course.className).includes(keyword);

      const matchesCategory =
        selectedCategory === "all" || course.categoryName === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [tabCourses, searchTerm, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredCourses.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredCourses]);

  const currentTab = TAB_CONFIG[activeTab];
  const hasActiveFilters =
    Boolean(searchTerm.trim()) || selectedCategory !== "all";

  return (
    <section
      id="learning-progress"
      className="trainee-progress"
      aria-labelledby="learning-progress-title"
    >
      <>
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
              {filteredCourses.length}{" "}
              {filteredCourses.length === 1 ? "class" : "classes"}
            </span>
          </div>

          <div className="progress-filter-bar">
            <label className="progress-search">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Search classes</span>
              <input
                type="search"
                placeholder="Search classes..."
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
                aria-label="Filter classes by category"
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
                    ? "No classes match your filters."
                    : currentTab.emptyMessage}
                </strong>
                <span>
                  {hasActiveFilters
                    ? "Try another class name or category."
                    : "Classes will appear here when progress is available."}
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
                  page={currentPage}
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
    </section>
  );
}
