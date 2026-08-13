import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import {
  Button,
  Checkbox,
  ErrorState,
  Form,
  FormActions,
  FormField,
  LoadingState,
  useToast,
} from '@/shared/components/ui'
import { systemSettingsService } from '../services/systemSettingsService'
import { googleMeetSettingsSchema } from '../schemas/settings-schemas'

const SECRET_PLACEHOLDER = '********'

/** Cấu hình tích hợp Google Meet ở cấp hệ thống. */
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

  /** Lưu trạng thái bật/tắt và refresh token Google Meet. */
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
    return <LoadingState label="Loading Google Meet settings..." />
  }
  if (loadError) {
    return <ErrorState title="Could not load Google Meet settings" description={loadError} />
  }

  return (
    <>
      <p className="admin-settings-section__lead">
        Configure Google Meet link generation. Changes take effect immediately without restarting the application.
      </p>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <h2 className="admin-settings-section__title">Google Meet</h2>
        <div className="admin-form-grid">
          <div className="admin-form-grid__full">
            <Checkbox
              className="admin-form-checkbox"
              label="Enable Google Meet integration"
              {...register('enabled')}
            />
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

        <FormActions>
          <Button type="submit" leftIcon={<Save size={16} />} loading={isSubmitting}>
            Save
          </Button>
        </FormActions>
      </Form>
    </>
  )
}
