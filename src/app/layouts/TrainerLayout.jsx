import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutBackground } from "./LayoutBackground";
import { TraineeHeader } from "./TraineeHeader";
import { authService, getCurrentUser } from "@/services";
import { SiteFooter } from "@/shared/components";
import { isRoleAllowed, normalizeRole, ROLES } from "@/shared/constants/roles";
import "./TrainerLayout.css";

const STAFF_TABS = [
  {
    label: "Course Content",
    to: "/staff/courses",
    end: true,
    roles: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
  },
  {
    label: "Flashcards Management",
    to: "/staff/flashcards",
    roles: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
  },
  {
    label: "Classrooms",
    to: "/staff/classrooms",
    roles: [ROLES.TRAINER, ROLES.TMO],
  },
  {
    label: "Schedule",
    to: "/staff/schedule",
    roles: [ROLES.TRAINER, ROLES.TMO],
  },
];

function getDisplayName(user) {
  return (
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Trainer"
  );
}

function getFirstName(name) {
  return name.trim().split(/\s+/)[0] || "Trainer";
}

function getRoleLabel(role) {
  const labels = {
    [ROLES.TRAINEE]: "Learner",
    [ROLES.TRAINER]: "Trainer",
    [ROLES.SME]: "SME",
    [ROLES.TMO]: "TMO",
    [ROLES.ADMIN]: "Admin",
    [ROLES.GUEST]: "Guest",
  };
  return labels[role?.toLowerCase()] || labels[role] || "User";
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

function isStaffPage(pathname) {
  return (
    pathname.startsWith("/staff/") ||
    pathname.startsWith("/trainer/") ||
    pathname.startsWith("/sme/") ||
    pathname.startsWith("/tmo/")
  );
}

export function TrainerLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const storedUser = getCurrentUser();
  const user = storedUser ?? {
    fullName: "Trainer",
    email: "",
    role: ROLES.TRAINER,
  };

  const displayName = getDisplayName(user);
  const showStaffNavigation = isStaffPage(location.pathname);

  const normalizedRole = normalizeRole(user.role);

  const visibleTabs = STAFF_TABS.filter((tab) =>
    isRoleAllowed(normalizedRole, tab.roles),
  );

  async function handleLogout() {
    try {
      await authService.logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <LayoutBackground className="trainer-layout">
      <a className="trainer-skip-link" href="#trainer-main-content">
        Skip to main content
      </a>

      <TraineeHeader
        user={user}
        onLogout={handleLogout}
        roleLabel={getRoleLabel(user.role)}
      />

      {showStaffNavigation && (
        <section className="trainer-shell-intro" aria-label="Staff overview">
          <div className="trainer-welcome">
            <span className="trainer-welcome__avatar" aria-hidden="true">
              {getInitials(displayName)}
            </span>
            <div>
              <h1>Welcome, {getFirstName(displayName)}</h1>
              <p>Manage your courses, classrooms, and training materials.</p>
            </div>
          </div>

          <nav className="trainer-nav" aria-label="Staff navigation">
            {visibleTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `trainer-nav__link${isActive ? " is-active" : ""}`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </section>
      )}

      <main
        id="trainer-main-content"
        className="trainer-layout__content"
        tabIndex={-1}
      >
        {children || <Outlet />}
      </main>

      <SiteFooter />
    </LayoutBackground>
  );
}
