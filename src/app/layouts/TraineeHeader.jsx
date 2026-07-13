import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, User } from "lucide-react";
import { Link } from "react-router-dom";
import { SmartLearnlyMark } from "@/shared/components/SmartLearnlyMark";
import { HeaderCourseSearch } from "@/shared/components/HeaderCourseSearch";
import { courseService } from "@/services";

function getDisplayName(user) {
  return (
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Learner"
  );
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TraineeHeader({ user, onLogout }) {
  const actionsRef = useRef(null);
  const categoriesRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const displayName = getDisplayName(user);
  const initials = getInitials(displayName);

  useEffect(() => {
    if (!categoriesOpen && !notificationOpen && !profileOpen) return undefined;

    function closeMenus(event) {
      const outsideCategories = !categoriesRef.current?.contains(event.target);
      const outsideActions = !actionsRef.current?.contains(event.target);

      if (outsideCategories && outsideActions) {
        setCategoriesOpen(false);
        setNotificationOpen(false);
        setProfileOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setCategoriesOpen(false);
        setNotificationOpen(false);
        setProfileOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeMenus);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenus);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [categoriesOpen, notificationOpen, profileOpen]);

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      try {
        const data = await courseService.getCategories();
        if (mounted) setCategories(Array.isArray(data) ? data : []);
      } catch {
        if (mounted) setCategories([]);
      } finally {
        if (mounted) setCategoriesLoading(false);
      }
    }

    loadCategories();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header className="trainee-header">
      <div className="header-container trainee-header__container">
        <Link
          to="/dashboard"
          className="header-logo"
          aria-label="Smart Learnly dashboard"
        >
          <SmartLearnlyMark className="header-logo-icon" />
          <span className="header-logo-text">Smart Learnly</span>
        </Link>

        <HeaderCourseSearch
          catalogPath="/learning/courses"
          catalogHash=""
          placeholder="Search courses, topics, or skills..."
          backLabel="Back to Course Catalog"
        />

        <div className="trainee-header__category-anchor" ref={categoriesRef}>
          <button
            type="button"
            className="header-categories-btn trainee-header__categories-button"
            aria-expanded={categoriesOpen}
            aria-haspopup="menu"
            onClick={() => {
              setCategoriesOpen((current) => !current);
              setNotificationOpen(false);
              setProfileOpen(false);
            }}
          >
            <span>Categories</span>
            <ChevronDown
              size={16}
              className={categoriesOpen ? "is-open" : undefined}
              aria-hidden="true"
            />
          </button>

          {categoriesOpen && (
            <div
              className="trainee-header__popover trainee-header__categories-menu"
              role="menu"
              aria-label="Course categories"
            >
              <Link
                to="/learning/courses"
                role="menuitem"
                onClick={() => setCategoriesOpen(false)}
              >
                All categories
              </Link>
              {categoriesLoading ? (
                <span className="trainee-header__categories-status" role="status">
                  Loading categories…
                </span>
              ) : categories.length > 0 ? (
                categories.map((category) => (
                  <Link
                    key={category.id || category.slug || category.name}
                    to={`/learning/courses?categorySlug=${encodeURIComponent(
                      category.slug || category.id,
                    )}`}
                    role="menuitem"
                    onClick={() => setCategoriesOpen(false)}
                  >
                    {category.name}
                  </Link>
                ))
              ) : (
                <span className="trainee-header__categories-status">
                  No categories available.
                </span>
              )}
            </div>
          )}
        </div>

        <div className="trainee-header__actions" ref={actionsRef}>
          <div className="trainee-header__menu-anchor">
            <button
              type="button"
              className="trainee-header__icon-button"
              aria-label="Notifications"
              aria-expanded={notificationOpen}
              aria-haspopup="dialog"
              onClick={() => {
                setNotificationOpen((current) => !current);
                setProfileOpen(false);
              }}
            >
              <Bell size={20} />
              <span className="trainee-header__notification-dot" />
            </button>

            {notificationOpen && (
              <div
                className="trainee-header__popover trainee-header__notifications"
                role="dialog"
                aria-label="Notifications"
              >
                <strong>Notifications</strong>
                <p>You are all caught up.</p>
              </div>
            )}
          </div>

          <div className="trainee-header__menu-anchor">
            <button
              type="button"
              className="trainee-header__profile-button"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              onClick={() => {
                setProfileOpen((current) => !current);
                setNotificationOpen(false);
              }}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" />
              ) : (
                <span className="trainee-header__avatar">{initials}</span>
              )}
              <span className="trainee-header__profile-copy">
                <strong>{displayName}</strong>
                <small>Learner</small>
              </span>
              <ChevronDown size={15} aria-hidden="true" />
            </button>

            {profileOpen && (
              <div
                className="trainee-header__popover trainee-header__profile-menu"
                role="menu"
              >
                <div className="trainee-header__profile-summary">
                  <strong>{displayName}</strong>
                  <span>{user?.email || "Learner account"}</span>
                </div>
                <Link to="/profile" role="menuitem" onClick={() => setProfileOpen(false)}>
                  <User size={17} /> Profile
                </Link>
                <button type="button" role="menuitem" onClick={onLogout}>
                  <LogOut size={17} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
