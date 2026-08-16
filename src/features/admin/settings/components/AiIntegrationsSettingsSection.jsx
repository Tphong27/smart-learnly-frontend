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
import {
  assignmentAiSettingsSchema,
  questionImageImportSettingsSchema,
} from '../schemas/settings-schemas'

const SECRET_PLACEHOLDER = '********'

/** Quản lý cấu hình AI dùng cho import câu hỏi và tạo assignment draft. */
export function AiIntegrationsSettingsSection() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const questionImportForm = useForm({
    resolver: zodResolver(questionImageImportSettingsSchema),
    defaultValues: {
      enabled: false,
      provider: 'gemini',
      apiKey: '',
      model: 'gemini-3.5-flash',
      timeoutSeconds: 45,
      maxFileSizeMb: 10,
      maxFiles: 5,
    },
    mode: 'onBlur',
  })

  const assignmentAiForm = useForm({
    resolver: zodResolver(assignmentAiSettingsSchema),
    defaultValues: {
      enabled: false,
      provider: 'gemini',
      apiKey: '',
      model: 'gemini-flash-latest',
      fallbackModel: 'gemini-flash-lite-latest',
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
        const [questionImageImport, assignmentAi] = await Promise.all([
          systemSettingsService.getQuestionImageImportSettings(),
          systemSettingsService.getAssignmentAiSettings(),
        ])
        if (cancelled) return

        questionImportForm.reset({
          enabled: Boolean(questionImageImport?.enabled),
          provider: questionImageImport?.provider ?? 'gemini',
          apiKey: questionImageImport?.hasApiKey ? SECRET_PLACEHOLDER : '',
          model: questionImageImport?.model ?? 'gemini-3.5-flash',
          timeoutSeconds: questionImageImport?.timeoutSeconds ?? 45,
          maxFileSizeMb: questionImageImport?.maxFileSizeMb ?? 10,
          maxFiles: questionImageImport?.maxFiles ?? 5,
        })

        assignmentAiForm.reset({
          enabled: Boolean(assignmentAi?.enabled),
          provider: assignmentAi?.provider ?? 'gemini',
          apiKey: assignmentAi?.hasApiKey ? SECRET_PLACEHOLDER : '',
          model: assignmentAi?.model ?? 'gemini-flash-latest',
          fallbackModel: assignmentAi?.fallbackModel ?? 'gemini-flash-lite-latest',
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
  }, [assignmentAiForm, questionImportForm, toast])

  /** Lưu cấu hình AI OCR/import câu hỏi từ hình ảnh. */
  async function submitQuestionImageImport(values) {
    try {
      const payload = {
        enabled: Boolean(values.enabled),
        provider: values.provider?.trim(),
        model: values.model?.trim(),
        timeoutSeconds: Number(values.timeoutSeconds),
        maxFileSizeMb: Number(values.maxFileSizeMb),
        maxFiles: Number(values.maxFiles),
      }
      if (values.apiKey !== SECRET_PLACEHOLDER) {
        payload.apiKey = values.apiKey || ''
      }
      const updated = await systemSettingsService.updateQuestionImageImportSettings(payload)
      questionImportForm.reset({
        enabled: Boolean(updated?.enabled),
        provider: updated?.provider ?? 'gemini',
        apiKey: updated?.hasApiKey ? SECRET_PLACEHOLDER : '',
        model: updated?.model ?? 'gemini-3.5-flash',
        timeoutSeconds: updated?.timeoutSeconds ?? 45,
        maxFileSizeMb: updated?.maxFileSizeMb ?? 10,
        maxFiles: updated?.maxFiles ?? 5,
      })
      toast.success('Question image import settings saved.')
    } catch (err) {
      toast.error(err?.message || 'Failed to save question image import settings.')
    }
  }

  /** Lưu cấu hình AI tạo bản nháp assignment. */
  async function submitAssignmentAi(values) {
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
      assignmentAiForm.reset({
        enabled: Boolean(updated?.enabled),
        provider: updated?.provider ?? 'gemini',
        apiKey: updated?.hasApiKey ? SECRET_PLACEHOLDER : '',
        model: updated?.model ?? 'gemini-flash-latest',
        fallbackModel: updated?.fallbackModel ?? 'gemini-flash-lite-latest',
        timeoutSeconds: updated?.timeoutSeconds ?? 60,
      })
      toast.success('Assignment AI settings saved.')
    } catch (err) {
      toast.error(err?.message || 'Failed to save Assignment AI settings.')
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
        Configure AI-powered question image import and assignment drafting. Changes take effect immediately without restarting the application.
      </p>

      <Form onSubmit={questionImportForm.handleSubmit(submitQuestionImageImport)}>
        <h2 className="admin-settings-section__title">Question image import</h2>
        <div className="admin-form-grid">
          <div className="admin-form-grid__full">
            <Checkbox
              className="admin-form-checkbox"
              label="Enable question image import"
              {...questionImportForm.register('enabled')}
            />
          </div>

          <FormField
            label="Provider"
            required
            placeholder="gemini"
            registration={questionImportForm.register('provider')}
            error={questionImportForm.formState.errors.provider?.message}
          />
          <FormField
            label="Model"
            required
            placeholder="gemini-3.5-flash"
            registration={questionImportForm.register('model')}
            error={questionImportForm.formState.errors.model?.message}
          />
          <div className="admin-form-grid__full">
            <FormField
              label="API Key"
              type="password"
              autoComplete="new-password"
              placeholder={SECRET_PLACEHOLDER}
              registration={questionImportForm.register('apiKey')}
              error={questionImportForm.formState.errors.apiKey?.message}
              helperText="Leave blank or keep ******** to retain the current value. Submit an empty field to clear the stored key."
            />
          </div>
          <FormField
            label="Timeout (seconds)"
            type="number"
            min="5"
            max="300"
            registration={questionImportForm.register('timeoutSeconds')}
            error={questionImportForm.formState.errors.timeoutSeconds?.message}
          />
          <FormField
            label="Max file size (MB)"
            type="number"
            min="1"
            max="50"
            registration={questionImportForm.register('maxFileSizeMb')}
            error={questionImportForm.formState.errors.maxFileSizeMb?.message}
          />
          <FormField
            label="Max files"
            type="number"
            min="1"
            max="20"
            registration={questionImportForm.register('maxFiles')}
            error={questionImportForm.formState.errors.maxFiles?.message}
          />
        </div>

        <FormActions>
          <Button
            type="submit"
            leftIcon={<Save size={16} />}
            loading={questionImportForm.formState.isSubmitting}
          >
            Save question import settings
          </Button>
        </FormActions>
      </Form>

      <hr className="admin-settings-divider" />

      <Form onSubmit={assignmentAiForm.handleSubmit(submitAssignmentAi)}>
        <h2 className="admin-settings-section__title">Assignment AI</h2>
        <div className="admin-form-grid">
          <div className="admin-form-grid__full">
            <Checkbox
              className="admin-form-checkbox"
              label="Enable assignment AI draft generation"
              {...assignmentAiForm.register('enabled')}
            />
          </div>

          <FormField
            label="Provider"
            required
            placeholder="gemini"
            registration={assignmentAiForm.register('provider')}
            error={assignmentAiForm.formState.errors.provider?.message}
          />
          <FormField
            label="Model"
            required
            placeholder="gemini-flash-latest"
            registration={assignmentAiForm.register('model')}
            error={assignmentAiForm.formState.errors.model?.message}
          />
          <FormField
            label="Fallback model"
            required
            placeholder="gemini-flash-lite-latest"
            registration={assignmentAiForm.register('fallbackModel')}
            error={assignmentAiForm.formState.errors.fallbackModel?.message}
          />
          <div className="admin-form-grid__full">
            <FormField
              label="API Key"
              type="password"
              autoComplete="new-password"
              placeholder={SECRET_PLACEHOLDER}
              registration={assignmentAiForm.register('apiKey')}
              error={assignmentAiForm.formState.errors.apiKey?.message}
              helperText="Leave blank or keep ******** to retain the current value. Submit an empty field to clear the stored key."
            />
          </div>
          <FormField
            label="Timeout (seconds)"
            type="number"
            min="5"
            max="300"
            registration={assignmentAiForm.register('timeoutSeconds')}
            error={assignmentAiForm.formState.errors.timeoutSeconds?.message}
          />
        </div>

        <FormActions>
          <Button
            type="submit"
            leftIcon={<Save size={16} />}
            loading={assignmentAiForm.formState.isSubmitting}
          >
            Save Assignment AI settings
          </Button>
        </FormActions>
      </Form>
    </>
  )
}
