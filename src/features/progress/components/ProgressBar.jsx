export function ProgressBar({ value, label }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-label={label || `Progress: ${safeValue}%`}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={safeValue}
    >
      <div className="progress-bar__fill" style={{ width: `${safeValue}%` }} />
    </div>
  );
}
