import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useOutletContext } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal } from 'lucide-react'
import { getCurrentUser } from '@/services/api-client'

const defaultHeader = {
  backTo: '/dashboard',
  backLabel: 'Back',
  contextLabel: 'Workspace',
  title: 'Smart Learnly Workspace',
  subtitle: '',
  statusNode: null,
  saveStatus: '',
  actions: null,
}

function getDisplayName(user) {
  if (!user) return 'User'
  return user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User'
}

function getInitials(user) {
  return getDisplayName(user)
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function WorkspaceHeaderController({ header }) {
  const context = useOutletContext()

  useEffect(() => {
    if (!context?.setHeader) return undefined

    context.setHeader(header)
    return () => context.setHeader(defaultHeader)
  }, [context, header])

  return null
}

export function WorkspaceLayout() {
  const [header, setHeader] = useState(defaultHeader)
  const user = getCurrentUser()
  const outletContext = useMemo(() => ({ setHeader }), [])
  const resolvedHeader = { ...defaultHeader, ...header }

  return (
    <div className="workspace-layout">
      <header className="workspace-top-header">
        <div className="workspace-top-header__left">
          <Link className="workspace-back-button" to={resolvedHeader.backTo}>
            <ArrowLeft size={17} />
            {resolvedHeader.backLabel}
          </Link>

          <div className="workspace-title-block">
            <span className="demo-kicker">{resolvedHeader.contextLabel}</span>
            <h1>{resolvedHeader.title}</h1>
            {resolvedHeader.subtitle ? <p>{resolvedHeader.subtitle}</p> : null}
          </div>
        </div>

        <div className="workspace-top-header__meta">
          {resolvedHeader.statusNode ? (
            <div className="workspace-status-slot">{resolvedHeader.statusNode}</div>
          ) : null}
          {resolvedHeader.saveStatus ? (
            <span className="workspace-save-status">{resolvedHeader.saveStatus}</span>
          ) : null}
        </div>

        <div className="workspace-top-header__right">
          {resolvedHeader.actions}
          <div className="workspace-user-avatar" title={getDisplayName(user)}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={getDisplayName(user)} />
            ) : (
              <span>{getInitials(user)}</span>
            )}
          </div>
          <button type="button" className="workspace-more-button" aria-label="More workspace actions">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </header>

      <main className="workspace-content">
        <Outlet context={outletContext} />
      </main>
    </div>
  )
}
