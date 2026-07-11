import "./Button.css";

export function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled = false,
  tactile,
  leftIcon = null,
  rightIcon = null,
  className = "",
  ...props
}) {
  const tactileEnabled = tactile ?? variant === "primary";

  const buttonClassName = [
    "button",
    `button--${variant}`,
    `button--${size}`,
    tactileEnabled ? "button--tactile" : "",
    fullWidth ? "button--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={buttonClassName}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="button__spinner" aria-hidden="true" />
      ) : (
        leftIcon && <span className="button__icon">{leftIcon}</span>
      )}

      <span className="button__content">
        {loading ? "Loading..." : children}
      </span>

      {!loading && rightIcon && (
        <span className="button__icon">{rightIcon}</span>
      )}
    </button>
  );
}
