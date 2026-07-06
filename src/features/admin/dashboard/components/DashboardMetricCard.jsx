export function DashboardMetricCard({ title, value, description, icon: Icon, tone = "blue" }) {
  return (
    <article className={`dashboard-metric-card dashboard-metric-card--${tone}`}>
      <div className="dashboard-metric-card__icon" aria-hidden="true">
        {Icon ? <Icon size={22} /> : null}
      </div>
      <div>
        <p className="dashboard-metric-card__label">{title}</p>
        <strong className="dashboard-metric-card__value">{value}</strong>
        {description ? <p className="dashboard-metric-card__description">{description}</p> : null}
      </div>
    </article>
  )
}
