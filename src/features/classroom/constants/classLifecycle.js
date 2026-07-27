export const CLASS_STATUSES = Object.freeze({
  UPCOMING: "upcoming",
  ONGOING: "ongoing",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
});

export function normalizeClassStatus(value) {
  return String(value || CLASS_STATUSES.UPCOMING)
    .trim()
    .toLowerCase();
}

export function getClassEditPolicy(currentStatus) {
  const status = normalizeClassStatus(currentStatus);
  const readOnly =
    status === CLASS_STATUSES.COMPLETED || status === CLASS_STATUSES.CANCELLED;
  const ongoing = status === CLASS_STATUSES.ONGOING;

  return {
    readOnly,
    lockCourse: readOnly || ongoing,
    lockStartDate: readOnly || ongoing,
    lockPrice: readOnly || ongoing,
    lockTrainer: readOnly,
    lockMeetingUrl: readOnly,
    lockEndDate: readOnly,
    lockCapacity: readOnly,
    lockSchedule: readOnly,
  };
}

export function isTerminalClassStatus(value) {
  const status = normalizeClassStatus(value);

  return (
    status === CLASS_STATUSES.COMPLETED || status === CLASS_STATUSES.CANCELLED
  );
}
