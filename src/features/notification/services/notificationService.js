/**
 * Service gọi API notification từ backend.
 */
import apiClient from "@/services/api-client";

export const NOTIFICATION_TYPES = Object.freeze([
  "ENROLLMENT",
  "PAYMENT",
  "ASSIGNMENT",
  "TEST",
  "FEEDBACK",
  "SYSTEM",
  "AI_SUGGESTION",
  "CLASS_REMINDER",
  "CHURN_ALERT",
  "CLASS",
  "COURSE",
]);

const NOTIFICATION_TYPE_SET = new Set(NOTIFICATION_TYPES);

/** Trích xuất data từ API response chuẩn. */
function unwrapApiResponse(response) {
  if (response && typeof response === "object" && "data" in response) {
    return response.data;
  }
  return response;
}

/** Chuẩn hóa type notification sang dạng hợp lệ. */
function normalizeType(type) {
  const normalized = String(type || "")
    .trim()
    .replaceAll("-", "_")
    .toUpperCase();

  return NOTIFICATION_TYPE_SET.has(normalized) ? normalized : null;
}

/** Chuẩn hóa một notification từ API. */
function normalizeNotification(notification) {
  if (!notification || typeof notification !== "object") return notification;
  const payload =
    notification.payload && typeof notification.payload === "object"
      ? notification.payload
      : {};

  return {
    id: notification.id,
    type: normalizeType(notification.type) || "SYSTEM",
    title: notification.title || "Notification",
    body: notification.body || "",
    referenceType: notification.referenceType || null,
    referenceId: notification.referenceId || null,
    actionUrl: notification.actionUrl || null,
    actorId: notification.actorId || null,
    eventKey: notification.eventKey || null,
    payload,
    readAt: notification.readAt || null,
    deliveredAt: notification.deliveredAt || null,
    seenAt: notification.seenAt || null,
    clickedAt: notification.clickedAt || null,
    archivedAt: notification.archivedAt || null,
    createdAt: notification.createdAt || null,
  };
}

/** Chuẩn hóa page response. */
function normalizePageResponse(page) {
  const payload = page && typeof page === "object" ? page : {};
  const items = Array.isArray(payload.items) ? payload.items : [];

  return {
    items: items.map(normalizeNotification),
    page: Number.isFinite(Number(payload.page)) ? Number(payload.page) : 0,
    size: Number.isFinite(Number(payload.size)) ? Number(payload.size) : 20,
    totalItems: Number.isFinite(Number(payload.totalItems))
      ? Number(payload.totalItems)
      : items.length,
    totalPages: Number.isFinite(Number(payload.totalPages))
      ? Number(payload.totalPages)
      : 0,
  };
}

/** Chuẩn hóa params cho list API. */
function normalizeListParams(params = {}) {
  const page = Number.isFinite(Number(params.page)) ? Number(params.page) : 0;
  const size = Number.isFinite(Number(params.size)) ? Number(params.size) : 20;

  return {
    page,
    size,
  };
}

/** Chuẩn hóa số notification chưa đọc. */
function normalizeUnreadCount(payload) {
  const value = Number(unwrapApiResponse(payload)?.unreadCount ?? 0);
  return {
    unreadCount: Number.isFinite(value) ? Math.max(0, value) : 0,
  };
}

export const notificationService = {
  /** Lấy danh sách notification của người dùng. */
  async list(params = {}) {
    const response = await apiClient.get("/notifications", {
      params: normalizeListParams(params),
    });
    return normalizePageResponse(unwrapApiResponse(response));
  },

  /** Lấy số notification chưa đọc. */
  async unreadCount() {
    const response = await apiClient.get("/notifications/unread-count");
    return normalizeUnreadCount(response);
  },

  /** Đánh dấu notification là đã đọc. */
  async markRead(notificationId) {
    const response = await apiClient.patch(
      `/notifications/${notificationId}/read`,
    );
    return normalizeNotification(unwrapApiResponse(response));
  },

  /** Ghi nhận thao tác click vào notification. */
  async recordClick(notificationId) {
    const response = await apiClient.patch(
      `/notifications/${notificationId}/clicked`,
    );
    return normalizeNotification(unwrapApiResponse(response));
  },

  /** Lưu trữ một notification. */
  async archive(notificationId) {
    const response = await apiClient.patch(
      `/notifications/${notificationId}/archive`,
    );
    return normalizeNotification(unwrapApiResponse(response));
  },

  /** Đánh dấu tất cả notification là đã đọc. */
  async markAllRead() {
    const response = await apiClient.patch("/notifications/read-all");
    return normalizeUnreadCount(response);
  },

};
