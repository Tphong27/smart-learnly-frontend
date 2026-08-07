/**
 * Feature Notifications - Entry point cho dropdown notification.
 */
export { NotificationProvider, useNotifications } from "./hooks/NotificationProvider";
export { NotificationBell } from "./components/NotificationBell";

/** Export service để các feature khác dùng contract notification tối thiểu. */
export { notificationService, NOTIFICATION_TYPES } from "./services/notificationService";

export * from "./notification-utils";
