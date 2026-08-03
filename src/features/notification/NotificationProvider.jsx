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
  notificationService,
} from "@/services";
import {
  isUnreadNotification,
  withNotificationRead,
} from "./notification-utils";

const LATEST_NOTIFICATION_SIZE = 8;

const NotificationContext = createContext(null);

const initialUnreadState = {
  count: 0,
  loading: false,
  error: null,
  loaded: false,
};

const initialLatestState = {
  items: [],
  loading: false,
  error: null,
  loaded: false,
};

function getAuthKey() {
  const token = getAccessToken();
  if (!token) return null;

  const user = getCurrentUser();
  return user?.id || user?.userId || user?.accountId || user?.email || token;
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function clampUnreadCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

function updateNotification(items, notificationId, updater) {
  return items.map((item) =>
    item.id === notificationId ? updater(item) : item,
  );
}

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

function removeNotification(items, notificationId) {
  return items.filter((item) => item.id !== notificationId);
}

function nowIso() {
  return new Date().toISOString();
}

export function NotificationProvider({ children }) {
  const authKey = getAuthKey();
  const [unreadState, setUnreadState] = useState(initialUnreadState);
  const [latestState, setLatestState] = useState(initialLatestState);
  const [pendingNotificationIds, setPendingNotificationIds] = useState(
    () => new Set(),
  );
  const [pendingBulkActions, setPendingBulkActions] = useState(() => new Set());
  const [mutationVersion, setMutationVersion] = useState(0);

  const unreadRequestRef = useRef(null);
  const unreadRequestIdRef = useRef(0);
  const latestRequestRef = useRef(null);
  const latestRequestIdRef = useRef(0);
  const pendingNotificationPromisesRef = useRef(new Map());
  const pendingBulkPromisesRef = useRef(new Map());
  const unreadCountRef = useRef(0);
  const latestItemsRef = useRef([]);
  const latestLoadedRef = useRef(false);

  useEffect(() => {
    unreadCountRef.current = unreadState.count;
  }, [unreadState.count]);

  useEffect(() => {
    latestItemsRef.current = latestState.items;
    latestLoadedRef.current = latestState.loaded;
  }, [latestState.items, latestState.loaded]);

  const resetState = useCallback(() => {
    unreadRequestRef.current = null;
    latestRequestRef.current = null;
    pendingNotificationPromisesRef.current = new Map();
    pendingBulkPromisesRef.current = new Map();
    unreadCountRef.current = 0;
    latestItemsRef.current = [];
    latestLoadedRef.current = false;
    setUnreadState(initialUnreadState);
    setLatestState(initialLatestState);
    setPendingNotificationIds(new Set());
    setPendingBulkActions(new Set());
  }, []);

  const refreshUnread = useCallback(async ({ force = false } = {}) => {
    if (!getAccessToken()) {
      setUnreadState(initialUnreadState);
      return null;
    }

    if (unreadRequestRef.current && !force) {
      return unreadRequestRef.current;
    }

    const requestId = unreadRequestIdRef.current + 1;
    unreadRequestIdRef.current = requestId;
    setUnreadState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    const request = notificationService
      .unreadCount()
      .then((response) => {
        if (unreadRequestIdRef.current === requestId) {
          const count = clampUnreadCount(response.unreadCount);
          unreadCountRef.current = count;
          setUnreadState({
            count,
            loading: false,
            error: null,
            loaded: true,
          });
        }
        return response;
      })
      .catch((error) => {
        if (unreadRequestIdRef.current === requestId) {
          setUnreadState((current) => ({
            ...current,
            loading: false,
            error: getErrorMessage(error, "Failed to load unread count."),
            loaded: true,
          }));
        }
        return null;
      })
      .finally(() => {
        if (unreadRequestRef.current === request) {
          unreadRequestRef.current = null;
        }
      });

    unreadRequestRef.current = request;
    return request;
  }, []);

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
      .list({ page: 0, size: LATEST_NOTIFICATION_SIZE, status: "all" })
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

  const synchronizeAfterMutation = useCallback(() => {
    setMutationVersion((value) => value + 1);
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

  const beginNotificationMutation = useCallback((notificationId, operation) => {
    if (!notificationId) return Promise.resolve(null);

    const existing = pendingNotificationPromisesRef.current.get(notificationId);
    if (existing) return existing;

    setPendingNotificationIds((current) => {
      const next = new Set(current);
      next.add(notificationId);
      return next;
    });

    const promise = operation().finally(() => {
      pendingNotificationPromisesRef.current.delete(notificationId);
      setPendingNotificationIds((current) => {
        const next = new Set(current);
        next.delete(notificationId);
        return next;
      });
    });

    pendingNotificationPromisesRef.current.set(notificationId, promise);
    return promise;
  }, []);

  const beginBulkMutation = useCallback((action, operation) => {
    const existing = pendingBulkPromisesRef.current.get(action);
    if (existing) return existing;

    setPendingBulkActions((current) => {
      const next = new Set(current);
      next.add(action);
      return next;
    });

    const promise = operation().finally(() => {
      pendingBulkPromisesRef.current.delete(action);
      setPendingBulkActions((current) => {
        const next = new Set(current);
        next.delete(action);
        return next;
      });
    });

    pendingBulkPromisesRef.current.set(action, promise);
    return promise;
  }, []);

  const markRead = useCallback(
    (notification) =>
      beginNotificationMutation(notification?.id, async () => {
        const previousUnread = unreadCountRef.current;
        const previousItems = latestItemsRef.current;
        const wasUnread = isUnreadNotification(notification);
        const timestamp = nowIso();

        if (wasUnread) {
          setUnreadState((current) => ({
            ...current,
            count: clampUnreadCount(current.count - 1),
          }));
        }
        setLatestState((current) => ({
          ...current,
          items: updateNotification(current.items, notification.id, (item) =>
            withNotificationRead(item, timestamp),
          ),
        }));

        try {
          const saved = await notificationService.markRead(notification.id);
          setLatestState((current) => ({
            ...current,
            items: applyNotification(current.items, saved),
          }));
          synchronizeAfterMutation();
          return saved;
        } catch (error) {
          setUnreadState((current) => ({
            ...current,
            count: previousUnread,
          }));
          setLatestState((current) => ({
            ...current,
            items: previousItems,
          }));
          throw error;
        }
      }),
    [beginNotificationMutation, synchronizeAfterMutation],
  );

  const recordClick = useCallback(
    (notification) =>
      beginNotificationMutation(notification?.id, async () => {
        const previousUnread = unreadCountRef.current;
        const previousItems = latestItemsRef.current;
        const wasUnread = isUnreadNotification(notification);
        const timestamp = nowIso();

        if (wasUnread) {
          setUnreadState((current) => ({
            ...current,
            count: clampUnreadCount(current.count - 1),
          }));
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
          setUnreadState((current) => ({
            ...current,
            count: previousUnread,
          }));
          setLatestState((current) => ({
            ...current,
            items: previousItems,
          }));
          throw error;
        }
      }),
    [beginNotificationMutation, synchronizeAfterMutation],
  );

  const archive = useCallback(
    (notification) =>
      beginNotificationMutation(notification?.id, async () => {
        const previousUnread = unreadCountRef.current;
        const previousItems = latestItemsRef.current;
        const wasUnread = isUnreadNotification(notification);

        if (wasUnread) {
          setUnreadState((current) => ({
            ...current,
            count: clampUnreadCount(current.count - 1),
          }));
        }
        setLatestState((current) => ({
          ...current,
          items: removeNotification(current.items, notification.id),
        }));

        try {
          const saved = await notificationService.archive(notification.id);
          synchronizeAfterMutation();
          return saved;
        } catch (error) {
          setUnreadState((current) => ({
            ...current,
            count: previousUnread,
          }));
          setLatestState((current) => ({
            ...current,
            items: previousItems,
          }));
          throw error;
        }
      }),
    [beginNotificationMutation, synchronizeAfterMutation],
  );

  const markAllRead = useCallback(
    () =>
      beginBulkMutation("read-all", async () => {
        const previousUnread = unreadCountRef.current;
        const previousItems = latestItemsRef.current;
        const timestamp = nowIso();

        setUnreadState((current) => ({ ...current, count: 0 }));
        setLatestState((current) => ({
          ...current,
          items: current.items.map((item) =>
            withNotificationRead(item, timestamp),
          ),
        }));

        try {
          const response = await notificationService.markAllRead();
          setUnreadState((current) => ({
            ...current,
            count: clampUnreadCount(response.unreadCount),
          }));
          synchronizeAfterMutation();
          return response;
        } catch (error) {
          setUnreadState((current) => ({
            ...current,
            count: previousUnread,
          }));
          setLatestState((current) => ({
            ...current,
            items: previousItems,
          }));
          throw error;
        }
      }),
    [beginBulkMutation, synchronizeAfterMutation],
  );

  const archiveAll = useCallback(
    () =>
      beginBulkMutation("archive-all", async () => {
        const previousUnread = unreadCountRef.current;
        const previousItems = latestItemsRef.current;

        setUnreadState((current) => ({ ...current, count: 0 }));
        setLatestState((current) => ({ ...current, items: [] }));

        try {
          const response = await notificationService.archiveAll();
          synchronizeAfterMutation();
          return response;
        } catch (error) {
          setUnreadState((current) => ({
            ...current,
            count: previousUnread,
          }));
          setLatestState((current) => ({
            ...current,
            items: previousItems,
          }));
          throw error;
        }
      }),
    [beginBulkMutation, synchronizeAfterMutation],
  );

  const value = useMemo(
    () => ({
      unreadCount: unreadState.count,
      unreadLoading: unreadState.loading,
      unreadError: unreadState.error,
      latestNotifications: latestState.items,
      latestLoading: latestState.loading,
      latestError: latestState.error,
      latestLoaded: latestState.loaded,
      pendingNotificationIds,
      pendingBulkActions,
      mutationVersion,
      refreshUnread,
      refreshLatest,
      markRead,
      recordClick,
      archive,
      markAllRead,
      archiveAll,
      isNotificationMutating: (notificationId) =>
        pendingNotificationIds.has(notificationId),
      isBulkMutating: (action) => pendingBulkActions.has(action),
    }),
    [
      archive,
      archiveAll,
      latestState.error,
      latestState.items,
      latestState.loaded,
      latestState.loading,
      markAllRead,
      markRead,
      mutationVersion,
      pendingBulkActions,
      pendingNotificationIds,
      recordClick,
      refreshLatest,
      refreshUnread,
      unreadState.count,
      unreadState.error,
      unreadState.loading,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
