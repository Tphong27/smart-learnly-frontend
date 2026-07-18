import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutBackground } from "./LayoutBackground";
import { TraineeHeader } from "./TraineeHeader";
import { authService, getCurrentUser } from "@/services";
import { SiteFooter } from "@/shared/components";
import "./TraineeLayout.css";

const TRAINEE_TABS = [
  {
    label: "Dashboard",
    to: "/dashboard",
    end: true,
  },
  {
    label: "Progress",
    to: "/learning/progress",
  },
  {
    label: "Course Catalog",
    to: "/learning/courses",
  },
  {
    label: "Opening Schedule",
    to: "/learning/opening-schedule",
  },
  {
    label: "My Transactions",
    to: "/learning/transactions",
  },
  {
    label: "My Tests",
    to: "/learning/tests",
  },
  {
    label: "Flashcards",
    to: "/learning/flashcards",
  },
];

function getDisplayName(user) {
  return (
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Learner"
  );
}

function getFirstName(name) {
  return name.trim().split(/\s+/)[0] || "Learner";
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

export function TraineeLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser() || { fullName: "Learner" };
  const displayName = getDisplayName(user);
  const showLearningNavigation =
    location.pathname === "/dashboard" ||
    location.pathname.startsWith("/learning/");

  async function handleLogout() {
    try {
      await authService.logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <LayoutBackground className="trainee-layout">
      <a className="trainee-skip-link" href="#trainee-main-content">
        Skip to main content
      </a>

      <TraineeHeader user={user} onLogout={handleLogout} roleLabel="Learner" />

      {showLearningNavigation && (
        <section className="trainee-shell-intro" aria-label="Learning overview">
          <div className="trainee-welcome">
            <span className="trainee-welcome__avatar" aria-hidden="true">
              {getInitials(displayName)}
            </span>
            <div>
              <h1>Welcome back, {getFirstName(displayName)}</h1>
              <p>Continue learning and keep moving toward your goals.</p>
            </div>
          </div>

          <nav className="trainee-nav" aria-label="Learner navigation">
            {TRAINEE_TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `trainee-nav__link${isActive ? " is-active" : ""}`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </section>
      )}

      <main
        id="trainee-main-content"
        className="trainee-layout__content"
        tabIndex={-1}
      >
        {children || <Outlet />}
      </main>

      <SiteFooter />
    </LayoutBackground>
  );
}
