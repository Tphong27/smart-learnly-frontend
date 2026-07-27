import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  UserRound,
  Users,
} from "lucide-react";
import { formatCapacity, formatDate, formatVnd } from "../utils/classFormatter";
import { ClassStatusBadge } from "./ClassStatusBadge";

export function ClassCard({
  className,
  courseTitle,
  trainerName,
  startDate,
  endDate,
  maxStudents,
  activeEnrollmentCount,
  availableSeats,
  status,
  price,
  onClick,
  actionButtons,
}) {
  const resolvedClassName = className?.trim() || "Untitled class";

  const resolvedCourseTitle = courseTitle?.trim() || "Course not assigned";

  const resolvedTrainerName = trainerName?.trim() || "Trainer not assigned";

  return (
    <article className="class-card">
      <div className="class-card__content">
        {/* Header */}
        <header className="class-card__header">
          <h3 className="class-card__title">
            <button
              type="button"
              className="class-card__title-button"
              onClick={onClick}
              aria-label={`Open ${resolvedClassName}`}
            >
              {resolvedClassName}
            </button>
          </h3>

          <div className="class-card__top-actions">
            <ClassStatusBadge status={status} />

            {actionButtons && (
              <div className="class-card__action-buttons">{actionButtons}</div>
            )}
          </div>
        </header>

        {/* Metadata */}
        <div className="class-card__meta">
          <div className="class-card__meta-item class-card__meta-item--course">
            <BookOpen size={17} aria-hidden="true" />

            <span className="class-card__meta-copy">
              <small>Course</small>
              <strong>{resolvedCourseTitle}</strong>
            </span>
          </div>

          <div className="class-card__meta-divider" />

          <div className="class-card__meta-item">
            <UserRound size={17} aria-hidden="true" />

            <span className="class-card__meta-copy">
              <small>Trainer</small>
              <strong>{resolvedTrainerName}</strong>
            </span>
          </div>

          <div className="class-card__meta-item">
            <CalendarDays size={17} aria-hidden="true" />

            <span className="class-card__meta-copy">
              <small>Schedule</small>
              <strong>
                {formatDate(startDate)} – {formatDate(endDate)}
              </strong>
            </span>
          </div>

          <div className="class-card__meta-item">
            <Users size={17} aria-hidden="true" />

            <span className="class-card__meta-copy">
              <small>Enrollment</small>
              <strong>
                {formatCapacity(activeEnrollmentCount, maxStudents)} trainees
              </strong>
            </span>
          </div>

          <div className="class-card__meta-item">
            <Users size={17} aria-hidden="true" />

            <span className="class-card__meta-copy">
              <small>Available seats</small>
              <strong>{availableSeats ?? 0}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="class-card__footer">
        <div className="class-card__fee">
          <small>Class fee</small>
          <strong>{formatVnd(price)}</strong>
        </div>

        <button
          type="button"
          className="class-card__open-button"
          onClick={onClick}
          aria-label={`Open ${resolvedClassName}`}
        >
          <span>Open class</span>
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </footer>
    </article>
  );
}
