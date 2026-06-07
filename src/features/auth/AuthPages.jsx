import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Button, Form, FormField } from '@/shared/components/ui'
import { useToast } from '@/shared/components/ui/Toast'
import { applyFieldErrors } from '@/shared/api/httpClient'
import { authService } from './authService'
import { useAuthStore } from './authStore'
import { GoogleLoginButton } from './GoogleLoginButton'
import {
  changePasswordSchema, forgotPasswordSchema, loginSchema, profileSchema,
  registerSchema, resetPasswordSchema,
} from './validation'
import './auth.css'

function AuthCard({ title, description, children, footer }) {
  return <main className="auth-page"><section className="auth-card">
    <Link className="auth-brand" to="/">Smart Learnly</Link>
    <h1>{title}</h1>
    {description && <p className="auth-description">{description}</p>}
    {children}
    {footer && <div className="auth-footer">{footer}</div>}
  </section></main>
}

const ErrorBanner = ({ message }) => message ? <div className="auth-alert auth-alert--error" role="alert">{message}</div> : null
const SuccessBanner = ({ message }) => message ? <div className="auth-alert auth-alert--success" role="status">{message}</div> : null
const useApiForm = (schema, defaultValues) => useForm({ resolver: zodResolver(schema), defaultValues })

export function LoginPage() {
  const login = useAuthStore((state) => state.login)
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle)
  const navigate = useNavigate()
  const location = useLocation()
  const [apiError, setApiError] = useState('')
  const form = useApiForm(loginSchema, { email: '', password: '' })
  const submit = form.handleSubmit(async (values) => {
    setApiError('')
    try {
      await login(values)
      navigate(location.state?.from ?? '/app', { replace: true })
    } catch (error) {
      applyFieldErrors(error, form.setError)
      setApiError(error.message)
    }
  })
  const submitGoogle = async (credential) => {
    setApiError('')
    try {
      await loginWithGoogle(credential)
      navigate(location.state?.from ?? '/app', { replace: true })
    } catch (error) {
      setApiError(error.message)
    }
  }
  return <AuthCard title="Đăng nhập" description="Tiếp tục hành trình học tập của bạn." footer={<>Chưa có tài khoản? <Link to="/register">Đăng ký</Link></>}>
    <ErrorBanner message={apiError} />
    <Form onSubmit={submit}>
      <FormField label="Email" type="email" autoComplete="email" required error={form.formState.errors.email} registration={form.register('email')} />
      <FormField label="Mật khẩu" type="password" autoComplete="current-password" required error={form.formState.errors.password} registration={form.register('password')} />
      <Link className="auth-inline-link" to="/forgot-password">Quên mật khẩu?</Link>
      <Button type="submit" fullWidth loading={form.formState.isSubmitting}>Đăng nhập</Button>
    </Form>
    <div className="auth-divider"><span>hoặc</span></div>
    <GoogleLoginButton onCredential={submitGoogle} onError={setApiError} />
  </AuthCard>
}

export function RegisterPage() {
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState('')
  const form = useApiForm(registerSchema, { fullName: '', email: '', password: '', confirmPassword: '' })
  const submit = form.handleSubmit(async (values) => {
    setApiError('')
    try {
      const response = await authService.register(values)
      setSuccess(response.message)
    } catch (error) {
      applyFieldErrors(error, form.setError)
      setApiError(error.message)
    }
  })
  return <AuthCard title="Tạo tài khoản" description="Đăng ký tài khoản học viên Smart Learnly." footer={<>Đã có tài khoản? <Link to="/login">Đăng nhập</Link></>}>
    <SuccessBanner message={success} /><ErrorBanner message={apiError} />
    <Form onSubmit={submit}>
      <FormField label="Họ và tên" required error={form.formState.errors.fullName} registration={form.register('fullName')} />
      <FormField label="Email" type="email" required error={form.formState.errors.email} registration={form.register('email')} />
      <FormField label="Mật khẩu" type="password" required helperText="Ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt." error={form.formState.errors.password} registration={form.register('password')} />
      <FormField label="Xác nhận mật khẩu" type="password" required error={form.formState.errors.confirmPassword} registration={form.register('confirmPassword')} />
      <Button type="submit" fullWidth loading={form.formState.isSubmitting}>Đăng ký</Button>
    </Form>
  </AuthCard>
}

export function ForgotPasswordPage() {
  const [message, setMessage] = useState('')
  const [apiError, setApiError] = useState('')
  const form = useApiForm(forgotPasswordSchema, { email: '' })
  const submit = form.handleSubmit(async (values) => {
    setApiError('')
    try { setMessage((await authService.forgotPassword(values)).message) }
    catch (error) { applyFieldErrors(error, form.setError); setApiError(error.message) }
  })
  return <AuthCard title="Quên mật khẩu" description="Nhập email để nhận đường link đặt lại mật khẩu." footer={<Link to="/login">Quay lại đăng nhập</Link>}>
    <SuccessBanner message={message} /><ErrorBanner message={apiError} />
    <Form onSubmit={submit}>
      <FormField label="Email" type="email" required error={form.formState.errors.email} registration={form.register('email')} />
      <Button type="submit" fullWidth loading={form.formState.isSubmitting}>Gửi đường link</Button>
    </Form>
  </AuthCard>
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [message, setMessage] = useState('')
  const [apiError, setApiError] = useState(token ? '' : 'Đường link đặt lại mật khẩu không hợp lệ.')
  const form = useApiForm(resetPasswordSchema, { newPassword: '', confirmPassword: '' })
  const submit = form.handleSubmit(async (values) => {
    setApiError('')
    try { setMessage((await authService.resetPassword({ token, ...values })).message) }
    catch (error) { applyFieldErrors(error, form.setError); setApiError(error.message) }
  })
  return <AuthCard title="Đặt lại mật khẩu" footer={<Link to="/login">Quay lại đăng nhập</Link>}>
    <SuccessBanner message={message} /><ErrorBanner message={apiError} />
    {!message && token && <Form onSubmit={submit}>
      <FormField label="Mật khẩu mới" type="password" required error={form.formState.errors.newPassword} registration={form.register('newPassword')} />
      <FormField label="Xác nhận mật khẩu" type="password" required error={form.formState.errors.confirmPassword} registration={form.register('confirmPassword')} />
      <Button type="submit" fullWidth loading={form.formState.isSubmitting}>Đổi mật khẩu</Button>
    </Form>}
  </AuthCard>
}

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState({ loading: Boolean(token), message: '', error: token ? '' : 'Đường link xác thực không hợp lệ.' })
  useEffect(() => {
    if (!token) return
    authService.verifyEmail(token)
      .then((response) => setState({ loading: false, message: response.message, error: '' }))
      .catch((error) => setState({ loading: false, message: '', error: error.message }))
  }, [token])
  return <AuthCard title="Xác thực email" footer={<Link to="/login">Đi đến đăng nhập</Link>}>
    {state.loading && <div className="auth-status">Đang xác thực email...</div>}
    <SuccessBanner message={state.message} /><ErrorBanner message={state.error} />
  </AuthCard>
}

export function AppLandingPage() {
  const user = useAuthStore((state) => state.user)
  return <section className="account-panel"><p className="account-eyebrow">Không gian học tập</p>
    <h1>Xin chào, {user?.fullName}</h1>
    <p>Phiên đăng nhập của bạn đã được thiết lập. Dashboard nghiệp vụ nằm ngoài phạm vi Sprint 1.</p>
  </section>
}

export function ProfilePage() {
  const currentUser = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const toast = useToast()
  const [apiError, setApiError] = useState('')
  const form = useApiForm(profileSchema, {
    fullName: currentUser?.fullName ?? '', avatarUrl: currentUser?.avatarUrl ?? '',
    phoneNumber: currentUser?.phoneNumber ?? '', bio: currentUser?.bio ?? '',
  })
  const submit = form.handleSubmit(async (values) => {
    setApiError('')
    try { const response = await authService.updateProfile(values); setUser(response.data); toast.success(response.message) }
    catch (error) { applyFieldErrors(error, form.setError); setApiError(error.message) }
  })
  return <section className="account-panel"><h1>Thông tin cá nhân</h1><ErrorBanner message={apiError} />
    <Form onSubmit={submit}>
      <FormField label="Email" disabled value={currentUser?.email ?? ''} />
      <FormField label="Vai trò" disabled value={currentUser?.role ?? ''} />
      <FormField label="Họ và tên" required error={form.formState.errors.fullName} registration={form.register('fullName')} />
      <FormField label="Avatar URL" error={form.formState.errors.avatarUrl} registration={form.register('avatarUrl')} />
      <FormField label="Số điện thoại" error={form.formState.errors.phoneNumber} registration={form.register('phoneNumber')} />
      <label className="auth-textarea-label">Giới thiệu<textarea className="auth-textarea" {...form.register('bio')} /></label>
      {form.formState.errors.bio && <p className="input-field__error">{form.formState.errors.bio.message}</p>}
      <Button type="submit" loading={form.formState.isSubmitting}>Lưu thay đổi</Button>
    </Form>
  </section>
}

export function ChangePasswordPage() {
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()
  const [apiError, setApiError] = useState('')
  const form = useApiForm(changePasswordSchema, { currentPassword: '', newPassword: '', confirmPassword: '' })
  const submit = form.handleSubmit(async (values) => {
    setApiError('')
    try { await authService.changePassword(values); await logout(); navigate('/login', { replace: true }) }
    catch (error) { applyFieldErrors(error, form.setError); setApiError(error.message) }
  })
  return <section className="account-panel"><h1>Đổi mật khẩu</h1><ErrorBanner message={apiError} />
    <Form onSubmit={submit}>
      <FormField label="Mật khẩu hiện tại" type="password" required error={form.formState.errors.currentPassword} registration={form.register('currentPassword')} />
      <FormField label="Mật khẩu mới" type="password" required error={form.formState.errors.newPassword} registration={form.register('newPassword')} />
      <FormField label="Xác nhận mật khẩu" type="password" required error={form.formState.errors.confirmPassword} registration={form.register('confirmPassword')} />
      <Button type="submit" loading={form.formState.isSubmitting}>Đổi mật khẩu</Button>
    </Form>
  </section>
}
