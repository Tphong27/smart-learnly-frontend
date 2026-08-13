import { useEffect, useState } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { courseAdminService } from "@/features/course";
import { StatusBadge } from "@/shared/components/status";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Table,
} from "@/shared/components/ui";
import { StaffAssessmentListPage } from "./StaffAssessmentListPage";
import "../test.css";

/** Lấy course ID từ các biến thể payload. */
function courseIdOf(course) {
  return course?.id || course?.courseId || course?.uuid || "";
}

/** Yêu cầu staff chọn course trước khi quản lý danh sách test. */
export function StaffTestListPage() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId") || "";
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(!courseId);
  const [error, setError] = useState("");

  useEffect(() => {
    if (courseId) return undefined;
    let cancelled = false;
    /** Tải danh sách course dùng cho bước chọn phạm vi test. */
    async function loadCourses() {
      setLoading(true);
      setError("");
      try {
        const result = await courseAdminService.list({ page: 0, size: 100 });
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

  if (courseId) return <StaffAssessmentListPage variant="test" />;

  return (
    <section className="ft-page ft-page--staff-list">
      <header className="ft-staff-hero">
        <div className="ft-staff-hero__content">
          <span className="ft-page-kicker">Trainer workspace</span>
          <h1 className="ft-page-title">Manage test</h1>
          <p className="ft-page-subtitle">Select a course to manage its tests.</p>
        </div>
      </header>

      <div className="ft-panel ft-ops-panel">
        {loading ? (
          <LoadingState label="Loading courses..." />
        ) : error ? (
          <ErrorState title="Could not load courses" description={error} />
        ) : courses.length === 0 ? (
          <EmptyState icon={<BookOpen size={28} />} title="No courses available" />
        ) : (
          <Table
            className="ft-table-wrap ft-table-wrap--ops"
            tableClassName="ft-table"
            ariaLabel="Courses available for test management"
          >
              <thead><tr><th>Course title</th><th>Category</th><th>SME</th><th>Status</th><th className="ft-table-action">Action</th></tr></thead>
              <tbody>
                {courses.map((course) => {
                  const id = courseIdOf(course);
                  return (
                    <tr key={id}>
                      <td data-label="Course title"><div className="ft-table-title"><strong>{course.title || course.courseTitle || "Untitled course"}</strong><span>{course.code || "--"}</span></div></td>
                      <td data-label="Category">{course.categoryName || course.category?.name || "--"}</td>
                      <td data-label="SME">{course.smeName || course.sme?.fullName || "--"}</td>
                      <td data-label="Status"><StatusBadge status={course.status || "draft"} label={course.status || "--"} /></td>
                      <td data-label="Action" className="ft-table-action"><Button variant="secondary" size="sm" to={`/staff/tests?courseId=${id}`} rightIcon={<ArrowRight size={15} />}>Tests</Button></td>
                    </tr>
                  );
                })}
              </tbody>
          </Table>
        )}
      </div>
    </section>
  );
}
