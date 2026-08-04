import "./ScheduleCalendar.css";
import { getClassTimeSlot } from "@/shared/constants/class-time-slots";

const WEEK_DAYS = [
  { key: "MONDAY", shortLabel: "MON" },
  { key: "TUESDAY", shortLabel: "TUE" },
  { key: "WEDNESDAY", shortLabel: "WED" },
  { key: "THURSDAY", shortLabel: "THU" },
  { key: "FRIDAY", shortLabel: "FRI" },
  { key: "SATURDAY", shortLabel: "SAT" },
  { key: "SUNDAY", shortLabel: "SUN" },
];

function parseSchedule(scheduleDescription) {
  if (!scheduleDescription) {
    return [];
  }

  if (Array.isArray(scheduleDescription)) {
    return scheduleDescription;
  }

  if (typeof scheduleDescription !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(scheduleDescription);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createScheduleRows(scheduleDescription) {
  const schedule = parseSchedule(scheduleDescription);

  return WEEK_DAYS.map((day) => {
    const matchedDay = schedule.find(
      (item) => item?.dayOfWeek === day.key,
    );

    if (!Array.isArray(matchedDay?.slots)) {
      return null;
    }

    const slotTexts = matchedDay.slots
      .map((slot) =>
        getClassTimeSlot(slot?.startTime, slot?.endTime),
      )
      .filter(Boolean)
      .map(
        (slot) =>
          `${slot.label} - ${slot.startTime}–${slot.endTime}`,
      );

    if (slotTexts.length === 0) {
      return null;
    }

    return {
      dayKey: day.key,
      dayLabel: day.shortLabel,
      scheduleText: slotTexts.join(", "),
    };
  }).filter(Boolean);
}

export function ScheduleCalendar({
  scheduleDescription,
  emptyText = "Schedule not available",
}) {
  const scheduleRows = createScheduleRows(scheduleDescription);

  if (scheduleRows.length === 0) {
    return (
      <span className="shared-schedule-calendar__empty">
        {emptyText}
      </span>
    );
  }

  return (
    <div className="shared-schedule-calendar">
      {scheduleRows.map((row) => (
        <div
          key={row.dayKey}
          className="shared-schedule-calendar__row"
          title={`${row.dayLabel}: ${row.scheduleText}`}
        >
          <strong className="shared-schedule-calendar__day">
            {row.dayLabel}:
          </strong>

          <span className="shared-schedule-calendar__slots">
            {row.scheduleText}
          </span>
        </div>
      ))}
    </div>
  );
}