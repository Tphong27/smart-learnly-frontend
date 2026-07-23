import { toDateInputValue } from "@/shared/utils/date";

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeNumber(value, fallback = "") {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeStatus(value) {
  return normalizeString(value || "upcoming").toLowerCase();
}

function normalizeFormValues(data) {
  return {
    courseId: normalizeString(data?.courseId),
    className: normalizeString(data?.className),
    trainerId: normalizeString(data?.trainerId),
    meetingUrl: normalizeString(data?.meetingUrl),
    scheduleDescription: normalizeString(data?.scheduleDescription),
    startDate: toDateInputValue(data?.startDate),
    endDate: toDateInputValue(data?.endDate),
    maxStudents: normalizeNumber(data?.maxStudents, 30),
    price: normalizeNumber(data?.price, ""),
    status: normalizeStatus(data?.status),
  };
}

export function toClassFormValues(initialData = null) {
  if (!initialData) {
    return {
      courseId: "",
      className: "",
      trainerId: "",
      meetingUrl: "",
      scheduleDescription: "",
      startDate: "",
      endDate: "",
      maxStudents: 30,
      price: "",
      status: "upcoming",
    };
  }

  return normalizeFormValues(initialData);
}

export function toCreateClassPayload(formData) {
  const values = normalizeFormValues(formData);

  return {
    courseId: values.courseId,
    className: values.className,
    trainerId: values.trainerId,
    meetingUrl: values.meetingUrl,
    scheduleDescription: values.scheduleDescription,
    startDate: values.startDate,
    endDate: values.endDate,
    maxStudents: Number(values.maxStudents),
    price: Number(values.price),
  };
}

export function toUpdateClassPayload(formData, originalClass) {
  const next = normalizeFormValues(formData);
  const original = normalizeFormValues(originalClass);
  const payload = {};

  if (next.courseId !== original.courseId) {
    payload.courseId = next.courseId;
  }

  if (next.className !== original.className) {
    payload.className = next.className;
  }

  if (next.trainerId !== original.trainerId) {
    payload.trainerId = next.trainerId;
  }

  if (next.meetingUrl !== original.meetingUrl) {
    payload.meetingUrl = next.meetingUrl;
  }

  if (next.scheduleDescription !== original.scheduleDescription) {
    payload.scheduleDescription = next.scheduleDescription;
  }

  if (next.startDate !== original.startDate) {
    payload.startDate = next.startDate;
  }

  if (next.endDate !== original.endDate) {
    payload.endDate = next.endDate;
  }

  if (Number(next.maxStudents) !== Number(original.maxStudents)) {
    payload.maxStudents = Number(next.maxStudents);
  }

  if (Number(next.price) !== Number(original.price)) {
    payload.price = Number(next.price);
  }

  if (next.status !== original.status) {
    payload.status = next.status;
  }

  /*
   * không cho cập nhật class CANCELLED nếu request
   * không chứa status. Khi có field khác thay đổi, gửi lại
   * status cancelled để backend xác nhận trạng thái.
   */
  if (
    Object.keys(payload).length > 0 &&
    original.status === "cancelled" &&
    payload.status === undefined
  ) {
    payload.status = next.status;
  }

  return payload;
}
