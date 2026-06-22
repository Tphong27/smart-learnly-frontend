import { Controller } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";

const WEEK_DAYS = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

function createEmptySchedule() {
  return WEEK_DAYS.map((day) => ({
    dayOfWeek: day.value,
    enabled: false,
    slots: [],
  }));
}

function parseSchedule(value) {
  if (!value) {
    return createEmptySchedule();
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return createEmptySchedule();
    }

    return WEEK_DAYS.map((day) => {
      const matchedDay = parsed.find((item) => item.dayOfWeek === day.value);

      return {
        dayOfWeek: day.value,
        enabled: Boolean(matchedDay),
        slots: Array.isArray(matchedDay?.slots)
          ? matchedDay.slots.map((slot) => ({
              startTime: slot.startTime || "",
              endTime: slot.endTime || "",
            }))
          : [],
      };
    });
  } catch {
    return createEmptySchedule();
  }
}

function stringifySchedule(schedule) {
  const selectedDays = schedule
    .filter((day) => day.enabled)
    .map((day) => ({
      dayOfWeek: day.dayOfWeek,
      slots: day.slots.filter((slot) => slot.startTime && slot.endTime),
    }))
    .filter((day) => day.slots.length > 0);

  return selectedDays.length > 0 ? JSON.stringify(selectedDays) : "";
}

export function WeeklySchedulePicker({ control, name = "scheduleDescription", error }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const schedule = parseSchedule(field.value);

        function updateSchedule(nextSchedule) {
          field.onChange(stringifySchedule(nextSchedule));
        }

        function toggleDay(dayIndex) {
          const nextSchedule = schedule.map((day, index) => {
            if (index !== dayIndex) return day;

            const nextEnabled = !day.enabled;

            return {
              ...day,
              enabled: nextEnabled,
              slots: nextEnabled && day.slots.length === 0
                ? [{ startTime: "19:00", endTime: "21:00" }]
                : day.slots,
            };
          });

          updateSchedule(nextSchedule);
        }

        function addSlot(dayIndex) {
          const nextSchedule = schedule.map((day, index) => {
            if (index !== dayIndex) return day;

            return {
              ...day,
              enabled: true,
              slots: [
                ...day.slots,
                { startTime: "19:00", endTime: "21:00" },
              ],
            };
          });

          updateSchedule(nextSchedule);
        }

        function updateSlot(dayIndex, slotIndex, fieldName, value) {
          const nextSchedule = schedule.map((day, index) => {
            if (index !== dayIndex) return day;

            return {
              ...day,
              slots: day.slots.map((slot, currentSlotIndex) => {
                if (currentSlotIndex !== slotIndex) return slot;

                return {
                  ...slot,
                  [fieldName]: value,
                };
              }),
            };
          });

          updateSchedule(nextSchedule);
        }

        function removeSlot(dayIndex, slotIndex) {
          const nextSchedule = schedule.map((day, index) => {
            if (index !== dayIndex) return day;

            const nextSlots = day.slots.filter((_, currentSlotIndex) => {
              return currentSlotIndex !== slotIndex;
            });

            return {
              ...day,
              enabled: nextSlots.length > 0 ? day.enabled : false,
              slots: nextSlots,
            };
          });

          updateSchedule(nextSchedule);
        }

        return (
          <div className="weekly-schedule-picker">
            <div className="weekly-schedule-picker__header">
              <span>Day</span>
              <span>Time slots</span>
            </div>

            {WEEK_DAYS.map((day, dayIndex) => {
              const daySchedule = schedule[dayIndex];

              return (
                <div className="weekly-schedule-picker__row" key={day.value}>
                  <label className="weekly-schedule-picker__day">
                    <input
                      type="checkbox"
                      checked={daySchedule.enabled}
                      onChange={() => toggleDay(dayIndex)}
                    />
                    <span>{day.label}</span>
                  </label>

                  <div className="weekly-schedule-picker__slots">
                    {!daySchedule.enabled && (
                      <span className="weekly-schedule-picker__empty">
                        No class
                      </span>
                    )}

                    {daySchedule.enabled &&
                      daySchedule.slots.map((slot, slotIndex) => (
                        <div
                          className="weekly-schedule-picker__slot"
                          key={`${day.value}-${slotIndex}`}
                        >
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(event) =>
                              updateSlot(
                                dayIndex,
                                slotIndex,
                                "startTime",
                                event.target.value
                              )
                            }
                          />

                          <span>to</span>

                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(event) =>
                              updateSlot(
                                dayIndex,
                                slotIndex,
                                "endTime",
                                event.target.value
                              )
                            }
                          />

                          <button
                            type="button"
                            className="weekly-schedule-picker__remove"
                            onClick={() => removeSlot(dayIndex, slotIndex)}
                            aria-label={`Remove ${day.label} slot`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}

                    {daySchedule.enabled && (
                      <button
                        type="button"
                        className="weekly-schedule-picker__add"
                        onClick={() => addSlot(dayIndex)}
                      >
                        <Plus size={16} />
                        <span>Add slot</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {error && (
              <span className="form-error-text">
                {error.message}
              </span>
            )}
          </div>
        );
      }}
    />
  );
}