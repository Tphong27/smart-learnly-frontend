import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  FileQuestion,
  GraduationCap,
  Home,
  Layers3,
  Settings,
  ShieldCheck,
  Users,
  X,
  Zap,
  MessageSquare, // Dùng thay cho Bot để tránh lỗi phiên bản cũ
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { ROLES } from "@/shared/constants/roles";

const navItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: Home,
    roles: [ROLES.TRAINEE, ROLES.TRAINER, ROLES.TMO, ROLES.SME],
  },
  {
    label: "My Courses",
    path: "/my-courses",
    icon: GraduationCap,
    roles: [ROLES.TRAINEE, ROLES.TRAINER, ROLES.SME, ROLES.TMO],
  },
  {
    label: "Classes",
    path: "/trainer/classes",
    icon: Users,
    roles: [ROLES.TRAINER, ROLES.TMO, ROLES.TRAINEE],
  },
  {
    label: "Tests",
    path: "/tests",
    icon: ClipboardCheck,
    roles: [ROLES.TRAINEE, ROLES.TRAINER, ROLES.SME, ROLES.TMO],
  },
  {
    label: "Flashcards",
    path: "/flashcards",
    icon: Layers3,
    roles: [ROLES.TRAINEE, ROLES.TRAINER, ROLES.SME, ROLES.TMO],
  },
  {
    label: "AI Chatbot",
    path: "/ai-chatbot",
    icon: MessageSquare,
    roles: [ROLES.TRAINEE, ROLES.SME, ROLES.TMO],
  },
  {
    label: "Course Content",
    path: "/sme/content",
    icon: Layers3,
    roles: [ROLES.SME, ROLES.TRAINER, ROLES.TMO],
  },
  {
    label: "Question Bank",
    path: "/sme/questions",
    icon: FileQuestion,
    roles: [ROLES.SME, ROLES.TRAINER, ROLES.TMO],
  },
  {
    label: "Course Management",
    path: "/admin/courses",
    icon: BookOpen,
    roles: [ROLES.TMO, ROLES.TRAINER, ROLES.SME],
  },
  {
    label: "Users & Roles",
    path: "/admin/users",
    icon: ShieldCheck,
    roles: [],
  },
  { label: "Reports", path: "/reports", icon: BarChart3, roles: [ROLES.TMO] },
  { label: "Settings", path: "/settings", icon: Settings, roles: [] },
];

export function Sidebar({ userRole, open, onClose }) {
  // Chuẩn hóa role về chữ thường
  const standardizedRole = userRole?.toString().toLowerCase();
  const adminRoleTarget = ROLES.ADMIN?.toString().toLowerCase() || "admin";

  // Bộ lọc tính năng: Hạ tất cả quyền xuống chữ thường để so sánh chính xác tuyệt đối
  const visibleItems = navItems.filter((item) => {
    if (standardizedRole === adminRoleTarget) return true;
    return item.roles
      .map((r) => r?.toString().toLowerCase())
      .includes(standardizedRole);
  });

  // Gộp cả hai loại class CSS (app-sidebar và sidebar) để file CSS nào cũng ăn khớp
  const overlayClassName = open
    ? "app-sidebar-overlay sidebar-overlay app-sidebar-overlay--open sidebar-overlay--open"
    : "app-sidebar-overlay sidebar-overlay";

  const sidebarClassName = open
    ? "app-sidebar sidebar app-sidebar--open sidebar--open"
    : "app-sidebar sidebar";

  return (
    <>
      <div className={overlayClassName} onClick={onClose} aria-hidden="true" />

      <aside className={sidebarClassName}>
        <div className="app-sidebar__brand-row sidebar__brand-row">
          <a href="/dashboard" className="app-sidebar__brand sidebar__brand">
            <span className="app-sidebar__brand-mark sidebar__brand-mark">
              <Zap size={18} />
            </span>
            Smart Learnly
          </a>

          <button
            type="button"
            onClick={onClose}
            className="app-sidebar__close-button sidebar__close-button"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

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

        <div className="app-sidebar__footer sidebar__footer">
          <div className="app-sidebar__summary sidebar__summary">
            <p>SLP</p>
            <small>
              A learning management system for the SLP program at Accenture.
            </small>
          </div>
        </div>
      </aside>
    </>
  );
}
