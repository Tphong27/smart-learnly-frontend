import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Clock3, Layers3, Star } from "lucide-react";

function formatPrice(course) {
  if (Number(course.price) === 0) {
    return "Free";
  }

  const price = course.discountedPrice ?? course.price;

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(price || 0));
}

function getCoursePath(course) {
  return `/courses/${course.slug || course.id}`;
}

export function CourseCard({ course, viewMode = "grid", detailState }) {
  const title = course.title || "Untitled course";
  const shortDescription =
    course.shortDescription ||
    course.description ||
    "No description available.";

  const thumbnailUrl = course.thumbnailUrl;
  const categoryName = course.category?.name || course.categoryName || "Course";
  const modules = Array.isArray(course.modules) ? course.modules : [];

  const moduleCount = Number(
    course.moduleCount ?? course.totalModules ?? modules.length ?? 0,
  );

  const lessonCount = Number(
    course.lessonCount ??
      course.totalLessons ??
      modules.reduce((sum, module) => sum + (module.lessons?.length || 0), 0) ??
      0,
  );

  const durationText = course.durationText || course.duration || "Self-paced";

  return (
    <article className={`course-card course-card--${viewMode}`}>
      <Link
        to={getCoursePath(course)}
        state={detailState}
        className="course-card__media"
      >
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title} />
        ) : (
          <div className="course-card__placeholder">
            <BookOpen size={32} />
          </div>
        )}
      </Link>

      <div className="course-card__body">
        <div className="course-card__meta">
          <span>{categoryName}</span>
          {course.level && <span>{course.level}</span>}
        </div>

        <h3>
          <Link to={getCoursePath(course)} state={detailState}>
            {title}
          </Link>
        </h3>

        <p>{shortDescription}</p>

        <div className="course-card__details">
          <span>
            <Layers3 size={15} />
            {moduleCount} {moduleCount === 1 ? "module" : "modules"}
          </span>

          <span>
            <BookOpen size={15} />
            {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
          </span>
          <span>
            <Clock3 size={15} />
            {durationText}
          </span>
          {course.rating && (
            <span>
              <Star size={15} />
              {course.rating}
            </span>
          )}
        </div>

        <div className="course-card__footer">
          <strong>{formatPrice(course)}</strong>
          <Link
            to={getCoursePath(course)}
            state={detailState}
            className="course-card__link"
          >
            View course <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}
