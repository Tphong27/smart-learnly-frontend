export function ProgressBar({ value = 0, label }) {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0))

  return (
    <div className="dev2-progress">
      {label ? (
        <div className="dev2-progress__label">
          <span>{label}</span>
          <strong>{safeValue}%</strong>
        </div>
      ) : null}

      <div className="dev2-progress__track">
        <div
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  )
}
