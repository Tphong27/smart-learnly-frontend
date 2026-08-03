import { z } from 'zod'

const optionalEmail = z
  .string()
  .trim()
  .email('Must be a valid email address')
  .or(z.literal(''))
  .optional()

export const emailSettingsSchema = z.object({
  // Leave blank to keep the current API key.
  apiKey: z.string().max(500, 'API key must be at most 500 characters').optional(),
  fromName: z
    .string({ message: 'From Name is required' })
    .trim()
    .min(1, 'From Name is required')
    .max(150, 'From Name must be at most 150 characters'),
  fromEmail: z
    .string({ message: 'From Email is required' })
    .trim()
    .min(1, 'From Email is required')
    .email('From Email is not a valid email address'),
  replyTo: optionalEmail,
})

export const googleOAuthSchema = z.object({
  clientId: z
    .string({ message: 'Client ID is required' })
    .trim()
    .min(1, 'Client ID is required')
    .max(300, 'Client ID must be at most 300 characters'),
  // Leave blank to keep the current Client Secret.
  clientSecret: z.string().max(300, 'Client Secret must be at most 300 characters').optional(),
  scope: z.string().trim().max(300, 'Scope must be at most 300 characters').optional(),
})

export const googleMeetSettingsSchema = z.object({
  enabled: z.boolean(),
  refreshToken: z.string().max(1000, 'Refresh token must be at most 1000 characters').optional(),
})

export const sePayBankDisplaySettingsSchema = z.object({
  accountNumber: z
    .string({ message: 'Account number is required' })
    .trim()
    .min(1, 'Account number is required')
    .max(100, 'Account number must be at most 100 characters'),
  bankName: z
    .string({ message: 'Bank name is required' })
    .trim()
    .min(1, 'Bank name is required')
    .max(100, 'Bank name must be at most 100 characters'),
  accountName: z
    .string({ message: 'Account name is required' })
    .trim()
    .min(1, 'Account name is required')
    .max(150, 'Account name must be at most 150 characters'),
})

export const questionImageImportSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: z
    .string({ message: 'Provider is required' })
    .trim()
    .min(1, 'Provider is required')
    .max(100, 'Provider must be at most 100 characters'),
  apiKey: z.string().max(500, 'API key must be at most 500 characters').optional(),
  model: z
    .string({ message: 'Model is required' })
    .trim()
    .min(1, 'Model is required')
    .max(200, 'Model must be at most 200 characters'),
  timeoutSeconds: z.coerce.number().min(5, 'Timeout must be at least 5 seconds').max(300, 'Timeout must be at most 300 seconds'),
  maxFileSizeMb: z.coerce.number().min(1, 'Max file size must be at least 1 MB').max(50, 'Max file size must be at most 50 MB'),
  maxFiles: z.coerce.number().min(1, 'Max files must be at least 1').max(20, 'Max files must be at most 20'),
})

export const assignmentAiSettingsSchema = z.object({
  enabled: z.boolean(),
  provider: z
    .string({ message: 'Provider is required' })
    .trim()
    .min(1, 'Provider is required')
    .max(100, 'Provider must be at most 100 characters'),
  apiKey: z.string().max(500, 'API key must be at most 500 characters').optional(),
  model: z
    .string({ message: 'Model is required' })
    .trim()
    .min(1, 'Model is required')
    .max(200, 'Model must be at most 200 characters'),
  fallbackModel: z
    .string({ message: 'Fallback model is required' })
    .trim()
    .min(1, 'Fallback model is required')
    .max(200, 'Fallback model must be at most 200 characters'),
  timeoutSeconds: z.coerce.number().min(5, 'Timeout must be at least 5 seconds').max(300, 'Timeout must be at most 300 seconds'),
})
