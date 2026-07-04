import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Lock,
  UserRound,
  Users,
} from "lucide-react";

function getCourseDetailPath(course) {
  return `/courses/${course.slug || course.id}`;
}

function getLearningWorkspacePath(course) {
  const enrolledClass = getEnrolledClass(course);
  const basePath = `/learning/courses/${course.id}`;

  if (!enrolledClass?.id) {
    return basePath;
  }

  return `${basePath}?classId=${encodeURIComponent(enrolledClass.id)}`;
}

function getCategoryName(course) {
  return course.category?.name || "Course";
}

function getCourseImage(course) {
  return course.avatarUrl || "";
}

function getEnrolledClass(course) {
  return course.enrolledClass || null;
}

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) {
    return "";
  }

  if (startDate && endDate) {
    return `${startDate} → ${endDate}`;
  }

  return startDate || endDate;
}

function formatSchedule(scheduleDescription) {
  if (!scheduleDescription) return "";

  try {
    const schedules = JSON.parse(scheduleDescription);

    if (!Array.isArray(schedules)) {
      return scheduleDescription;
    }

    return schedules
      .map((item) => {
        const day = item.dayOfWeek || "";
        const slots = Array.isArray(item.slots) ? item.slots : [];

        const slotText = slots
          .map((slot) => `${slot.startTime} - ${slot.endTime}`)
          .join(", ");

        return [day, slotText].filter(Boolean).join(" • ");
      })
      .join("; ");
  } catch {
    return scheduleDescription;
  }
}

export function EnrolledCourseCard({ course, viewMode = "grid" }) {
  const title = course.title || "Untitled course";
  const description = course.description || "No description available.";
  const categoryName = getCategoryName(course);
  const imageUrl = getCourseImage(course);

  const enrolledClass = getEnrolledClass(course);
  const classDateRange = enrolledClass
    ? formatDateRange(enrolledClass.startDate, enrolledClass.endDate)
    : "";
  const classSchedule = enrolledClass
    ? formatSchedule(enrolledClass.scheduleDescription)
    : "";

  const accessAllowed = course.accessAllowed !== false;

  return (
    <article
      className={`enrolled-course-card enrolled-course-card--${viewMode}`}
    >
      <div className="course-card__media">
        {imageUrl ? (
          <img src={imageUrl} alt={title} loading="lazy" />
        ) : (
          <div className="course-card__placeholder">
            <BookOpen size={34} />
          </div>
        )}
      </div>

      <div className="enrolled-course-card__body">
        <div className="enrolled-course-card__top">
          <span className="enrolled-course-card__label">
            <GraduationCap size={15} />
            {categoryName}
          </span>

          {course.enrollmentStatus && (
            <span className="enrolled-course-card__status">
              {course.enrollmentStatus}
            </span>
          )}
        </div>

        <h3 className="enrolled-course-card__title">{title}</h3>

        <p className="enrolled-course-card__description">{description}</p>

        {enrolledClass && (
          <div className="enrolled-course-card__class-compact">
            <div className="enrolled-course-card__class-main">
              <span className="enrolled-course-card__class-kicker">
                Your class
              </span>

              <div className="enrolled-course-card__class-title-row">
                <h4>{enrolledClass.className || "Unnamed class"}</h4>

                {enrolledClass.status && (
                  <span className="enrolled-course-card__class-status">
                    {enrolledClass.status}
                  </span>
                )}
              </div>
            </div>

            <div className="enrolled-course-card__class-details">
              {enrolledClass.trainerName && (
                <span>
                  <UserRound size={14} />
                  {enrolledClass.trainerName}
                </span>
              )}

              {classDateRange && (
                <span>
                  <CalendarDays size={14} />
                  {classDateRange}
                </span>
              )}

              {classSchedule && (
                <span>
                  <CalendarDays size={14} />
                  {classSchedule}
                </span>
              )}

              {Number.isFinite(Number(enrolledClass.maxStudents)) && (
                <span>
                  <Users size={14} />
                  {Number(enrolledClass.activeEnrollmentCount || 0)}/
                  {enrolledClass.maxStudents}
                </span>
              )}
            </div>
          </div>
        )}

        {!accessAllowed && (
          <div className="enrolled-course-card__blocked">
            <Lock size={15} />
            {course.accessBlockedReason ||
              "Course access is currently blocked."}
          </div>
        )}

        <div className="enrolled-course-card__actions">
          <Link
            to={getLearningWorkspacePath(course)}
            className={`enrolled-course-card__button enrolled-course-card__button--primary ${
              !accessAllowed ? "is-disabled" : ""
            }`}
            aria-disabled={!accessAllowed}
            onClick={(event) => {
              if (!accessAllowed) {
                event.preventDefault();
              }
            }}
          >
            Learning
          </Link>

          <Link
            to={getCourseDetailPath(course)}
            state={{
              from: "/dashboard",
              backLabel: "Back to Dashboard",
            }}
            className="course-card__link"
          >
            View course <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}
