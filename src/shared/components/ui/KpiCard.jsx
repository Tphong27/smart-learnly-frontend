export function KpiCard({ title, value, helper, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {helper ? <p className="mt-1 text-sm text-slate-500">{helper}</p> : null}
        </div>

        {Icon ? (
          <span className="rounded-xl bg-blue-50 p-3 text-blue-700">
            <Icon size={20} />
          </span>
        ) : null}
      </div>
    </div>
  )
}