import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Form, FormField, Button, useToast } from '@/shared/components/ui'
import { authService } from '@/services'
import { resetPasswordSchema } from '../schemas/auth-schemas'
import { AuthPage, AuthCard } from '../components/AuthCard'
import { PasswordStrengthChecklist } from '../components/PasswordStrengthChecklist'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const initialToken = searchParams.get('token') ?? ''
  const [serverError, setServerError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: initialToken,
      newPassword: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  })

  useEffect(() => {
    if (initialToken) {
      setValue('token', initialToken)
    }
  }, [initialToken, setValue])

  const passwordValue = watch('newPassword') ?? ''

  async function onSubmit(values) {
    setServerError(null)
    try {
      await authService.resetPassword(values)
      toast.success('Password reset successful. Please sign in.')
      navigate('/login', { replace: true })
    } catch (error) {
      setServerError(error?.message || 'Reset password failed. Please try again.')
    }
  }

  if (!initialToken) {
    return (
      <AuthPage>
        <AuthCard
          title="Invalid reset link"
          subtitle="The reset link is missing or invalid. Please request a new password reset email."
          alert={{ type: 'error', message: 'Reset token not found in URL.' }}
          footer={
            <>
              <Link to="/forgot-password">Request a new link</Link> or back to{' '}
              <Link to="/login">sign in</Link>
            </>
          }
        >
          <Button fullWidth size="lg" onClick={() => navigate('/forgot-password')}>
            Request new reset link
          </Button>
        </AuthCard>
      </AuthPage>
    )
  }

  return (
    <AuthPage>
      <AuthCard
        title="Reset your password"
        subtitle="Enter your new password below."
        alert={serverError ? { type: 'error', message: serverError } : null}
        footer={
          <>
            Back to <Link to="/login">sign in</Link>
          </>
        }
      >
        <Form onSubmit={handleSubmit(onSubmit)}>
          <input type="hidden" {...register('token')} />

          <div>
            <FormField
              label="New password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              required
              registration={register('newPassword')}
              error={errors.newPassword?.message}
              leftIcon={<Lock size={16} />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="auth-toggle-eye"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              autoComplete="new-password"
            />
            <div style={{ marginTop: 12 }}>
              <PasswordStrengthChecklist value={passwordValue} />
            </div>
          </div>

          <FormField
            label="Confirm new password"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Re-enter your new password"
            required
            registration={register('confirmPassword')}
            error={errors.confirmPassword?.message}
            leftIcon={<Lock size={16} />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                className="auth-toggle-eye"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            autoComplete="new-password"
          />

          <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
            Reset password
          </Button>
        </Form>
      </AuthCard>
    </AuthPage>
  )
}
