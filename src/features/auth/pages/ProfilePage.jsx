import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  Phone,
  ShieldCheck,
  User,
  UserRound,
} from 'lucide-react'
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
    control,
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

  const bioValue = useWatch({ control, name: 'bio' }) ?? ''

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
    <section className="profile-panel" aria-labelledby="profile-info-heading">
      <header className="profile-panel__header">
        <div>
          <h2 id="profile-info-heading">Personal information</h2>
          <p>Update your display name, avatar and contact details.</p>
        </div>
      </header>

      {serverError && (
        <div className="profile-alert" role="alert">
          <AlertCircle size={19} aria-hidden="true" />
          <div>
            <strong>Profile could not be updated</strong>
            <p>{serverError}</p>
          </div>
        </div>
      )}

      <Form className="profile-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="profile-form__grid">
          <FormField
            id="profile-full-name"
            label="Full name"
            required
            registration={register('fullName')}
            error={errors.fullName?.message}
            leftIcon={<User size={16} aria-hidden="true" />}
            autoComplete="name"
          />

          <FormField
            id="profile-phone"
            label="Phone number"
            placeholder="e.g. +84901234567"
            registration={register('phoneNumber')}
            error={errors.phoneNumber?.message}
            leftIcon={<Phone size={16} aria-hidden="true" />}
            autoComplete="tel"
            inputMode="tel"
          />

          <FormField
            id="profile-avatar-url"
            className="profile-form__full"
            label="Avatar URL"
            placeholder="https://example.com/avatar.jpg"
            registration={register('avatarUrl')}
            error={errors.avatarUrl?.message}
            leftIcon={<ImageIcon size={16} aria-hidden="true" />}
            helperText="Use a public JPEG, PNG, or WebP image URL."
            type="url"
          />

          <div className="input-field profile-form__full">
            <div className="profile-form__label-row">
              <label className="input-field__label" htmlFor="profile-bio">
                Bio
              </label>
              <span>{bioValue.length} / 1000</span>
            </div>
            <textarea
              id="profile-bio"
              className={[
                'profile-textarea',
                errors.bio ? 'profile-textarea--error' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              maxLength={1000}
              rows={6}
              placeholder="Tell learners and colleagues a little about yourself"
              aria-invalid={Boolean(errors.bio) || undefined}
              aria-describedby={errors.bio ? 'profile-bio-error' : undefined}
              {...register('bio')}
            />
            {errors.bio && (
              <p id="profile-bio-error" className="input-field__error" role="alert">
                {errors.bio.message}
              </p>
            )}
          </div>
        </div>

        <div className="profile-form__actions">
          <p aria-live="polite">
            {isSubmitting
              ? 'Saving profile...'
              : isDirty
                ? 'Unsaved changes'
                : 'Your profile is up to date'}
          </p>
          <div>
            <Button type="button" variant="outline" onClick={() => reset()} disabled={!isDirty || isSubmitting}>
            Reset
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
              Save changes
            </Button>
          </div>
        </div>
      </Form>
    </section>
  )
}

function ChangePasswordForm() {
  const toast = useToast()
  const [serverError, setServerError] = useState(null)
  const [show, setShow] = useState({ cur: false, next: false, conf: false })

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    mode: 'onBlur',
  })

  const newPasswordValue = useWatch({ control, name: 'newPassword' }) ?? ''

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

  return (
    <section className="profile-panel" aria-labelledby="profile-password-heading">
      <header className="profile-panel__header">
        <div>
          <h2 id="profile-password-heading">Password &amp; security</h2>
          <p>Choose a strong, unique password to protect your account.</p>
        </div>
      </header>

      {serverError && (
        <div className="profile-alert" role="alert">
          <AlertCircle size={19} aria-hidden="true" />
          <div>
            <strong>Password could not be changed</strong>
            <p>{serverError}</p>
          </div>
        </div>
      )}

      <Form className="profile-form profile-form--password" onSubmit={handleSubmit(onSubmit)}>
        <FormField
          id="profile-current-password"
          label="Current password"
          type={show.cur ? 'text' : 'password'}
          required
          registration={register('currentPassword')}
          error={errors.currentPassword?.message}
          leftIcon={<Lock size={16} aria-hidden="true" />}
          rightIcon={
            <button
              type="button"
              className="profile-password-toggle"
              onClick={() => setShow((state) => ({ ...state, cur: !state.cur }))}
              aria-label={show.cur ? 'Hide current password' : 'Show current password'}
              aria-pressed={show.cur}
            >
              {show.cur ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          }
          autoComplete="current-password"
        />

        <div className="profile-password-group">
          <FormField
            id="profile-new-password"
            label="New password"
            type={show.next ? 'text' : 'password'}
            required
            registration={register('newPassword')}
            error={errors.newPassword?.message}
            leftIcon={<Lock size={16} aria-hidden="true" />}
            rightIcon={
              <button
                type="button"
                className="profile-password-toggle"
                onClick={() => setShow((state) => ({ ...state, next: !state.next }))}
                aria-label={show.next ? 'Hide new password' : 'Show new password'}
                aria-pressed={show.next}
              >
                {show.next ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            }
            autoComplete="new-password"
          />
          <div className="profile-password-requirements">
            <strong>Password requirements</strong>
            <PasswordStrengthChecklist value={newPasswordValue} />
          </div>
        </div>

        <FormField
          id="profile-confirm-password"
          label="Confirm new password"
          type={show.conf ? 'text' : 'password'}
          required
          registration={register('confirmPassword')}
          error={errors.confirmPassword?.message}
          leftIcon={<Lock size={16} aria-hidden="true" />}
          rightIcon={
            <button
              type="button"
              className="profile-password-toggle"
              onClick={() => setShow((state) => ({ ...state, conf: !state.conf }))}
              aria-label={show.conf ? 'Hide password confirmation' : 'Show password confirmation'}
              aria-pressed={show.conf}
            >
              {show.conf ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          }
          autoComplete="new-password"
        />

        <div className="profile-form__actions profile-form__actions--password">
          <p>Your password is encrypted and never displayed.</p>
          <Button type="submit" loading={isSubmitting}>Update password</Button>
        </div>
      </Form>
    </section>
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

  function handleTabKeyDown(event) {
    if (
      event.key !== 'ArrowUp' &&
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'ArrowRight'
    ) {
      return
    }
    event.preventDefault()
    const nextTab = activeTab === TABS.INFO ? TABS.PASSWORD : TABS.INFO
    setActiveTab(nextTab)
    window.requestAnimationFrame(() => {
      document.getElementById(`profile-tab-${nextTab}`)?.focus()
    })
  }

  if (loading) {
    return (
      <div
        className="profile-page profile-page--loading"
        role="status"
        aria-label="Loading your profile"
      >
        <div className="profile-skeleton profile-skeleton--heading" />
        <div className="profile-layout">
          <div className="profile-skeleton profile-skeleton--sidebar" />
          <div className="profile-skeleton profile-skeleton--panel" />
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="profile-page">
        <div className="profile-error-state" role="alert">
          <AlertCircle size={28} aria-hidden="true" />
          <h1>Could not load profile</h1>
          <p>{error}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Try again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <header className="profile-page__heading">
        <div>
          <h1>Profile &amp; security</h1>
          <p>Manage your personal information and account security.</p>
        </div>
      </header>

      <div className="profile-layout">
        <aside className="profile-sidebar">
          <div className="profile-identity">
            {profile?.avatarUrl ? (
              <img
                className="profile-page__avatar"
                src={profile.avatarUrl}
                alt={`${profile?.fullName || 'User'} profile`}
              />
            ) : (
              <div className="profile-page__avatar-fallback" aria-hidden="true">
                {initials}
              </div>
            )}
            <div className="profile-identity__copy">
              <h2>{profile?.fullName || 'User'}</h2>
              <p>{profile?.email}</p>
              {profile?.role && (
                <span className="profile-page__role-badge">{profile.role}</span>
              )}
            </div>
          </div>

          <nav
            className="profile-tabs"
            role="tablist"
            aria-label="Profile settings"
          >
            <button
              id="profile-tab-info"
              type="button"
              role="tab"
              aria-selected={activeTab === TABS.INFO}
              aria-controls="profile-panel-info"
              tabIndex={activeTab === TABS.INFO ? 0 : -1}
              className={[
                'profile-tabs__btn',
                activeTab === TABS.INFO ? 'profile-tabs__btn--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setActiveTab(TABS.INFO)}
              onKeyDown={handleTabKeyDown}
            >
              <UserRound size={18} aria-hidden="true" />
              <span>Personal information</span>
            </button>
            <button
              id="profile-tab-password"
              type="button"
              role="tab"
              aria-selected={activeTab === TABS.PASSWORD}
              aria-controls="profile-panel-password"
              tabIndex={activeTab === TABS.PASSWORD ? 0 : -1}
              className={[
                'profile-tabs__btn',
                activeTab === TABS.PASSWORD ? 'profile-tabs__btn--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setActiveTab(TABS.PASSWORD)}
              onKeyDown={handleTabKeyDown}
            >
              <ShieldCheck size={18} aria-hidden="true" />
              <span>Password &amp; security</span>
            </button>
          </nav>
        </aside>

        <main className="profile-content">
          <div
            id={`profile-panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`profile-tab-${activeTab}`}
          >
            {activeTab === TABS.INFO ? (
              <ProfileInfoForm
                profile={profile}
                onSaved={(updated) =>
                  setProfile((current) => ({ ...current, ...updated }))
                }
              />
            ) : (
              <ChangePasswordForm />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
