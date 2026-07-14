import { useId, useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { ProgressBar } from "./ProgressBar";
import { ProgressMetric } from "./ProgressMetric";

function getLearningPath(course) {
  const courseId = course.courseId || course.id;

  if (!courseId) {
    return "/learning/progress";
  }

  if (!course.classId) {
    return `/learning/courses/${courseId}`;
  }

  const params = new URLSearchParams();
  params.set("classId", course.classId);

  return `/learning/courses/${courseId}?${params.toString()}`;
}

export function CourseProgressCard({ course }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const isCompleted = course.courseStatus === "COMPLETED";
  const learningPath = getLearningPath(course);

  const lesson = course.lesson ?? {
    completed: 0,
    total: 0,
    percent: 0,
  };

  const quiz = course.quiz ?? {
    completed: 0,
    total: 0,
    percent: 0,
  };

  const flashcard = course.flashcard ?? {
    completed: 0,
    total: 0,
    percent: 0,
  };

  const assignment = course.assignment ?? {
    completed: 0,
    total: 0,
    percent: 0,
  };
  return (
    <article className="course-progress-card">
      <div className="course-progress-card__top">
        <div className="course-progress-card__thumbnail">
          {course.thumbnailUrl ? (
            <img src={course.thumbnailUrl} alt="" loading="lazy" />
          ) : (
            <BookOpen size={28} aria-hidden="true" />
          )}
        </div>

        <div className="course-progress-card__info">
          <div className="course-progress-card__heading-row">
            <div>
              <p className="course-progress-card__meta">
                <span>{course.categoryName}</span>
                {course.className ? ` · ${course.className}` : ""}
              </p>
              <h3>{course.title}</h3>
            </div>

            <span
              className={
                isCompleted
                  ? "course-status-badge course-status-badge--completed"
                  : "course-status-badge course-status-badge--progress"
              }
            >
              {isCompleted ? "Completed" : "In progress"}
            </span>
          </div>

          <div className="course-progress-card__progress-row">
            <div className="course-progress-card__progress-copy">
              <span>Course progress</span>
              <strong>{course.overallPercent}%</strong>
            </div>
            <ProgressBar
              value={course.overallPercent}
              label={`${course.title} progress: ${course.overallPercent}%`}
            />
          </div>

          <ul className="course-progress-card__metric-summary">
            <li>{lesson.completed}/{lesson.total} lessons</li>
            <li>{quiz.completed}/{quiz.total} quizzes</li>
            <li>{flashcard.completed}/{flashcard.total} flashcards</li>
            <li>{assignment.completed}/{assignment.total} assignments</li>
          </ul>

          {!course.accessAllowed && (
            <p className="course-progress-card__access-note">
              {course.accessBlockedReason || "Course access is currently unavailable."}
            </p>
          )}

          <div className="course-progress-card__actions">
            {course.accessAllowed && (
              <Button to={learningPath} size="sm">
                {isCompleted ? "Review course" : "Continue learning"}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="course-progress-card__details-button"
              onClick={() => setExpanded((current) => !current)}
              aria-expanded={expanded}
              aria-controls={detailsId}
              rightIcon={
                <ChevronDown
                  size={17}
                  className={expanded ? "is-expanded" : undefined}
                  aria-hidden="true"
                />
              }
            >
              {expanded ? "Hide details" : "View details"}
            </Button>
          </div>
        </div>
      </div>

      {expanded && (
        <div
          className="course-progress-card__metrics"
          id={detailsId}
          aria-label={`${course.title} progress details`}
        >
          <ProgressMetric
            label="Lessons"
            completed={lesson.completed}
            total={lesson.total}
            percent={lesson.percent}
            to={learningPath}
          />

          <ProgressMetric
            label="Quizzes"
            completed={quiz.completed}
            total={quiz.total}
            percent={quiz.percent}
            to="/learning/tests"
          />

          <ProgressMetric
            label="Flashcards"
            completed={flashcard.completed}
            total={flashcard.total}
            percent={flashcard.percent}
            to={`/learning/flashcards?courseId=${course.courseId}`}
          />

          <ProgressMetric
            label="Assignments"
            completed={assignment.completed}
            total={assignment.total}
            percent={assignment.percent}
            to={`/learning/assignments?courseId=${course.courseId}`}
          />
        </div>
      )}
    </article>
  );
}
