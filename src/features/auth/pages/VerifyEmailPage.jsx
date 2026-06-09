import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, MailCheck, RefreshCw } from 'lucide-react'
import { Form, FormField, Button, useToast } from '@/shared/components/ui'
import { authService } from '@/services'
import { verifyEmailSchema } from '../schemas/auth-schemas'
import { AuthPage, AuthCard } from '../components/AuthCard'

const RESEND_COOLDOWN_SECONDS = 60

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const initialToken = searchParams.get('token') ?? ''

  const [serverError, setServerError] = useState(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [autoVerifyState, setAutoVerifyState] = useState(initialToken ? 'pending' : 'idle')
  const autoVerifiedRef = useRef(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { token: initialToken },
    mode: 'onBlur',
  })

  useEffect(() => {
    if (resendCooldown <= 0) return undefined
    const timer = window.setInterval(() => {
      setResendCooldown((value) => (value > 0 ? value - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldown])

  useEffect(() => {
    if (!initialToken || autoVerifiedRef.current) return
    autoVerifiedRef.current = true

    let cancelled = false
    ;(async () => {
      setAutoVerifyState('pending')
      try {
        await authService.verifyEmail(initialToken)
        if (cancelled) return
        toast.success('Email verified successfully. Please sign in.')
        navigate('/login', { replace: true })
      } catch (error) {
        if (cancelled) return
        setAutoVerifyState('failed')
        setServerError(error?.message || 'Token is invalid or has expired.')
        setValue('token', initialToken)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [initialToken, navigate, toast, setValue])

  async function onSubmit(values) {
    setServerError(null)
    try {
      await authService.verifyEmail(values.token)
      toast.success('Email verified successfully. Please sign in.')
      navigate('/login', { replace: true })
    } catch (error) {
      setServerError(error?.message || 'Token is invalid or has expired.')
    }
  }

  async function handleResend() {
    if (!email) {
      setServerError('Email is missing. Please go back to the registration page.')
      return
    }
    if (resendCooldown > 0) return

    setResendLoading(true)
    setServerError(null)
    try {
      await authService.resendVerification(email)
      toast.success('Verification token resent. Please check your email.')
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (error) {
      setServerError(error?.message || 'Could not resend the token. Try again later.')
    } finally {
      setResendLoading(false)
    }
  }

  if (autoVerifyState === 'pending') {
    return (
      <AuthPage>
        <AuthCard title="Verifying your email..." subtitle="Please wait a moment.">
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <RefreshCw size={32} className="spin" style={{ color: '#2768ee' }} />
          </div>
          <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </AuthCard>
      </AuthPage>
    )
  }

  return (
    <AuthPage>
      <AuthCard
        title="Verify your email"
        subtitle={
          email
            ? `We sent a verification token to ${email}. Paste it into the field below.`
            : 'Paste the verification token from your email below.'
        }
        alert={serverError ? { type: 'error', message: serverError } : null}
        footer={
          <>
            Wrong email?{' '}
            <Link to="/register">Sign up again</Link>
          </>
        }
      >
        <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 14px' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 56, height: 56, borderRadius: '50%', background: '#eff6ff', color: '#1d4ed8' }}>
            <MailCheck size={26} />
          </span>
        </div>

        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormField
            label="Verification token"
            placeholder="Paste the token from your email"
            required
            registration={register('token')}
            error={errors.token?.message}
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
            disabled={resendCooldown > 0 || !email}
            loading={resendLoading}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend token'}
          </Button>
        </Form>
      </AuthCard>
    </AuthPage>
  )
}
