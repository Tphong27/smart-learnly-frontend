import { formatLabel } from "@/shared/utils/formatters";

export function DashboardSectionCard({ title, description, items = [] }) {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);

  return (
    <section className="admin-card dashboard-section-card">
      <div className="dashboard-section-card__header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <span className="dashboard-section-card__total">{total.toLocaleString("vi-VN")}</span>
      </div>

      <div className="dashboard-breakdown-list">
        {items.length === 0 ? (
          <p className="dashboard-empty-text">No data available.</p>
        ) : (
          items.map((item) => {
            const value = Number(item.value || 0);
            const percent = total > 0 ? Math.round((value / total) * 100) : 0;
            return (
              <div className="dashboard-breakdown-item" key={item.label}>
                <div className="dashboard-breakdown-item__meta">
                  <span>{formatLabel(item.label)}</span>
                  <strong>{value.toLocaleString("vi-VN")}</strong>
                </div>
                <div className="dashboard-breakdown-item__bar" aria-hidden="true">
                  <span style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
