import { Controller } from "react-hook-form";
import {
  CLASS_TIME_SLOTS,
  getClassTimeSlot,
  toScheduleTimeRange,
} from "@/shared/constants/class-time-slots";
import { WEEK_DAY_OPTIONS } from "@/shared/constants/week-days";

function createEmptySchedule() {
  return WEEK_DAY_OPTIONS.map((day) => ({
    dayOfWeek: day.value,
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
      const matchedDay = parsed.find((item) => item?.dayOfWeek === day.value);
      const selectedSlotCodes = new Set(
        (Array.isArray(matchedDay?.slots) ? matchedDay.slots : [])
          .map((slot) => getClassTimeSlot(slot?.startTime, slot?.endTime))
          .filter(Boolean)
          .map((slot) => slot.code),
      );

      return {
        dayOfWeek: day.value,
        slots: CLASS_TIME_SLOTS.filter((slot) =>
          selectedSlotCodes.has(slot.code),
        ).map(toScheduleTimeRange),
      };
    });
  } catch {
    return createEmptySchedule();
  }
}

function stringifySchedule(schedule) {
  const selectedDays = schedule
    .filter((day) => day.slots.length > 0)
    .map((day) => ({
      dayOfWeek: day.dayOfWeek,
      slots: day.slots,
    }));

  return selectedDays.length > 0 ? JSON.stringify(selectedDays) : "";
}

export function WeeklyScheduleEditor({
  value,
  onChange,
  error,
  disabled = false,
}) {
  const schedule = parseSchedule(value);

  function toggleSlot(dayIndex, selectedSlot) {
    if (disabled) {
      return;
    }

    const nextSchedule = schedule.map((day, currentDayIndex) => {
      if (currentDayIndex !== dayIndex) {
        return day;
      }

      const selected = day.slots.some(
        (slot) =>
          slot.startTime === selectedSlot.startTime &&
          slot.endTime === selectedSlot.endTime,
      );
      const nextSlots = selected
        ? day.slots.filter(
            (slot) =>
              slot.startTime !== selectedSlot.startTime ||
              slot.endTime !== selectedSlot.endTime,
          )
        : [...day.slots, toScheduleTimeRange(selectedSlot)];

      return {
        ...day,
        slots: CLASS_TIME_SLOTS.filter((slot) =>
          nextSlots.some(
            (selectedTime) =>
              selectedTime.startTime === slot.startTime &&
              selectedTime.endTime === slot.endTime,
          ),
        ).map(toScheduleTimeRange),
      };
    });

    onChange?.(stringifySchedule(nextSchedule));
  }

  return (
    <div className="weekly-schedule-picker">
      <div className="weekly-schedule-picker__header">
        <span>Day</span>
        <span>Class time slots</span>
      </div>

      {WEEK_DAY_OPTIONS.map((day, dayIndex) => {
        const daySchedule = schedule[dayIndex];

        return (
          <div className="weekly-schedule-picker__row" key={day.value}>
            <strong className="weekly-schedule-picker__day">{day.label}</strong>

            <div className="weekly-schedule-picker__slot-grid">
              {CLASS_TIME_SLOTS.map((slot) => {
                const checked = daySchedule.slots.some(
                  (selected) =>
                    selected.startTime === slot.startTime &&
                    selected.endTime === slot.endTime,
                );

                return (
                  <label
                    className={[
                      "weekly-schedule-picker__slot-option",
                      checked ? "is-selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    key={slot.code}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleSlot(dayIndex, slot)}
                    />

                    <span>
                      <strong>{slot.label}</strong>
                      <small>
                        {slot.startTime}–{slot.endTime}
                      </small>
                    </span>
                  </label>
                );
              })}
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