import { describe, expect, it } from 'vitest'
import { registerSchema, resetPasswordSchema } from './validation'

describe('auth validation', () => {
  it('accepts a valid registration payload', () => {
    const result = registerSchema.safeParse({
      fullName: 'Nguyen Van A',
      email: 'learner@example.com',
      password: 'Strong@123',
      confirmPassword: 'Strong@123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects mismatched reset passwords', () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: 'Strong@123',
      confirmPassword: 'Different@123',
    })
    expect(result.success).toBe(false)
    expect(result.error.issues[0].path).toEqual(['confirmPassword'])
  })
})
