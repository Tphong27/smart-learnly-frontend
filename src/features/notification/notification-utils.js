import { getCurrentUser, NOTIFICATION_TYPES } from "@/services";

const TYPE_LABELS = Object.freeze({
  ENROLLMENT: "Enrollment",
  PAYMENT: "Payment",
  ASSIGNMENT: "Assignment",
  TEST: "Course quiz",
  FEEDBACK: "Feedback",
  SYSTEM: "System",
  AI_SUGGESTION: "AI suggestion",
  CLASS_REMINDER: "Class reminder",
  CHURN_ALERT: "Churn alert",
  CLASS: "Class",
  COURSE: "Course",
});

const TYPE_SET = new Set(NOTIFICATION_TYPES);
const STAFF_ROLES = new Set(["TRAINER", "TMO", "SME"]);

/** Kiểm tra chuỗi URL có chứa control character không an toàn hay không. */
function hasControlCharacter(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }

  return false;
}

/** Lấy base URL hiện tại để chuẩn hóa action URL tương đối. */
function getNotificationUrlBase() {
  if (typeof document !== "undefined" && document.baseURI) {
    return new URL("/", document.baseURI);
  }

  return new URL("http://localhost/");
}

/** Lấy role hiện tại để map action URL backend sang route frontend phù hợp. */
function getCurrentRole() {
  return String(getCurrentUser()?.role || "").trim().toUpperCase();
}

/** Lấy giá trị đầu tiên tồn tại trong payload notification. */
function getPayloadValue(notification, ...keys) {
  const payload = notification?.payload;
  if (!payload || typeof payload !== "object") return null;

  for (const key of keys) {
    const value = payload[key];
    if (value != null && value !== "") return String(value);
  }

  return null;
}

/** Trích xuất id trong path dựa trên prefix cố định. */
function getPathId(pathname, prefix) {
  if (!pathname.startsWith(prefix)) return null;
  const tail = pathname.slice(prefix.length).split("/")[0];
  return tail || null;
}

/** Map action URL từ backend sang route frontend theo role hiện tại. */
function resolveBackendActionRoute(safeActionUrl, notification) {
  const role = getCurrentRole();
  const [, pathname = safeActionUrl, queryAndHash = ""] =
    safeActionUrl.match(/^([^?#]*)(.*)$/) || [];

  const orderId = getPathId(pathname, "/orders/");
  if (orderId) {
    if (role === "ADMIN" || role === "TMO") return "/admin/transactions";
    return "/learning/transactions";
  }

  const learningClassId = getPathId(pathname, "/learning/classes/");
  if (learningClassId) {
    return `/opening-schedule/${learningClassId}${queryAndHash}`;
  }

  const classId = getPathId(pathname, "/classes/");
  if (classId) {
    if (role === "ADMIN") return `/admin/classrooms/${classId}/workspace`;
    if (role === "TRAINER" || role === "TMO") {
      return `/staff/classrooms/${classId}/workspace`;
    }
    return `/opening-schedule/${classId}${queryAndHash}`;
  }

  const assignmentId =
    getPathId(pathname, "/assignments/") ||
    getPayloadValue(notification, "assignmentId", "assignment_id");
  if (getPathId(pathname, "/assignments/")) {
    if (STAFF_ROLES.has(role)) {
      return `/staff/assignments/monitor/${assignmentId}/essay`;
    }
    if (role === "TRAINEE") return "/learning/assignments";
    return null;
  }

  const submissionId = getPathId(pathname, "/submissions/");
  if (submissionId) {
    if (STAFF_ROLES.has(role)) {
      return assignmentId
        ? `/staff/assignments/monitor/${assignmentId}/essay`
        : "/staff/assignments";
    }
    if (role === "TRAINEE") return "/learning/assignments";
    return null;
  }

  const testId = getPayloadValue(notification, "testId", "test_id");

  const attemptId = getPathId(pathname, "/course-quiz-attempts/");
  if (attemptId) {
    if (testId && role === "TRAINEE") {
      return `/learning/course-quizzes/attempts/${testId}/${attemptId}`;
    }
    return role === "TRAINEE" ? "/dashboard" : "/staff/courses";
  }

  return safeActionUrl;
}

/** Chuẩn hóa type notification về enum frontend đang hỗ trợ. */
export function normalizeNotificationType(type) {
  const normalized = String(type || "")
    .trim()
    .replaceAll("-", "_")
    .toUpperCase();

  return TYPE_SET.has(normalized) ? normalized : "SYSTEM";
}

/** Trả về nhãn hiển thị cho type notification. */
export function getNotificationTypeLabel(type) {
  return TYPE_LABELS[normalizeNotificationType(type)] || "System";
}

/** Xác định trạng thái đọc của notification. */
export function getNotificationReadState(notification) {
  return notification?.readAt ? "read" : "unread";
}

/** Kiểm tra notification còn chưa đọc hay không. */
export function isUnreadNotification(notification) {
  return !notification?.readAt;
}

/** Tạo bản sao notification đã được đánh dấu đọc/xem. */
export function withNotificationRead(notification, timestamp) {
  if (!notification) return notification;

  return {
    ...notification,
    readAt: notification.readAt || timestamp,
    seenAt: notification.seenAt || timestamp,
  };
}

/** Chuẩn hóa action URL và chặn URL ngoài origin hoặc không an toàn. */
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

/** Lấy route đích từ actionUrl của notification nếu có. */
export function getNotificationActionDestination(notification) {
  const safeActionUrl = resolveSafeNotificationActionUrl(
    notification?.actionUrl,
  );

  if (!safeActionUrl) return null;
  return resolveBackendActionRoute(safeActionUrl, notification);
}

/** Lấy route đích khi click notification; notification không có actionUrl thì không điều hướng. */
export function getNotificationDestination(notification) {
  const actionDestination = getNotificationActionDestination(notification);
  if (actionDestination) return actionDestination;
  return null;
}

/** Rút gọn nội dung notification để hiển thị trong dropdown. */
export function getNotificationPreview(notification) {
  const body = String(notification?.body || "").replace(/\s+/g, " ").trim();
  if (!body) return "";
  return body.length > 140 ? `${body.slice(0, 137)}...` : body;
}

/** Định dạng thời gian notification theo khoảng cách tương đối. */
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
