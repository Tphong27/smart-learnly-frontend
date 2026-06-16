import { useEffect, useState } from "react";
import { BookOpen, GraduationCap } from "lucide-react";
import { CourseCard } from "../components/CourseCard";
import { CourseListPage } from "./CourseListPage";
import { courseService } from "@/services";
import "../course.css";

const TAB_ENROLLED = "enrolled";
const TAB_CATALOG = "catalog";
const ENABLE_MY_COURSES_API = import.meta.env.VITE_ENABLE_MY_COURSES_API === "true";

export function MyCoursesPage() {
  const [activeTab, setActiveTab] = useState(TAB_ENROLLED);

  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(false);
  const [enrolledError, setEnrolledError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadEnrolledCourses() {
      if (!ENABLE_MY_COURSES_API) {
        setEnrolledCourses([]);
        setEnrolledError("");
        return;
      }

      setLoadingEnrolled(true);
      setEnrolledError("");

      try {
        const data = await courseService.getMyCourses();

        if (mounted) {
          setEnrolledCourses(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (mounted) {
          setEnrolledError(
            error?.message ||
              "My Courses API is not available yet. This section will be connected when enrollment API is ready.",
          );
          setEnrolledCourses([]);
        }
      } finally {
        if (mounted) {
          setLoadingEnrolled(false);
        }
      }
    }

    loadEnrolledCourses();

    return () => {
      mounted = false;
    };
  }, []);

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
          </div>

          {loadingEnrolled && (
            <div className="course-state">
              <p>Loading enrolled courses...</p>
            </div>
          )}

          {!loadingEnrolled && enrolledError && (
            <div className="course-state course-state--error">
              <p>{enrolledError}</p>
            </div>
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

          {!loadingEnrolled && !enrolledError && enrolledCourses.length > 0 && (
            <div className="course-list course-list--grid">
              {enrolledCourses.map((course) => (
                <CourseCard
                  key={course.id || course.slug}
                  course={course}
                  viewMode="grid"
                  detailState={{
                    from: "/my-courses",
                    backLabel: "Back to My Courses",
                  }}
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
              <p>Browse published courses directly inside My Courses.</p>
            </div>
          </div>

          <CourseListPage
            embedded
            showHero={false}
            pageSize={6}
            detailState={{
              from: "/my-courses",
              backLabel: "Back to My Courses",
            }}
          />
        </section>
      )}
    </main>
  );
}
