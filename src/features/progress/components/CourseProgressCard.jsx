import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getCurrentUser } from "@/services/api-client";
import { assignmentService } from "@/services/flashtest.service";
import { ProgressBar } from "./ProgressBar";
import { ProgressMetric } from "./ProgressMetric";

function AssignmentMetric({ courseId }) {
  const [counts, setCounts] = useState({ completed: 0, total: 0 });

  useEffect(() => {
    let cancelled = false;
    async function loadAssignments() {
      const currentUser = getCurrentUser();
      const studentId =
        currentUser?.id || currentUser?.userId || currentUser?.accountId || "";
      if (!studentId || !courseId) {
        setCounts({ completed: 0, total: 0 });
        return;
      }
      try {
        const assignments = await assignmentService.getAvailable({
          courseId,
          isFlashtest: false,
        });
        const checks = await Promise.allSettled(
          assignments.map((assignment) =>
            assignmentService.getSubmissionByStudent(assignment.id, studentId),
          ),
        );
        const completed = checks.filter(
          (result) =>
            result.status === "fulfilled" &&
            ["SUBMITTED", "GRADED", "EXPIRED", "LATE"].includes(
              String(result.value?.status || "").toUpperCase(),
            ),
        ).length;
        if (!cancelled) {
          setCounts({ completed, total: assignments.length });
        }
      } catch (error) {
        if (!cancelled) setCounts({ completed: 0, total: 0 });
      }
    }
    loadAssignments();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return (
    <ProgressMetric
      label="Assignment"
      completed={counts.completed}
      total={counts.total}
      percent={0}
      hideProgress
      to={`/learning/assignments?courseId=${courseId}`}
    />
  );
}

export function CourseProgressCard({ course }) {
  const [expanded, setExpanded] = useState(true);
  const isCompleted = course.courseStatus === "COMPLETED";

  return (
    <article className="course-progress-card">
      <div className="course-progress-card__top">
        <div className="course-progress-card__identity">
          <div className="course-progress-card__thumbnail">
            {course.thumbnailUrl ? (
              <img src={course.thumbnailUrl} alt={course.title} />
            ) : (
              <BookOpen size={28} />
            )}
          </div>

          <div className="course-progress-card__info">
            <span className="course-progress-card__category">
              {course.categoryName}
            </span>

            <h3>{course.title}</h3>

            <Link
              to={`/learning/courses/${course.courseId}`}
              className="course-progress-card__overall"
            >
              <ProgressBar value={course.overallPercent} />
              <strong>{course.overallPercent}%</strong>
            </Link>
          </div>
        </div>

        <div className="course-progress-card__right">
          <span
            className={
              isCompleted
                ? "course-status-badge course-status-badge--completed"
                : "course-status-badge course-status-badge--progress"
            }
          >
            {isCompleted ? "Completed" : "In Progress"}
          </span>

          <button
            type="button"
            className="course-progress-card__toggle"
            onClick={() => setExpanded((current) => !current)}
            aria-label={
              expanded ? "Collapse progress details" : "Expand progress details"
            }
          >
            {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="course-progress-card__metrics">
          <ProgressMetric
            label="Lesson"
            completed={course.lesson.completed}
            total={course.lesson.total}
            percent={course.lesson.percent}
            to={`/learning/courses/${course.courseId}`}
          />

          <ProgressMetric
            label="Quiz"
            completed={course.quiz.completed}
            total={course.quiz.total}
            percent={course.quiz.percent}
            to="/learning/tests"
          />

          <ProgressMetric
            label="Flashcard"
            completed={course.flashcard.completed}
            total={course.flashcard.total}
            percent={course.flashcard.percent}
            to={`/learning/flashcards?courseId=${course.courseId}`}
          />

          <AssignmentMetric courseId={course.courseId} />
        </div>
      )}
    </article>
  );
}
