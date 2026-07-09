export const DEFAULT_LOCALE = "vi-VN";
export const DEFAULT_CURRENCY = "VND";

export function formatPrice(value, isFree) {
  if (isFree) return "Free";
  return formatAmount(value, "VND");
}

export function toNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? fallback : numberValue;
}

export function formatCurrency(
  value,
  currency = DEFAULT_CURRENCY,
  locale = DEFAULT_LOCALE,
) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return "--";
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || DEFAULT_CURRENCY,
      maximumFractionDigits: 0,
    }).format(numberValue);
  } catch {
    return `${numberValue} ${currency || DEFAULT_CURRENCY}`;
  }
}

export function formatAmount(value, currency = DEFAULT_CURRENCY) {
  return formatCurrency(value, currency);
}

export function formatDate(value, locale = DEFAULT_LOCALE) {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleDateString(locale);
}

export function formatDateTime(value, locale = DEFAULT_LOCALE) {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleString(locale);
}

export function formatTime(value, locale = DEFAULT_LOCALE) {
  if (!value) return "--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(seconds) {
  const totalSeconds = Number(seconds);

  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "--";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainSeconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${remainSeconds}s`;
  }

  return `${remainSeconds}s`;
}

export function formatPercent(value, digits = 0) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return "--";
  }

  return `${numberValue.toFixed(digits)}%`;
}

export function truncateText(value, maxLength = 8, suffix = "...") {
  if (!value) return "--";

  const text = String(value);

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}${suffix}`;
}

export function truncateId(value, maxLength = 8) {
  return truncateText(value, maxLength);
}

export function shortId(value) {
  if (!value) return "--";
  const text = String(value);
  return text.length > 12 ? `${text.slice(0, 8)}...${text.slice(-4)}` : text;
}

export function formatFileSize(bytes) {
  const size = Number(bytes);

  if (!Number.isFinite(size) || size < 0) {
    return "--";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatStatusLabel(status) {
  if (!status) return "Pending";

  return String(status)
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Alias for formatStatusLabel - they do the same thing
export function formatLabel(value) {
  return formatStatusLabel(value);
}