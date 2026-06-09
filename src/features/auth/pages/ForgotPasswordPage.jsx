import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, MailCheck } from 'lucide-react'
import { Form, FormField, Button, useToast } from '@/shared/components/ui'
import { authService } from '@/services'
import { forgotPasswordSchema } from '../schemas/auth-schemas'
import { AuthPage, AuthCard } from '../components/AuthCard'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [serverError, setServerError] = useState(null)
  const [submittedEmail, setSubmittedEmail] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onBlur',
  })

  async function onSubmit(values) {
    setServerError(null)
    try {
      await authService.forgotPassword(values.email)
      setSubmittedEmail(values.email)
      toast.success('Request sent. Please check your email.')
    } catch (error) {
      setServerError(error?.message || 'Could not send the request. Please try again.')
    }
  }

  if (submittedEmail) {
    return (
      <AuthPage>
        <AuthCard
          title="Check your email"
          subtitle={`We sent password reset instructions to ${submittedEmail} (if the account exists).`}
          alert={{ type: 'info', message: 'Remember to check your spam folder if you do not see the email.' }}
          footer={
            <>
              Already have a reset token?{' '}
              <Link to={`/reset-password?email=${encodeURIComponent(submittedEmail)}`}>Go to reset page</Link>
            </>
          }
        >
          <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 18px' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 64, height: 64, borderRadius: '50%', background: '#eff6ff', color: '#1d4ed8' }}>
              <MailCheck size={28} />
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="outline" fullWidth onClick={() => setSubmittedEmail(null)}>
              Resend
            </Button>
            <Button fullWidth onClick={() => navigate('/login')}>
              Back to sign in
            </Button>
          </div>
        </AuthCard>
      </AuthPage>
    )
  }

  return (
    <AuthPage>
      <AuthCard
        title="Forgot your password?"
        subtitle="Enter your email and we will send you instructions to reset your password."
        alert={serverError ? { type: 'error', message: serverError } : null}
        footer={
          <>
            Remembered your password? <Link to="/login">Sign in</Link>
          </>
        }
      >
        <Form onSubmit={handleSubmit(onSubmit)}>
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
          <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
            Send request
          </Button>
        </Form>
      </AuthCard>
    </AuthPage>
  )
}
