import { Brain, CreditCard, Mail, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { DataState } from '@/shared/components/ui/DataState'

const settings = [
  {
    name: 'AI Provider',
    value: 'OpenAI / Gemini mock',
    status: 'active',
    icon: Brain,
  },
  {
    name: 'Payment Gateway',
    value: 'PayOS / VNPay mock',
    status: 'active',
    icon: CreditCard,
  },
  {
    name: 'Email Service',
    value: 'SMTP mock',
    status: 'active',
    icon: Mail,
  },
  {
    name: 'RBAC Policy',
    value: 'Default SLP roles protected',
    status: 'active',
    icon: ShieldCheck,
  },
]

export function SystemSettingsPage() {
  const isLoading = false
  const error = null

  const header = (
    <PageHeader
      title="System Settings"
      description="Admin mock screen for AI, payment, email, and access-control configuration."
    />
  )

  if (isLoading) {
    return (
      <section>
        {header}
        <DataState type="loading" title="Loading settings" description="Fetching system configuration categories." />
      </section>
    )
  }

  if (error) {
    return (
      <section>
        {header}
        <DataState type="error" title="Settings unavailable" description={error} />
      </section>
    )
  }

  if (settings.length === 0) {
    return (
      <section>
        {header}
        <DataState type="empty" title="No settings found" description="System configuration categories have not been loaded." />
      </section>
    )
  }

  return (
    <section>
      {header}

      <div className="grid gap-4 md:grid-cols-2">
        {settings.map((item) => {
          const Icon = item.icon

          return (
            <div key={item.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-blue-50 p-3 text-blue-700">
                    <Icon size={20} />
                  </span>

                  <div>
                    <h2 className="font-bold text-slate-900">{item.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{item.value}</p>
                    <p className="mt-3 text-xs text-slate-400">
                      Secret values are masked in demo mode.
                    </p>
                  </div>
                </div>

                <StatusBadge status={item.status} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
