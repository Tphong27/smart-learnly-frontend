import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, LogOut, User, ChevronDown, Menu, Zap } from "lucide-react";
import { getDashboardPathByRole } from "@/app/routes/dashboard-path";
import { normalizeRole } from "@/shared/constants/roles";
import "./Header.css";

function getInitials(name) {
  return (name || "U")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Header({ user, onLogout, onToggleSidebar }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(() => window.scrollY > 24);
  const menuRef = useRef(null);

  const displayName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "User";
  const initials = getInitials(displayName);
  const role = normalizeRole(user?.role);
  const dashboardPath = getDashboardPathByRole(role);

  useEffect(() => {
    function handleClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    let frameId = null;
    const scrollContainer = document.querySelector(".app-content-area");

    function handleScroll() {
      if (frameId) return;

      frameId = window.requestAnimationFrame(() => {
        const scrollTop = Math.max(
          window.scrollY,
          scrollContainer?.scrollTop || 0,
        );
        const shouldCompact = scrollTop > 24;
        setIsCompact((current) =>
          current === shouldCompact ? current : shouldCompact,
        );
        frameId = null;
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    scrollContainer?.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      scrollContainer?.removeEventListener("scroll", handleScroll);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <header className={`app-header${isCompact ? " app-header--compact" : ""}`}>
      <div className="app-header__inner">
        {/* Left: Logo + Search */}
        <div className="app-header__left">
          {/* Mobile menu button */}
          {onToggleSidebar && (
            <button
              type="button"
              className="app-header__menu-button"
              onClick={onToggleSidebar}
              aria-label="Open sidebar"
            >
              <Menu size={18} />
            </button>
          )}

          {/* Logo */}
          <Link to={dashboardPath} className="app-header__logo">
            <span className="app-header__logo-mark">
              <Zap size={18} />
            </span>
            <span className="app-header__logo-text">
              <span className="app-header__logo-title">Smart Learnly</span>
            </span>
          </Link>

          {/* Vertical divider */}
          <div className="app-header__divider-vertical" />
        </div>

        {/* Right: Actions + Profile */}
        <div className="app-header__actions">
          {/* Notification */}
          <button
            type="button"
            className="app-header__icon-button"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="app-header__notification-dot" />
          </button>

          <div className="app-header__divider" />

          {/* User Profile Dropdown */}
          <div className="app-header__user" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className={`app-header__user-button ${open ? "app-header__user-button--active" : ""}`}
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  className="app-header__avatar"
                />
              ) : (
                <span className="app-header__avatar app-header__avatar--initials">
                  {initials}
                </span>
              )}

              <span className="app-header__user-copy">
                <span className="app-header__user-name">{displayName}</span>
                <span className="app-header__user-role">{role}</span>
              </span>

              <ChevronDown
                size={14}
                className={`app-header__chevron ${open ? "app-header__chevron--rotate" : ""}`}
              />
            </button>

            {open && (
              <div className="app-header__user-menu">
                <div className="app-header__dropdown-header">
                  <p className="dropdown-user-name">{displayName}</p>
                  <p className="dropdown-user-email">
                    {user?.email || "No email"}
                  </p>
                </div>

                <div className="user-menu__divider" />

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate("/profile");
                  }}
                  className="app-header__user-menu-item"
                >
                  <User size={16} /> Profile
                </button>

                <div className="user-menu__divider" />

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onLogout?.();
                  }}
                  className="app-header__user-menu-item app-header__user-menu-item--danger"
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
