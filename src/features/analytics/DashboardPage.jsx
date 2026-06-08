import { AlertTriangle, BarChart3, BookOpen, Brain, Users } from 'lucide-react'
import { KpiCard } from '@/shared/components/ui/KpiCard'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { ProgressBar } from '@/shared/components/ui/ProgressBar'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { demoClasses } from '@/data/demo/demoClasses'
import { demoOperationalMetrics, demoWeakTopics } from '@/data/demo/demoAnalytics'
import { getCurrentUser } from '@/services'
import { ROLES } from '@/shared/constants/roles'

export function DashboardPage() {
  const user = getCurrentUser()
  const role = user?.role || ROLES.ADMIN

  if (role === ROLES.SME) return <SmeDashboard />
  if (role === ROLES.TRAINER) return <TrainerDashboard />
  if (role === ROLES.TMO || role === ROLES.ADMIN) return <OperationsDashboard />

  return <TraineeFallbackDashboard />
}

function OperationsDashboard() {
  return (
    <section>
      <PageHeader
        title="Operations Dashboard"
        description="Monitor active classes, payments, class performance, and churn risk signals."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Active Classes" value={demoOperationalMetrics.activeClasses} icon={BookOpen} />
        <KpiCard title="Active Trainees" value={demoOperationalMetrics.activeTrainees} icon={Users} />
        <KpiCard title="At-risk Trainees" value={demoOperationalMetrics.atRiskTrainees} icon={AlertTriangle} />
        <KpiCard title="Revenue This Month" value={demoOperationalMetrics.revenueThisMonth} icon={BarChart3} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Class Performance</h2>

          <div className="mt-4 space-y-4">
            {demoClasses.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-100 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-500">{item.course}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div className="mt-4">
                  <ProgressBar value={item.averageProgress} label="Average progress" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Weak Topic Signals</h2>

          <div className="mt-4 space-y-3">
            {demoWeakTopics.map((item) => (
              <div key={item.topic} className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{item.topic}</p>
                  <p className="text-sm text-slate-500">
                    {item.affectedTrainees} trainees affected
                  </p>
                </div>

                <span className="text-sm font-bold text-slate-900">
                  {item.averageScore}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function SmeDashboard() {
  return (
    <section>
      <PageHeader
        title="SME Dashboard"
        description="Prepare learning content, review AI-generated drafts, and publish approved resources."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard title="Assigned Courses" value="2" helper="1 published, 1 draft" icon={BookOpen} />
        <KpiCard title="AI Draft Questions" value="18" helper="Need SME review" icon={Brain} />
        <KpiCard title="Approved Questions" value="126" helper="Ready for tests" icon={BarChart3} />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Next SME Actions</h2>

        <div className="mt-4 space-y-3">
          <ActionItem title="Review AI-generated questions" status="review" />
          <ActionItem title="Publish Module 2 learning materials" status="draft" />
          <ActionItem title="Check CLO coverage for AWS course" status="pending" />
        </div>
      </div>
    </section>
  )
}

function TrainerDashboard() {
  return (
    <section>
      <PageHeader
        title="Trainer Dashboard"
        description="Track assigned classes, weak topics, progress, and trainees who may need support."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard title="Assigned Classes" value="2" icon={Users} />
        <KpiCard title="Average Class Score" value="74%" icon={BarChart3} />
        <KpiCard title="At-risk Trainees" value="5" icon={AlertTriangle} />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Assigned Classes</h2>

        <div className="mt-4 space-y-4">
          {demoClasses.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-500">{item.course}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>

              <div className="mt-4">
                <ProgressBar value={item.averageProgress} label="Average progress" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TraineeFallbackDashboard() {
  return (
    <section>
      <PageHeader
        title="Learning Dashboard"
        description="Trainee flow is owned by Dev 1. This fallback keeps the demo route stable."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">
            The trainee dashboard is currently under development. Please check back later to see your personalized learning insights, progress tracking, and recommended resources.
        </p>
      </div>
    </section>
  )
}

function ActionItem({ title, status }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-100 p-4">
      <p className="font-medium text-slate-800">{title}</p>
      <StatusBadge status={status} />
    </div>
  )
}