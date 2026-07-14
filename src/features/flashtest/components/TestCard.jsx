import { ArrowRight, Calendar, CheckSquare, Clock3, FileText } from "lucide-react";
import "./TestCard.css";

function formatShortDate(value) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDuration(item) {
  if (item.durationMinutes ?? item.duration_minutes ?? item.duration) {
    return item.durationMinutes ?? item.duration_minutes ?? item.duration;
  }
  const dueDate = item.dueDate || item.due_date;
  const baseTime =
    item.updatedAt || item.updated_at || item.createdAt || item.created_at;
  if (!dueDate || !baseTime) return "--";
  const diff = new Date(dueDate).getTime() - new Date(baseTime).getTime();
  return Number.isFinite(diff) ? Math.max(0, Math.round(diff / 60000)) : "--";
}

function formatScoreValue(value) {
  if (!Number.isFinite(value)) return "--";
  const score = Math.max(0, Math.min(10, value));
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

export function TestCard({
  item,
  result,
  onStart,
  nowMs = Date.now(),
}) {
  const isEssay = item.flashType === "essay";
  const taken = Boolean(result?.taken);
  const dueDate = item.dueDate || item.due_date;
  const expired = isEssay && dueDate && new Date(dueDate).getTime() <= nowMs;

  const statusClass = expired
    ? "is-expired"
    : taken
    ? "is-completed"
    : "";

  const statusLabel = taken ? "Completed" : expired ? "Expired" : "Ready";
  const statusBadgeClass = expired
    ? "test-card__status--expired"
    : taken
    ? "test-card__status--completed"
    : "test-card__status--ready";

  const typeBadgeClass = isEssay
    ? "test-card__type--essay"
    : "test-card__type--mcq";

  const TypeIcon = isEssay ? FileText : CheckSquare;
  const typeLabel = isEssay ? "Essay" : "MCQ";

  const displayDate = dueDate || item.createdAt || item.created_at;
  const dateLabel = taken ? "Completed" : dueDate ? "Due" : "Created";
  const dateIcon = Calendar;

  const score = result?.score;
  const displayScore = score != null ? formatScoreValue(score) : "--";

  const handleAction = () => {
    if (onStart) {
      onStart(item, isEssay);
    }
  };

  return (
    <article className={`test-card ${statusClass}`}>
      {/* Header: Type badge + Duration + Action */}
      <header className="test-card__header">
        <div className="test-card__badges">
          <span className={typeBadgeClass}>
            <TypeIcon size={11} />
            {typeLabel}
          </span>
          <span className="test-card__duration">
            <Clock3 size={14} />
            {getDuration(item)} mins
          </span>
        </div>
        <div className="test-card__action">
          {taken ? (
            <span className="ft-button ft-button--disabled">Completed</span>
          ) : expired ? (
            <span className="ft-button ft-button--disabled">Expired</span>
          ) : (
            <button
              type="button"
              className="ft-button ft-button--primary"
              onClick={handleAction}
            >
              Start <ArrowRight size={15} />
            </button>
          )}
        </div>
      </header>

      {/* Title */}
      <h3 className="test-card__title">
        {item.title || item.name || "Untitled test"}
      </h3>

      {/* Description */}
      {item.description && (
        <p className="test-card__description">{item.description}</p>
      )}

      {/* Footer: Date + Score + Status */}
      <footer className="test-card__footer">
        <div className="test-card__meta">
          <span className="test-card__meta-item">
            <dateIcon size={14} />
            {dateLabel}: {formatShortDate(displayDate)}
          </span>
          <span className="test-card__meta-item">
            Score: <strong>{displayScore}</strong>
          </span>
        </div>
        <span className={statusBadgeClass}>{statusLabel}</span>
      </footer>
    </article>
  );
}
