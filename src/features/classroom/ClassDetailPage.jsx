import { useParams } from 'react-router-dom'
import { AlertTriangle, BarChart3, Users } from 'lucide-react'
import { KpiCard } from '@/shared/components/ui/KpiCard'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { ProgressBar } from '@/shared/components/ui/ProgressBar'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { demoClasses, demoClassTrainees } from '@/data/demo/demoClasses'

export function ClassDetailPage() {
  const { classId } = useParams()
  const currentClass = demoClasses.find((item) => item.id === classId) || demoClasses[0]

  return (
    <section>
      <PageHeader
        title={currentClass.name}
        description={`${currentClass.course} — Trainer: ${currentClass.trainer}`}
        action={<StatusBadge status={currentClass.status} />}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard title="Trainees" value={currentClass.trainees} icon={Users} />
        <KpiCard title="Avg. Progress" value={`${currentClass.averageProgress}%`} icon={BarChart3} />
        <KpiCard title="Avg. Score" value={`${currentClass.averageScore}%`} icon={BarChart3} />
        <KpiCard title="At Risk" value={currentClass.atRiskCount} icon={AlertTriangle} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Trainee Risk Monitoring</h2>
          <p className="mt-1 text-sm text-slate-500">
            Churn risk is a decision-support signal only. Trainer/TMO should review context before intervention.
          </p>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Trainee</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Last Login</th>
                    <th className="px-4 py-3">Weak Topic</th>
                    <th className="px-4 py-3">Risk</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {demoClassTrainees.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4 font-medium text-slate-900">{item.name}</td>
                      <td className="px-4 py-4">
                        <div className="w-36">
                          <ProgressBar value={item.progress} />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{item.score}%</td>
                      <td className="px-4 py-4 text-slate-700">
                        {item.lastLoginDays} day(s) ago
                      </td>
                      <td className="px-4 py-4 text-slate-700">{item.weakTopic}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={item.risk} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Weak Topic Summary</h2>

            <div className="mt-4 space-y-4">
              <WeakTopic label="Cloud Pricing Models" value={52} />
              <WeakTopic label="Security & Compliance" value={58} />
              <WeakTopic label="Shared Responsibility Model" value={61} />
            </div>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 text-red-600" size={20} />
              <div>
                <h3 className="font-bold text-red-800">Recommended Intervention</h3>
                <p className="mt-1 text-sm text-red-700">
                  Schedule a focused review session for Cloud Pricing Models and contact high-risk trainees.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

function WeakTopic({ label, value }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-amber-500" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}