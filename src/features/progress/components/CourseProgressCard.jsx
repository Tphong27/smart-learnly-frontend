import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  Clock3,
  ExternalLink,
} from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/shared/components/ui";
import { ProgressBar } from "./ProgressBar";
import { ProgressMetric } from "./ProgressMetric";
import { ScheduleCalendar } from "@/shared/components/scheduleCalendar";
import { formatDate } from "@/shared/utils/formatters";
import { getGoogleMeetUrl } from "@/shared/utils/googleMeetUrl";

function getLearningPath(course) {
  const courseId = course.courseId || course.id;

  if (!courseId) {
    return "/dashboard";
  }

  if (!course.classId) {
    return `/learning/courses/${courseId}`;
  }

  const params = new URLSearchParams();
  params.set("classId", course.classId);

  return `/learning/courses/${courseId}?${params.toString()}`;
}

function getScopedListPath(basePath, course) {
  const params = new URLSearchParams();
  const courseId = course.courseId || course.id;

  if (courseId) params.set("courseId", courseId);
  if (course.classId) params.set("classId", course.classId);

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function CourseProgressCard({ course }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const isCompleted = course.courseStatus === "COMPLETED";
  const isClassLearning =
    course.learningType === "CLASS" || Boolean(course.classId);
  const meetingUrl = isClassLearning
    ? getGoogleMeetUrl(course.classMeetingUrl)
    : "";

  const learningPath = getLearningPath(course);

  const learningTitle = isClassLearning
    ? course.className || "Unnamed class"
    : course.title;

  const learningTypeLabel = isClassLearning ? "Class course" : "Online course";

  const progressLabel = isClassLearning ? "Class progress" : "Course progress";

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
                <span
                  className={
                    isClassLearning
                      ? "course-learning-type course-learning-type--class"
                      : "course-learning-type course-learning-type--course"
                  }
                >
                  {learningTypeLabel}
                </span>
                <span>{course.categoryName}</span>
              </p>
              <h3>{learningTitle}</h3>

              {isClassLearning && (
                <p className="course-progress-card__parent-course">
                  Course: {course.title}
                </p>
              )}
              {isClassLearning && (
                <div className="course-progress-card__class-info">
                  {(course.classStartDate || course.classEndDate) && (
                    <div className="course-progress-card__class-info-row">
                      <CalendarDays size={15} aria-hidden="true" />

                      <span>
                        {formatDate(course.classStartDate)}
                        {course.classStartDate && course.classEndDate
                          ? " – "
                          : ""}
                        {formatDate(course.classEndDate)}
                      </span>
                    </div>
                  )}

                  <div className="course-progress-card__class-info-row">
                    <Clock3 size={15} aria-hidden="true" />

                    <ScheduleCalendar
                      scheduleDescription={course.classScheduleDescription}
                      variant="inline"
                      emptyText="Class schedule not available"
                    />
                  </div>
                </div>
              )}
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
              <span>{progressLabel}</span>
              <strong>{course.overallPercent}%</strong>
            </div>
            <ProgressBar
              value={course.overallPercent}
              label={`${learningTitle} progress: ${course.overallPercent}%`}
            />
          </div>

          <ul className="course-progress-card__metric-summary">
            <li>
              {lesson.completed}/{lesson.total} lessons
            </li>
            <li>
              {quiz.completed}/{quiz.total} quizzes
            </li>
            <li>
              {flashcard.completed}/{flashcard.total} flashcards
            </li>
            <li>
              {assignment.completed}/{assignment.total} assignments
            </li>
          </ul>

          {!course.accessAllowed && (
            <p className="course-progress-card__access-note">
              {course.accessBlockedReason ||
                "Course access is currently unavailable."}
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
            {isClassLearning && meetingUrl && (
              <Button
                href={meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                size="sm"
                rightIcon={<ExternalLink size={15} aria-hidden="true" />}
              >
                Join Meet
              </Button>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div
          className="course-progress-card__metrics"
          id={detailsId}
          aria-label={`${learningTitle} progress details`}
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
            to={getScopedListPath("/learning/tests", course)}
          />

          <ProgressMetric
            label="Flashcards"
            completed={flashcard.completed}
            total={flashcard.total}
            percent={flashcard.percent}
            to={getScopedListPath("/flashcards", course)}
          />

          <ProgressMetric
            label="Assignments"
            completed={assignment.completed}
            total={assignment.total}
            percent={assignment.percent}
            to={getScopedListPath("/learning/assignments", course)}
          />
        </div>
      )}
    </article>
  );
}
