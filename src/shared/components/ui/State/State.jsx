import { CircleAlert, Inbox, LoaderCircle } from "lucide-react";
import "./State.css";

/** Hiển thị trạng thái không có dữ liệu kèm hướng dẫn hoặc hành động tiếp theo. */
export function EmptyState({
  title = "No data yet",
  description,
  action,
  icon,
  className = "",
}) {
  return (
    <section className={`ui-state${className ? ` ${className}` : ""}`}>
      <span className="ui-state__icon" aria-hidden="true">
        {icon || <Inbox size={28} />}
      </span>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="ui-state__action">{action}</div> : null}
    </section>
  );
}

/** Hiển thị lỗi tải dữ liệu và ưu tiên cung cấp action phục hồi như retry. */
export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  className = "",
}) {
  return (
    <section
      className={`ui-state ui-state--danger${className ? ` ${className}` : ""}`}
      role="alert"
    >
      <span className="ui-state__icon" aria-hidden="true">
        <CircleAlert size={28} />
      </span>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="ui-state__action">{action}</div> : null}
    </section>
  );
}

/** Hiển thị trạng thái đang tải có thông báo dành cho cả hình ảnh và screen reader. */
export function LoadingState({
  label = "Loading...",
  compact = false,
  className = "",
}) {
  return (
    <div
      className={`ui-state ui-state--loading${compact ? " ui-state--compact" : ""}${className ? ` ${className}` : ""}`}
      role="status"
    >
      <LoaderCircle className="ui-state__spinner" size={compact ? 20 : 28} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
