const statusStyles = {
  draft: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-100 text-amber-700',
  review: 'bg-purple-100 text-purple-700',
  published: 'bg-emerald-100 text-emerald-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  running: 'bg-blue-100 text-blue-700',
  upcoming: 'bg-slate-100 text-slate-700',
  completed: 'bg-emerald-100 text-emerald-700',
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-emerald-100 text-emerald-700',
}

export function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase()
  const className = statusStyles[normalized] || 'bg-slate-100 text-slate-700'

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${className}`}>
      {status}
    </span>
  )
}