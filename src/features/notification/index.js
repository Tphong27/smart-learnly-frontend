export const notificationFeature = {
  name: 'Notifications',
  routeBase: '/notifications',
}

export { NotificationProvider, useNotifications } from "./NotificationProvider";
export { NotificationBell } from "./components/NotificationBell";
export {
  NotificationCenterPage,
} from "./pages/NotificationCenterPage";
export {
  NotificationDetailPage,
} from "./pages/NotificationDetailPage";
export * from "./notification-utils";
