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
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { ROLES } from '@/shared/constants/roles'

const navItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: Home,
    roles: [ROLES.TRAINEE, ROLES.TRAINER, ROLES.TMO, ROLES.SME, ROLES.ADMIN],
  },
  {
    label: 'My Courses',
    path: '/my-courses',
    icon: GraduationCap,
    roles: [ROLES.TRAINEE, ROLES.TRAINER, ROLES.SME, ROLES.ADMIN, ROLES.TMO],
  },
  {
    label: 'Learning',
    path: '/learning',
    icon: BookOpen,
    roles: [ROLES.TRAINEE],
  },
  {
    label: 'Tests',
    path: '/tests',
    icon: ClipboardCheck,
    roles: [ROLES.TRAINEE, ROLES.TRAINER, ROLES.SME, ROLES.ADMIN, ROLES.TMO],
  },
  {
    label: 'My Analytics',
    path: '/analytics/me',
    icon: BarChart3,
    roles: [ROLES.TRAINEE],
  },
  {
    label: 'Classes',
    path: '/trainer/classes',
    icon: Users,
    roles: [ROLES.TRAINER, ROLES.SME, ROLES.ADMIN, ROLES.TMO],
  },
  {
    label: 'Course Content',
    path: '/sme/content',
    icon: Layers3,
    roles: [ROLES.SME, ROLES.ADMIN, ROLES.TRAINER, ROLES.TMO],
  },
  {
    label: 'Question Bank',
    path: '/sme/questions',
    icon: FileQuestion,
    roles: [ROLES.SME, ROLES.ADMIN, ROLES.TRAINER, ROLES.TMO],
  },
  {
    label: 'Course Management',
    path: '/admin/courses',
    icon: BookOpen,
    roles: [ROLES.ADMIN, ROLES.TMO, ROLES.TRAINER, ROLES.SME],
  },
  {
    label: 'Users & Roles',
    path: '/admin/users',
    icon: ShieldCheck,
    roles: [ROLES.ADMIN],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: BarChart3,
    roles: [ROLES.TMO, ROLES.ADMIN, ROLES.TRAINER, ROLES.SME],
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    roles: [ROLES.ADMIN],
  },
]

export function Sidebar({ userRole, open, onClose }) {
  const visibleItems = navItems.filter((item) => item.roles.includes(userRole))

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 transition lg:hidden ${
          open ? 'block' : 'hidden'
        }`}
        onClick={onClose}
      />

      <aside
        className={`app-sidebar fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-slate-200 bg-white transition-transform lg:sticky lg:z-20 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="app-sidebar__brand-row flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <a href="/dashboard" className="app-sidebar__brand flex items-center gap-2 font-bold text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Zap size={18} />
            </span>
            Smart Learnly
          </a>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="app-sidebar__nav flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  'app-sidebar__link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                ].join(' ')
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">SLP</p>
            <p className="mt-1 text-xs text-slate-500">
                A learning management system for the SLP program at Accenture.
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
