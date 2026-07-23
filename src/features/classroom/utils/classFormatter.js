import {
  formatDate as formatSharedDate,
  formatDateTime as formatSharedDateTime,
  formatPrice,
  formatStatusLabel,
} from "@/shared/utils/formatters";

const CLASS_DATE_OPTIONS = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

const CLASS_DATE_TIME_OPTIONS = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

export function formatDate(dateString) {
  return formatSharedDate(
    dateString,
    "vi-VN",
    CLASS_DATE_OPTIONS,
  );
}

export function formatDateTime(dateString) {
  return formatSharedDateTime(
    dateString,
    "vi-VN",
    CLASS_DATE_TIME_OPTIONS,
  );
}

export function formatCapacity(activeEnrollmentCount, maxStudents) {
  return `${Number(activeEnrollmentCount || 0)}/${Number(
    maxStudents || 0,
  )}`;
}

export function formatVnd(value) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return "--";
  }

  return formatPrice(amount, amount === 0);
}

export function getStatusColorClass(status) {
  const normalized = String(status || "").toUpperCase();

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
  if (!status) {
    return "Unknown";
  }

  return formatStatusLabel(status);
}