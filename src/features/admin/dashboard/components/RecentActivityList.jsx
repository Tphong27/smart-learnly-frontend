import { Link } from "react-router-dom";
import { formatDateTime, formatLabel } from "@/shared/utils/formatters";

export function RecentActivityList({ items = [] }) {
  return (
    <section className="admin-card admin-card--flush dashboard-activity-card">
      <div className="dashboard-card-toolbar">
        <div>
          <h2>Recent system activity</h2>
          <p>Latest audit events in the selected date range.</p>
        </div>
        <Link to="/admin/audit-log" className="dashboard-card-link">
          View all logs
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="admin-empty">No recent activity in this date range.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Domain</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Result</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id || `${item.occurredAt}-${item.action}`}>
                  <td>{formatDateTime(item.occurredAt)}</td>
                  <td>{formatLabel(item.domain)}</td>
                  <td>{formatLabel(item.action)}</td>
                  <td>{item.actorEmail || item.actorRole || "System"}</td>
                  <td>
                    <span className={`admin-status admin-status--${String(item.result || "").toLowerCase() || "draft"}`}>
                      {item.result || "--"}
                    </span>
                  </td>
                  <td>{item.summary || "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
