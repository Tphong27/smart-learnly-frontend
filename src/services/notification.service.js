import apiClient from "./api-client";

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
const NOTIFICATION_STATUSES = new Set(["all", "unread", "read"]);

function unwrapApiResponse(response) {
  if (response && typeof response === "object" && "data" in response) {
    return response.data;
  }

  return response;
}

function normalizeType(type) {
  const normalized = String(type || "")
    .trim()
    .replaceAll("-", "_")
    .toUpperCase();

  return NOTIFICATION_TYPE_SET.has(normalized) ? normalized : null;
}

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

function normalizeListParams(params = {}) {
  const page = Number.isFinite(Number(params.page)) ? Number(params.page) : 0;
  const size = Number.isFinite(Number(params.size)) ? Number(params.size) : 20;
  const status = NOTIFICATION_STATUSES.has(params.status)
    ? params.status
    : "all";
  const type = normalizeType(params.type);

  return {
    page,
    size,
    status,
    ...(type ? { type } : {}),
  };
}

function normalizeUnreadCount(payload) {
  const value = Number(unwrapApiResponse(payload)?.unreadCount ?? 0);
  return {
    unreadCount: Number.isFinite(value) ? Math.max(0, value) : 0,
  };
}

function normalizeArchivedCount(payload) {
  const value = Number(unwrapApiResponse(payload)?.archivedCount ?? 0);
  return {
    archivedCount: Number.isFinite(value) ? Math.max(0, value) : 0,
  };
}

export const notificationService = {
  async list(params = {}) {
    const response = await apiClient.get("/notifications", {
      params: normalizeListParams(params),
    });
    return normalizePageResponse(unwrapApiResponse(response));
  },

  async unreadCount() {
    const response = await apiClient.get("/notifications/unread-count");
    return normalizeUnreadCount(response);
  },

  async get(notificationId) {
    const response = await apiClient.get(`/notifications/${notificationId}`);
    return normalizeNotification(unwrapApiResponse(response));
  },

  async markRead(notificationId) {
    const response = await apiClient.patch(
      `/notifications/${notificationId}/read`,
    );
    return normalizeNotification(unwrapApiResponse(response));
  },

  async recordClick(notificationId) {
    const response = await apiClient.patch(
      `/notifications/${notificationId}/clicked`,
    );
    return normalizeNotification(unwrapApiResponse(response));
  },

  async archive(notificationId) {
    const response = await apiClient.patch(
      `/notifications/${notificationId}/archive`,
    );
    return normalizeNotification(unwrapApiResponse(response));
  },

  async markAllRead() {
    const response = await apiClient.patch("/notifications/read-all");
    return normalizeUnreadCount(response);
  },

  async archiveAll() {
    const response = await apiClient.patch("/notifications/archive-all");
    return normalizeArchivedCount(response);
  },
};
