import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Play, Save } from 'lucide-react'
import { Button, Form, FormField, useToast } from '@/shared/components/ui'
import { systemSettingsService } from '../services/systemSettingsService'
import {
  sePayBankDisplaySettingsSchema,
  sePayRuntimeSettingsSchema,
} from '../schemas/settings-schemas'

const SECRET_PLACEHOLDER = '********'

const sectionTitleStyle = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: '#64708a',
  textTransform: 'uppercase',
  margin: '0 0 14px',
}

const sectionLeadStyle = {
  fontSize: 14,
  color: '#64708a',
  lineHeight: 1.6,
  margin: '0 0 20px',
}

export function SePayBankDisplaySettingsSection() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [displayConfigured, setDisplayConfigured] = useState(false)
  const [runtimeConfigured, setRuntimeConfigured] = useState({
    hasApiToken: false,
    hasWebhookSecret: false,
    hasApiTokenOverride: false,
    hasWebhookSecretOverride: false,
  })
  const [runningReconciliation, setRunningReconciliation] = useState(false)

  const displayForm = useForm({
    resolver: zodResolver(sePayBankDisplaySettingsSchema),
    defaultValues: {
      accountNumber: '',
      bankName: '',
      accountName: '',
    },
    mode: 'onBlur',
  })

  const runtimeForm = useForm({
    resolver: zodResolver(sePayRuntimeSettingsSchema),
    defaultValues: {
      apiToken: '',
      webhookSecret: '',
    },
    mode: 'onBlur',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const [displayData, runtimeData] = await Promise.all([
          systemSettingsService.getSePayBankDisplaySettings(),
          systemSettingsService.getSePayRuntimeSettings(),
        ])
        if (cancelled) return
        displayForm.reset({
          accountNumber: displayData?.accountNumber ?? '',
          bankName: displayData?.bankName ?? '',
          accountName: displayData?.accountName ?? '',
        })
        runtimeForm.reset({
          apiToken: runtimeData?.hasApiTokenOverride ? SECRET_PLACEHOLDER : '',
          webhookSecret: runtimeData?.hasWebhookSecretOverride ? SECRET_PLACEHOLDER : '',
        })
        setDisplayConfigured(Boolean(displayData?.configured))
        setRuntimeConfigured({
          hasApiToken: Boolean(runtimeData?.hasApiToken),
          hasWebhookSecret: Boolean(runtimeData?.hasWebhookSecret),
          hasApiTokenOverride: Boolean(runtimeData?.hasApiTokenOverride),
          hasWebhookSecretOverride: Boolean(runtimeData?.hasWebhookSecretOverride),
        })
      } catch (err) {
        if (cancelled) return
        const message = err?.message || 'Could not load SePay settings.'
        setLoadError(message)
        toast.error(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [displayForm, runtimeForm, toast])

  async function submitDisplay(values) {
    try {
      const payload = {
        accountNumber: values.accountNumber?.trim(),
        bankName: values.bankName?.trim(),
        accountName: values.accountName?.trim(),
      }
      const updated = await systemSettingsService.updateSePayBankDisplaySettings(payload)
      displayForm.reset({
        accountNumber: updated?.accountNumber ?? payload.accountNumber,
        bankName: updated?.bankName ?? payload.bankName,
        accountName: updated?.accountName ?? payload.accountName,
      })
      setDisplayConfigured(Boolean(updated?.configured))
      toast.success('SePay bank display settings saved.')
    } catch (err) {
      toast.error(err?.message || 'Failed to save SePay bank display settings.')
    }
  }

  async function submitRuntime(values) {
    try {
      const payload = {}
      if (values.apiToken !== SECRET_PLACEHOLDER) {
        payload.apiToken = values.apiToken || ''
      }
      if (values.webhookSecret !== SECRET_PLACEHOLDER) {
        payload.webhookSecret = values.webhookSecret || ''
      }
      const updated = await systemSettingsService.updateSePayRuntimeSettings(payload)
      runtimeForm.reset({
        apiToken: updated?.hasApiTokenOverride ? SECRET_PLACEHOLDER : '',
        webhookSecret: updated?.hasWebhookSecretOverride ? SECRET_PLACEHOLDER : '',
      })
      setRuntimeConfigured({
        hasApiToken: Boolean(updated?.hasApiToken),
        hasWebhookSecret: Boolean(updated?.hasWebhookSecret),
        hasApiTokenOverride: Boolean(updated?.hasApiTokenOverride),
        hasWebhookSecretOverride: Boolean(updated?.hasWebhookSecretOverride),
      })
      toast.success('SePay runtime settings saved.')
    } catch (err) {
      toast.error(err?.message || 'Failed to save SePay runtime settings.')
    }
  }

  async function runReconciliationNow() {
    try {
      setRunningReconciliation(true)
      const result = await systemSettingsService.runSePayReconciliationNow()
      toast.success(
        result?.queryFailures || result?.candidateFailures
          ? `SePay reconciliation completed with warnings. Pending: ${result?.pendingOrders ?? 0}, queried: ${result?.queriedOrders ?? 0}, matched: ${result?.matchedCandidates ?? 0}, query failures: ${result?.queryFailures ?? 0}, candidate failures: ${result?.candidateFailures ?? 0}`
          : `SePay reconciliation completed. Pending: ${result?.pendingOrders ?? 0}, queried: ${result?.queriedOrders ?? 0}, matched: ${result?.matchedCandidates ?? 0}`,
      )
    } catch (err) {
      toast.error(err?.message || 'Failed to run SePay reconciliation.')
    } finally {
      setRunningReconciliation(false)
    }
  }

  if (loading) {
    return <div className="admin-loading">Loading...</div>
  }
  if (loadError) {
    return <div className="admin-error">{loadError}</div>
  }

  return (
    <>
      <p style={sectionLeadStyle}>
        Configure the bank transfer details and runtime credentials used by SePay checkout and reconciliation. Changes take effect immediately without restarting the application.
      </p>

      <Form onSubmit={displayForm.handleSubmit(submitDisplay)}>
        <h2 style={sectionTitleStyle}>SEPAY BANK DISPLAY</h2>
        <div className="admin-form-grid">
          <FormField
            label="Account number"
            required
            placeholder="123456789"
            registration={displayForm.register('accountNumber')}
            error={displayForm.formState.errors.accountNumber?.message}
          />
          <FormField
            label="Bank name"
            required
            placeholder="MBBank"
            registration={displayForm.register('bankName')}
            error={displayForm.formState.errors.bankName?.message}
          />
          <div className="admin-form-grid__full">
            <FormField
              label="Account name"
              required
              placeholder="SMART LEARNLY"
              registration={displayForm.register('accountName')}
              error={displayForm.formState.errors.accountName?.message}
              helperText={displayConfigured
                ? 'This configuration is complete. New SePay checkout orders will use these values.'
                : 'Complete all fields so checkout can render SePay QR and bank transfer instructions.'}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <Button type="submit" leftIcon={<Save size={16} />} loading={displayForm.formState.isSubmitting}>
            Save SePay display settings
          </Button>
        </div>
      </Form>

      <div style={{ height: 1, background: '#e7ecf4', margin: '28px 0' }} />

      <Form onSubmit={runtimeForm.handleSubmit(submitRuntime)}>
        <h2 style={sectionTitleStyle}>SEPAY RUNTIME</h2>
        <div className="admin-form-grid">
          <div className="admin-form-grid__full">
            <FormField
              label="API Token"
              type="password"
              autoComplete="new-password"
              placeholder={SECRET_PLACEHOLDER}
              registration={runtimeForm.register('apiToken')}
              error={runtimeForm.formState.errors.apiToken?.message}
              helperText={runtimeConfigured.hasApiTokenOverride
                ? 'A stored override is configured. Leave blank or keep ******** to retain the current value. Submit an empty field to clear the stored override.'
                : runtimeConfigured.hasApiToken
                  ? 'Currently using environment fallback. Enter a value here only if you want to override it in System Settings.'
                  : 'Configure SePay API token to enable reconciliation without waiting for webhooks.'}
            />
          </div>
          <div className="admin-form-grid__full">
            <FormField
              label="Webhook secret"
              type="password"
              autoComplete="new-password"
              placeholder={SECRET_PLACEHOLDER}
              registration={runtimeForm.register('webhookSecret')}
              error={runtimeForm.formState.errors.webhookSecret?.message}
              helperText={runtimeConfigured.hasWebhookSecretOverride
                ? 'A stored override is configured. Leave blank or keep ******** to retain the current value. Submit an empty field to clear the stored override.'
                : runtimeConfigured.hasWebhookSecret
                  ? 'Currently using environment fallback. Enter a value here only if you want to override it in System Settings.'
                  : 'Configure SePay webhook secret if you want backend webhook signature verification to use System Settings.'}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <Button type="submit" leftIcon={<Save size={16} />} loading={runtimeForm.formState.isSubmitting}>
            Save SePay runtime settings
          </Button>
        </div>
      </Form>

      <div style={{ height: 1, background: '#e7ecf4', margin: '28px 0' }} />

      <div>
        <h2 style={sectionTitleStyle}>MANUAL RECONCILIATION</h2>
        <p style={{ ...sectionLeadStyle, marginBottom: 16 }}>
          Run SePay reconciliation immediately to scan pending checkout orders without waiting for the scheduled job.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="button" leftIcon={<Play size={16} />} loading={runningReconciliation} onClick={runReconciliationNow}>
            Run SePay reconciliation now
          </Button>
        </div>
      </div>
    </>
  )
}
