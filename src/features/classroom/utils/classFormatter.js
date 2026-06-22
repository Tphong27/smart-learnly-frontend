export function formatDate(dateString) {
  if (!dateString) return "--";

  try {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "--";
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return "--";

  try {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--";
  }
}

export function formatCapacity(activeEnrollmentCount, maxStudents) {
  return `${Number(activeEnrollmentCount || 0)}/${Number(maxStudents || 0)}`;
}

export function formatVnd(value) {
  const amount = Number(value || 0);

  if (amount <= 0) {
    return "--";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getStatusColorClass(status) {
  const normalized = (status || "").toUpperCase();

  const colorMap = {
    UPCOMING: "status-upcoming",
    ONGOING: "status-active",
    ACTIVE: "status-active",
    COMPLETED: "status-completed",
    CANCELLED: "status-cancelled",
    DRAFT: "status-draft",
  };

  return colorMap[normalized] || "status-default";
}

export function getStatusLabel(status) {
  const normalized = (status || "").toUpperCase();

  const labels = {
    UPCOMING: "Upcoming",
    ONGOING: "Ongoing",
    ACTIVE: "Active",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
    DRAFT: "Draft",
  };

  return labels[normalized] || status || "Unknown";
}

const DAY_LABELS = {
  MONDAY: "Thứ 2",
  TUESDAY: "Thứ 3",
  WEDNESDAY: "Thứ 4",
  THURSDAY: "Thứ 5",
  FRIDAY: "Thứ 6",
  SATURDAY: "Thứ 7",
  SUNDAY: "Chủ nhật",
};

function safeParseSchedule(scheduleDescription) {
  if (!scheduleDescription) {
    return null;
  }

  if (Array.isArray(scheduleDescription)) {
    return scheduleDescription;
  }

  if (typeof scheduleDescription !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(scheduleDescription);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isValidSlot(slot) {
  return Boolean(slot?.startTime && slot?.endTime);
}

export function formatSchedule(scheduleDescription) {
  const parsedSchedule = safeParseSchedule(scheduleDescription);

  if (!parsedSchedule) {
    return scheduleDescription || "Schedule empty";
  }

  const formattedItems = parsedSchedule
    .map((daySchedule) => {
      const dayLabel =
        DAY_LABELS[daySchedule.dayOfWeek] || daySchedule.dayOfWeek || "";

      const slots = Array.isArray(daySchedule.slots)
        ? daySchedule.slots.filter(isValidSlot)
        : [];

      if (!dayLabel || slots.length === 0) {
        return null;
      }

      const slotText = slots
        .map((slot) => `${slot.startTime} - ${slot.endTime}`)
        .join(", ");

      return `${dayLabel}: ${slotText}`;
    })
    .filter(Boolean);

  return formattedItems.length > 0
    ? formattedItems.join("; ")
    : "Schedule empty";
}