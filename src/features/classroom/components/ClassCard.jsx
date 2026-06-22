import { Calendar, Users, MapPin, BookOpen, WalletCards } from "lucide-react";
import {
  formatCapacity,
  formatDate,
  formatVnd,
  formatSchedule,
} from "../utils/classFormatter";
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
  scheduleDescription,
  price,
  onClick,
  actionButtons,
}) {
  return (
    <article className="class-card">
      <button type="button" className="class-card__main" onClick={onClick}>
        <div className="class-card__header">
          <div className="class-card__heading">
            <h3 className="class-card__title">
              {className || "Untitled class"}
            </h3>

            {courseTitle && (
              <p className="class-card__course">
                <BookOpen size={15} />
                {courseTitle}
              </p>
            )}
          </div>

          <div className="class-card__status">
            <ClassStatusBadge status={status} />
          </div>
        </div>

        <div className="class-card__meta">
          <div className="class-card__meta-item">
            <span className="class-card__meta-label">Trainer </span>
            <span className="class-card__meta-value">
              {trainerName || "Trainer empty"}
            </span>
          </div>

          <div className="class-card__meta-item">
            <Calendar size={16} />
            <span className="class-card__meta-value">
              {formatDate(startDate)} - {formatDate(endDate)}
            </span>
          </div>

          <div className="class-card__meta-item">
            <MapPin size={16} />
            <span className="class-card__meta-value">
              {formatSchedule(scheduleDescription)}
            </span>
          </div>

          <div className="class-card__meta-item">
            <Users size={16} />
            <span className="class-card__meta-value">
              {formatCapacity(activeEnrollmentCount, maxStudents)} trainee
            </span>
          </div>

          <div className="class-card__meta-item">
            <WalletCards size={16} />
            <span className="class-card__meta-value">{formatVnd(price)}</span>
          </div>

          <div className="class-card__meta-item">
            <span className="class-card__meta-label">Available Seats </span>
            <span className="class-card__meta-value">
              {availableSeats ?? 0}
            </span>
          </div>
        </div>
      </button>

      {actionButtons && (
        <div className="class-card__actions">{actionButtons}</div>
      )}
    </article>
  );
}
