import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, RefreshCw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { courseService } from "@/services/course.service";
import { StaffFlashTestListPage } from "./StaffFlashTestListPage";
import "../flashtest.css";

function courseIdOf(course) {
  return course?.id || course?.courseId || course?.uuid || "";
}

export function StaffTestListPage() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId") || "";
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(!courseId);
  const [error, setError] = useState("");

  useEffect(() => {
    if (courseId) return undefined;
    let cancelled = false;
    async function loadCourses() {
      setLoading(true);
      setError("");
      try {
        const result = await courseService.listAdmin({ page: 0, size: 100 });
        if (!cancelled) setCourses(result?.items || []);
      } catch (requestError) {
        if (!cancelled) setError(requestError?.message || "Could not load courses.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadCourses();
    return () => { cancelled = true; };
  }, [courseId]);

  if (courseId) return <StaffFlashTestListPage variant="test" />;

  return (
    <section className="ft-page ft-page--staff-list">
      <header className="ft-staff-hero">
        <div className="ft-staff-hero__content">
          <span className="ft-page-kicker">Trainer workspace</span>
          <h1 className="ft-page-title">Test Management</h1>
          <p className="ft-page-subtitle">Select a course to manage its tests.</p>
        </div>
      </header>

      <div className="ft-panel ft-ops-panel">
        {loading ? (
          <div className="ft-empty"><RefreshCw className="ft-spin" size={28} /><strong>Loading courses...</strong></div>
        ) : error ? (
          <div className="ft-empty"><strong>{error}</strong></div>
        ) : courses.length === 0 ? (
          <div className="ft-empty"><BookOpen size={28} /><strong>No courses available</strong></div>
        ) : (
          <div className="ft-table-wrap ft-table-wrap--ops">
            <table className="ft-table">
              <thead><tr><th>Course title</th><th>Category</th><th>SME</th><th>Status</th><th className="ft-table-action">Action</th></tr></thead>
              <tbody>
                {courses.map((course) => {
                  const id = courseIdOf(course);
                  return (
                    <tr key={id}>
                      <td><div className="ft-table-title"><strong>{course.title || course.courseTitle || "Untitled course"}</strong><span>{course.code || "--"}</span></div></td>
                      <td>{course.categoryName || course.category?.name || "--"}</td>
                      <td>{course.smeName || course.sme?.fullName || "--"}</td>
                      <td><span className="ft-badge">{course.status || "--"}</span></td>
                      <td className="ft-table-action"><Link className="ft-button ft-button--secondary" to={`/staff/tests?courseId=${id}`}><span>Tests</span><ArrowRight size={15} /></Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
