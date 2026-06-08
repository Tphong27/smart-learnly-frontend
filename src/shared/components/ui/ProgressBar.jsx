export function ProgressBar({ value = 0, label }) {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0))

  return (
    <div>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">{label}</span>
          <span className="font-semibold text-slate-900">{safeValue}%</span>
        </div>
      ) : null}

      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-blue-600"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  )
}