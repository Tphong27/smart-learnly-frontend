import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { Button, Form, FormField, useToast } from '@/shared/components/ui'
import { systemSettingsService } from '@/services/system-settings.service'
import { sePayBankDisplaySettingsSchema } from '../schemas/settings-schemas'

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
  const [configured, setConfigured] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(sePayBankDisplaySettingsSchema),
    defaultValues: {
      accountNumber: '',
      bankName: '',
      accountName: '',
    },
    mode: 'onBlur',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const data = await systemSettingsService.getSePayBankDisplaySettings()
        if (cancelled) return
        reset({
          accountNumber: data?.accountNumber ?? '',
          bankName: data?.bankName ?? '',
          accountName: data?.accountName ?? '',
        })
        setConfigured(Boolean(data?.configured))
      } catch (err) {
        if (cancelled) return
        const message = err?.message || 'Could not load SePay bank display settings.'
        setLoadError(message)
        toast.error(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reset, toast])

  async function onSubmit(values) {
    try {
      const payload = {
        accountNumber: values.accountNumber?.trim(),
        bankName: values.bankName?.trim(),
        accountName: values.accountName?.trim(),
      }
      const updated = await systemSettingsService.updateSePayBankDisplaySettings(payload)
      reset({
        accountNumber: updated?.accountNumber ?? payload.accountNumber,
        bankName: updated?.bankName ?? payload.bankName,
        accountName: updated?.accountName ?? payload.accountName,
      })
      setConfigured(Boolean(updated?.configured))
      toast.success('SePay bank display settings saved.')
    } catch (err) {
      toast.error(err?.message || 'Failed to save SePay bank display settings.')
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
        Configure the bank transfer details shown on the SePay checkout screen. Changes take effect for new checkout orders without restarting the application.
      </p>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <h2 style={sectionTitleStyle}>SEPAY BANK DISPLAY</h2>
        <div className="admin-form-grid">
          <FormField
            label="Account number"
            placeholder="123456789"
            registration={register('accountNumber')}
            error={errors.accountNumber?.message}
          />
          <FormField
            label="Bank name"
            placeholder="MBBank"
            registration={register('bankName')}
            error={errors.bankName?.message}
          />
          <div className="admin-form-grid__full">
            <FormField
              label="Account name"
              placeholder="SMART LEARNLY"
              registration={register('accountName')}
              error={errors.accountName?.message}
              helperText={configured
                ? 'This configuration is complete. New SePay checkout orders will use these values.'
                : 'Complete all fields so checkout can render SePay QR and bank transfer instructions.'}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <Button type="submit" leftIcon={<Save size={16} />} loading={isSubmitting}>
            Save SePay settings
          </Button>
        </div>
      </Form>
    </>
  )
}
