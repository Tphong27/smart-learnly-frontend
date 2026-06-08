import { useState } from 'react'
import {
  Brain,
  CreditCard,
  Database,
  Mail,
  Save,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { DataState } from '@/shared/components/ui/DataState'
import {
  getAdminSettings,
  updateAdminSettings,
} from '@/data/demo/demoAdminRuntime'

function ConfigCard({ title, description, icon: Icon, status, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-blue-50 p-3 text-blue-700">
            <Icon size={20} />
          </span>

          <div>
            <h2 className="font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
            <p className="mt-3 text-xs text-slate-400">
              Secret values are masked in demo mode.
            </p>
          </div>
        </div>

        <StatusBadge status={status} />
      </div>

      <div className="mt-5">{children}</div>
    </section>
  )
}

function updateNestedForm(setForm, name, value) {
  setForm((current) => ({
    ...current,
    [name]: value,
  }))
}

export function SystemSettingsPage() {
  const [settings, setSettings] = useState(() => getAdminSettings())
  const [aiForm, setAiForm] = useState(settings.ai)
  const [paymentForm, setPaymentForm] = useState(settings.payment)
  const [emailForm, setEmailForm] = useState(settings.email)
  const [securityForm, setSecurityForm] = useState(settings.security)
  const [savedMessage, setSavedMessage] = useState('')

  const isLoading = false
  const error = null

  const header = (
    <PageHeader
      title="System Settings"
      description="Configure AI service, RAG, payment gateway, email service, and RBAC policy in demo mode."
    />
  )

  const saveSection = (section, form) => {
    const nextSettings = updateAdminSettings(section, form)
    setSettings(nextSettings)
    setSavedMessage(`${section.toUpperCase()} configuration saved in demo mode.`)
  }

  if (isLoading) {
    return (
      <section>
        {header}
        <DataState
          type="loading"
          title="Loading settings"
          description="Fetching system configuration categories."
        />
      </section>
    )
  }

  if (error) {
    return (
      <section>
        {header}
        <DataState
          type="error"
          title="Settings unavailable"
          description={error}
        />
      </section>
    )
  }

  return (
    <section>
      {header}

      {savedMessage ? (
        <div className="course-flow-note-card">
          <strong>Saved</strong>
          <span>{savedMessage}</span>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <ConfigCard
          title="AI Service"
          description="Provider, model, token limit, RAG, and generation status."
          icon={Brain}
          status={aiForm.status}
        >
          <div className="course-flow-form-grid">
            <label className="course-flow-field">
              <span>AI Provider</span>
              <select
                value={aiForm.provider}
                onChange={(event) =>
                  updateNestedForm(setAiForm, 'provider', event.target.value)
                }
              >
                <option>OpenAI / Gemini mock</option>
                <option>OpenAI mock</option>
                <option>Gemini mock</option>
                <option>Local LLM mock</option>
              </select>
            </label>

            <label className="course-flow-field">
              <span>Model</span>
              <input
                value={aiForm.model}
                onChange={(event) =>
                  updateNestedForm(setAiForm, 'model', event.target.value)
                }
              />
            </label>

            <label className="course-flow-field">
              <span>Token limit</span>
              <input
                type="number"
                value={aiForm.tokenLimit}
                onChange={(event) =>
                  updateNestedForm(setAiForm, 'tokenLimit', Number(event.target.value))
                }
              />
            </label>

            <label className="course-flow-field">
              <span>Temperature</span>
              <input
                type="number"
                step="0.1"
                value={aiForm.temperature}
                onChange={(event) =>
                  updateNestedForm(setAiForm, 'temperature', Number(event.target.value))
                }
              />
            </label>

            <label className="course-flow-field">
              <span>Daily generation limit</span>
              <input
                type="number"
                value={aiForm.dailyLimit}
                onChange={(event) =>
                  updateNestedForm(setAiForm, 'dailyLimit', Number(event.target.value))
                }
              />
            </label>

            <label className="course-flow-field">
              <span>Status</span>
              <select
                value={aiForm.status}
                onChange={(event) =>
                  updateNestedForm(setAiForm, 'status', event.target.value)
                }
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <label className="course-flow-field course-flow-field--wide">
              <span>RAG Source</span>
              <input
                value={aiForm.ragSource}
                onChange={(event) =>
                  updateNestedForm(setAiForm, 'ragSource', event.target.value)
                }
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={aiForm.ragEnabled}
                onChange={(event) =>
                  updateNestedForm(setAiForm, 'ragEnabled', event.target.checked)
                }
              />
              Enable RAG for course materials and question bank
            </label>
          </div>

          <button
            type="button"
            className="demo-primary-action mt-4"
            onClick={() => saveSection('ai', aiForm)}
          >
            <Save size={16} />
            Save AI Config
          </button>
        </ConfigCard>

        <ConfigCard
          title="Payment Gateway"
          description="Payment provider, sandbox mode, verification, and refund rule."
          icon={CreditCard}
          status={paymentForm.status}
        >
          <div className="course-flow-form-grid">
            <label className="course-flow-field">
              <span>Primary Gateway</span>
              <select
                value={paymentForm.primaryGateway}
                onChange={(event) =>
                  updateNestedForm(
                    setPaymentForm,
                    'primaryGateway',
                    event.target.value,
                  )
                }
              >
                <option>VNPay</option>
                <option>PayOS</option>
                <option>Manual Transfer</option>
              </select>
            </label>

            <label className="course-flow-field">
              <span>Secondary Gateway</span>
              <select
                value={paymentForm.secondaryGateway}
                onChange={(event) =>
                  updateNestedForm(
                    setPaymentForm,
                    'secondaryGateway',
                    event.target.value,
                  )
                }
              >
                <option>PayOS</option>
                <option>VNPay</option>
                <option>Disabled</option>
              </select>
            </label>

            <label className="course-flow-field">
              <span>Status</span>
              <select
                value={paymentForm.status}
                onChange={(event) =>
                  updateNestedForm(setPaymentForm, 'status', event.target.value)
                }
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>

            <label className="course-flow-field course-flow-field--wide">
              <span>Refund Policy</span>
              <input
                value={paymentForm.refundPolicy}
                onChange={(event) =>
                  updateNestedForm(setPaymentForm, 'refundPolicy', event.target.value)
                }
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={paymentForm.sandboxMode}
                onChange={(event) =>
                  updateNestedForm(
                    setPaymentForm,
                    'sandboxMode',
                    event.target.checked,
                  )
                }
              />
              Sandbox mode
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={paymentForm.autoVerify}
                onChange={(event) =>
                  updateNestedForm(
                    setPaymentForm,
                    'autoVerify',
                    event.target.checked,
                  )
                }
              />
              Auto-verify successful payments
            </label>
          </div>

          <button
            type="button"
            className="demo-primary-action mt-4"
            onClick={() => saveSection('payment', paymentForm)}
          >
            <Save size={16} />
            Save Payment Config
          </button>
        </ConfigCard>

        <ConfigCard
          title="RAG Knowledge Base"
          description="Mock index status for learning materials and assessment content."
          icon={Database}
          status={aiForm.ragEnabled ? 'active' : 'inactive'}
        >
          <dl className="course-flow-mini-grid">
            <div>
              <dt>Indexed Sources</dt>
              <dd>Course PDFs, lesson text, question bank</dd>
            </div>
            <div>
              <dt>Chunking Strategy</dt>
              <dd>Lesson-level mock chunks</dd>
            </div>
            <div>
              <dt>Retrieval Mode</dt>
              <dd>Semantic + keyword mock</dd>
            </div>
            <div>
              <dt>Last Sync</dt>
              <dd>2026-06-08 09:30</dd>
            </div>
          </dl>
        </ConfigCard>

        <ConfigCard
          title="Email & RBAC"
          description="Email sender, session timeout, and role protection policy."
          icon={ShieldCheck}
          status={securityForm.status}
        >
          <div className="course-flow-form-grid">
            <label className="course-flow-field">
              <span>Email Provider</span>
              <input
                value={emailForm.provider}
                onChange={(event) =>
                  updateNestedForm(setEmailForm, 'provider', event.target.value)
                }
              />
            </label>

            <label className="course-flow-field">
              <span>Sender</span>
              <input
                value={emailForm.sender}
                onChange={(event) =>
                  updateNestedForm(setEmailForm, 'sender', event.target.value)
                }
              />
            </label>

            <label className="course-flow-field">
              <span>Session timeout minutes</span>
              <input
                type="number"
                value={securityForm.sessionTimeoutMinutes}
                onChange={(event) =>
                  updateNestedForm(
                    setSecurityForm,
                    'sessionTimeoutMinutes',
                    Number(event.target.value),
                  )
                }
              />
            </label>

            <label className="course-flow-field course-flow-field--wide">
              <span>RBAC Policy</span>
              <input
                value={securityForm.rbacPolicy}
                onChange={(event) =>
                  updateNestedForm(
                    setSecurityForm,
                    'rbacPolicy',
                    event.target.value,
                  )
                }
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="demo-secondary-action"
              onClick={() => saveSection('email', emailForm)}
            >
              <Mail size={16} />
              Save Email
            </button>

            <button
              type="button"
              className="demo-primary-action"
              onClick={() => saveSection('security', securityForm)}
            >
              <SlidersHorizontal size={16} />
              Save RBAC
            </button>
          </div>
        </ConfigCard>
      </div>
    </section>
  )
}