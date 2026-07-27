import { Controller } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { WEEK_DAY_OPTIONS } from "@/shared/constants/week-days";


function createEmptySchedule() {
  return WEEK_DAY_OPTIONS.map((day) => ({
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
    const parsed = typeof value === "string" ? JSON.parse(value) : value;

    if (!Array.isArray(parsed)) {
      return createEmptySchedule();
    }

    return WEEK_DAY_OPTIONS.map((day) => {
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

export function WeeklyScheduleEditor({
  value,
  onChange,
  error,
  disabled = false,
}) {
  const schedule = parseSchedule(value);

  function updateSchedule(nextSchedule) {
    if (disabled) return;
    onChange?.(stringifySchedule(nextSchedule));
  }

  function toggleDay(dayIndex) {
    const nextSchedule = schedule.map((day, index) => {
      if (index !== dayIndex) return day;

      const nextEnabled = !day.enabled;

      return {
        ...day,
        enabled: nextEnabled,
        slots:
          nextEnabled && day.slots.length === 0
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
        slots: [...day.slots, { startTime: "19:00", endTime: "21:00" }],
      };
    });

    updateSchedule(nextSchedule);
  }

  function updateSlot(dayIndex, slotIndex, fieldName, nextValue) {
    const nextSchedule = schedule.map((day, index) => {
      if (index !== dayIndex) return day;

      return {
        ...day,
        slots: day.slots.map((slot, currentSlotIndex) => {
          if (currentSlotIndex !== slotIndex) return slot;

          return {
            ...slot,
            [fieldName]: nextValue,
          };
        }),
      };
    });

    updateSchedule(nextSchedule);
  }

  function removeSlot(dayIndex, slotIndex) {
    const nextSchedule = schedule.map((day, index) => {
      if (index !== dayIndex) return day;

      const nextSlots = day.slots.filter(
        (_, currentSlotIndex) => currentSlotIndex !== slotIndex
      );

      return {
        ...day,
        enabled: nextSlots.length > 0,
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

      {WEEK_DAY_OPTIONS.map((day, dayIndex) => {
        const daySchedule = schedule[dayIndex] || {
          dayOfWeek: day.value,
          enabled: false,
          slots: [],
        };

        return (
          <div className="weekly-schedule-picker__row" key={day.value}>
            <label className="weekly-schedule-picker__day">
              <input
                type="checkbox"
                checked={daySchedule.enabled}
                disabled={disabled}
                onChange={() => toggleDay(dayIndex)}
              />
              <span>{day.label}</span>
            </label>

            <div className="weekly-schedule-picker__slots">
              {!daySchedule.enabled && (
                <span className="weekly-schedule-picker__empty">No class</span>
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
                      disabled={disabled}
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
                      disabled={disabled}
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
                      disabled={disabled}
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
                  disabled={disabled}
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

      {error && <span className="form-error-text">{error.message}</span>}
    </div>
  );
}

export function WeeklySchedulePicker({
  control,
  name = "scheduleDescription",
  error,
  disabled = false,
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <WeeklyScheduleEditor
          value={field.value}
          onChange={field.onChange}
          error={error}
          disabled={disabled}
        />
      )}
    />
  );
}