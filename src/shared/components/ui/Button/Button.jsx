import { Link } from "react-router-dom";
import "./Button.css";

export function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  fullWidth = false,
  loading = false,
  loadingLabel = "Loading...",
  disabled = false,
  leftIcon = null,
  rightIcon = null,
  as: Element,
  to,
  href,
  onClick,
  onKeyDown,
  role,
  tabIndex,
  className = "",
  ...props
}) {
  const buttonClassName = [
    "button",
    `button--${variant}`,
    `button--${size}`,
    fullWidth ? "button--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const isDisabled = disabled || loading;
  const content = (
    <>
      {loading ? (
        <span className="button__spinner" aria-hidden="true" />
      ) : (
        leftIcon && <span className="button__icon">{leftIcon}</span>
      )}

      <span className="button__content">
        {loading ? loadingLabel : children}
      </span>

      {!loading && rightIcon && (
        <span className="button__icon">{rightIcon}</span>
      )}
    </>
  );

  function handleInteractiveClick(event) {
    if (isDisabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onClick?.(event);
  }

  function handleCustomKeyDown(event) {
    onKeyDown?.(event);

    if (event.defaultPrevented || isDisabled || Element !== "label") {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.currentTarget.querySelector("input:not(:disabled)")?.click();
    }
  }

  if (Element) {
    return (
      <Element
        className={buttonClassName}
        role={role ?? (Element === "label" ? "button" : undefined)}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        tabIndex={isDisabled ? -1 : (tabIndex ?? (Element === "label" ? 0 : undefined))}
        onClick={handleInteractiveClick}
        onKeyDown={handleCustomKeyDown}
        {...props}
      >
        {content}
      </Element>
    );
  }

  if (to) {
    return (
      <Link
        to={to}
        className={buttonClassName}
        role={role}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        tabIndex={isDisabled ? -1 : tabIndex}
        onClick={handleInteractiveClick}
        onKeyDown={onKeyDown}
        {...props}
      >
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        className={buttonClassName}
        role={role}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        tabIndex={isDisabled ? -1 : tabIndex}
        onClick={handleInteractiveClick}
        onKeyDown={onKeyDown}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={buttonClassName}
      role={role}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={tabIndex}
      {...props}
    >
      {content}
    </button>
  );
}
