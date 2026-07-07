import "./ScheduleCalendar.css";

const WEEK_DAYS = [
  { key: "MONDAY", shortLabel: "MON" },
  { key: "TUESDAY", shortLabel: "TUE"},
  { key: "WEDNESDAY", shortLabel: "WED"},
  { key: "THURSDAY", shortLabel: "THU"},
  { key: "FRIDAY", shortLabel: "FRI"},
  { key: "SATURDAY", shortLabel: "SAT"},
  { key: "SUNDAY", shortLabel: "SUN"},
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

export function ScheduleCalendar({ scheduleDescription }) {
  const slotsByDay = getSlotsByDay(scheduleDescription);

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
                    {day.shortLabel}
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
                              {slot.startTime} - {slot.endTime}
                            </strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="shared-schedule-calendar__empty">-</span>
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