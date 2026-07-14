import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  CreditCard,
  FileQuestion,
  FolderTree,
  GraduationCap,
  Home,
  Layers3,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  /* Timer, */
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { isRoleAllowed, normalizeRole, ROLES } from "@/shared/constants/roles";
import { getDashboardPathByRole } from "@/app/routes/dashboard-path";
import { SmartLearnlyMark } from "@/shared/components/SmartLearnlyMark";

const navItems = [
  // ADMIN & MONITORING ROUTES
  {
    label: "Admin Dashboard",
    path: "/admin/dashboard",
    icon: Home,
    roles: [ROLES.ADMIN],
  },
  {
    label: "Users & Roles",
    path: "/admin/users-management",
    icon: ShieldCheck,
    roles: [ROLES.ADMIN],
  },
  {
    label: "Course Management",
    path: "/admin/courses",
    icon: FolderTree,
    roles: [ROLES.ADMIN, ROLES.TMO, ROLES.SME],
  },
  {
    label: "Question Bank",
    path: "/admin/question-banks",
    icon: FileQuestion,
    roles: [ROLES.ADMIN, ROLES.TMO, ROLES.SME, ROLES.TRAINER],
  },
  {
    label: "Categories",
    path: "/admin/categories",
    icon: Receipt,
    roles: [ROLES.ADMIN, ROLES.TMO, ROLES.SME],
  },
  {
    label: "Transactions",
    path: "/admin/transactions",
    icon: CreditCard,
    roles: [ROLES.ADMIN, ROLES.TMO],
  },
  {
    label: "System Activity Log",
    path: "/admin/audit-log",
    icon: ScrollText,
    roles: [ROLES.ADMIN],
  },
  {
    label: "System Settings",
    path: "/admin/settings",
    icon: Settings,
    roles: [ROLES.ADMIN],
  },

  // STAFF ROUTES
  {
    label: "Course Content",
    path: "/staff/courses",
    icon: Layers3,
    roles: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
  },
  {
    label: "Tests Management",
    path: "/staff/tests",
    icon: FileQuestion,
    roles: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
  },
  {
    label: "Flashcards Management",
    path: "/staff/flashcards",
    icon: BookOpen,
    roles: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
  },
  {
    label: "Classrooms",
    path: "/staff/classrooms",
    icon: Users,
    roles: [ROLES.TRAINER, ROLES.TMO],
  },
  {
    label: "AI Chatbot Config",
    path: "/staff/ai-chatbot",
    icon: Settings,
    roles: [ROLES.ADMIN],
  },
  {
    label: "Reports & Analytics",
    path: "/staff/reports",
    icon: BarChart3,
    roles: [ROLES.TMO],
  },
  // {
  //   label: "Flash Tests Management",
  //   path: "/staff/flashtests",
  //   icon: Timer,
  //   roles: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
  // },

  // TRAINEE ROUTES
  {
    label: "Trainee Dashboard",
    path: "/dashboard",
    icon: Home,
    roles: [ROLES.TRAINEE],
  },
  {
    label: "Trainee Progress",
    path: "/learning/progress",
    icon: BarChart3,
    roles: [ROLES.TRAINEE],
  },
  {
    label: "Courses Catalog",
    path: "/learning/courses",
    icon: GraduationCap,
    roles: [ROLES.TRAINEE],
  },
  {
    label: "My Transactions",
    path: "/learning/transactions",
    icon: Receipt,
    roles: [ROLES.TRAINEE],
  },
  {
    label: "My Tests",
    path: "/learning/tests",
    icon: ClipboardCheck,
    roles: [ROLES.TRAINEE],
  },
  {
    label: "Flashcards",
    path: "/learning/flashcards",
    icon: BookOpen,
    roles: [ROLES.TRAINEE],
  },
  // {
  //   label: "Flash Tests Management",
  //   path: "/learning/flashtests",
  //   icon: Timer,
  //   roles: [ROLES.TRAINEE],
  // },
];

export function Sidebar({
  userRole,
  open = false,
  collapsed = false,
  onClose,
  onToggleCollapsed,
}) {
  const normalizedRole = normalizeRole(userRole);
  const dashboardPath = getDashboardPathByRole(normalizedRole);
  const [isMobile, setIsMobile] = useState(() =>
    window.matchMedia("(max-width: 1024px)").matches,
  );
  const [hoverSuppressed, setHoverSuppressed] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1024px)");
    const handleChange = (event) => setIsMobile(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const visibleItems = navItems.filter((item) =>
    isRoleAllowed(normalizedRole, item.roles),
  );

  const overlayClassName = open
    ? "app-sidebar-overlay app-sidebar-overlay--open"
    : "app-sidebar-overlay";

  const sidebarClassName = [
    "app-sidebar",
    open ? "app-sidebar--open" : "",
    collapsed ? "app-sidebar--collapsed" : "",
    hoverSuppressed ? "app-sidebar--hover-suppressed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <button
        type="button"
        className={overlayClassName}
        onClick={onClose}
        aria-label="Close navigation"
        tabIndex={open ? 0 : -1}
      />

      <aside
        id="app-sidebar-navigation"
        className={sidebarClassName}
        aria-label="Main navigation"
        aria-hidden={isMobile && !open ? "true" : undefined}
        inert={isMobile && !open ? true : undefined}
        onMouseLeave={() => setHoverSuppressed(false)}
      >
        <div className="app-sidebar__brand-row">
          <Link
            to={dashboardPath}
            className="app-sidebar__brand"
            aria-label="Smart Learnly dashboard"
            onClick={(event) => {
              if (event.detail > 0) event.currentTarget.blur();
              onClose?.();
            }}
          >
            <SmartLearnlyMark className="app-sidebar__brand-mark" />
            <span className="app-sidebar__brand-name">Smart Learnly</span>
          </Link>
          <button
            type="button"
            className="app-sidebar__mobile-close"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className="app-sidebar__nav sidebar__nav" aria-label="Workspace">
          {visibleItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={(event) => {
                if (event.detail > 0) event.currentTarget.blur();
                onClose?.();
              }}
              className={({ isActive }) =>
                isActive
                  ? "app-sidebar__link sidebar__link app-sidebar__link--active sidebar__link--active"
                  : "app-sidebar__link sidebar__link"
              }
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
            >
              <Icon size={19} aria-hidden="true" />
              <span className="app-sidebar__link-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        {onToggleCollapsed && (
          <div className="app-sidebar__footer">
            <button
              type="button"
              className="app-sidebar__collapse-button"
              onClick={(event) => {
                if (!collapsed && event.detail > 0) setHoverSuppressed(true);
                onToggleCollapsed?.();
                if (event.detail > 0) {
                  window.requestAnimationFrame(() =>
                    event.currentTarget.blur(),
                  );
                }
              }}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen size={18} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={18} aria-hidden="true" />
              )}
              <span className="app-sidebar__collapse-label">
                {collapsed ? "Keep sidebar open" : "Collapse sidebar"}
              </span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
