import { useEffect, useState, useMemo } from "react";
import { BookOpen, GraduationCap, RotateCcw } from "lucide-react";
import { EnrolledCourseCard } from "../components/EnrolledCourseCard";
import { CourseFilters } from "../components/CourseFilters";
import { CourseListToolbar } from "../components/CourseListToolbar";
import { CourseListPage } from "./CourseListPage";
import { courseService } from "@/services";
import "../course.css";

const TAB_ENROLLED = "enrolled";
const TAB_CATALOG = "catalog";

export function MyCoursesPage() {
  const [activeTab, setActiveTab] = useState(TAB_ENROLLED);

  const [enrolledKeyword, setEnrolledKeyword] = useState("");
  const [enrolledCategorySlug, setEnrolledCategorySlug] = useState("");
  const [enrolledViewMode, setEnrolledViewMode] = useState(
    localStorage.getItem("enrolledCourseViewMode") || "grid",
  );
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [reloadEnrolledKey, setReloadEnrolledKey] = useState(0);
  const [loadingEnrolled, setLoadingEnrolled] = useState(true);
  const [enrolledError, setEnrolledError] = useState("");

  function normalizeEnrolledCourse(course) {
    return {
      ...course,
      avatarUrl: course.avatarUrl,
      categoryName: course.category?.name,
    };
  }

  function handleEnrolledViewModeChange(mode) {
    setEnrolledViewMode(mode);
    localStorage.setItem("enrolledCourseViewMode", mode);
  }

  function refreshEnrolledCourses() {
    setLoadingEnrolled(true);
    setEnrolledError("");
    setReloadEnrolledKey((currentValue) => currentValue + 1);
  }

  useEffect(() => {
    let mounted = true;

    courseService
      .getMyCourses()
      .then((data) => {
        if (!mounted) return;

        setEnrolledCourses(
          Array.isArray(data) ? data.map(normalizeEnrolledCourse) : [],
        );
        setEnrolledError("");
      })
      .catch((error) => {
        if (!mounted) return;

        setEnrolledError(
          error?.message ||
            "My Courses API is not available yet. This section will be connected when enrollment API is ready.",
        );
        setEnrolledCourses([]);
      })
      .finally(() => {
        if (!mounted) return;

        setLoadingEnrolled(false);
      });

    return () => {
      mounted = false;
    };
  }, [reloadEnrolledKey]);

  const enrolledCategories = useMemo(() => {
    const categoryMap = new Map();

    enrolledCourses.forEach((course) => {
      const category = course.category;

      if (!category?.slug) {
        return;
      }

      categoryMap.set(category.slug, {
        id: category.id || category.slug,
        name: category.name || "Course",
        slug: category.slug,
      });
    });

    return Array.from(categoryMap.values());
  }, [enrolledCourses]);

  const filteredEnrolledCourses = useMemo(() => {
    const keyword = enrolledKeyword.trim().toLowerCase();

    return enrolledCourses.filter((course) => {
      const title = course.title?.toLowerCase() || "";
      const description = course.description?.toLowerCase() || "";
      const categoryName = course.category?.name?.toLowerCase() || "";
      const categorySlug = course.category?.slug || "";

      const matchesKeyword =
        !keyword ||
        title.includes(keyword) ||
        description.includes(keyword) ||
        categoryName.includes(keyword);

      const matchesCategory =
        !enrolledCategorySlug || categorySlug === enrolledCategorySlug;

      return matchesKeyword && matchesCategory;
    });
  }, [enrolledCourses, enrolledKeyword, enrolledCategorySlug]);

  return (
    <main className="course-page">
      <section className="my-courses-hero">
        <span className="course-hero__eyebrow">Learning space</span>
        <h1>My Courses</h1>
        <p>
          Continue enrolled courses or browse the course catalog in one place.
        </p>
      </section>

      <section className="my-courses-tabs">
        <button
          type="button"
          className={activeTab === TAB_ENROLLED ? "is-active" : ""}
          onClick={() => setActiveTab(TAB_ENROLLED)}
        >
          <GraduationCap size={18} />
          Enrolled Courses
        </button>

        <button
          type="button"
          className={activeTab === TAB_CATALOG ? "is-active" : ""}
          onClick={() => setActiveTab(TAB_CATALOG)}
        >
          <BookOpen size={18} />
          Course Catalog
        </button>
      </section>

      {activeTab === TAB_ENROLLED && (
        <section className="my-courses-section">
          <div className="my-courses-section__header">
            <div>
              <h2>Enrolled Courses</h2>
              <p>Courses that you have enrolled in or have access to.</p>
            </div>

            <button
              type="button"
              className="my-courses-section__refresh"
              onClick={refreshEnrolledCourses}
              disabled={loadingEnrolled}
            >
              <RotateCcw size={16} />
              Refresh
            </button>
          </div>

          {loadingEnrolled && (
            <div className="course-state">
              <p>Loading enrolled courses...</p>
            </div>
          )}

          {!loadingEnrolled && enrolledError && (
            <div className="course-state course-state--error">
              <p>{enrolledError}</p>
              <button type="button" onClick={refreshEnrolledCourses}>
                Try again
              </button>
            </div>
          )}

          {!loadingEnrolled && !enrolledError && enrolledCourses.length > 0 && (
            <>
              <CourseFilters
                keyword={enrolledKeyword}
                categorySlug={enrolledCategorySlug}
                categories={enrolledCategories}
                onKeywordChange={setEnrolledKeyword}
                onCategoryChange={setEnrolledCategorySlug}
              />

              <CourseListToolbar
                totalElements={filteredEnrolledCourses.length}
                viewMode={enrolledViewMode}
                onViewModeChange={handleEnrolledViewModeChange}
              />
            </>
          )}

          {!loadingEnrolled &&
            !enrolledError &&
            enrolledCourses.length === 0 && (
              <div className="course-state">
                <h3>No enrolled courses yet</h3>
                <p>
                  You have not enrolled in any course. Open the Course Catalog
                  tab to explore available courses.
                </p>
                <button type="button" onClick={() => setActiveTab(TAB_CATALOG)}>
                  Browse course catalog
                </button>
              </div>
            )}

          {!loadingEnrolled &&
            !enrolledError &&
            enrolledCourses.length > 0 &&
            filteredEnrolledCourses.length === 0 && (
              <div className="course-state">
                <h3>No matching enrolled courses</h3>
                <p>Try another keyword or category.</p>
                <button
                  type="button"
                  onClick={() => {
                    setEnrolledKeyword("");
                    setEnrolledCategorySlug("");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}

          {!loadingEnrolled &&
            !enrolledError &&
            filteredEnrolledCourses.length > 0 && (
              <div
                className={`enrolled-course-list enrolled-course-list--${enrolledViewMode}`}
              >
                {filteredEnrolledCourses.map((course) => (
                  <EnrolledCourseCard
                    key={course.enrollmentId || course.id || course.slug}
                    course={course}
                    viewMode={enrolledViewMode}
                  />
                ))}
              </div>
            )}
        </section>
      )}

      {activeTab === TAB_CATALOG && (
        <section className="my-courses-section">
          <div className="my-courses-section__header">
            <div>
              <h2>Course Catalog</h2>
            </div>
          </div>

          <CourseListPage
            embedded
            showHero={false}
            pageSize={6}
            excludeEnrolled={true}
            detailState={{
              from: "/learning/courses",
              backLabel: "Back to My Courses",
            }}
          />
        </section>
      )}
    </main>
  );
}
