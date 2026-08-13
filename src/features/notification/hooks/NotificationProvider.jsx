/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getAccessToken,
  getCurrentUser,
} from "@/services/api-client";
import { notificationService } from "../services/notificationService";
import {
  isUnreadNotification,
  withNotificationRead,
} from "../notification-utils";

/** Số notification hiển thị trong danh sách gần đây. */
const LATEST_NOTIFICATION_SIZE = 8;

const NotificationContext = createContext(null);

const initialLatestState = {
  items: [],
  loading: false,
  error: null,
  loaded: false,
};

/** Tạo khóa phiên để reset notification state khi user/token thay đổi. */
function getAuthKey() {
  const token = getAccessToken();
  if (!token) return null;

  const user = getCurrentUser();
  return user?.id || user?.userId || user?.accountId || user?.email || token;
}

/** Lấy message lỗi thân thiện với fallback ổn định. */
function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

/** Chuẩn hóa số lượng notification chưa đọc về số không âm. */
function clampUnreadCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

/** Cập nhật một notification trong danh sách hiện tại. */
function updateNotification(items, notificationId, updater) {
  return items.map((item) =>
    item.id === notificationId ? updater(item) : item,
  );
}

/** Gộp notification đã lưu từ backend vào danh sách hiện tại. */
function applyNotification(items, notification) {
  if (!notification?.id) return items;
  let found = false;
  const nextItems = items.map((item) => {
    if (item.id !== notification.id) return item;
    found = true;
    return { ...item, ...notification };
  });

  return found ? nextItems : items;
}

/** Lấy timestamp ISO dùng cho optimistic update. */
function nowIso() {
  return new Date().toISOString();
}

/**
 * Provider cung cấp context và state cho notification trong toàn bộ ứng dụng.
 */
export function NotificationProvider({ children }) {
  const authKey = getAuthKey();
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestState, setLatestState] = useState(initialLatestState);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const unreadRequestRef = useRef(null);
  const unreadRequestIdRef = useRef(0);
  const latestRequestRef = useRef(null);
  const latestRequestIdRef = useRef(0);
  const pendingNotificationPromisesRef = useRef(new Map());
  const pendingMarkAllReadPromiseRef = useRef(null);
  const unreadCountRef = useRef(0);
  const latestItemsRef = useRef([]);
  const latestLoadedRef = useRef(false);

  useEffect(() => {
    unreadCountRef.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    latestItemsRef.current = latestState.items;
    latestLoadedRef.current = latestState.loaded;
  }, [latestState.items, latestState.loaded]);

  /** Xóa toàn bộ cache và trạng thái mutation khi phiên đăng nhập thay đổi. */
  const resetState = useCallback(() => {
    unreadRequestRef.current = null;
    latestRequestRef.current = null;
    pendingNotificationPromisesRef.current = new Map();
    pendingMarkAllReadPromiseRef.current = null;
    unreadCountRef.current = 0;
    latestItemsRef.current = [];
    latestLoadedRef.current = false;
    setUnreadCount(0);
    setLatestState(initialLatestState);
    setIsMarkingAllRead(false);
  }, []);

  /** Tải lại số notification chưa đọc và giữ request mới nhất làm nguồn dữ liệu. */
  const refreshUnread = useCallback(async ({ force = false } = {}) => {
    if (!getAccessToken()) {
      setUnreadCount(0);
      return null;
    }

    if (unreadRequestRef.current && !force) {
      return unreadRequestRef.current;
    }

    const requestId = unreadRequestIdRef.current + 1;
    unreadRequestIdRef.current = requestId;

    const request = notificationService
      .unreadCount()
      .then((response) => {
        if (unreadRequestIdRef.current === requestId) {
          const count = clampUnreadCount(response.unreadCount);
          unreadCountRef.current = count;
          setUnreadCount(count);
        }
        return response;
      })
      .catch(() => null)
      .finally(() => {
        if (unreadRequestRef.current === request) {
          unreadRequestRef.current = null;
        }
      });

    unreadRequestRef.current = request;
    return request;
  }, []);

  /** Tải danh sách notification gần nhất để hiển thị trong dropdown. */
  const refreshLatest = useCallback(async ({ force = false } = {}) => {
    if (!getAccessToken()) {
      setLatestState(initialLatestState);
      return null;
    }

    if (latestRequestRef.current && !force) {
      return latestRequestRef.current;
    }

    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    setLatestState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    const request = notificationService
      .list({ page: 0, size: LATEST_NOTIFICATION_SIZE })
      .then((page) => {
        if (latestRequestIdRef.current === requestId) {
          latestItemsRef.current = page.items;
          latestLoadedRef.current = true;
          setLatestState({
            items: page.items,
            loading: false,
            error: null,
            loaded: true,
          });
        }
        return page;
      })
      .catch((error) => {
        if (latestRequestIdRef.current === requestId) {
          latestLoadedRef.current = true;
          setLatestState((current) => ({
            ...current,
            loading: false,
            error: getErrorMessage(error, "Failed to load notifications."),
            loaded: true,
          }));
        }
        return null;
      })
      .finally(() => {
        if (latestRequestRef.current === request) {
          latestRequestRef.current = null;
        }
      });

    latestRequestRef.current = request;
    return request;
  }, []);

  /** Đồng bộ badge và danh sách sau một mutation thành công. */
  const synchronizeAfterMutation = useCallback(() => {
    void refreshUnread({ force: true });
    void refreshLatest({ force: true });
  }, [refreshLatest, refreshUnread]);

  useEffect(() => {
    if (!authKey) {
      resetState();
      return;
    }

    void refreshUnread({ force: true });
  }, [authKey, refreshUnread, resetState]);

  useEffect(() => {
    /** Đồng bộ notification khi người dùng quay lại cửa sổ ứng dụng. */
    function handleFocus() {
      if (!getAccessToken()) return;
      void refreshUnread({ force: true });
      if (latestLoadedRef.current) {
        void refreshLatest({ force: true });
      }
    }

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshLatest, refreshUnread]);

  /** Chặn nhiều request click đồng thời trên cùng một notification. */
  const beginNotificationMutation = useCallback((notificationId, operation) => {
    if (!notificationId) return Promise.resolve(null);

    const existing = pendingNotificationPromisesRef.current.get(notificationId);
    if (existing) return existing;

    const promise = operation().finally(() => {
      pendingNotificationPromisesRef.current.delete(notificationId);
    });

    pendingNotificationPromisesRef.current.set(notificationId, promise);
    return promise;
  }, []);

  /** Ghi nhận click, đồng thời cập nhật trạng thái đã đọc theo hướng optimistic. */
  const recordClick = useCallback(
    (notification) =>
      beginNotificationMutation(notification?.id, async () => {
        const previousUnread = unreadCountRef.current;
        const previousItems = latestItemsRef.current;
        const wasUnread = isUnreadNotification(notification);
        const timestamp = nowIso();

        if (wasUnread) {
          setUnreadCount((current) => clampUnreadCount(current - 1));
        }
        setLatestState((current) => ({
          ...current,
          items: updateNotification(current.items, notification.id, (item) => ({
            ...withNotificationRead(item, timestamp),
            clickedAt: item.clickedAt || timestamp,
          })),
        }));

        try {
          const saved = await notificationService.recordClick(notification.id);
          setLatestState((current) => ({
            ...current,
            items: applyNotification(current.items, saved),
          }));
          synchronizeAfterMutation();
          return saved;
        } catch (error) {
          setUnreadCount(previousUnread);
          setLatestState((current) => ({
            ...current,
            items: previousItems,
          }));
          throw error;
        }
      }),
    [beginNotificationMutation, synchronizeAfterMutation],
  );

  /** Đánh dấu toàn bộ notification đã đọc và rollback nếu API thất bại. */
  const markAllRead = useCallback(
    () => {
      if (pendingMarkAllReadPromiseRef.current) {
        return pendingMarkAllReadPromiseRef.current;
      }

      const previousUnread = unreadCountRef.current;
      const previousItems = latestItemsRef.current;
      const timestamp = nowIso();

      setIsMarkingAllRead(true);
      setUnreadCount(0);
      setLatestState((current) => ({
        ...current,
        items: current.items.map((item) => withNotificationRead(item, timestamp)),
      }));

      const promise = notificationService
        .markAllRead()
        .then((response) => {
          setUnreadCount(clampUnreadCount(response.unreadCount));
          synchronizeAfterMutation();
          return response;
        })
        .catch((error) => {
          setUnreadCount(previousUnread);
          setLatestState((current) => ({
            ...current,
            items: previousItems,
          }));
          throw error;
        })
        .finally(() => {
          if (pendingMarkAllReadPromiseRef.current === promise) {
            pendingMarkAllReadPromiseRef.current = null;
          }
          setIsMarkingAllRead(false);
        });

      pendingMarkAllReadPromiseRef.current = promise;
      return promise;
    },
    [synchronizeAfterMutation],
  );

  const value = useMemo(
    () => ({
      unreadCount,
      latestNotifications: latestState.items,
      latestLoading: latestState.loading,
      latestError: latestState.error,
      latestLoaded: latestState.loaded,
      refreshUnread,
      refreshLatest,
      recordClick,
      markAllRead,
      isMarkingAllRead,
    }),
    [
      isMarkingAllRead,
      latestState.error,
      latestState.items,
      latestState.loaded,
      latestState.loading,
      markAllRead,
      recordClick,
      refreshLatest,
      refreshUnread,
      unreadCount,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/** Hook để truy cập notification context. */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
