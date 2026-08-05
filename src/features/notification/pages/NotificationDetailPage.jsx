import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArrowLeft,
  Check,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Modal } from "@/shared/components/ui";
import { notificationService } from "@/services";
import { useNotifications } from "../hooks/NotificationProvider";
import {
  formatNotificationTime,
  getNotificationActionDestination,
  getNotificationReadState,
  getNotificationTypeLabel,
  isUnreadNotification,
  withNotificationRead,
} from "../notification-utils";
import "./NotificationPages.css";

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

function NotificationDetailState({ title, message, action }) {
  return (
    <section className="notifications-state" aria-live="polite">
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {action}
    </section>
  );
}

export function NotificationDetailPage() {
  const { notificationId } = useParams();
  const navigate = useNavigate();
  const requestIdRef = useRef(0);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const {
    markRead,
    recordClick,
    archive,
    isNotificationMutating,
    mutationVersion,
  } = useNotifications();

  const actionDestination = useMemo(
    () => getNotificationActionDestination(notification),
    [notification],
  );

  const loadNotification = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);
    setUnauthorized(false);

    try {
      const response = await notificationService.get(notificationId);
      if (requestIdRef.current !== requestId) return;
      setNotification(response);
      setLoading(false);
    } catch (loadError) {
      if (requestIdRef.current !== requestId) return;
      const status = getErrorStatus(loadError);
      setLoading(false);
      setNotification(null);
      setError(getErrorMessage(loadError, "Failed to load notification."));
      setUnauthorized(status === 401 || status === 403);
    }
  }, [notificationId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadNotification();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [loadNotification, mutationVersion]);

  async function handleMarkRead() {
    if (!notification || !isUnreadNotification(notification)) return;

    setActionError(null);
    const previousNotification = notification;
    const timestamp = new Date().toISOString();
    setNotification(withNotificationRead(notification, timestamp));

    try {
      const saved = await markRead(notification);
      if (saved) setNotification(saved);
    } catch (markError) {
      setNotification(previousNotification);
      setActionError(
        getErrorMessage(markError, "Failed to mark notification as read."),
      );
    }
  }

  async function handleArchiveConfirmed() {
    if (!notification) return;

    setActionError(null);
    const previousNotification = notification;
    setArchiveConfirmOpen(false);
    setNotification(null);

    try {
      await archive(previousNotification);
      navigate("/notifications", { replace: true });
    } catch (archiveError) {
      setNotification(previousNotification);
      setActionError(
        getErrorMessage(archiveError, "Failed to archive notification."),
      );
    }
  }

  async function handleOpenAction() {
    if (!notification || !actionDestination) return;

    setActionError(null);
    const previousNotification = notification;
    const timestamp = new Date().toISOString();
    setNotification({
      ...withNotificationRead(notification, timestamp),
      clickedAt: notification.clickedAt || timestamp,
    });

    try {
      const saved = await recordClick(notification);
      if (saved) setNotification(saved);
      navigate(actionDestination);
    } catch (clickError) {
      setNotification(previousNotification);
      setActionError(
        getErrorMessage(clickError, "Failed to open notification link."),
      );
    }
  }

  const mutating = isNotificationMutating(notification?.id);
  const unread = isUnreadNotification(notification);

  return (
    <section
      className="notifications-page notifications-page--detail"
      aria-labelledby="notification-detail-title"
    >
      <div className="notifications-page__back">
        <Link to="/notifications" className="notifications-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          Notifications
        </Link>
      </div>

      {loading ? (
        <NotificationDetailState
          title="Loading notification..."
          message="Fetching the selected update."
        />
      ) : unauthorized ? (
        <NotificationDetailState
          title="Unable to load notification"
          message="Your session does not have access to this notification."
          action={
            <button
              type="button"
              className="notifications-action"
              onClick={loadNotification}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Retry
            </button>
          }
        />
      ) : error ? (
        <NotificationDetailState
          title="Something went wrong"
          message={error}
          action={
            <button
              type="button"
              className="notifications-action"
              onClick={loadNotification}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Retry
            </button>
          }
        />
      ) : notification ? (
        <article className="notifications-detail">
          <div className="notifications-detail__header">
            <div>
              <div className="notifications-list-item__meta">
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
              </div>
              <h1 id="notification-detail-title">{notification.title}</h1>
            </div>
            <div className="notifications-page__header-actions">
              {unread && (
                <button
                  type="button"
                  className="notifications-action"
                  disabled={mutating}
                  onClick={handleMarkRead}
                >
                  <Check size={16} aria-hidden="true" />
                  Mark read
                </button>
              )}
              <button
                type="button"
                className="notifications-action notifications-action--danger"
                disabled={mutating}
                onClick={() => setArchiveConfirmOpen(true)}
              >
                <Archive size={16} aria-hidden="true" />
                Archive
              </button>
              {actionDestination && (
                <button
                  type="button"
                  className="notifications-action notifications-action--primary"
                  disabled={mutating}
                  onClick={handleOpenAction}
                >
                  <ExternalLink size={16} aria-hidden="true" />
                  Open linked page
                </button>
              )}
            </div>
          </div>

          {actionError && (
            <div className="notifications-inline-error" role="alert">
              {actionError}
            </div>
          )}

          <div className="notifications-detail__body">
            {notification.body ? (
              <p>{notification.body}</p>
            ) : (
              <p className="notifications-detail__muted">
                No message body was provided.
              </p>
            )}
          </div>

          <dl className="notifications-detail__meta">
            <div>
              <dt>Delivered</dt>
              <dd>{formatNotificationTime(notification.deliveredAt)}</dd>
            </div>
            <div>
              <dt>Reference</dt>
              <dd>
                {notification.referenceType && notification.referenceId
                  ? `${notification.referenceType} ${notification.referenceId}`
                  : "None"}
              </dd>
            </div>
          </dl>
        </article>
      ) : (
        <NotificationDetailState
          title="Notification not found"
          message="This notification may have been archived or removed."
        />
      )}

      <Modal
        open={archiveConfirmOpen}
        title="Archive notification?"
        description="Archived notifications are removed from active notification lists."
        closeDisabled={mutating}
        onClose={() => setArchiveConfirmOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="notifications-action"
              disabled={mutating}
              onClick={() => setArchiveConfirmOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="notifications-action notifications-action--danger"
              disabled={mutating}
              onClick={handleArchiveConfirmed}
            >
              Archive
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
