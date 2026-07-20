import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  UserRound,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  formatDate,
  formatPrice,
  formatStatusLabel,
  toNumber,
} from "@/shared/utils/formatters";

const CARD_DATE_OPTIONS = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

export function OpeningScheduleCard({ classItem, detailState }) {
  const availableSlots = toNumber(classItem?.availableSlots, 0);
  const price = toNumber(classItem?.price, 0);

  const isAvailable =
    String(classItem?.status || "").toUpperCase() === "UPCOMING" &&
    availableSlots > 0;

  const detailPath = `/opening-schedule/${classItem.classId}`;

  return (
    <article className="opening-card">
      <Link
        to={detailPath}
        state={detailState}
        className="opening-card__media"
        aria-label={`View ${classItem.className}`}
      >
        {classItem.courseThumbnailUrl ? (
          <img
            src={classItem.courseThumbnailUrl}
            alt={classItem.courseTitle}
            loading="lazy"
          />
        ) : (
          <div className="opening-card__image-fallback">
            <BookOpen size={36} aria-hidden="true" />
          </div>
        )}

        <span
          className={
            isAvailable
              ? "opening-card__status opening-card__status--available"
              : "opening-card__status opening-card__status--unavailable"
          }
        >
          {isAvailable
            ? "Open for registration"
            : classItem.status
              ? formatStatusLabel(classItem.status)
              : "Unavailable"}
        </span>
      </Link>

      <div className="opening-card__body">
        <div className="opening-card__top">
          <span className="opening-card__course">{classItem.courseTitle}</span>

          <h3 className="opening-card__title">
            <Link
              to={detailPath}
              state={detailState}
              className="opening-card__title-link"
            >
              {classItem.className}
            </Link>
          </h3>

          <div className="opening-card__information">
            <div className="opening-card__information-row">
              <UserRound size={16} aria-hidden="true" />
              <span>{classItem.trainerName || "Trainer not assigned"}</span>
            </div>

            <div className="opening-card__information-row">
              <CalendarDays size={16} aria-hidden="true" />
              <span>
                {formatDate(classItem.startDate, "vi-VN", CARD_DATE_OPTIONS)}
                {" – "}
                {formatDate(classItem.endDate, "vi-VN", CARD_DATE_OPTIONS)}
              </span>
            </div>

            <div className="opening-card__information-row">
              <Users size={16} aria-hidden="true" />
              <span>
                {availableSlots} of {classItem.maxStudents} places remaining
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="opening-card__footer">
        <strong className="opening-card__price">
          {formatPrice(classItem.price, price <= 0)}
        </strong>

        <Link
          to={detailPath}
          state={detailState}
          className="opening-card__link"
        >
          View class
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
