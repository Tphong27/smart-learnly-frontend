import './Button.css'

export function Button({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  leftIcon = null,
  rightIcon = null,
  className = '',
  ...props
}) {
  const buttonClassName = [
    'slp-button',
    `slp-button--${variant}`,
    `slp-button--${size}`,
    fullWidth ? 'slp-button--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={buttonClassName}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="slp-button__spinner" aria-hidden="true" />
      ) : (
        leftIcon && <span className="slp-button__icon">{leftIcon}</span>
      )}

      <span>{loading ? 'Đang xử lý...' : children}</span>

      {!loading && rightIcon && (
        <span className="slp-button__icon">{rightIcon}</span>
      )}
    </button>
  )
}