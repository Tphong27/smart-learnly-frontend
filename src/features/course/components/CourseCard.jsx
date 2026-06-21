import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Layers3, Star } from "lucide-react";
import {
  formatVnd,
  getDiscountPercent,
  getDisplayPrice,
  getOriginalPrice,
  hasValidDiscount,
} from "../utils/course-price";
import "../course.css";

function getCoursePath(course) {
  return `/courses/${course.slug || course.id}`;
}

export function CourseCard({ course, viewMode = "grid", detailState }) {
  const title = course.title || "Untitled course";
  const shortDescription = course.description || "No description available.";

  const avatarUrl = course.avatarUrl;
  const categoryName = course.category?.name || "Course";
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

  const originalPrice = getOriginalPrice(course);
  const displayPrice = getDisplayPrice(course);
  const hasDiscount = hasValidDiscount(course);
  const discountPercent = getDiscountPercent(course);

  return (
    <article className={`course-card course-card--${viewMode}`}>
      <Link
        to={getCoursePath(course)}
        state={detailState}
        className="course-card__media"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={title}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
              event.currentTarget
                .closest(".course-card__media")
                ?.classList.add("course-card__media--fallback");
            }}
          />
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
          {course.rating && (
            <span>
              <Star size={15} />
              {course.rating}
            </span>
          )}
        </div>

        <div className="course-card__footer">
          <div className="course-card__price-block">
            {hasDiscount ? (
              <>
                <div className="course-card__price-row">
                  <strong className="course-card__price-current">
                    <span>Discount price</span>
                    {formatVnd(displayPrice)}
                  </strong>

                  <span className="course-card__discount-badge">
                    -{discountPercent}%
                  </span>
                </div>

                <span className="course-card__price-original">
                  <span>Original price</span>
                  <s>{formatVnd(originalPrice)}</s>
                </span>
              </>
            ) : (
              <strong className="course-card__price-current">
                <span>Course price</span>
                {formatVnd(displayPrice)}
              </strong>
            )}
          </div>

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
