import {
  BookOpen,
  CalendarDays,
  Clock3,
  MapPin,
  UserRound,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ScheduleCalendar } from "@/shared/components/scheduleCalendar";
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

  return (
    <article className="opening-card">
      <div className="opening-card__image-wrapper">
        {classItem.courseThumbnailUrl ? (
          <img
            src={classItem.courseThumbnailUrl}
            alt={classItem.courseTitle}
            className="opening-card__image"
          />
        ) : (
          <div className="opening-card__image-fallback">
            <BookOpen size={38} />
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
              : "Unknown"}
        </span>
      </div>

      <div className="opening-card__body">
        <p className="opening-card__course">{classItem.courseTitle}</p>

        <h2 className="opening-card__title">{classItem.className}</h2>

        <div className="opening-card__information">
          <div className="opening-card__information-row">
            <UserRound size={17} />

            <span>{classItem.trainerName || "Trainer not assigned"}</span>
          </div>

          <div className="opening-card__information-row">
            <CalendarDays size={17} />

            <span>
              {formatDate(classItem.startDate, "vi-VN", CARD_DATE_OPTIONS)}
              {" – "}
              {formatDate(classItem.endDate, "vi-VN", CARD_DATE_OPTIONS)}
            </span>
          </div>

          <div className="opening-card__information-row opening-card__information-row--schedule">
            <Clock3 size={17} />

            <ScheduleCalendar
              variant="compact"
              scheduleDescription={classItem.scheduleDescription}
              emptyText="Schedule not available"
            />
          </div>

          <div className="opening-card__information-row">
            <Users size={17} />

            <span>{availableSlots} places remaining</span>
          </div>

          <div className="opening-card__information-row">
            <MapPin size={17} />

            <span>Offline class</span>
          </div>
        </div>

        <div className="opening-card__footer">
          <strong className="opening-card__price">
            {formatPrice(classItem.price, price <= 0)}
          </strong>

          <Link
            to={`/opening-schedule/${classItem.classId}`}
            state={detailState}
            className="opening-card__button"
          >
            View class
          </Link>
        </div>
      </div>
    </article>
  );
}
