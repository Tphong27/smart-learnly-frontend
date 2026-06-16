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
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { ROLES } from '@/shared/constants/roles'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: Home, roles: [ROLES.TRAINEE, ROLES.TRAINER, ROLES.TMO, ROLES.SME, ROLES.ADMIN] },
  { label: 'My Courses', path: '/my-courses', icon: GraduationCap, roles: [ROLES.TRAINEE, ROLES.TRAINER, ROLES.SME, ROLES.ADMIN, ROLES.TMO] },
  { label: 'Tests', path: '/tests', icon: ClipboardCheck, roles: [ROLES.TRAINEE, ROLES.TRAINER, ROLES.SME, ROLES.ADMIN, ROLES.TMO] },
  { label: 'Classes', path: '/trainer/classes', icon: Users, roles: [ROLES.TRAINER, ROLES.SME, ROLES.ADMIN, ROLES.TMO] },
  { label: 'Course Content', path: '/sme/content', icon: Layers3, roles: [ROLES.SME, ROLES.ADMIN, ROLES.TRAINER, ROLES.TMO] },
  { label: 'Question Bank', path: '/sme/questions', icon: FileQuestion, roles: [ROLES.SME, ROLES.ADMIN, ROLES.TRAINER, ROLES.TMO] },
  { label: 'Course Management', path: '/admin/courses', icon: BookOpen, roles: [ROLES.ADMIN] },
  { label: 'Categories', path: '/admin/categories', icon: FolderTree, roles: [ROLES.ADMIN] },
  { label: 'Users & Roles', path: '/admin/users', icon: ShieldCheck, roles: [ROLES.ADMIN] },
  { label: 'Reports', path: '/reports', icon: BarChart3, roles: [ROLES.TMO, ROLES.ADMIN, ROLES.TRAINER, ROLES.SME] },
  { label: 'Settings', path: '/settings', icon: Settings, roles: [ROLES.ADMIN] },
]

export function Sidebar({ userRole, open, onClose }) {
  const normalizedRole = typeof userRole === 'string' ? userRole.toLowerCase() : userRole
  const visibleItems = navItems.filter((item) => item.roles.includes(normalizedRole))

  return (
    <>
      <div
        className={`sidebar__overlay${open ? ' is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar${open ? ' is-open' : ''}`}>
        <div className="sidebar__head">
          <NavLink to="/dashboard" className="sidebar__brand" onClick={onClose}>
            <span className="sidebar__brand-mark">
              <Zap size={18} />
            </span>
            Smart Learnly
          </NavLink>

          <button
            type="button"
            onClick={onClose}
            className="sidebar__close"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar__nav">
          {visibleItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar__nav-item${isActive ? ' is-active' : ''}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__foot">
          <div className="sidebar__promo">
            <span className="sidebar__promo-title">
              <Sparkles size={14} /> SLP
            </span>
            <p className="sidebar__promo-text">
              A learning management system for the SLP program at Accenture.
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
