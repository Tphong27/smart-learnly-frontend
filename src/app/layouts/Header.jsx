import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, LogOut, Search, User, ChevronDown } from "lucide-react";
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

export function Header({ user, onLogout }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const displayName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "User";
  const initials = getInitials(displayName);
  const role = user?.role || "user";

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

  return (
    <header className="app-header">
      <div className="app-header__inner">
        {/* Thanh tìm kiếm bên trái */}
        <div className="app-header__left">
          <div className="app-header__search-container">
            <Search size={16} className="app-header__search-icon" />
            <input
              type="text"
              placeholder="Search..."
              className="app-header__search-input"
            />
          </div>
        </div>

        {/* Chuông thông báo & Profile bên phải */}
        <div className="app-header__actions">
          <button
            type="button"
            className="app-header__icon-button"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="app-header__notification-dot" />
          </button>

          <div className="app-header__divider" />

          {/* Khối User Profile Dropdown */}
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
