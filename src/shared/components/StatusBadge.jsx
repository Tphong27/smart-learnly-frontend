export function StatusBadge({ status, tone }) {
  const normalizedStatus = String(status || 'unknown').toLowerCase()
  const badgeTone = tone || normalizedStatus.replace(/\s+/g, '-')

  return (
    <span className={`status-badge status-badge--${badgeTone}`}>
      {normalizedStatus}
    </span>
  )
}
