import { ArrowRight, GraduationCap, ShieldCheck, Users, Zap } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { setAuthSession } from '@/services/api-client'
import { demoUsers } from '@/data/demo'
import { ROLES } from '@/shared/constants/roles'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

const demoRoles = [
  {
    role: ROLES.TRAINEE,
    label: 'Trainee demo',
    description: 'Course discovery, enrollment, learning, tests, and weakness analysis.',
    icon: GraduationCap,
  },
  {
    role: ROLES.SME,
    label: 'SME demo',
    description: 'Content and AI draft review workspace for Dev 2 screens.',
    icon: ShieldCheck,
  },
  {
    role: ROLES.TMO,
    label: 'TMO demo',
    description: 'Create courses, assign SME, review content, and publish courses.',
    icon: ShieldCheck,
  },
  {
    role: ROLES.ADMIN,
    label: 'Admin demo',
    description: 'System management, users, reports, and course operations.',
    icon: ShieldCheck,
  },
  {
    role: ROLES.TRAINER,
    label: 'Trainer demo',
    description: 'Classes and analytics workspace for Dev 2 screens.',
    icon: Users,
  },
]

export function LoginPage() {
  useDocumentTitle('Demo login')

  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from?.pathname || '/my-courses'

  const handleLogin = (role) => {
    setAuthSession({
      accessToken: `demo-token-${role}`,
      refreshToken: `demo-refresh-${role}`,
      user: demoUsers[role],
    })

    navigate(role === ROLES.TRAINEE ? redirectTo : '/dashboard', { replace: true })
  }

  return (
    <main className="demo-auth">
      <section className="demo-auth__panel">
        <div className="demo-auth__brand">
          <span><Zap size={20} /></span>
          Smart Learnly
        </div>
        <h1>Demo login</h1>
        <p>
          Pick a demo role to enter the vertical slice. Dev 1 uses Trainee; Dev 2 can extend the same entry point for staff dashboards.
        </p>

        <div className="demo-auth__roles">
          {demoRoles.map(({ role, label, description, icon: Icon }) => (
            <button key={role} type="button" onClick={() => handleLogin(role)}>
              <span className="demo-auth__role-icon"><Icon size={20} /></span>
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              <ArrowRight size={18} />
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
