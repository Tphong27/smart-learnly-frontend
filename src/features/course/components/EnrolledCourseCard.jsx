import { Link } from "react-router-dom";
import { BookOpen, GraduationCap, Lock, ArrowRight } from "lucide-react";

function getCourseDetailPath(course) {
  return `/courses/${course.slug || course.id}`;
}

function getLearningWorkspacePath(course) {
  return `/learning?courseId=${course.id}`;
}

function getCategoryName(course) {
  return course.category?.name || "Course";
}

function getCourseImage(course) {
  return course.avatarUrl || "";
}

export function EnrolledCourseCard({ course, viewMode = "grid" }) {
  const title = course.title || "Untitled course";
  const description = course.description || "No description available.";
  const categoryName = getCategoryName(course);
  const imageUrl = getCourseImage(course);

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
              from: "/learning/courses",
              backLabel: "Back to My Courses",
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
