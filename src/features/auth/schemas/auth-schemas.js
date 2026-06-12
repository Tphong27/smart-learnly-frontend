import { z } from 'zod'

export const passwordRules = {
  minLength: 8,
  hasLower: /[a-z]/,
  hasUpper: /[A-Z]/,
  hasDigit: /\d/,
  hasSpecial: /[^A-Za-z0-9]/,
}

export const passwordSchema = z
  .string({ message: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must not exceed 100 characters')
  .regex(passwordRules.hasLower, 'Must contain a lowercase letter')
  .regex(passwordRules.hasUpper, 'Must contain an uppercase letter')
  .regex(passwordRules.hasDigit, 'Must contain a digit')
  .regex(passwordRules.hasSpecial, 'Must contain a special character')

export const emailSchema = z
  .string({ message: 'Email is required' })
  .min(1, 'Email is required')
  .email('Email is invalid')
  .max(255, 'Email is too long')

export const registerSchema = z
  .object({
    fullName: z
      .string({ message: 'Full name is required' })
      .trim()
      .min(1, 'Full name is required')
      .max(150, 'Full name must not exceed 150 characters'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string({ message: 'Password confirmation is required' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ message: 'Password is required' }).min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z
  .object({
    token: z.string({ message: 'Reset token is required' }).min(1, 'Reset token is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string({ message: 'Password confirmation is required' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })

export const verifyEmailSchema = z.object({
  email: emailSchema,
  otpCode: z
    .string({ message: 'Verification code is required' })
    .trim()
    .regex(/^\d{6}$/, 'Verification code must be exactly 6 digits'),
})

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(150, 'Full name must not exceed 150 characters'),
  avatarUrl: z
    .string()
    .trim()
    .max(2048, 'Avatar URL is too long')
    .url('Avatar URL is invalid')
    .or(z.literal(''))
    .optional(),
  phoneNumber: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{9,15}$/, 'Phone number must contain 9 to 15 digits')
    .or(z.literal(''))
    .optional(),
  bio: z
    .string()
    .max(1000, 'Bio must not exceed 1000 characters')
    .or(z.literal(''))
    .optional(),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ message: 'Current password is required' }).min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string({ message: 'Password confirmation is required' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
