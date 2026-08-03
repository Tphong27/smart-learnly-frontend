import { NOTIFICATION_TYPES } from "@/services";

const TYPE_LABELS = Object.freeze({
  ENROLLMENT: "Enrollment",
  PAYMENT: "Payment",
  ASSIGNMENT: "Assignment",
  TEST: "Test",
  FEEDBACK: "Feedback",
  SYSTEM: "System",
  AI_SUGGESTION: "AI suggestion",
  CLASS_REMINDER: "Class reminder",
  CHURN_ALERT: "Churn alert",
  CLASS: "Class",
  COURSE: "Course",
});

const TYPE_SET = new Set(NOTIFICATION_TYPES);

function hasControlCharacter(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }

  return false;
}

function getNotificationUrlBase() {
  if (typeof document !== "undefined" && document.baseURI) {
    return new URL("/", document.baseURI);
  }

  return new URL("http://localhost/");
}

export function normalizeNotificationType(type) {
  const normalized = String(type || "")
    .trim()
    .replaceAll("-", "_")
    .toUpperCase();

  return TYPE_SET.has(normalized) ? normalized : "SYSTEM";
}

export function getNotificationTypeLabel(type) {
  return TYPE_LABELS[normalizeNotificationType(type)] || "System";
}

export function getNotificationReadState(notification) {
  return notification?.readAt ? "read" : "unread";
}

export function isUnreadNotification(notification) {
  return !notification?.readAt;
}

export function withNotificationRead(notification, timestamp) {
  if (!notification) return notification;

  return {
    ...notification,
    readAt: notification.readAt || timestamp,
    seenAt: notification.seenAt || timestamp,
  };
}

export function resolveSafeNotificationActionUrl(actionUrl) {
  if (typeof actionUrl !== "string") return null;

  const value = actionUrl.trim();
  if (!value) return null;
  if (hasControlCharacter(value)) return null;
  if (value.includes("\\")) return null;
  if (value.startsWith("//")) return null;

  try {
    const baseUrl = getNotificationUrlBase();
    const resolved = new URL(value, baseUrl);
    if (resolved.origin !== baseUrl.origin) return null;
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return null;
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return null;
  }
}

export function getNotificationDestination(notification) {
  const safeActionUrl = resolveSafeNotificationActionUrl(
    notification?.actionUrl,
  );

  if (safeActionUrl) return safeActionUrl;
  return notification?.id ? `/notifications/${notification.id}` : "/notifications";
}

export function getNotificationPreview(notification) {
  const body = String(notification?.body || "").replace(/\s+/g, " ").trim();
  if (!body) return "";
  return body.length > 140 ? `${body.slice(0, 137)}...` : body;
}

export function formatNotificationTime(value) {
  if (!value) return "Unknown time";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSeconds < 60) return "Just now";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}
