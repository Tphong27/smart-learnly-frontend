import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Archive,
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  CreditCard,
  Ellipsis,
  GraduationCap,
  Info,
  MessageSquareText,
  Sparkles,
  TriangleAlert,
  UserPlus,
} from "lucide-react";
import { useNotifications } from "../hooks/NotificationProvider";
import {
  formatNotificationTime,
  getNotificationDestination,
  getNotificationPreview,
  getNotificationTypeLabel,
  isUnreadNotification,
  normalizeNotificationType,
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

/** Rút gọn số lượng chưa đọc để badge trên chuông luôn vừa kích thước. */
function getUnreadBadgeLabel(count) {
  if (count > 99) return "99+";
  return String(count);
}

const TYPE_VISUALS = Object.freeze({
  ENROLLMENT: { icon: UserPlus, tone: "enrollment" },
  PAYMENT: { icon: CreditCard, tone: "payment" },
  ASSIGNMENT: { icon: ClipboardList, tone: "assignment" },
  TEST: { icon: ClipboardCheck, tone: "test" },
  FEEDBACK: { icon: MessageSquareText, tone: "feedback" },
  SYSTEM: { icon: Info, tone: "system" },
  AI_SUGGESTION: { icon: Sparkles, tone: "ai" },
  CLASS_REMINDER: { icon: Clock3, tone: "class" },
  CHURN_ALERT: { icon: TriangleAlert, tone: "alert" },
  CLASS: { icon: GraduationCap, tone: "class" },
  COURSE: { icon: BookOpen, tone: "course" },
});

/** Chọn icon và tone hiển thị cho từng loại notification trong dropdown. */
function getNotificationVisual(type) {
  return TYPE_VISUALS[normalizeNotificationType(type)] || TYPE_VISUALS.SYSTEM;
}

/** Hiển thị một notification trong dropdown và các thao tác nhanh của nó. */
function NotificationDropdownItem({
  notification,
  mutating,
  actionsOpen,
  onArchive,
  onCloseActions,
  onMarkRead,
  onOpen,
  onToggleActions,
}) {
  const unread = isUnreadNotification(notification);
  const preview = getNotificationPreview(notification);
  const actionsId = useId();
  const { icon: TypeIcon, tone } = getNotificationVisual(notification.type);

  function handleMarkRead() {
    onCloseActions();
    void onMarkRead(notification);
  }

  function handleArchive() {
    onCloseActions();
    void onArchive(notification);
  }

  return (
    <li
      className={`notification-dropdown__item${
        unread ? " notification-dropdown__item--unread" : ""
      }`}
    >
      {unread && (
        <span className="notification-dropdown__unread-dot" aria-hidden="true" />
      )}

      <button
        type="button"
        className="notification-dropdown__item-main"
        onClick={() => onOpen(notification)}
      >
        <span
          className={`notification-dropdown__type-icon notification-dropdown__type-icon--${tone}`}
          aria-hidden="true"
        >
          <TypeIcon size={18} />
        </span>

        <span className="notification-dropdown__item-copy">
          <span className="notification-dropdown__item-topline">
            <span className="notification-dropdown__type">
              {getNotificationTypeLabel(notification.type)}
            </span>
            <span className="notification-dropdown__time">
              {formatNotificationTime(notification.createdAt)}
            </span>
          </span>
          <strong className="notification-dropdown__title">
            {unread && (
              <span className="notification-dropdown__sr-only">
                Unread notification:{" "}
              </span>
            )}
            {notification.title}
          </strong>
          {preview && (
            <span className="notification-dropdown__preview">{preview}</span>
          )}
        </span>
      </button>

      <div
        className="notification-dropdown__item-actions"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            onCloseActions();
          }
        }}
      >
        <button
          type="button"
          className="notification-dropdown__more-button"
          disabled={mutating}
          onClick={onToggleActions}
          aria-label={`More actions for ${notification.title}`}
          aria-haspopup="menu"
          aria-expanded={actionsOpen}
          aria-controls={actionsOpen ? actionsId : undefined}
        >
          <Ellipsis size={18} aria-hidden="true" />
        </button>

        {actionsOpen && (
          <div
            id={actionsId}
            className="notification-dropdown__actions-menu"
            role="menu"
          >
            {unread && (
              <button type="button" role="menuitem" onClick={handleMarkRead}>
                <Check size={15} aria-hidden="true" />
                Mark as read
              </button>
            )}
            <button type="button" role="menuitem" onClick={handleArchive}>
              <Archive size={15} aria-hidden="true" />
              Archive
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

/** Hiển thị chuông notification và popover danh sách cập nhật gần nhất. */
export function NotificationBell({ variant = "app", onOpen }) {
  const classes = VARIANT_CLASSES[variant] || VARIANT_CLASSES.app;
  const panelTitleId = useId();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const location = useLocation();
  const routeRef = useRef(location.key);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeActionsId, setActiveActionsId] = useState(null);
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
    markAllRead,
    isNotificationMutating,
    isBulkMutating,
  } = useNotifications();

  const closePanel = useCallback(({ returnFocus = true } = {}) => {
    setOpen(false);
    setActiveActionsId(null);
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
        if (activeActionsId) {
          setActiveActionsId(null);
          return;
        }
        closePanel();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeActionsId, closePanel, open]);

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

  async function handleMarkAllRead() {
    setActionError(null);
    setActiveActionsId(null);
    try {
      await markAllRead();
    } catch (error) {
      setActionError(error?.message || "Failed to mark notifications as read.");
    }
  }

  function handleRefresh() {
    void refreshUnread({ force: true });
    void refreshLatest({ force: true });
  }

  function handleOpenNotification(notification) {
    const destination = getNotificationDestination(notification);
    setActionError(null);
    setActiveActionsId(null);
    void recordClick(notification).catch(() => {});

    if (destination) {
      closePanel({ returnFocus: false });
      navigate(destination);
    }
  }

  const visibleNotifications =
    activeFilter === "unread"
      ? latestNotifications.filter(isUnreadNotification)
      : latestNotifications;
  const markingAllRead = isBulkMutating("read-all");

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
              <span>
                {unreadCount > 0
                  ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                  : "You're all caught up"}
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-dropdown__mark-all"
                onClick={handleMarkAllRead}
                disabled={markingAllRead}
              >
                <CheckCheck size={16} aria-hidden="true" />
                {markingAllRead ? "Marking..." : "Mark all read"}
              </button>
            )}
          </div>

          <div className="notification-dropdown__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "all"}
              className={activeFilter === "all" ? "is-active" : undefined}
              onClick={() => {
                setActiveFilter("all");
                setActiveActionsId(null);
              }}
            >
              All
              <span>{latestNotifications.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeFilter === "unread"}
              className={activeFilter === "unread" ? "is-active" : undefined}
              onClick={() => {
                setActiveFilter("unread");
                setActiveActionsId(null);
              }}
            >
              Unread
              <span>{unreadCount}</span>
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
          ) : visibleNotifications.length === 0 ? (
            <div className="notification-dropdown__state">
              <CheckCheck size={22} aria-hidden="true" />
              No unread notifications.
            </div>
          ) : (
            <ul className="notification-dropdown__list">
              {visibleNotifications.map((notification) => (
                <NotificationDropdownItem
                  key={notification.id}
                  notification={notification}
                  mutating={isNotificationMutating(notification.id)}
                  actionsOpen={activeActionsId === notification.id}
                  onArchive={handleArchive}
                  onCloseActions={() => setActiveActionsId(null)}
                  onMarkRead={handleMarkRead}
                  onOpen={handleOpenNotification}
                  onToggleActions={() =>
                    setActiveActionsId((current) =>
                      current === notification.id ? null : notification.id,
                    )
                  }
                />
              ))}
            </ul>
          )}

          {actionError && (
            <div className="notification-dropdown__action-error" role="alert">
              {actionError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
