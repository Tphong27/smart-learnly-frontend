/**
 * Feature Notifications - Entry point
 * Chứa các export công khai của feature notification.
 */
export { notificationFeature } from "./notificationFeature";

export { NotificationProvider, useNotifications } from "./hooks/NotificationProvider";
export { NotificationBell } from "./components/NotificationBell";

export {
  NotificationCenterPage,
} from "./pages/NotificationCenterPage";
export {
  NotificationDetailPage,
} from "./pages/NotificationDetailPage";

/** Export service để sử dụng trong các feature khác. */
export { notificationService, NOTIFICATION_TYPES } from "./services/notificationService";

export * from "./notification-utils";
