export const CLASS_TIME_SLOTS = Object.freeze([
  Object.freeze({
    code: "SLOT_1",
    label: "Slot 1",
    startTime: "07:30",
    endTime: "09:30",
  }),
  Object.freeze({
    code: "SLOT_2",
    label: "Slot 2",
    startTime: "09:45",
    endTime: "11:45",
  }),
  Object.freeze({
    code: "SLOT_3",
    label: "Slot 3",
    startTime: "13:00",
    endTime: "15:00",
  }),
  Object.freeze({
    code: "SLOT_4",
    label: "Slot 4",
    startTime: "15:15",
    endTime: "17:15",
  }),
  Object.freeze({
    code: "SLOT_5",
    label: "Slot 5",
    startTime: "19:30",
    endTime: "21:30",
  }),
  Object.freeze({
    code: "SLOT_6",
    label: "Slot 6",
    startTime: "21:45",
    endTime: "23:45",
  }),
]);

const SLOT_BY_TIME_RANGE = new Map(
  CLASS_TIME_SLOTS.map((slot) => [`${slot.startTime}|${slot.endTime}`, slot]),
);

export function normalizeScheduleTime(value) {
  return String(value || "")
    .trim()
    .slice(0, 5);
}

export function getClassTimeSlot(startTime, endTime) {
  return (
    SLOT_BY_TIME_RANGE.get(
      [normalizeScheduleTime(startTime), normalizeScheduleTime(endTime)].join(
        "|",
      ),
    ) || null
  );
}

export function toScheduleTimeRange(slot) {
  return {
    startTime: slot.startTime,
    endTime: slot.endTime,
  };
}
