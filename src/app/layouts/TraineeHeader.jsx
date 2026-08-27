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
  const [profileOpen, setProfileOpen] = useState(false);

  const displayName = getUserDisplayName(user, "Learner");
  const initials = getInitials(displayName);
  const roleText = roleLabel || getUserRoleLabel(user?.role);
  const dashboardPath = getDashboardPathByRole(user?.role);
  const normalizedRole = normalizeRole(user?.role);
  const isStaffHeader = isRoleAllowed(normalizedRole, STAFF_HEADER_ROLES);
  const canAccessProfile = isRoleAllowed(normalizedRole, PROFILE_ROLES);

  useEffect(() => {
    if (!profileOpen) return undefined;

    function closeMenus(event) {
      if (!actionsRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeMenus);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenus);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [profileOpen]);

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
              : "Search classes, topics, or skills..."
          }
          classDetailPath="/opening-schedule"
          classReturnPath="/#opening-schedule"
          classBackLabel="Back to homepage"
        />

        {!isStaffHeader && normalizedRole === ROLES.TRAINEE && (
          <nav
            className="trainee-header__browse-nav"
            aria-label="Course discovery"
          >
            <NavLink
              to="/learning/opening-schedule"
              className={({ isActive }) =>
                `trainee-header__primary-link${isActive ? " is-active" : ""}`
              }
              onClick={() => {
                setProfileOpen(false);
              }}
            >
              Opening Class
            </NavLink>
          </nav>
        )}

        <div className="trainee-header__actions" ref={actionsRef}>
          <NotificationBell
            variant="trainee"
            onOpen={() => {
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
