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
