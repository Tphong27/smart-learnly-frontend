import {
  BookOpen,
  CalendarDays,
  Clock3,
  GraduationCap,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { ScheduleCalendar } from "@/shared/components/scheduleCalendar";

function formatClassStatus(status) {
  if (!status) return "Unknown";

  return String(status)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function EnrolledClassDetailPopup({
  enrolledClass,
  classDateRange,
  onClose,
}) {
  if (!enrolledClass) return null;

  const activeEnrollmentCount = Number(
    enrolledClass.activeEnrollmentCount || 0,
  );
  const maxStudents = Number(enrolledClass.maxStudents || 0);
  const capacityText = maxStudents
    ? `${activeEnrollmentCount}/${maxStudents} learners`
    : `${activeEnrollmentCount} learners`;

  return (
    <div
      className="enrolled-class-popup-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="enrolled-class-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="enrolledClassPopupTitle"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="enrolled-class-popup__header">
          <div>
            <span className="enrolled-class-popup__eyebrow">Your class</span>
            <h3 id="enrolledClassPopupTitle">
              {enrolledClass.className || "Unnamed class"}
            </h3>
          </div>

          <button
            type="button"
            className="enrolled-class-popup__close"
            onClick={onClose}
            aria-label="Close class detail"
          >
            <X size={18} />
          </button>
        </div>

        <div className="enrolled-class-popup__content">
          <div className="enrolled-class-popup__item enrolled-class-popup__item--wide">
            <GraduationCap size={16} />
            <div>
              <span>Class name</span>
              <strong>{enrolledClass.className || "Unnamed class"}</strong>
            </div>
          </div>

          <div className="enrolled-class-popup__item">
            <UserRound size={16} />
            <div>
              <span>Trainer</span>
              <strong>
                {enrolledClass.trainerName || "Trainer not assigned"}
              </strong>
            </div>
          </div>

          <div className="enrolled-class-popup__item">
            <CalendarDays size={16} />
            <div>
              <span>Date range</span>
              <strong>{classDateRange || "Not set"}</strong>
            </div>
          </div>

          <div className="enrolled-class-popup__item enrolled-class-popup__item--wide enrolled-class-popup__item--schedule">
            <Clock3 size={16} />
            <div className="enrolled-class-popup__schedule-body">
              <span>Schedule</span>
              <div className="enrolled-class-popup__schedule-table">
                <ScheduleCalendar
                  scheduleDescription={enrolledClass.scheduleDescription}
                />
              </div>
            </div>
          </div>

          <div className="enrolled-class-popup__item">
            <Users size={16} />
            <div>
              <span>Capacity</span>
              <strong>{capacityText}</strong>
            </div>
          </div>

          <div className="enrolled-class-popup__item">
            <BookOpen size={16} />
            <div>
              <span>Class status</span>
              <strong>{formatClassStatus(enrolledClass.status)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
