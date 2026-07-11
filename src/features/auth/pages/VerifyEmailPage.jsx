import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Mail, MailCheck } from 'lucide-react'
import { Form, FormField, Button, useToast } from '@/shared/components/ui'
import { authService } from '@/services'
import { verifyEmailSchema } from '../schemas/auth-schemas'
import { AuthPage, AuthCard } from '../components/AuthCard'

const RESEND_COOLDOWN_SECONDS = 60

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const emailFromQuery = searchParams.get('email') ?? ''

  const [serverError, setServerError] = useState(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { email: emailFromQuery, otpCode: '' },
    mode: 'onBlur',
  })

  useEffect(() => {
    if (resendCooldown <= 0) return undefined
    const timer = window.setInterval(() => {
      setResendCooldown((value) => (value > 0 ? value - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldown])

  async function onSubmit(values) {
    setServerError(null)
    try {
      await authService.verifyEmail({ email: values.email, otpCode: values.otpCode })
      toast.success('Email verified successfully. Please sign in.')
      navigate('/login', { replace: true })
    } catch (error) {
      setServerError(error?.message || 'Verification code is invalid or has expired.')
    }
  }

  async function handleResend() {
    const email = (getValues('email') || emailFromQuery || '').trim()
    if (!email) {
      setServerError('Please enter your email first.')
      return
    }
    if (resendCooldown > 0) return

    setResendLoading(true)
    setServerError(null)
    try {
      await authService.resendVerification(email)
      toast.success('Verification code resent. Please check your email.')
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (error) {
      setServerError(error?.message || 'Could not resend the code. Try again later.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <AuthPage>
      <AuthCard
        icon={<MailCheck size={24} strokeWidth={2.2} />}
        title="Verify your email"
        subtitle={
          emailFromQuery
            ? `We sent a 6-digit code to ${emailFromQuery}.`
            : 'Enter your email and the 6-digit code we sent you.'
        }
        alert={serverError ? { type: 'error', message: serverError } : null}
        footer={
          <>
            Wrong email? <Link to="/register">Sign up again</Link>
          </>
        }
      >
        <Form onSubmit={handleSubmit(onSubmit)}>
          {emailFromQuery ? (
            <input type="hidden" {...register('email')} />
          ) : (
            <FormField
              label="Email"
              type="email"
              placeholder="you@example.com"
              required
              registration={register('email')}
              error={errors.email?.message}
              leftIcon={<Mail size={16} />}
              autoComplete="email"
            />
          )}

          <FormField
            label="6-digit verification code"
            placeholder="123456"
            inputMode="numeric"
            maxLength={6}
            required
            registration={register('otpCode')}
            error={errors.otpCode?.message}
            leftIcon={<KeyRound size={16} />}
            autoComplete="one-time-code"
          />

          <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
            Verify
          </Button>

          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={handleResend}
            disabled={resendCooldown > 0}
            loading={resendLoading}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </Button>
        </Form>
      </AuthCard>
    </AuthPage>
  )
}
