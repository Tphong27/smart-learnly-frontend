import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Archive, Bell, Check, RefreshCw } from "lucide-react";
import { useNotifications } from "../NotificationProvider";
import {
  formatNotificationTime,
  getNotificationDestination,
  getNotificationPreview,
  getNotificationTypeLabel,
  isUnreadNotification,
} from "../notification-utils";
import "./NotificationBell.css";

const VARIANT_CLASSES = {
  app: {
    wrapper: "app-header__notification notification-bell notification-bell--app",
    button: "app-header__icon-button notification-bell__button",
    panel: "app-header__notification-panel notification-dropdown",
  },
  trainee: {
    wrapper:
      "trainee-header__menu-anchor notification-bell notification-bell--trainee",
    button: "trainee-header__icon-button notification-bell__button",
    panel:
      "trainee-header__popover trainee-header__notifications notification-dropdown",
  },
};

function getUnreadBadgeLabel(count) {
  if (count > 99) return "99+";
  return String(count);
}

function NotificationDropdownItem({
  notification,
  mutating,
  onArchive,
  onMarkRead,
  onOpen,
}) {
  const unread = isUnreadNotification(notification);
  const preview = getNotificationPreview(notification);

  return (
    <li
      className={`notification-dropdown__item${
        unread ? " notification-dropdown__item--unread" : ""
      }`}
    >
      <button
        type="button"
        className="notification-dropdown__item-main"
        onClick={() => onOpen(notification)}
      >
        <span className="notification-dropdown__item-topline">
          <span className="notification-dropdown__type">
            {getNotificationTypeLabel(notification.type)}
          </span>
          <span className="notification-dropdown__time">
            {formatNotificationTime(notification.createdAt)}
          </span>
        </span>
        <span className="notification-dropdown__title-row">
          <strong>{notification.title}</strong>
          {unread && (
            <span className="notification-dropdown__unread-label">Unread</span>
          )}
        </span>
        {preview && (
          <span className="notification-dropdown__preview">{preview}</span>
        )}
      </button>

      <div className="notification-dropdown__item-actions">
        {unread && (
          <button
            type="button"
            className="notification-dropdown__icon-action"
            disabled={mutating}
            onClick={() => onMarkRead(notification)}
            aria-label={`Mark ${notification.title} as read`}
            title="Mark read"
          >
            <Check size={14} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className="notification-dropdown__icon-action"
          disabled={mutating}
          onClick={() => onArchive(notification)}
          aria-label={`Archive ${notification.title}`}
          title="Archive"
        >
          <Archive size={14} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

export function NotificationBell({ variant = "app", onOpen }) {
  const classes = VARIANT_CLASSES[variant] || VARIANT_CLASSES.app;
  const panelTitleId = useId();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const location = useLocation();
  const routeRef = useRef(location.key);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState(null);
  const {
    unreadCount,
    latestNotifications,
    latestLoading,
    latestError,
    latestLoaded,
    refreshUnread,
    refreshLatest,
    markRead,
    recordClick,
    archive,
    isNotificationMutating,
  } = useNotifications();

  const closePanel = useCallback(({ returnFocus = true } = {}) => {
    setOpen(false);
    setActionError(null);

    if (returnFocus) {
      window.requestAnimationFrame(() => {
        buttonRef.current?.focus();
      });
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        closePanel();
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePanel, open]);

  useEffect(() => {
    if (routeRef.current === location.key) return;
    routeRef.current = location.key;

    if (open) {
      const frame = window.requestAnimationFrame(() => closePanel());
      return () => window.cancelAnimationFrame(frame);
    }

    return undefined;
  }, [closePanel, location.key, open]);

  useEffect(() => {
    if (!open) return;
    void refreshUnread({ force: true });
    void refreshLatest({ force: true });
  }, [open, refreshLatest, refreshUnread]);

  function handleToggle() {
    setOpen((current) => {
      const next = !current;
      if (next) onOpen?.();
      return next;
    });
  }

  async function handleMarkRead(notification) {
    setActionError(null);
    try {
      await markRead(notification);
    } catch (error) {
      setActionError(error?.message || "Failed to mark notification as read.");
    }
  }

  async function handleArchive(notification) {
    setActionError(null);
    try {
      await archive(notification);
    } catch (error) {
      setActionError(error?.message || "Failed to archive notification.");
    }
  }

  function handleRefresh() {
    void refreshUnread({ force: true });
    void refreshLatest({ force: true });
  }

  function handleOpenNotification(notification) {
    const destination = getNotificationDestination(notification);
    setActionError(null);
    void recordClick(notification).catch(() => {});
    closePanel({ returnFocus: false });
    navigate(destination);
  }

  return (
    <div className={classes.wrapper} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={classes.button}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications, no unread notifications"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelTitleId : undefined}
        onClick={handleToggle}
      >
        <Bell size={variant === "trainee" ? 20 : 18} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="notification-bell__badge">
            {getUnreadBadgeLabel(unreadCount)}
          </span>
        )}
      </button>

      {open && (
        <div
          className={classes.panel}
          role="dialog"
          aria-labelledby={panelTitleId}
        >
          <div className="notification-dropdown__header">
            <div>
              <strong id={panelTitleId}>Notifications</strong>
              <span>Latest updates</span>
            </div>
            <button
              type="button"
              className="notification-dropdown__retry"
              onClick={handleRefresh}
              disabled={latestLoading}
            >
              <RefreshCw
                size={14}
                className={latestLoading ? "notification-spin" : undefined}
                aria-hidden="true"
              />
              Refresh
            </button>
          </div>

          {latestLoading && !latestLoaded ? (
            <div className="notification-dropdown__state" role="status">
              Loading notifications...
            </div>
          ) : latestError ? (
            <div className="notification-dropdown__state notification-dropdown__state--error">
              <span>{latestError}</span>
              <button
                type="button"
                className="notification-dropdown__state-action"
                onClick={handleRefresh}
              >
                Retry
              </button>
            </div>
          ) : latestNotifications.length === 0 ? (
            <div className="notification-dropdown__state">
              No notifications yet.
            </div>
          ) : (
            <ul className="notification-dropdown__list">
              {latestNotifications.map((notification) => (
                <NotificationDropdownItem
                  key={notification.id}
                  notification={notification}
                  mutating={isNotificationMutating(notification.id)}
                  onArchive={handleArchive}
                  onMarkRead={handleMarkRead}
                  onOpen={handleOpenNotification}
                />
              ))}
            </ul>
          )}

          {actionError && (
            <div className="notification-dropdown__action-error" role="alert">
              {actionError}
            </div>
          )}

          <Link
            to="/notifications"
            className="notification-dropdown__view-all"
            onClick={() => closePanel({ returnFocus: false })}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
