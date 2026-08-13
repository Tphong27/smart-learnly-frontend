import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { IconButton } from '../IconButton'
import { Input } from '../Input'
import './Form.css'

/** Tạo form semantic với thiết lập validation HTML phù hợp cho form có validation riêng. */
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

/** Kết nối Input dùng chung với registration và error từ thư viện quản lý form. */
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

/** Hiển thị trường mật khẩu có nút hiện/ẩn đạt chuẩn accessibility và touch target. */
export function PasswordField({
  showLabel = 'Show password',
  hideLabel = 'Hide password',
  inputClassName = '',
  ...props
}) {
  const [isVisible, setIsVisible] = useState(false)
  const resolvedInputClassName = [
    'input-field__control--password',
    inputClassName,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <FormField
      {...props}
      type={isVisible ? 'text' : 'password'}
      inputClassName={resolvedInputClassName}
      rightIcon={
        <IconButton
          icon={isVisible ? <EyeOff size={17} /> : <Eye size={17} />}
          label={isVisible ? hideLabel : showLabel}
          className="input-field__password-toggle"
          aria-pressed={isVisible}
          onClick={() => setIsVisible((current) => !current)}
        />
      }
    />
  )
}

/** Căn chỉnh nhóm hành động ở cuối form theo hướng được chỉ định. */
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
