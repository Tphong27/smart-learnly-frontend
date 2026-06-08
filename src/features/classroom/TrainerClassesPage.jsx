import { Link } from 'react-router-dom'
import { AlertTriangle, BarChart3, Users } from 'lucide-react'
import { KpiCard } from '@/shared/components/ui/KpiCard'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { ProgressBar } from '@/shared/components/ui/ProgressBar'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { DataState } from '@/shared/components/ui/DataState'
import { demoClasses } from '@/data/demo/demoClasses'

export function TrainerClassesPage() {
  const classes = demoClasses
  const isLoading = false
  const error = null
  const runningClasses = classes.filter((item) => item.status === 'running')
  const totalAtRisk = classes.reduce((sum, item) => sum + item.atRiskCount, 0)

  const header = (
    <PageHeader
      title="Trainer Classes"
      description="Monitor assigned classes, progress, weak topics, and trainees who need intervention."
    />
  )

  if (isLoading) {
    return (
      <section>
        {header}
        <DataState type="loading" title="Loading classes" description="Fetching assigned class data." />
      </section>
    )
  }

  if (error) {
    return (
      <section>
        {header}
        <DataState type="error" title="Classes unavailable" description={error} />
      </section>
    )
  }

  if (classes.length === 0) {
    return (
      <section>
        {header}
        <DataState type="empty" title="No assigned classes" description="There are no classes assigned to this role yet." />
      </section>
    )
  }

  return (
    <section>
      {header}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <KpiCard title="Assigned Classes" value={classes.length} icon={Users} />
        <KpiCard title="Running Classes" value={runningClasses.length} icon={BarChart3} />
        <KpiCard title="At-risk Trainees" value={totalAtRisk} icon={AlertTriangle} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {classes.map((item) => (
          <Link
            key={item.id}
            to={`/trainer/classes/${item.id}`}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{item.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{item.course}</p>
                <p className="mt-1 text-sm text-slate-500">Trainer: {item.trainer}</p>
              </div>

              <StatusBadge status={item.status} />
            </div>

            <div className="mt-5 space-y-4">
              <ProgressBar value={item.averageProgress} label="Average progress" />

              <div className="grid gap-3 md:grid-cols-3">
                <MiniMetric label="Trainees" value={item.trainees} />
                <MiniMetric label="Avg. score" value={`${item.averageScore}%`} />
                <MiniMetric label="At risk" value={item.atRiskCount} />
              </div>

              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-800">
                  Weakest topic: {item.weakestTopic}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  )
}
