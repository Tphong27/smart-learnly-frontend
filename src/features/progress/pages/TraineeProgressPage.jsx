import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Flame, GraduationCap, Layers3 } from "lucide-react";
import { traineeProgressService } from "@/services";
import { ProgressBar } from "../components/ProgressBar";
import { ProgressStatCard } from "../components/ProgressStatCard";
import { CourseProgressSection } from "../components/CourseProgressSection";
import "../TraineeProgressPage.css";

export function TraineeProgressPage() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const totalLessons = useMemo(() => {
    if (!progress?.courses?.length) return 0;

    return progress.courses.reduce(
      (sum, course) => sum + Number(course.lesson.total || 0),
      0,
    );
  }, [progress]);

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

            <ProgressStatCard
              icon={Layers3}
              label="Total Lessons"
              value={totalLessons}
              helper="Across all courses"
            />
          </section>

          <CourseProgressSection
            title="In Progress Courses"
            description="Courses that you are currently learning."
            courses={progress.inProgressCourseItems}
          />

          <CourseProgressSection
            title="Completed Courses"
            description="Courses that you have completed."
            courses={progress.completedCourseItems}
          />
        </>
      )}
    </main>
  );
}