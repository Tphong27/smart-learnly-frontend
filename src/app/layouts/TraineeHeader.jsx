import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Receipt, User } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { SmartLearnlyMark } from "@/shared/components/SmartLearnlyMark";
import { HeaderCourseSearch } from "@/shared/components/HeaderCourseSearch";
import {
  isRoleAllowed,
  normalizeRole,
  PROFILE_ROLES,
  ROLES,
} from "@/shared/constants/roles";
import { getDashboardPathByRole } from "@/app/routes/dashboard-path";
import { categoryService } from "@/features/course";
import { NotificationBell } from "@/features/notification";
import {
  getInitials,
  getUserDisplayName,
  getUserRoleLabel,
} from "@/shared/utils/userDisplay";
import "./TraineeLayout.css";

const STAFF_HEADER_ROLES = [ROLES.TRAINER, ROLES.SME, ROLES.TMO];

export function TraineeHeader({ user, onLogout, roleLabel }) {
  const actionsRef = useRef(null);
  const categoriesRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const displayName = getUserDisplayName(user, "Learner");
  const initials = getInitials(displayName);
  const roleText = roleLabel || getUserRoleLabel(user?.role);
  const dashboardPath = getDashboardPathByRole(user?.role);
  const normalizedRole = normalizeRole(user?.role);
  const isStaffHeader = isRoleAllowed(normalizedRole, STAFF_HEADER_ROLES);
  const canAccessProfile = isRoleAllowed(normalizedRole, PROFILE_ROLES);

  useEffect(() => {
    if (!categoriesOpen && !profileOpen) return undefined;

    function closeMenus(event) {
      const outsideCategories = !categoriesRef.current?.contains(event.target);
      const outsideActions = !actionsRef.current?.contains(event.target);

      if (outsideCategories && outsideActions) {
        setCategoriesOpen(false);
        setProfileOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setCategoriesOpen(false);
        setProfileOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeMenus);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenus);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [categoriesOpen, profileOpen]);

  useEffect(() => {
    if (isStaffHeader) return undefined;

    let mounted = true;

    async function loadCategories() {
      try {
        const data = await categoryService.listPublic();
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
  }, [isStaffHeader]);

  return (
    <header className="trainee-header">
      <div className="header-container trainee-header__container">
        <Link
          to={dashboardPath}
          className="header-logo"
          aria-label="Smart Learnly dashboard"
        >
          <SmartLearnlyMark className="header-logo-icon" />
          <span className="header-logo-text">Smart Learnly</span>
        </Link>

        <HeaderCourseSearch
          searchScope={isStaffHeader ? "staff" : "public"}
          userRole={normalizedRole}
          includeOpeningClasses={!isStaffHeader}
          placeholder={
            isStaffHeader
              ? normalizedRole === ROLES.SME
                ? "Search assigned course content..."
                : "Search course content and classrooms..."
              : "Search courses, classes, topics, or skills..."
          }
          classDetailPath="/opening-schedule"
          classReturnPath="/#opening-schedule"
          classBackLabel="Back to homepage"
        />

        {!isStaffHeader && (
          <nav
            className="trainee-header__browse-nav"
            aria-label="Course discovery"
          >
            <div
              className="trainee-header__category-anchor"
              ref={categoriesRef}
            >
              <button
                type="button"
                className="header-categories-btn trainee-header__categories-button"
                aria-expanded={categoriesOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setCategoriesOpen((current) => !current);
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
                    <span
                      className="trainee-header__categories-status"
                      role="status"
                    >
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

            {normalizedRole === ROLES.TRAINEE && (
              <>
                <NavLink
                  to="/learning/courses"
                  className={({ isActive }) =>
                    `trainee-header__primary-link${
                      isActive ? " is-active" : ""
                    }`
                  }
                  onClick={() => {
                    setCategoriesOpen(false);
                    setProfileOpen(false);
                  }}
                >
                  Course Catalog
                </NavLink>

                <NavLink
                  to="/learning/opening-schedule"
                  className={({ isActive }) =>
                    `trainee-header__primary-link${
                      isActive ? " is-active" : ""
                    }`
                  }
                  onClick={() => {
                    setCategoriesOpen(false);
                    setProfileOpen(false);
                  }}
                >
                  Opening Class
                </NavLink>
              </>
            )}
          </nav>
        )}

        <div className="trainee-header__actions" ref={actionsRef}>
          <NotificationBell
            variant="trainee"
            onOpen={() => {
              setCategoriesOpen(false);
              setProfileOpen(false);
            }}
          />

          <div className="trainee-header__menu-anchor">
            <button
              type="button"
              className="trainee-header__profile-button"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              onClick={() => {
                setProfileOpen((current) => !current);
                setCategoriesOpen(false);
              }}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" />
              ) : (
                <span className="trainee-header__avatar">{initials}</span>
              )}
              <span className="trainee-header__profile-copy">
                <strong>{displayName}</strong>
                <small>{roleText}</small>
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
                  <span>{user?.email || `${roleText} account`}</span>
                </div>
                {canAccessProfile && (
                  <Link
                    to="/profile"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                  >
                    <User size={17} /> Profile
                  </Link>
                )}
                {!isStaffHeader && (
                  <Link
                    to="/learning/transactions"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Receipt size={17} />
                    My Transactions
                  </Link>
                )}

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout?.();
                  }}
                >
                  <LogOut size={17} />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
