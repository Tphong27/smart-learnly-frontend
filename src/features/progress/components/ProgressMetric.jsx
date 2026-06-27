import { Link } from "react-router-dom";
import { ProgressBar } from "./ProgressBar";

export function ProgressMetric({ label, completed, total, percent, to }) {
  const content = (
    <>
      <span className="course-metric__label">{label}</span>

      <span className="course-metric__count">
        {total > 0 ? `${completed}/${total}` : "0/0"}
      </span>

      <ProgressBar value={percent} />

      <strong className="course-metric__percent">{percent}%</strong>
    </>
  );

  if (!to) {
    return <div className="course-metric">{content}</div>;
  }

  return (
    <Link to={to} className="course-metric">
      {content}
    </Link>
  );
}