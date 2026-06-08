export function KpiCard({ title, value, helper, icon: Icon }) {
  return (
    <div className="dev2-kpi-card">
      <div className="dev2-kpi-card__inner">
        <div>
          <p className="dev2-kpi-card__title">{title}</p>
          <p className="dev2-kpi-card__value">{value}</p>
          {helper ? <p className="dev2-kpi-card__helper">{helper}</p> : null}
        </div>

        {Icon ? (
          <span className="dev2-kpi-card__icon">
            <Icon size={20} />
          </span>
        ) : null}
      </div>
    </div>
  )
}
