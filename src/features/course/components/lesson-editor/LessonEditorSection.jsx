import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Circle,
  Loader2,
} from "lucide-react";

/** Hiển thị một bước accordion và trạng thái hoàn thành của lesson editor. */
export function LessonEditorSection({
  id,
  step,
  title,
  description,
  summary,
  state = "incomplete",
  stateLabel,
  expanded,
  onToggle,
  className = "",
  children,
}) {
  const StatusIcon =
    state === "complete"
      ? CheckCircle2
      : state === "error"
        ? AlertCircle
        : state === "processing"
          ? Loader2
          : Circle;
  const headingId = `${id}-heading`;
  const panelId = `${id}-panel`;
  return (
    <section
      className={[
        "sl-lesson-step",
        `sl-lesson-step--${state}`,
        expanded ? "is-expanded" : "",
        className,
      ].filter(Boolean).join(" ")}
    >
      <h2 className="sl-lesson-step__heading" id={headingId}>
        <button
          type="button"
          className="sl-lesson-step__trigger"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="sl-lesson-step__status-icon" aria-hidden="true">
            <StatusIcon
              size={20}
              className={state === "processing" ? "animate-spin" : undefined}
            />
          </span>
          <span className="sl-lesson-step__copy">
            <strong>{step}. {title}</strong>
            <span>{summary || description}</span>
          </span>
          <span className="sl-lesson-step__meta">
            <span className={`sl-lesson-step__state sl-lesson-step__state--${state}`}>
              {stateLabel}
            </span>
            <ChevronDown size={19} className="sl-lesson-step__chevron" aria-hidden="true" />
          </span>
        </button>
      </h2>
      {expanded && (
        <div
          id={panelId}
          className="sl-lesson-step__content"
          role="region"
          aria-labelledby={headingId}
        >
          {children}
        </div>
      )}
    </section>
  );
}
