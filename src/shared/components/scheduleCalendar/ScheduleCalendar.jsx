import "./ScheduleCalendar.css";

const WEEK_DAYS = [
  { key: "MONDAY", shortLabel: "MON", fullLabel: "Monday" },
  { key: "TUESDAY", shortLabel: "TUE", fullLabel: "Tuesday" },
  { key: "WEDNESDAY", shortLabel: "WED", fullLabel: "Wednesday" },
  { key: "THURSDAY", shortLabel: "THU", fullLabel: "Thursday" },
  { key: "FRIDAY", shortLabel: "FRI", fullLabel: "Friday" },
  { key: "SATURDAY", shortLabel: "SAT", fullLabel: "Saturday" },
  { key: "SUNDAY", shortLabel: "SUN", fullLabel: "Sunday" },
];

function parseSchedule(scheduleDescription) {
  if (!scheduleDescription) return [];

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

function getSlotsByDay(scheduleDescription) {
  const schedule = parseSchedule(scheduleDescription);

  return WEEK_DAYS.reduce((result, day) => {
    const matchedDay = schedule.find((item) => item.dayOfWeek === day.key);

    const slots = Array.isArray(matchedDay?.slots)
      ? matchedDay.slots.filter((slot) => slot?.startTime && slot?.endTime)
      : [];

    result[day.key] = slots;
    return result;
  }, {});
}

export function ScheduleCalendar({
  scheduleDescription,
  variant = "table",
  emptyText = "Schedule not available",
}) {
  const slotsByDay = getSlotsByDay(scheduleDescription);

  const scheduledDays = WEEK_DAYS
    .map((day) => ({
      ...day,
      slots: slotsByDay[day.key] || [],
    }))
    .filter((day) => day.slots.length > 0);

  if (variant === "compact") {
    if (scheduledDays.length === 0) {
      return (
        <span className="shared-schedule-calendar__compact-empty">
          {emptyText}
        </span>
      );
    }

    return (
      <div className="shared-schedule-calendar shared-schedule-calendar--compact">
        {scheduledDays.map((day) => (
          <div
            className="shared-schedule-calendar__compact-day"
            key={day.key}
          >
            <strong className="shared-schedule-calendar__compact-day-name">
              {day.fullLabel}
            </strong>

            <div className="shared-schedule-calendar__compact-slots">
              {day.slots.map((slot, index) => (
                <span
                  className="shared-schedule-calendar__compact-slot"
                  key={`${day.key}-${slot.startTime}-${slot.endTime}-${index}`}
                >
                  {slot.startTime} – {slot.endTime}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="shared-schedule-calendar">
      <div className="shared-schedule-calendar__scroll">
        <table className="shared-schedule-calendar__table">
          <thead>
            <tr>
              {WEEK_DAYS.map((day) => (
                <th key={day.key}>
                  <span className="shared-schedule-calendar__day-short">
                    {day.shortLabel}
                  </span>

                  <span className="shared-schedule-calendar__day-name">
                    {day.fullLabel}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            <tr>
              {WEEK_DAYS.map((day) => {
                const slots = slotsByDay[day.key] || [];

                return (
                  <td key={day.key}>
                    {slots.length > 0 ? (
                      <div className="shared-schedule-calendar__slot-list">
                        {slots.map((slot, index) => (
                          <div
                            className="shared-schedule-calendar__class-cell"
                            key={`${day.key}-${slot.startTime}-${slot.endTime}-${index}`}
                          >
                            <strong>
                              {slot.startTime} – {slot.endTime}
                            </strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="shared-schedule-calendar__empty">
                        -
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}