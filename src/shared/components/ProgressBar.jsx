export function ProgressBar({ value = 0, label = 'Progress' }) {
  const progress = Math.max(0, Math.min(100, Number(value) || 0))

  return (
    <div className="progress-meter" aria-label={`${label}: ${progress}%`}>
      <div className="progress-meter__track">
        <span style={{ width: `${progress}%` }} />
      </div>
      <strong>{progress}%</strong>
    </div>
  )
}
