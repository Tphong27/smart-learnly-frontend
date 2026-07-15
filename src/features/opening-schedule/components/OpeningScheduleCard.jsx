import {
  BookOpen,
  CalendarDays,
  Clock3,
  MapPin,
  UserRound,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

function formatMoney(
  value,
  currency = "VND",
) {
  const amount = Number(value || 0);

  if (amount <= 0) {
    return "Free";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value) {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatStatus(status) {
  if (!status) {
    return "Unknown";
  }

  return String(status)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (character) => character.toUpperCase(),
    );
}

export function OpeningScheduleCard({
  classItem,
}) {
  const availableSlots = Number(
    classItem?.availableSlots ?? 0,
  );

  const isAvailable =
    String(
      classItem?.status || "",
    ).toUpperCase() === "UPCOMING" &&
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
            : formatStatus(classItem.status)}
        </span>
      </div>

      <div className="opening-card__body">
        <p className="opening-card__course">
          {classItem.courseTitle}
        </p>

        <h2 className="opening-card__title">
          {classItem.className}
        </h2>

        <div className="opening-card__information">
          <div className="opening-card__information-row">
            <UserRound size={17} />

            <span>
              {classItem.trainerName ||
                "Trainer not assigned"}
            </span>
          </div>

          <div className="opening-card__information-row">
            <CalendarDays size={17} />

            <span>
              {formatDate(classItem.startDate)}
              {" – "}
              {formatDate(classItem.endDate)}
            </span>
          </div>

          <div className="opening-card__information-row">
            <Clock3 size={17} />

            <span>
              {classItem.scheduleDescription ||
                "Schedule not available"}
            </span>
          </div>

          <div className="opening-card__information-row">
            <Users size={17} />

            <span>
              {availableSlots} places remaining
            </span>
          </div>

          <div className="opening-card__information-row">
            <MapPin size={17} />

            <span>Offline class</span>
          </div>
        </div>

        <div className="opening-card__footer">
          <strong className="opening-card__price">
            {formatMoney(classItem.price)}
          </strong>

          <Link
            to={`/opening-schedule/${classItem.classId}`}
            className="opening-card__button"
          >
            View class
          </Link>
        </div>
      </div>
    </article>
  );
}