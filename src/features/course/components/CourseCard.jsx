import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Flame } from "lucide-react";
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

export function CourseCard({
  course,
  viewMode = "grid",
  detailState,
  highlightLabel = "",
}) {
  const title = course.title || "Untitled course";
  const shortDescription = course.description || "No description available.";
  const avatarUrl = course.avatarUrl;
  const categoryName = course.category?.name || "Course";
  const originalPrice = getOriginalPrice(course);
  const displayPrice = getDisplayPrice(course);
  const hasDiscount = hasValidDiscount(course);
  const discountPercent = getDiscountPercent(course);

  return (
    <article className={`course-card course-card--catalog course-card--${viewMode}${highlightLabel ? " course-card--highlighted" : ""}`}>
      <Link to={getCoursePath(course)} state={detailState} className="course-card__media">
        {highlightLabel ? (
          <span className="course-card__highlight">
            <Flame size={15} aria-hidden="true" />
            {highlightLabel}
          </span>
        ) : null}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={title}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
              event.currentTarget.closest(".course-card__media")?.classList.add("course-card__media--fallback");
            }}
          />
        ) : (
          <div className="course-card__placeholder">
            <BookOpen size={32} />
          </div>
        )}
      </Link>

      <div className="course-card__body">
        <div className="course-card__top">
          <span className="course-card__category">{categoryName}</span>
          <h3>
            <Link
              to={getCoursePath(course)}
              state={detailState}
              className="course-card__title-link"
            >
              {title}
            </Link>
          </h3>
          <p>{shortDescription}</p>
        </div>

        <div className="course-card__footer">
          {hasDiscount ? (
            <>
              <span className="course-card__price-original">{formatVnd(originalPrice)}</span>
              <div className="course-card__price-row">
                <div className="course-card__price-left">
                  <span className="course-card__price-current">{formatVnd(displayPrice)}</span>
                  <span className="course-card__discount-badge">-{discountPercent}%</span>
                </div>
                <Link to={getCoursePath(course)} state={detailState} className="course-card__link">
                  View course <ArrowRight size={15} />
                </Link>
              </div>
            </>
          ) : (
            <div className="course-card__price-row">
              <span className="course-card__price-current">{formatVnd(displayPrice)}</span>
              <Link to={getCoursePath(course)} state={detailState} className="course-card__link">
                View course <ArrowRight size={15} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
