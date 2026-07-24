export const DEFAULT_STUDENT_PERFORMANCE_QUERY =
  Object.freeze({
    keyword: "",
    progress: "all",
    indicator: "all",
    page: 0,
    size: 10,
  });

export const STUDENT_PROGRESS_OPTIONS = [
  {
    value: "all",
    label: "All progress",
  },
  {
    value: "not_started",
    label: "Not started",
  },
  {
    value: "in_progress",
    label: "In progress",
  },
  {
    value: "completed",
    label: "Completed",
  },
];

export const STUDENT_INDICATOR_OPTIONS = [
  {
    value: "all",
    label: "All indicators",
  },
  {
    value: "inactive",
    label: "Inactive",
  },
  {
    value: "late_submission",
    label: "Late submission",
  },
  {
    value: "no_alert",
    label: "No alert",
  },
];