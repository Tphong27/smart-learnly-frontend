import { Check, Minus } from 'lucide-react'
import { passwordRules } from '../schemas/auth-schemas'
import './PasswordStrengthChecklist.css'

const rules = [
  { key: 'len', label: 'At least 8 characters', test: (v) => (v ?? '').length >= passwordRules.minLength },
  { key: 'upper', label: 'Uppercase letter', test: (v) => passwordRules.hasUpper.test(v ?? '') },
  { key: 'lower', label: 'Lowercase letter', test: (v) => passwordRules.hasLower.test(v ?? '') },
  { key: 'digit', label: 'Digit', test: (v) => passwordRules.hasDigit.test(v ?? '') },
  { key: 'special', label: 'Special character', test: (v) => passwordRules.hasSpecial.test(v ?? '') },
]

export function PasswordStrengthChecklist({ value }) {
  return (
    <ul className="password-checklist" aria-label="Password requirements">
      {rules.map((rule) => {
        const ok = rule.test(value)
        return (
          <li
            key={rule.key}
            className={[
              'password-checklist__item',
              ok ? 'password-checklist__item--ok' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="password-checklist__icon" aria-hidden="true">
              {ok ? <Check size={12} strokeWidth={3} /> : <Minus size={12} strokeWidth={3} />}
            </span>
            {rule.label}
          </li>
        )
      })}
    </ul>
  )
}
