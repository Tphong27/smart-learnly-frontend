import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  FileQuestion,
  FolderTree,
  GraduationCap,
  Home,
  Layers3,
  Settings,
  ShieldCheck,
  Users,
  X,
  Zap,
  Receipt, // Thêm icon cho Hóa đơn
  CreditCard, // Thêm icon cho Giao dịch
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { ROLES } from "@/shared/constants/roles";

// Cấu hình chuẩn khớp 100% với adminRoutes, staffRoutes, traineeRoutes
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
    icon: FolderTree, // Sử dụng icon FolderTree trực quan cho quản trị cấu trúc khóa học
    roles: [ROLES.ADMIN, ROLES.TMO, ROLES.SME], // Phân quyền khớp chuẩn với RoleGuard trong adminRoutes.jsx
  },
  {
    label: "Orders Management",
    path: "/admin/orders",
    icon: Receipt,
    roles: [ROLES.ADMIN, ROLES.TMO], // Cấp quyền cho Admin và TMO
  },
  {
    label: "Transactions",
    path: "/admin/transactions",
    icon: CreditCard,
    roles: [ROLES.ADMIN, ROLES.TMO], // Cấp quyền cho Admin và TMO
  },

  // STAFF ROUTES (TRAINER, TMO, SME)
  {
    label: "Course Content",
    path: "/staff/courses",
    icon: Layers3,
    roles: [ROLES.TRAINER, ROLES.TMO, ROLES.SME],
  },
  {
    label: "Tests & Questions",
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
    roles: [ROLES.TMO, ROLES.SME],
  },
  {
    label: "Reports & Analytics",
    path: "/staff/reports",
    icon: BarChart3,
    roles: [ROLES.TMO],
  },

  // TRAINEE ROUTES (LEARNING Workspace)
  {
    label: "My Courses",
    path: "/learning/courses",
    icon: GraduationCap,
    roles: [ROLES.TRAINEE],
  },
  {
    label: "My Classes",
    path: "/learning/classrooms",
    icon: Users,
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
    label: "AI Assistant",
    path: "/learning/ai-chatbot",
    icon: Settings,
    roles: [ROLES.TRAINEE],
  },
];

export function Sidebar({ userRole, open, onClose }) {
  // SỬA TẠI ĐÂY: Không dùng .toLowerCase() nữa để giữ nguyên dạng hoa khớp với ROLES hằng số
  const normalizedRole =
    typeof userRole === "string" ? userRole.toUpperCase() : userRole;

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(normalizedRole),
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
        <div className="app-sidebar__brand-row sidebar__brand-row">
          <a
            href="/admin/dashboard"
            className="app-sidebar__brand sidebar__brand"
          >
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
