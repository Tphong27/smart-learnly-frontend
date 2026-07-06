import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Lock,
} from "lucide-react";
import { EnrolledClassDetailPopup } from "./EnrolledClassDetailPopup";

function getCourseDetailPath(course) {
  return `/courses/${course.slug || course.id}`;
}

function getLearningWorkspacePath(course) {
  const enrolledClass = getEnrolledClass(course);
  const courseId = course.id || course.courseId;
  const params = new URLSearchParams();

  if (enrolledClass?.id) {
    params.set("classId", enrolledClass.id);
  }

  const query = params.toString();

  return query
    ? `/learning/courses/${courseId}?${query}`
    : `/learning/courses/${courseId}`;
}

function getCategoryName(course) {
  return course.category?.name || "Course";
}

function getCourseImage(course) {
  return course.avatarUrl || "";
}

function getEnrolledClass(course) {
  return course.enrolledClass || course.myCourseClass || null;
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

function buildClassSummary(enrolledClass) {
  if (!enrolledClass) {
    return "";
  }

  const className = enrolledClass.className || "Unnamed class";
  const trainerName = enrolledClass.trainerName || "Trainer not assigned";

  return `${className} • ${trainerName}`;
}

export function EnrolledCourseCard({ course, viewMode = "grid" }) {
  const [classPopupOpen, setClassPopupOpen] = useState(false);

  const title = course.title || "Untitled course";
  const description = course.description || "No description available.";
  const categoryName = getCategoryName(course);
  const imageUrl = getCourseImage(course);

  const enrolledClass = getEnrolledClass(course);
  const classDateRange = enrolledClass
    ? formatDateRange(enrolledClass.startDate, enrolledClass.endDate)
    : "";
  const classSummary = buildClassSummary(enrolledClass);

  const accessAllowed = course.accessAllowed !== false;

  return (
    <>
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
            <div className="enrolled-course-card__class-compact enrolled-course-card__class-compact--inline">
              <div className="enrolled-course-card__class-inline-info">
                <span className="enrolled-course-card__class-kicker">
                  Your class
                </span>

                <span className="enrolled-course-card__class-inline-text">
                  {classSummary}
                </span>
              </div>

              <button
                type="button"
                className="enrolled-course-card__class-detail-button"
                onClick={() => setClassPopupOpen(true)}
              >
                View detail
              </button>
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
      {classPopupOpen && enrolledClass && (
        <EnrolledClassDetailPopup
          enrolledClass={enrolledClass}
          classDateRange={classDateRange}
          onClose={() => setClassPopupOpen(false)}
        />
      )}
    </>
  );
}
