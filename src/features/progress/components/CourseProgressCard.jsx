import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
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
  const [expanded, setExpanded] = useState(true);
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
  console.log("CourseProgressCard:", {
    courseId: course?.courseId,
    lesson: course?.lesson,
    quiz: course?.quiz,
    flashcard: course?.flashcard,
    assignment: course?.assignment,
  });

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

            {course.className ? (
              <span className="course-progress-card__class">
                Class: {course.className}
              </span>
            ) : (
              <span className="course-progress-card__class course-progress-card__class--missing">
                No class selected
              </span>
            )}

            <Link to={learningPath} className="course-progress-card__overall">
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
            completed={lesson.completed}
            total={lesson.total}
            percent={lesson.percent}
            to={learningPath}
          />

          <ProgressMetric
            label="Quiz"
            completed={quiz.completed}
            total={quiz.total}
            percent={quiz.percent}
            to="/learning/tests"
          />

          <ProgressMetric
            label="Flashcard"
            completed={flashcard.completed}
            total={flashcard.total}
            percent={flashcard.percent}
            to={`/learning/flashcards?courseId=${course.courseId}`}
          />

          <ProgressMetric
            label="Assignment"
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
