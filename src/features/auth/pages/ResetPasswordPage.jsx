import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock } from 'lucide-react'
import { Button, Form, PasswordField, useToast } from '@/shared/components/ui'
import { authService } from '../services/authService'
import { resetPasswordSchema } from '../schemas/auth-schemas'
import { AuthPage, AuthCard } from '../components/AuthCard'
import { PasswordStrengthChecklist } from '../components/PasswordStrengthChecklist'

/** Đặt mật khẩu mới từ reset token và điều hướng về đăng nhập khi thành công. */
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const initialToken = searchParams.get('token') ?? ''
  const [serverError, setServerError] = useState(null)

  const {
    register,
    handleSubmit,
    setValue,
    control,
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

  const passwordValue = useWatch({ control, name: 'newPassword' }) ?? ''

  /** Gửi reset token cùng mật khẩu mới và hiển thị lỗi phục hồi khi thất bại. */
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
            <PasswordField
              label="New password"
              placeholder="At least 8 characters"
              required
              registration={register('newPassword')}
              error={errors.newPassword?.message}
              leftIcon={<Lock size={16} />}
              autoComplete="new-password"
            />
            <div style={{ marginTop: 12 }}>
              <PasswordStrengthChecklist value={passwordValue} />
            </div>
          </div>

          <PasswordField
            label="Confirm new password"
            placeholder="Re-enter your new password"
            required
            registration={register('confirmPassword')}
            error={errors.confirmPassword?.message}
            leftIcon={<Lock size={16} />}
            showLabel="Show password confirmation"
            hideLabel="Hide password confirmation"
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
