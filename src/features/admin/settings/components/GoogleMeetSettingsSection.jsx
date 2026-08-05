import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { Button, Form, FormField, useToast } from '@/shared/components/ui'
import { systemSettingsService } from '../services/systemSettingsService'
import { googleMeetSettingsSchema } from '../schemas/settings-schemas'

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

export function GoogleMeetSettingsSection() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(googleMeetSettingsSchema),
    defaultValues: { enabled: false, refreshToken: '' },
    mode: 'onBlur',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const data = await systemSettingsService.getGoogleMeetSettings()
        if (cancelled) return
        reset({
          enabled: Boolean(data?.enabled),
          refreshToken: data?.hasRefreshToken ? SECRET_PLACEHOLDER : '',
        })
      } catch (err) {
        if (cancelled) return
        const message = err?.message || 'Could not load Google Meet settings.'
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
        enabled: Boolean(values.enabled),
      }
      if (values.refreshToken !== SECRET_PLACEHOLDER) {
        payload.refreshToken = values.refreshToken || ''
      }
      const updated = await systemSettingsService.updateGoogleMeetSettings(payload)
      reset({
        enabled: Boolean(updated?.enabled),
        refreshToken: updated?.hasRefreshToken ? SECRET_PLACEHOLDER : '',
      })
      toast.success('Google Meet settings saved.')
    } catch (err) {
      toast.error(err?.message || 'Failed to save Google Meet settings.')
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
        Configure Google Meet link generation. Changes take effect immediately without restarting the application.
      </p>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <h2 style={sectionTitleStyle}>GOOGLE MEET</h2>
        <div className="admin-form-grid">
          <div className="admin-form-grid__full">
            <label className="admin-checkbox" style={{ marginTop: 6 }}>
              <input type="checkbox" {...register('enabled')} />
              Enable Google Meet integration
            </label>
          </div>

          <div className="admin-form-grid__full">
            <FormField
              label="Refresh Token"
              type="password"
              autoComplete="new-password"
              placeholder={SECRET_PLACEHOLDER}
              registration={register('refreshToken')}
              error={errors.refreshToken?.message}
              helperText="Leave blank or keep ******** to retain the current value. Submit an empty field to clear the stored token."
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <Button type="submit" leftIcon={<Save size={16} />} loading={isSubmitting}>
            Save
          </Button>
        </div>
      </Form>
    </>
  )
}
