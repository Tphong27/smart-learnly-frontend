export function ProgressStatCard({ icon: Icon, label, value, helper }) {
  return (
    <article className="progress-stat-card">
      <div className="progress-stat-card__icon">
        <Icon size={22} />
      </div>

      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {helper && <span>{helper}</span>}
      </div>
    </article>
  );
}