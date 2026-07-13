import { useId } from 'react'
import './Input.css'

export function Input({
  id,
  label,
  error,
  helperText,
  leftIcon = null,
  rightIcon = null,
  required = false,
  className = '',
  inputClassName = '',
  ...props
}) {
  const generatedId = useId()
  const inputId = id || props.name || generatedId

  const wrapperClassName = [
    'input-field',
    error ? 'input-field--error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const controlClassName = [
    'input-field__control',
    leftIcon ? 'input-field__control--has-left-icon' : '',
    rightIcon ? 'input-field__control--has-right-icon' : '',
    inputClassName,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={wrapperClassName}>
      {label && (
        <label className="input-field__label" htmlFor={inputId}>
          {label}
          {required && <span className="input-field__required">*</span>}
        </label>
      )}

      <div className="input-field__wrapper">
        {leftIcon && (
          <span className="input-field__icon input-field__icon--left">
            {leftIcon}
          </span>
        )}

        <input
          id={inputId}
          className={controlClassName}
          aria-invalid={Boolean(error)}
          aria-required={required || undefined}
          aria-describedby={
            error
              ? `${inputId}-error`
              : helperText
                ? `${inputId}-helper`
                : undefined
          }
          {...props}
        />

        {rightIcon && (
          <span className="input-field__icon input-field__icon--right">
            {rightIcon}
          </span>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} className="input-field__error">
          {error}
        </p>
      )}

      {!error && helperText && (
        <p id={`${inputId}-helper`} className="input-field__helper">
          {helperText}
        </p>
      )}
    </div>
  )
}
