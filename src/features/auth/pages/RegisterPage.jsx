import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Mail, User, Lock } from 'lucide-react'
import { Form, FormField, Button, useToast } from '@/shared/components/ui'
import { authService } from '@/services'
import { registerSchema } from '../schemas/auth-schemas'
import { AuthPage, AuthCard } from '../components/AuthCard'
import { PasswordStrengthChecklist } from '../components/PasswordStrengthChecklist'

export function RegisterPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [serverError, setServerError] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onBlur',
  })

  const passwordValue = watch('password') ?? ''

  async function onSubmit(values) {
    setServerError(null)
    try {
      await authService.register(values)
      toast.success('Registration successful. Please check your email to verify your account.')
      navigate(`/verify-email?email=${encodeURIComponent(values.email)}`)
    } catch (error) {
      const message = error?.message || 'Registration failed. Please try again.'
      setServerError(message)
    }
  }

  return (
    <AuthPage>
      <AuthCard
        title="Create your account"
        subtitle="Join Smart Learnly to start your personalized learning journey."
        alert={serverError ? { type: 'error', message: serverError } : null}
        footer={
          <>
            Already have an account? <Link to="/login">Sign in</Link>
          </>
        }
      >
        <Form onSubmit={handleSubmit(onSubmit)}>
          <FormField
            label="Full name"
            placeholder="Jane Doe"
            required
            registration={register('fullName')}
            error={errors.fullName?.message}
            leftIcon={<User size={16} />}
            autoComplete="name"
          />

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

          <div>
            <FormField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              required
              registration={register('password')}
              error={errors.password?.message}
              leftIcon={<Lock size={16} />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'inherit', display: 'inline-flex' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              autoComplete="new-password"
            />
            <div style={{ marginTop: 10 }}>
              <PasswordStrengthChecklist value={passwordValue} />
            </div>
          </div>

          <FormField
            label="Confirm password"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Re-enter your password"
            required
            registration={register('confirmPassword')}
            error={errors.confirmPassword?.message}
            leftIcon={<Lock size={16} />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'inherit', display: 'inline-flex' }}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            autoComplete="new-password"
          />

          <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
            Sign up
          </Button>
        </Form>
      </AuthCard>
    </AuthPage>
  )
}
