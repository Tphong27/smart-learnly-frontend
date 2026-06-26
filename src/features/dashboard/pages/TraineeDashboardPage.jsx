import { useEffect, useMemo, useState } from "react";
import { BookOpen, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import { courseService } from "@/services";
import { EnrolledCourseCard } from "@/features/course";
import { CourseFilters } from "@/features/course/components/CourseFilters";
import { CourseListToolbar } from "@/features/course/components/CourseListToolbar";
import "@/features/course/course.css";
import "./TraineeDashboardPage.css";

function normalizeEnrolledCourse(course) {
  return {
    ...course,
    avatarUrl: course.avatarUrl,
    categoryName: course.category?.name,
  };
}

export function TraineeDashboardPage() {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [viewMode, setViewMode] = useState(
    localStorage.getItem("traineeDashboardCourseViewMode") || "grid",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadEnrolledCourses() {
      setLoading(true);
      setError("");

      try {
        const data = await courseService.getMyCourses();

        if (!mounted) return;

        setEnrolledCourses(
          Array.isArray(data) ? data.map(normalizeEnrolledCourse) : [],
        );
      } catch (err) {
        if (!mounted) return;

        setError(err?.message || "Could not load your enrolled courses.");
        setEnrolledCourses([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadEnrolledCourses();

    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const map = new Map();

    enrolledCourses.forEach((course) => {
      const category = course.category;

      if (!category?.slug) return;

      map.set(category.slug, {
        id: category.id || category.slug,
        name: category.name || "Course",
        slug: category.slug,
      });
    });

    return Array.from(map.values());
  }, [enrolledCourses]);

  const filteredCourses = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return enrolledCourses.filter((course) => {
      const title = course.title?.toLowerCase() || "";
      const description = course.description?.toLowerCase() || "";
      const categoryName = course.category?.name?.toLowerCase() || "";
      const currentCategorySlug = course.category?.slug || "";

      const matchesKeyword =
        !normalizedKeyword ||
        title.includes(normalizedKeyword) ||
        description.includes(normalizedKeyword) ||
        categoryName.includes(normalizedKeyword);

      const matchesCategory =
        !categorySlug || currentCategorySlug === categorySlug;

      return matchesKeyword && matchesCategory;
    });
  }, [enrolledCourses, keyword, categorySlug]);

  function handleViewModeChange(nextMode) {
    setViewMode(nextMode);
    localStorage.setItem("traineeDashboardCourseViewMode", nextMode);
  }

  return (
    <main className="trainee-dashboard-page">
      <section className="trainee-dashboard-hero">
        <span className="course-hero__eyebrow">Dashboard</span>
        <h1>Welcome back to your learning space</h1>
        <p>
          Continue your enrolled courses, track your learning access, and open
          your course workspace.
        </p>
      </section>

      <section className="trainee-dashboard-section">
        <div className="my-courses-section__header">
          <div>
            <h2>My Enrolled Courses</h2>
            <p>Courses that you have enrolled in or have active access to.</p>
          </div>
        </div>

        {loading && (
          <div className="course-state">
            <p>Loading your enrolled courses...</p>
          </div>
        )}

        {!loading && error && (
          <div className="course-state course-state--error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && enrolledCourses.length > 0 && (
          <div className="trainee-dashboard-toolbar">
            <CourseFilters
              keyword={keyword}
              categorySlug={categorySlug}
              categories={categories}
              onKeywordChange={setKeyword}
              onCategoryChange={setCategorySlug}
            />

            <CourseListToolbar
              totalElements={filteredCourses.length}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />
          </div>
        )}

        {!loading && !error && enrolledCourses.length === 0 && (
          <div className="course-state">
            <GraduationCap size={32} />
            <h3>No enrolled courses yet</h3>
            <p>You have not enrolled in any course yet.</p>
            <Link to="/learning/courses" className="button button--primary">
              Browse Course Catalog
            </Link>
          </div>
        )}

        {!loading &&
          !error &&
          enrolledCourses.length > 0 &&
          filteredCourses.length === 0 && (
            <div className="course-state">
              <h3>No matching enrolled courses</h3>
              <p>Try another keyword or category.</p>
              <button
                type="button"
                onClick={() => {
                  setKeyword("");
                  setCategorySlug("");
                }}
              >
                Clear filters
              </button>
            </div>
          )}

        {!loading && !error && filteredCourses.length > 0 && (
          <div
            className={`enrolled-course-list enrolled-course-list--${viewMode}`}
          >
            {filteredCourses.map((course) => (
              <EnrolledCourseCard
                key={course.enrollmentId || course.id || course.slug}
                course={course}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </section>

      <section className="trainee-dashboard-cta">
        <div>
          <h3>Explore more courses</h3>
          <p>Find another course that matches your next learning goal.</p>
        </div>

        <Link
          to="/learning/courses"
          className="button button--primary button--md"
        >
          <BookOpen size={16} />
          Open Course Catalog
        </Link>
      </section>
    </main>
  );
}
