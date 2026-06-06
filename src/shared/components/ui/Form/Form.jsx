import { Input } from '../Input'
import './Form.css'

export function Form({
  children,
  onSubmit,
  className = '',
  noValidate = true,
  ...props
}) {
  const formClassName = ['form', className].filter(Boolean).join(' ')

  return (
    <form
      className={formClassName}
      onSubmit={onSubmit}
      noValidate={noValidate}
      {...props}
    >
      {children}
    </form>
  )
}

export function FormField({
  label,
  error,
  registration,
  required = false,
  ...props
}) {
  return (
    <Input
      label={label}
      error={error?.message || error}
      required={required}
      {...registration}
      {...props}
    />
  )
}

export function FormActions({ children, align = 'right', className = '' }) {
  const actionsClassName = [
    'form-actions',
    `form-actions--${align}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <div className={actionsClassName}>{children}</div>
}