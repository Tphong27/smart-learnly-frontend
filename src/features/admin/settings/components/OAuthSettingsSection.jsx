import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Save } from 'lucide-react'
import { Button, Form, FormField, useToast } from '@/shared/components/ui'
import { systemSettingsService } from '@/services/system-settings.service'
import { googleOAuthSchema } from '../schemas/settings-schemas'

const SECRET_PLACEHOLDER = '********'
const DEFAULT_SCOPE = 'openid,profile,email'

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

export function OAuthSettingsSection() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [redirectHint, setRedirectHint] = useState('/login/oauth2/code/google')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(googleOAuthSchema),
    defaultValues: { clientId: '', clientSecret: '', scope: DEFAULT_SCOPE },
    mode: 'onBlur',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const data = await systemSettingsService.getGoogleOAuth()
        if (cancelled) return
        if (data?.redirectUriHint) setRedirectHint(data.redirectUriHint)
        reset({
          clientId: data?.hasClientId ? SECRET_PLACEHOLDER : '',
          clientSecret: data?.hasClientSecret ? SECRET_PLACEHOLDER : '',
          scope: data?.scope ?? DEFAULT_SCOPE,
        })
      } catch (err) {
        if (cancelled) return
        const message = err?.message || 'Could not load OAuth settings.'
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
        scope: values.scope?.trim() || DEFAULT_SCOPE,
      }
      // Only send clientId/clientSecret when the user actually changed them (not the placeholder).
      if (values.clientId && values.clientId !== SECRET_PLACEHOLDER) {
        payload.clientId = values.clientId.trim()
      }
      if (values.clientSecret && values.clientSecret !== SECRET_PLACEHOLDER) {
        payload.clientSecret = values.clientSecret
      }
      const updated = await systemSettingsService.updateGoogleOAuth(payload)
      reset({
        clientId: updated?.hasClientId ? SECRET_PLACEHOLDER : '',
        clientSecret: updated?.hasClientSecret ? SECRET_PLACEHOLDER : '',
        scope: updated?.scope ?? DEFAULT_SCOPE,
      })
      toast.success('OAuth settings saved.')
    } catch (err) {
      toast.error(err?.message || 'Failed to save settings.')
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
        Configure single sign-on providers. Changes take effect immediately, no application restart
        required.
      </p>

      <Form onSubmit={handleSubmit(onSubmit)}>
        <h2 style={sectionTitleStyle}>GOOGLE</h2>
        <div className="admin-form-grid">
          <div className="admin-form-grid__full">
            <FormField
              label="Client ID"
              required
              placeholder="xxxxxxxx.apps.googleusercontent.com"
              registration={register('clientId')}
              error={errors.clientId?.message}
            />
          </div>
          <div className="admin-form-grid__full">
            <FormField
              label="Client Secret"
              type="password"
              autoComplete="new-password"
              placeholder={SECRET_PLACEHOLDER}
              registration={register('clientSecret')}
              error={errors.clientSecret?.message}
              helperText="Leave blank or keep ******** to retain the current value."
            />
          </div>
          <div className="admin-form-grid__full">
            <FormField
              label="Scope"
              placeholder={DEFAULT_SCOPE}
              registration={register('scope')}
              error={errors.scope?.message}
              helperText={`Default: ${DEFAULT_SCOPE}`}
            />
          </div>
        </div>

        <p style={{ fontSize: 13, color: '#64708a', lineHeight: 1.6, margin: '16px 0 0' }}>
          Create an OAuth Client ID in the Google Cloud Console. Set the Authorized redirect URI to:{' '}
          <code style={{ color: '#2768ee' }}>{redirectHint}</code>
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <Button type="submit" leftIcon={<Save size={16} />} loading={isSubmitting}>
            Save
          </Button>
        </div>
      </Form>
    </>
  )
}
