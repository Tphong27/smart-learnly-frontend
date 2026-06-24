import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Send, Save } from 'lucide-react'
import { Button, Form, FormField, useToast } from '@/shared/components/ui'
import { systemSettingsService } from '@/services/system-settings.service'
import { emailSettingsSchema } from '../schemas/settings-schemas'

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

export function EmailSettingsSection() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [testing, setTesting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: { apiKey: '', fromName: '', fromEmail: '', replyTo: '' },
    mode: 'onBlur',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const data = await systemSettingsService.getEmailSettings()
        if (cancelled) return
        reset({
          apiKey: data?.hasApiKey ? SECRET_PLACEHOLDER : '',
          fromName: data?.fromName ?? '',
          fromEmail: data?.fromEmail ?? '',
          replyTo: data?.replyTo ?? '',
        })
      } catch (err) {
        if (cancelled) return
        const message = err?.message || 'Could not load email settings.'
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
        fromName: values.fromName?.trim(),
        fromEmail: values.fromEmail?.trim(),
        replyTo: values.replyTo?.trim() || '',
      }
      // Only send apiKey when the user actually changed it (not the placeholder).
      if (values.apiKey && values.apiKey !== SECRET_PLACEHOLDER) {
        payload.apiKey = values.apiKey
      }
      const updated = await systemSettingsService.updateEmailSettings(payload)
      reset({
        apiKey: updated?.hasApiKey ? SECRET_PLACEHOLDER : '',
        fromName: updated?.fromName ?? '',
        fromEmail: updated?.fromEmail ?? '',
        replyTo: updated?.replyTo ?? '',
      })
      toast.success('Email settings saved.')
    } catch (err) {
      toast.error(err?.message || 'Failed to save settings.')
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      const result = await systemSettingsService.testEmail({})
      toast.success(result?.message || 'SMTP connection successful')
    } catch (err) {
      toast.error(err?.message || 'Failed to send test email.')
    } finally {
      setTesting(false)
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
        Configure the email transport and sender identity. Changes take effect immediately, no
        application restart required.
      </p>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <h2 style={sectionTitleStyle}>EMAIL TRANSPORT</h2>
        <div className="admin-form-grid">
          <div className="admin-form-grid__full">
            <FormField
              label="API Key"
              type="password"
              autoComplete="new-password"
              placeholder={SECRET_PLACEHOLDER}
              registration={register('apiKey')}
              error={errors.apiKey?.message}
              helperText="Leave blank or keep ******** to retain the current value."
            />
          </div>
        </div>

        <h2 style={{ ...sectionTitleStyle, marginTop: 24 }}>SENDER IDENTITY</h2>
        <div className="admin-form-grid">
          <FormField
            label="From Name"
            required
            placeholder="Smart Learnly"
            registration={register('fromName')}
            error={errors.fromName?.message}
          />
          <FormField
            label="From Email"
            required
            placeholder="no-reply@smartlearnly.online"
            registration={register('fromEmail')}
            error={errors.fromEmail?.message}
          />
          <FormField
            label="Reply-To"
            placeholder="support@smartlearnly.online"
            registration={register('replyTo')}
            error={errors.replyTo?.message}
            helperText="Optional"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <Button
            type="button"
            variant="secondary"
            leftIcon={<Send size={16} />}
            loading={testing}
            onClick={handleTest}
          >
            Test Email
          </Button>
          <Button type="submit" leftIcon={<Save size={16} />} loading={isSubmitting}>
            Save
          </Button>
        </div>
      </Form>
    </>
  )
}
