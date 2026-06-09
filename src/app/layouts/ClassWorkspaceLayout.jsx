import { useMemo, useState } from 'react'
import { NavLink, Outlet, useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  ClipboardCheck,
  FileText,
  Layers3,
  LayoutDashboard,
  Menu,
  MessageCircle,
  MoreHorizontal,
  TrendingUp,
  Users,
} from 'lucide-react'
import { getCurrentUser } from '@/services/api-client'
import { getClassFlowClassById } from '@/data/demo/classFlowRuntime'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import './ClassWorkspaceLayout.css'

const sidebarConfigs = {
  trainer: (classId) => [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard, to: `/trainer/classes/${classId}/workspace` },
    { key: 'assignments', label: 'Assignments', icon: ClipboardCheck, to: `/trainer/classes/${classId}/assignments` },
    { key: 'tests', label: 'Tests', icon: FileText, to: `/trainer/classes/${classId}/tests` },
    { key: 'flashcards', label: 'Flashcards', icon: Layers3, to: `/trainer/classes/${classId}/flashcards` },
    { key: 'discussions', label: 'Discussions', icon: MessageCircle, to: `/trainer/classes/${classId}/discussions` },
    { key: 'trainees', label: 'Trainees', icon: Users, to: `/trainer/classes/${classId}/trainees` },
    { key: 'analytics', label: 'Analytics', icon: BarChart3, to: `/trainer/classes/${classId}/analytics` },
  ],
  trainee: (classId) => [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard, to: `/my-classes/${classId}/workspace` },
    { key: 'assignments', label: 'Assignments', icon: ClipboardCheck, to: `/my-classes/${classId}/assignments` },
    { key: 'tests', label: 'Tests', icon: FileText, to: `/my-classes/${classId}/tests` },
    { key: 'flashcards', label: 'Flashcards', icon: Layers3, to: `/my-classes/${classId}/flashcards` },
    { key: 'discussions', label: 'Discussions', icon: MessageCircle, to: `/my-classes/${classId}/discussions` },
    { key: 'progress', label: 'Progress', icon: TrendingUp, to: `/my-classes/${classId}/progress` },
  ],
  tmo: (classId) => [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard, to: `/tmo/classes/${classId}` },
  ],
}

const backTargets = {
  trainer: { to: '/trainer/classes', label: 'My Classes' },
  trainee: { to: '/my-classes', label: 'My Classes' },
  tmo: { to: '/tmo/classes', label: 'Class Management' },
  admin: { to: '/tmo/classes', label: 'Class Management' },
}

function getDisplayName(user) {
  if (!user) return 'User'
  return user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User'
}

function getInitials(user) {
  return getDisplayName(user)
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function ClassWorkspaceLayout() {
  const { classId } = useParams()
  const user = getCurrentUser()
  const role = user?.role || 'trainee'
  const workspaceRole = role === 'admin' ? 'tmo' : role
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const classData = useMemo(() => getClassFlowClassById(classId), [classId])
  const navItems = useMemo(() => {
    const builder = sidebarConfigs[workspaceRole] || sidebarConfigs.trainee
    return builder(classId)
  }, [workspaceRole, classId])

  const back = backTargets[role] || backTargets[workspaceRole] || backTargets.trainee

  const outletContext = useMemo(
    () => ({ classData, user, classId }),
    [classData, user, classId],
  )

  return (
    <div className="class-workspace">
      {/* ── Top header ─────────────────────────────────── */}
      <header className="class-workspace__header">
        <div className="class-workspace__header-left">
          <button
            type="button"
            className="class-workspace__icon-btn class-workspace__sidebar-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>

          <Link className="class-workspace__back" to={back.to}>
            <ArrowLeft size={15} />
            {back.label}
          </Link>

          <span className="class-workspace__divider" />

          <div className="class-workspace__title-block">
            <span className="class-workspace__class-name">
              {classData?.className || 'Class'}
            </span>
            <span className="class-workspace__course-name">
              <BookOpen size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
              {classData?.courseTitle || 'Course'}
            </span>
          </div>

          {classData?.status ? (
            <StatusBadge status={classData.status} />
          ) : null}
        </div>

        <div className="class-workspace__header-right">
          <button type="button" className="class-workspace__icon-btn" aria-label="Notifications">
            <Bell size={17} />
            <span className="class-workspace__notification-dot" />
          </button>

          <div className="class-workspace__avatar" title={getDisplayName(user)}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={getDisplayName(user)} />
            ) : (
              <span>{getInitials(user)}</span>
            )}
          </div>

          <span className="class-workspace__role-badge">{role}</span>

          <button type="button" className="class-workspace__icon-btn" aria-label="More actions">
            <MoreHorizontal size={17} />
          </button>
        </div>
      </header>

      {/* ── Body: sidebar + content ────────────────────── */}
      <div className="class-workspace__body">
        <div
          className={`class-workspace__sidebar-overlay${sidebarOpen ? ' is-open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        <aside className={`class-workspace__sidebar${sidebarOpen ? ' is-open' : ''}`}>
          <nav className="class-workspace__sidebar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.key === 'overview'}
                className={({ isActive }) =>
                  `class-workspace__nav-item${isActive ? ' active' : ''}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={17} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="class-workspace__content">
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  )
}
