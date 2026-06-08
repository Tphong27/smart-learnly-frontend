const statusStyles = {
  draft: 'is-neutral',
  pending: 'is-warning',
  review: 'is-review',
  published: 'is-success',
  approved: 'is-success',
  rejected: 'is-danger',
  running: 'is-info',
  upcoming: 'is-neutral',
  completed: 'is-success',
  active: 'is-success',
  inactive: 'is-neutral',
  high: 'is-danger',
  medium: 'is-warning',
  low: 'is-success',
}

export function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase()
  const className = statusStyles[normalized] || 'is-neutral'

  return (
    <span className={`dev2-status-badge ${className}`}>
      {status}
    </span>
  )
}
