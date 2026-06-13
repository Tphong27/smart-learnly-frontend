import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Image as ImageIcon, Lock, Phone, User } from 'lucide-react'
import { Form, FormField, Button, useToast } from '@/shared/components/ui'
import { authService } from '@/services'
import { setAuthSession, getCurrentUser } from '@/services/api-client'
import { profileSchema, changePasswordSchema } from '../schemas/auth-schemas'
import { PasswordStrengthChecklist } from '../components/PasswordStrengthChecklist'
import './ProfilePage.css'

const TABS = {
  INFO: 'info',
  PASSWORD: 'password',
}

function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '?'
}

function ProfileInfoForm({ profile, onSaved }) {
  const toast = useToast()
  const [serverError, setServerError] = useState(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.fullName ?? '',
      avatarUrl: profile?.avatarUrl ?? '',
      phoneNumber: profile?.phoneNumber ?? '',
      bio: profile?.bio ?? '',
    },
    mode: 'onBlur',
  })

  useEffect(() => {
    reset({
      fullName: profile?.fullName ?? '',
      avatarUrl: profile?.avatarUrl ?? '',
      phoneNumber: profile?.phoneNumber ?? '',
      bio: profile?.bio ?? '',
    })
  }, [profile, reset])

  async function onSubmit(values) {
    setServerError(null)
    try {
      const payload = {
        fullName: values.fullName?.trim(),
        avatarUrl: values.avatarUrl?.trim() || null,
        phoneNumber: values.phoneNumber?.trim() || null,
        bio: values.bio?.trim() || null,
      }
      const updated = await authService.updateProfile(payload)
      const user = getCurrentUser()
      setAuthSession({
        accessToken: undefined,
        user: { ...(user ?? {}), ...updated },
      })
      onSaved(updated)
      toast.success('Profile updated successfully.')
    } catch (error) {
      setServerError(error?.message || 'Update failed. Please try again.')
    }
  }

  return (
    <div className="profile-card">
      <h2 className="profile-card__title">Personal information</h2>
      <p className="profile-card__subtitle">Update your display name, avatar and contact details.</p>

      {serverError && (
        <div className="auth-card__alert" style={{ marginBottom: 16 }}>{serverError}</div>
      )}

      <Form onSubmit={handleSubmit(onSubmit)}>
        <FormField
          label="Full name"
          required
          registration={register('fullName')}
          error={errors.fullName?.message}
          leftIcon={<User size={16} />}
          autoComplete="name"
        />

        <FormField
          label="Avatar URL"
          placeholder="https://..."
          registration={register('avatarUrl')}
          error={errors.avatarUrl?.message}
          leftIcon={<ImageIcon size={16} />}
          helperText="Paste a public image URL. File upload support will be added later."
        />

        <FormField
          label="Phone number"
          placeholder="+1..."
          registration={register('phoneNumber')}
          error={errors.phoneNumber?.message}
          leftIcon={<Phone size={16} />}
          autoComplete="tel"
        />

        <div className="input-field">
          <label className="input-field__label" htmlFor="profile-bio">Bio</label>
          <textarea
            id="profile-bio"
            className={['profile-textarea', errors.bio ? 'profile-textarea--error' : ''].filter(Boolean).join(' ')}
            maxLength={1000}
            rows={4}
            {...register('bio')}
          />
          {errors.bio && <p className="input-field__error">{errors.bio.message}</p>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button type="button" variant="ghost" onClick={() => reset()}>
            Reset
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </Form>
    </div>
  )
}

function ChangePasswordForm() {
  const toast = useToast()
  const [serverError, setServerError] = useState(null)
  const [show, setShow] = useState({ cur: false, next: false, conf: false })

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onBlur',
  })

  const newPasswordValue = watch('newPassword') ?? ''

  async function onSubmit(values) {
    setServerError(null)
    try {
      await authService.changePassword(values)
      toast.success('Password changed successfully.')
      reset()
    } catch (error) {
      setServerError(error?.message || 'Could not change password.')
    }
  }

  const togglerStyle = {
    background: 'transparent', border: 0, cursor: 'pointer', color: 'inherit', display: 'inline-flex',
  }

  return (
    <div className="profile-card">
      <h2 className="profile-card__title">Change password</h2>
      <p className="profile-card__subtitle">For security, choose a strong password and never share it.</p>

      {serverError && (
        <div className="auth-card__alert" style={{ marginBottom: 16 }}>{serverError}</div>
      )}

      <Form onSubmit={handleSubmit(onSubmit)}>
        <FormField
          label="Current password"
          type={show.cur ? 'text' : 'password'}
          required
          registration={register('currentPassword')}
          error={errors.currentPassword?.message}
          leftIcon={<Lock size={16} />}
          rightIcon={
            <button type="button" style={togglerStyle} onClick={() => setShow((s) => ({ ...s, cur: !s.cur }))} aria-label="Toggle">
              {show.cur ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          autoComplete="current-password"
        />

        <div>
          <FormField
            label="New password"
            type={show.next ? 'text' : 'password'}
            required
            registration={register('newPassword')}
            error={errors.newPassword?.message}
            leftIcon={<Lock size={16} />}
            rightIcon={
              <button type="button" style={togglerStyle} onClick={() => setShow((s) => ({ ...s, next: !s.next }))} aria-label="Toggle">
                {show.next ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            autoComplete="new-password"
          />
          <div style={{ marginTop: 10 }}>
            <PasswordStrengthChecklist value={newPasswordValue} />
          </div>
        </div>

        <FormField
          label="Confirm new password"
          type={show.conf ? 'text' : 'password'}
          required
          registration={register('confirmPassword')}
          error={errors.confirmPassword?.message}
          leftIcon={<Lock size={16} />}
          rightIcon={
            <button type="button" style={togglerStyle} onClick={() => setShow((s) => ({ ...s, conf: !s.conf }))} aria-label="Toggle">
              {show.conf ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          autoComplete="new-password"
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" loading={isSubmitting}>Update password</Button>
        </div>
      </Form>
    </div>
  )
}

export function ProfilePage() {
  const toast = useToast()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState(TABS.INFO)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await authService.getProfile()
        if (cancelled) return
        setProfile(data)
        const user = getCurrentUser()
        setAuthSession({ accessToken: undefined, user: { ...(user ?? {}), ...data } })
      } catch (e) {
        if (cancelled) return
        setError(e?.message || 'Could not load your profile.')
        toast.error(e?.message || 'Could not load your profile.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [toast])

  const initials = useMemo(() => getInitials(profile?.fullName), [profile?.fullName])

  if (loading) {
    return <div className="profile-loading">Loading your profile...</div>
  }

  if (error && !profile) {
    return (
      <div className="profile-card">
        <h2 className="profile-card__title">Could not load profile</h2>
        <p className="profile-card__subtitle">{error}</p>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <header className="profile-page__header">
        {profile?.avatarUrl ? (
          <img className="profile-page__avatar" src={profile.avatarUrl} alt="avatar" />
        ) : (
          <div className="profile-page__avatar-fallback">{initials}</div>
        )}
        <div>
          <h1 className="profile-page__name">{profile?.fullName || 'User'}</h1>
          <p className="profile-page__email">{profile?.email}</p>
          {profile?.role && <span className="profile-page__role-badge">{profile.role}</span>}
        </div>
      </header>

      <div className="profile-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === TABS.INFO}
          className={[
            'profile-tabs__btn',
            activeTab === TABS.INFO ? 'profile-tabs__btn--active' : '',
          ].filter(Boolean).join(' ')}
          onClick={() => setActiveTab(TABS.INFO)}
        >
          Personal information
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === TABS.PASSWORD}
          className={[
            'profile-tabs__btn',
            activeTab === TABS.PASSWORD ? 'profile-tabs__btn--active' : '',
          ].filter(Boolean).join(' ')}
          onClick={() => setActiveTab(TABS.PASSWORD)}
        >
          Change password
        </button>
      </div>

      {activeTab === TABS.INFO ? (
        <ProfileInfoForm profile={profile} onSaved={(updated) => setProfile((p) => ({ ...p, ...updated }))} />
      ) : (
        <ChangePasswordForm />
      )}
    </div>
  )
}
