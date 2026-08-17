import { useId } from "react";
import "./Input.css";

/** Chuẩn hóa error dạng chuỗi hoặc FieldError thành nội dung có thể hiển thị. */
function resolveErrorMessage(error) {
  if (!error) {
    return "";
  }

  if (typeof error === "string") {
    return error;
  }

  if (typeof error?.message === "string") {
    return error.message;
  }

  return "Invalid value";
}

/** Hiển thị input chuẩn với label, helper, error và icon tùy chọn. */
export function Input({
  id,
  label,
  error,
  helperText,
  leftIcon = null,
  rightIcon = null,
  suffix = null,
  required = false,
  className = "",
  inputClassName = "",
  ...props
}) {
  const generatedId = useId();
  const inputId = id || props.name || generatedId;
  const errorMessage = resolveErrorMessage(error);

  const wrapperClassName = [
    "input-field",
    errorMessage ? "input-field--error" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const controlClassName = [
    "input-field__control",
    leftIcon ? "input-field__control--has-left-icon" : "",
    rightIcon || suffix ? "input-field__control--has-right-icon" : "",
    suffix ? "input-field__control--has-suffix" : "",
    inputClassName,
  ]
    .filter(Boolean)
    .join(" ");

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
          aria-invalid={Boolean(errorMessage)}
          aria-required={required || undefined}
          aria-describedby={
            errorMessage
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

        {!rightIcon && suffix && (
          <span className="input-field__suffix" aria-hidden="true">
            {suffix}
          </span>
        )}
      </div>

      {errorMessage && (
        <p id={`${inputId}-error`} className="input-field__error" role="alert">
          {errorMessage}
        </p>
      )}

      {!errorMessage && helperText && (
        <p id={`${inputId}-helper`} className="input-field__helper">
          {helperText}
        </p>
      )}
    </div>
  );
}