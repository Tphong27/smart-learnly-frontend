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
  Timer,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { isRoleAllowed, normalizeRole, ROLES } from "@/shared/constants/roles";

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
  {
    label: "Flash Tests Management",
    path: "/staff/flashtests",
    icon: Timer,
    roles: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
  },

  // TRAINEE ROUTES
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
  {
    label: "Flash Tests Management",
    path: "/learning/flashtests",
    icon: Timer,
    roles: [ROLES.TRAINEE],
  },
];

export function Sidebar({ userRole, open, onClose }) {
  const normalizedRole = normalizeRole(userRole);

  const visibleItems = navItems.filter((item) =>
    isRoleAllowed(normalizedRole, item.roles),
  );

  const overlayClassName = open
    ? "app-sidebar-overlay app-sidebar-overlay--open"
    : "app-sidebar-overlay";

  const sidebarClassName = open
    ? "app-sidebar app-sidebar--open"
    : "app-sidebar";

  return (
    <>
      <div className={overlayClassName} onClick={onClose} aria-hidden="true" />

      <aside className={sidebarClassName}>
        <nav className="app-sidebar__nav sidebar__nav">
          {visibleItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className={({ isActive }) =>
                isActive
                  ? "app-sidebar__link sidebar__link app-sidebar__link--active sidebar__link--active"
                  : "app-sidebar__link sidebar__link"
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
