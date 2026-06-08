import { AlertTriangle, BarChart3, CreditCard, Users } from 'lucide-react'
import { KpiCard } from '@/shared/components/ui/KpiCard'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { demoClasses } from '@/data/demo/demoClasses'
import { demoOperationalMetrics, demoWeakTopics } from '@/data/demo/demoAnalytics'

export function ReportsPage() {
  return (
    <section>
      <PageHeader
        title="Reports & Operational Insights"
        description="TMO/Admin view for enrollment, payment, class performance, and churn risk monitoring."
        action={
          <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Export Mock Report
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Active Trainees" value={demoOperationalMetrics.activeTrainees} icon={Users} />
        <KpiCard title="Revenue This Month" value={demoOperationalMetrics.revenueThisMonth} icon={CreditCard} />
        <KpiCard title="Pending Payments" value={demoOperationalMetrics.pendingPayments} icon={CreditCard} />
        <KpiCard title="At-risk Trainees" value={demoOperationalMetrics.atRiskTrainees} icon={AlertTriangle} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Class Report</h2>

          <div className="mt-4 space-y-3">
            {demoClasses.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">{item.course}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <ReportCell label="Trainees" value={item.trainees} />
                  <ReportCell label="Avg. Score" value={`${item.averageScore}%`} />
                  <ReportCell label="At Risk" value={item.atRiskCount} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-700" />
            <h2 className="text-lg font-bold text-slate-900">Weak Topic Report</h2>
          </div>

          <div className="mt-4 space-y-3">
            {demoWeakTopics.map((item) => (
              <div key={item.topic} className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{item.topic}</p>
                    <p className="text-sm text-slate-500">
                      {item.affectedTrainees} affected trainees
                    </p>
                  </div>

                  <p className="text-xl font-bold text-slate-900">{item.averageScore}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ReportCell({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  )
}