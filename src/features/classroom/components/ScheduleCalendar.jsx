const WEEK_DAYS = [
  {
    key: "MONDAY",
    label: "Monday",
    viLabel: "Thứ 2",
  },
  {
    key: "TUESDAY",
    label: "Tuesday",
    viLabel: "Thứ 3",
  },
  {
    key: "WEDNESDAY",
    label: "Wednesday",
    viLabel: "Thứ 4",
  },
  {
    key: "THURSDAY",
    label: "Thursday",
    viLabel: "Thứ 5",
  },
  {
    key: "FRIDAY",
    label: "Friday",
    viLabel: "Thứ 6",
  },
  {
    key: "SATURDAY",
    label: "Saturday",
    viLabel: "Thứ 7",
  },
  {
    key: "SUNDAY",
    label: "Sunday",
    viLabel: "Chủ nhật",
  },
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
    <div className="schedule-calendar">
      <div className="schedule-calendar__grid">
        {WEEK_DAYS.map((day) => {
          const slots = slotsByDay[day.key] || [];

          return (
            <div className="schedule-calendar__day" key={day.key}>
              <div className="schedule-calendar__day-header">
                <strong>{day.label}</strong>
                <span>{day.viLabel}</span>
              </div>

              <div className="schedule-calendar__day-body">
                {slots.length === 0 ? (
                  <span className="schedule-calendar__empty">No Slots</span>
                ) : (
                  slots.map((slot, index) => (
                    <div
                      className="schedule-calendar__slot"
                      key={`${day.key}-${slot.startTime}-${slot.endTime}-${index}`}
                    >
                      {slot.startTime} - {slot.endTime}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}