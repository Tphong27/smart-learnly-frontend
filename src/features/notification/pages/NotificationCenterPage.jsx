import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Modal } from "@/shared/components/ui";
import { NOTIFICATION_TYPES, notificationService } from "@/services";
import { useNotifications } from "../hooks/NotificationProvider";
import {
  formatNotificationTime,
  getNotificationDestination,
  getNotificationPreview,
  getNotificationReadState,
  getNotificationTypeLabel,
  isUnreadNotification,
  withNotificationRead,
} from "../notification-utils";
import "./NotificationPages.css";

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
];

function getErrorStatus(error) {
  return (
    error?.status ||
    error?.code ||
    error?.originalError?.response?.status ||
    error?.response?.status ||
    null
  );
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function emptyMessageForStatus(status) {
  if (status === "unread") return "You are all caught up.";
  if (status === "read") return "No read notifications yet.";
  return "No notifications yet.";
}

function updateNotification(items, notificationId, updater) {
  return items.map((item) =>
    item.id === notificationId ? updater(item) : item,
  );
}

function removeNotification(items, notificationId) {
  return items.filter((item) => item.id !== notificationId);
}

function updateTotalPages(totalItems, size) {
  if (totalItems <= 0) return 0;
  return Math.ceil(totalItems / Math.max(1, size));
}

function NotificationPageState({ title, message, action }) {
  return (
    <section className="notifications-state" aria-live="polite">
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {action}
    </section>
  );
}

function NotificationListItem({
  notification,
  mutating,
  onArchive,
  onMarkRead,
  onOpen,
}) {
  const unread = isUnreadNotification(notification);
  const preview = getNotificationPreview(notification);

  return (
    <article
      className={`notifications-list-item${
        unread ? " notifications-list-item--unread" : ""
      }`}
    >
      <button
        type="button"
        className="notifications-list-item__main"
        onClick={() => onOpen(notification)}
      >
        <span className="notifications-list-item__meta">
          <span className="notifications-type">
            {getNotificationTypeLabel(notification.type)}
          </span>
          <span>{formatNotificationTime(notification.createdAt)}</span>
          <span
            className={`notifications-read-state notifications-read-state--${getNotificationReadState(
              notification,
            )}`}
          >
            {unread ? "Unread" : "Read"}
          </span>
        </span>
        <span className="notifications-list-item__title">
          {notification.title}
        </span>
        {preview && (
          <span className="notifications-list-item__preview">{preview}</span>
        )}
      </button>

      <div className="notifications-list-item__actions">
        {unread && (
          <button
            type="button"
            className="notifications-action"
            disabled={mutating}
            onClick={() => onMarkRead(notification)}
          >
            <Check size={16} aria-hidden="true" />
            Mark read
          </button>
        )}
        <button
          type="button"
          className="notifications-action"
          disabled={mutating}
          onClick={() => onArchive(notification)}
        >
          <Archive size={16} aria-hidden="true" />
          Archive
        </button>
        <button
          type="button"
          className="notifications-action notifications-action--primary"
          disabled={mutating}
          onClick={() => onOpen(notification)}
        >
          <ExternalLink size={16} aria-hidden="true" />
          Open
        </button>
      </div>
    </article>
  );
}

export function NotificationCenterPage() {
  const navigate = useNavigate();
  const requestIdRef = useRef(0);
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("");
  const [page, setPage] = useState(0);
  const [pageState, setPageState] = useState({
    items: [],
    page: 0,
    size: PAGE_SIZE,
    totalItems: 0,
    totalPages: 0,
    loading: true,
    error: null,
    unauthorized: false,
  });
  const [actionError, setActionError] = useState(null);
  const [archiveAllConfirmOpen, setArchiveAllConfirmOpen] = useState(false);
  const {
    unreadCount,
    mutationVersion,
    markRead,
    recordClick,
    archive,
    markAllRead,
    archiveAll,
    isNotificationMutating,
    isBulkMutating,
  } = useNotifications();

  const loadNotifications = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setPageState((current) => ({
      ...current,
      loading: true,
      error: null,
      unauthorized: false,
    }));

    try {
      const result = await notificationService.list({
        page,
        size: PAGE_SIZE,
        status,
        type,
      });

      if (requestIdRef.current !== requestId) return;

      setPageState({
        ...result,
        loading: false,
        error: null,
        unauthorized: false,
      });
    } catch (error) {
      if (requestIdRef.current !== requestId) return;

      const errorStatus = getErrorStatus(error);
      setPageState((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(error, "Failed to load notifications."),
        unauthorized: errorStatus === 401 || errorStatus === 403,
      }));
    }
  }, [page, status, type]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications, mutationVersion]);

  function handleStatusChange(nextStatus) {
    setStatus(nextStatus);
    setPage(0);
  }

  function handleTypeChange(event) {
    setType(event.target.value);
    setPage(0);
  }

  async function handleMarkRead(notification) {
    setActionError(null);
    const previousState = pageState;
    const timestamp = new Date().toISOString();

    setPageState((current) => {
      if (status === "unread") {
        const totalItems = Math.max(0, current.totalItems - 1);
        return {
          ...current,
          items: removeNotification(current.items, notification.id),
          totalItems,
          totalPages: updateTotalPages(totalItems, current.size),
        };
      }

      return {
        ...current,
        items: updateNotification(current.items, notification.id, (item) =>
          withNotificationRead(item, timestamp),
        ),
      };
    });

    try {
      await markRead(notification);
    } catch (error) {
      setPageState(previousState);
      setActionError(
        getErrorMessage(error, "Failed to mark notification as read."),
      );
    }
  }

  async function handleArchive(notification) {
    setActionError(null);
    const previousState = pageState;

    setPageState((current) => ({
      ...current,
      items: removeNotification(current.items, notification.id),
      totalItems: Math.max(0, current.totalItems - 1),
      totalPages: updateTotalPages(
        Math.max(0, current.totalItems - 1),
        current.size,
      ),
    }));

    try {
      await archive(notification);
    } catch (error) {
      setPageState(previousState);
      setActionError(getErrorMessage(error, "Failed to archive notification."));
    }
  }

  async function handleMarkAllRead() {
    setActionError(null);
    const previousState = pageState;
    const timestamp = new Date().toISOString();

    setPageState((current) => {
      if (status === "unread") {
        return {
          ...current,
          items: [],
          totalItems: 0,
          totalPages: 0,
          page: 0,
        };
      }

      return {
        ...current,
        items: current.items.map((item) => withNotificationRead(item, timestamp)),
      };
    });

    try {
      await markAllRead();
      if (status === "unread") {
        setPage(0);
      }
    } catch (error) {
      setPageState(previousState);
      setActionError(
        getErrorMessage(error, "Failed to mark notifications as read."),
      );
    }
  }

  async function handleArchiveAllConfirmed() {
    setActionError(null);
    const previousState = pageState;
    setPageState((current) => ({
      ...current,
      items: [],
      totalItems: 0,
      totalPages: 0,
    }));

    try {
      await archiveAll();
      setArchiveAllConfirmOpen(false);
      setPage(0);
    } catch (error) {
      setPageState(previousState);
      setActionError(
        getErrorMessage(error, "Failed to archive notifications."),
      );
    }
  }

  function handleOpen(notification) {
    const destination = getNotificationDestination(notification);
    void recordClick(notification).catch(() => {});
    navigate(destination);
  }

  const hasItems = pageState.items.length > 0;
  const totalPages = Math.max(0, pageState.totalPages);
  const currentPageNumber = totalPages === 0 ? 0 : pageState.page + 1;

  return (
    <section className="notifications-page" aria-labelledby="notifications-title">
      <div className="notifications-page__header">
        <div>
          <span className="notifications-page__eyebrow">Notification Center</span>
          <h1 id="notifications-title">Notifications</h1>
          <p>Review account, course, class and system updates.</p>
        </div>
        <div className="notifications-page__header-actions">
          <button
            type="button"
            className="notifications-action"
            disabled={unreadCount === 0 || isBulkMutating("read-all")}
            onClick={handleMarkAllRead}
          >
            <Check size={16} aria-hidden="true" />
            Mark all read
          </button>
          <button
            type="button"
            className="notifications-action notifications-action--danger"
            disabled={!hasItems || isBulkMutating("archive-all")}
            onClick={() => setArchiveAllConfirmOpen(true)}
          >
            <Archive size={16} aria-hidden="true" />
            Archive all
          </button>
        </div>
      </div>

      <div className="notifications-toolbar">
        <div className="notifications-filter-group" aria-label="Read status">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className={`notifications-filter${
                status === filter.key ? " notifications-filter--active" : ""
              }`}
              onClick={() => handleStatusChange(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <label className="notifications-type-select">
          <span>Type</span>
          <select value={type} onChange={handleTypeChange}>
            <option value="">All types</option>
            {NOTIFICATION_TYPES.map((notificationType) => (
              <option key={notificationType} value={notificationType}>
                {getNotificationTypeLabel(notificationType)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {actionError && (
        <div className="notifications-inline-error" role="alert">
          {actionError}
        </div>
      )}

      {pageState.loading ? (
        <NotificationPageState
          title="Loading notifications..."
          message="Fetching your latest updates."
        />
      ) : pageState.unauthorized ? (
        <NotificationPageState
          title="Unable to load notifications"
          message="Your session does not have access to these notifications."
          action={
            <button
              type="button"
              className="notifications-action"
              onClick={loadNotifications}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Retry
            </button>
          }
        />
      ) : pageState.error ? (
        <NotificationPageState
          title="Something went wrong"
          message={pageState.error}
          action={
            <button
              type="button"
              className="notifications-action"
              onClick={loadNotifications}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Retry
            </button>
          }
        />
      ) : !hasItems ? (
        <NotificationPageState
          title={emptyMessageForStatus(status)}
          message="New active notifications will appear here."
        />
      ) : (
        <>
          <div className="notifications-list">
            {pageState.items.map((notification) => (
              <NotificationListItem
                key={notification.id}
                notification={notification}
                mutating={isNotificationMutating(notification.id)}
                onArchive={handleArchive}
                onMarkRead={handleMarkRead}
                onOpen={handleOpen}
              />
            ))}
          </div>

          <div className="notifications-pagination">
            <span>
              Page {currentPageNumber} of {Math.max(1, totalPages)} -{" "}
              {pageState.totalItems} notifications
            </span>
            <div>
              <button
                type="button"
                className="notifications-action"
                disabled={pageState.page <= 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft size={16} aria-hidden="true" />
                Previous
              </button>
              <button
                type="button"
                className="notifications-action"
                disabled={totalPages === 0 || pageState.page >= totalPages - 1}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={archiveAllConfirmOpen}
        title="Archive all notifications?"
        description="Archived notifications are removed from active notification lists."
        closeDisabled={isBulkMutating("archive-all")}
        onClose={() => setArchiveAllConfirmOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="notifications-action"
              disabled={isBulkMutating("archive-all")}
              onClick={() => setArchiveAllConfirmOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="notifications-action notifications-action--danger"
              disabled={isBulkMutating("archive-all")}
              onClick={handleArchiveAllConfirmed}
            >
              Archive all
            </button>
          </>
        }
      >
        <p className="notifications-confirm-copy">
          This action only affects your active notification list.
        </p>
      </Modal>
    </section>
  );
}
