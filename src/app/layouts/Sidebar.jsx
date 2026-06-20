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
  MessageSquare, // Dùng thay cho Bot để tránh lỗi phiên bản cũ
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { ROLES } from "@/shared/constants/roles";

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: Home, roles: [ROLES.TRAINEE, ROLES.TRAINER, ROLES.TMO, ROLES.SME, ROLES.ADMIN] },
  { label: 'My Courses', path: '/my-courses', icon: GraduationCap, roles: [ROLES.TRAINEE, ROLES.TRAINER, ROLES.SME, ROLES.ADMIN, ROLES.TMO] },
  { label: 'Tests', path: '/tests', icon: ClipboardCheck, roles: [ROLES.TRAINEE, ROLES.TRAINER, ROLES.SME, ROLES.ADMIN, ROLES.TMO] },
  { label: 'Classes', path: '/trainer/classes', icon: Users, roles: [ROLES.TRAINER, ROLES.SME, ROLES.ADMIN, ROLES.TMO, ROLES.TRAINEE] },
  { label: 'Course Content', path: '/sme/content', icon: Layers3, roles: [ROLES.SME, ROLES.ADMIN, ROLES.TRAINER, ROLES.TMO] },
  { label: 'Question Bank', path: '/sme/questions', icon: FileQuestion, roles: [ROLES.SME, ROLES.ADMIN, ROLES.TRAINER, ROLES.TMO] },
  { label: 'Course Management', path: '/admin/courses', icon: BookOpen, roles: [ROLES.ADMIN] },
  { label: 'Categories', path: '/admin/categories', icon: FolderTree, roles: [ROLES.ADMIN] },
  { label: 'Users & Roles', path: '/admin/users', icon: ShieldCheck, roles: [ROLES.ADMIN] },
  { label: 'Reports', path: '/reports', icon: BarChart3, roles: [ROLES.TMO, ROLES.ADMIN, ROLES.TRAINER, ROLES.SME] },
  { label: 'Settings', path: '/settings', icon: Settings, roles: [ROLES.ADMIN] },
]

export function Sidebar({ userRole, open, onClose }) {
  const normalizedRole = typeof userRole === 'string' ? userRole.toUpperCase() : userRole
  const visibleItems = navItems.filter((item) => item.roles.includes(normalizedRole))

  const overlayClassName = open
    ? 'app-sidebar-overlay app-sidebar-overlay--open'
    : 'app-sidebar-overlay'
  const sidebarClassName = open ? 'app-sidebar app-sidebar--open' : 'app-sidebar'

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
