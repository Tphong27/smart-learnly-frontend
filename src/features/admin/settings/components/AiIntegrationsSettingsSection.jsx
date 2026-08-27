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
import { assignmentAiSettingsSchema } from '../schemas/settings-schemas'

const SECRET_PLACEHOLDER = '********'

/** Cấu hình AI model dùng chung cho assignment, question, flashcard và video. */
export function AiIntegrationsSettingsSection() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const form = useForm({
    resolver: zodResolver(assignmentAiSettingsSchema),
    defaultValues: {
      enabled: false,
      provider: 'gemini',
      apiKey: '',
      model: 'gemini-2.5-flash',
      fallbackModel: 'gemini-3.5-flash-lite',
      timeoutSeconds: 60,
    },
    mode: 'onBlur',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const assignmentAi = await systemSettingsService.getAssignmentAiSettings()
        if (cancelled) return

        form.reset({
          enabled: Boolean(assignmentAi?.enabled),
          provider: assignmentAi?.provider ?? 'gemini',
          apiKey: assignmentAi?.hasApiKey ? SECRET_PLACEHOLDER : '',
          model: assignmentAi?.model ?? 'gemini-2.5-flash',
          fallbackModel: assignmentAi?.fallbackModel ?? 'gemini-3.5-flash-lite',
          timeoutSeconds: assignmentAi?.timeoutSeconds ?? 60,
        })
      } catch (err) {
        if (cancelled) return
        const message = err?.message || 'Could not load AI settings.'
        setLoadError(message)
        toast.error(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [form, toast])

  /** Lưu cấu hình AI model dùng chung. */
  async function submitAiModel(values) {
    try {
      const payload = {
        enabled: Boolean(values.enabled),
        provider: values.provider?.trim(),
        model: values.model?.trim(),
        fallbackModel: values.fallbackModel?.trim(),
        timeoutSeconds: Number(values.timeoutSeconds),
      }
      if (values.apiKey !== SECRET_PLACEHOLDER) {
        payload.apiKey = values.apiKey || ''
      }
      const updated = await systemSettingsService.updateAssignmentAiSettings(payload)
      form.reset({
        enabled: Boolean(updated?.enabled),
        provider: updated?.provider ?? 'gemini',
        apiKey: updated?.hasApiKey ? SECRET_PLACEHOLDER : '',
        model: updated?.model ?? 'gemini-2.5-flash',
        fallbackModel: updated?.fallbackModel ?? 'gemini-3.5-flash-lite',
        timeoutSeconds: updated?.timeoutSeconds ?? 60,
      })
      toast.success('AI model settings saved.')
    } catch (err) {
      toast.error(err?.message || 'Failed to save AI model settings.')
    }
  }

  if (loading) {
    return <LoadingState label="Loading AI settings..." />
  }
  if (loadError) {
    return <ErrorState title="Could not load AI settings" description={loadError} />
  }

  return (
    <>
      <p className="admin-settings-section__lead">
        Configure the shared AI model used for assignment draft, question draft,
        flashcard generation, and video summary. Changes take effect immediately
        without restarting the application.
      </p>

      <Form onSubmit={form.handleSubmit(submitAiModel)}>
        <h2 className="admin-settings-section__title">AI model</h2>
        <div className="admin-form-grid">
          <div className="admin-form-grid__full">
            <Checkbox
              className="admin-form-checkbox"
              label="Enable AI features"
              {...form.register('enabled')}
            />
          </div>

          <FormField
            label="Provider"
            required
            placeholder="gemini"
            registration={form.register('provider')}
            error={form.formState.errors.provider?.message}
          />
          <FormField
            label="Model"
            required
            placeholder="gemini-2.5-flash"
            registration={form.register('model')}
            error={form.formState.errors.model?.message}
          />
          <FormField
            label="Fallback model"
            required
            placeholder="gemini-3.5-flash-lite"
            registration={form.register('fallbackModel')}
            error={form.formState.errors.fallbackModel?.message}
          />
          <div className="admin-form-grid__full">
            <FormField
              label="API Key"
              type="password"
              autoComplete="new-password"
              placeholder={SECRET_PLACEHOLDER}
              registration={form.register('apiKey')}
              error={form.formState.errors.apiKey?.message}
              helperText="Leave blank or keep ******** to retain the current value. Submit an empty field to clear the stored key."
            />
          </div>
          <FormField
            label="Timeout (seconds)"
            type="number"
            min="5"
            max="300"
            registration={form.register('timeoutSeconds')}
            error={form.formState.errors.timeoutSeconds?.message}
          />
        </div>

        <FormActions>
          <Button
            type="submit"
            leftIcon={<Save size={16} />}
            loading={form.formState.isSubmitting}
          >
            Save AI model settings
          </Button>
        </FormActions>
      </Form>
    </>
  )
}
