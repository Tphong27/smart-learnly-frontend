import React from "react";
import { Link } from "react-router-dom";
import { Ban, Clock, Eye } from "lucide-react";
import "../flashtest.css";

function minutesBetween(start, end) {
  if (!start || !end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(diff) ? Math.max(0, Math.round(diff / 60000)) : null;
}

export function FlashTestCard({ item, type }) {
  const isEssay = type === "essay";
  const title = item.title || item.name || "Untitled flash test";
  const dueDate = item.dueDate || item.due_date;
  const duration =
    item.durationMinutes ??
    item.duration_minutes ??
    item.duration ??
    minutesBetween(item.createdAt || item.created_at, dueDate);
  const isExpired =
    isEssay && dueDate && new Date(dueDate).getTime() <= Date.now();

  return (
    <article className="ft-card">
      <div>
        <div className="ft-card-top">
          <span className={`ft-badge ${isEssay ? "ft-badge--essay" : "ft-badge--mcq"}`}>
            {isEssay ? "Essay" : "MCQ"}
          </span>
          <span className="ft-meta">
            <Clock size={14} /> {duration ?? "--"} mins
          </span>
        </div>

        {isExpired && (
          <span className="ft-badge ft-badge--expired" style={{ marginTop: 10 }}>
            <Ban size={12} /> Expired
          </span>
        )}

        <h3 className="ft-card-title">{title}</h3>
        <p className="ft-card-text">
          {item.description || "No description provided for this flash test."}
        </p>
        {isEssay && dueDate && (
          <p className="ft-muted">Due: {new Date(dueDate).toLocaleString()}</p>
        )}
      </div>

      <div className="ft-card-footer">
        <Link
          to={`/staff/flashtests/monitor/${item.id}/${type}`}
          className="ft-button ft-button--ghost"
        >
          <Eye size={16} /> Monitor Progress
        </Link>
      </div>
    </article>
  );
}
