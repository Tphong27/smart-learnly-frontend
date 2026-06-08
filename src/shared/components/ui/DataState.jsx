import { AlertCircle, Inbox, Loader2 } from 'lucide-react'

const stateIcon = {
  loading: Loader2,
  empty: Inbox,
  error: AlertCircle,
}

export function DataState({ type = 'empty', title, description, action }) {
  const Icon = stateIcon[type] || Inbox
  const iconClassName = type === 'loading' ? 'dev2-state__icon is-spinning' : 'dev2-state__icon'

  return (
    <div className={`dev2-state dev2-state--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon className={iconClassName} size={28} />
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action ? <div className="dev2-state__action">{action}</div> : null}
    </div>
  )
}
