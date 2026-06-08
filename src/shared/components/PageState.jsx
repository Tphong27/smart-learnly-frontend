import { AlertCircle, Inbox, Loader2 } from 'lucide-react'

export function PageState({ state = 'empty', title, description, action = null }) {
  const Icon = state === 'loading' ? Loader2 : state === 'error' ? AlertCircle : Inbox

  return (
    <section className={`demo-state demo-state--${state}`} aria-live="polite">
      <Icon className={state === 'loading' ? 'demo-state__icon is-spinning' : 'demo-state__icon'} size={28} />
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && <div className="demo-state__action">{action}</div>}
    </section>
  )
}
