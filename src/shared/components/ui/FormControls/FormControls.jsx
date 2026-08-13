import { useId } from "react";
import "./FormControls.css";

/** Ghép label, helper và error semantic quanh một form control bất kỳ. */
function FieldFrame({ id, label, required, error, helperText, children, className = "" }) {
  const describedBy = error
    ? `${id}-error`
    : helperText
      ? `${id}-helper`
      : undefined;

  return (
    <div className={`input-field${error ? " input-field--error" : ""}${className ? ` ${className}` : ""}`}>
      {label ? (
        <label className="input-field__label" htmlFor={id}>
          {label}
          {required ? <span className="input-field__required">*</span> : null}
        </label>
      ) : null}
      {children({ describedBy })}
      {error ? (
        <p id={`${id}-error`} className="input-field__error" role="alert">{error?.message || error}</p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="input-field__helper">{helperText}</p>
      ) : null}
    </div>
  );
}

/** Hiển thị select chuẩn với label, helper và error dùng chung. */
export function Select({
  id,
  label,
  required = false,
  error,
  helperText,
  className = "",
  selectClassName = "",
  children,
  ...props
}) {
  const generatedId = useId();
  const controlId = id || props.name || generatedId;

  return (
    <FieldFrame id={controlId} label={label} required={required} error={error} helperText={helperText} className={className}>
      {({ describedBy }) => (
        <select
          id={controlId}
          className={`form-control${selectClassName ? ` ${selectClassName}` : ""}`}
          aria-invalid={Boolean(error)}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          {...props}
        >
          {children}
        </select>
      )}
    </FieldFrame>
  );
}

/** Hiển thị textarea chuẩn với label, helper, error và chiều cao có thể thay đổi. */
export function Textarea({
  id,
  label,
  required = false,
  error,
  helperText,
  className = "",
  textareaClassName = "",
  ...props
}) {
  const generatedId = useId();
  const controlId = id || props.name || generatedId;

  return (
    <FieldFrame id={controlId} label={label} required={required} error={error} helperText={helperText} className={className}>
      {({ describedBy }) => (
        <textarea
          id={controlId}
          className={`form-control form-control--textarea${textareaClassName ? ` ${textareaClassName}` : ""}`}
          aria-invalid={Boolean(error)}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          {...props}
        />
      )}
    </FieldFrame>
  );
}

/** Hiển thị checkbox có label và mô tả, phù hợp cho lựa chọn boolean độc lập. */
export function Checkbox({ label, description, className = "", ...props }) {
  return (
    <label className={`checkbox-field${className ? ` ${className}` : ""}`}>
      <input className="checkbox-field__control" type="checkbox" {...props} />
      <span className="checkbox-field__copy">
        <span className="checkbox-field__label">{label}</span>
        {description ? <span className="checkbox-field__description">{description}</span> : null}
      </span>
    </label>
  );
}

/** Hiển thị nhóm radio semantic với legend, helper và error dùng chung. */
export function RadioGroup({
  legend,
  name,
  value,
  options,
  onChange,
  required = false,
  error,
  helperText,
  className = "",
}) {
  const generatedId = useId();
  const groupId = name || generatedId;
  const describedBy = error
    ? `${groupId}-error`
    : helperText
      ? `${groupId}-helper`
      : undefined;

  return (
    <fieldset
      className={`radio-group${error ? " radio-group--error" : ""}${className ? ` ${className}` : ""}`}
      aria-describedby={describedBy}
      aria-invalid={Boolean(error)}
    >
      {legend ? (
        <legend className="radio-group__legend">
          {legend}
          {required ? <span className="input-field__required">*</span> : null}
        </legend>
      ) : null}
      <div className="radio-group__options">
        {options.map((option) => (
          <label key={option.value} className="radio-group__option">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              required={required}
              onChange={(event) => onChange?.(event.target.value, event)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={`${groupId}-error`} className="input-field__error" role="alert">
          {error?.message || error}
        </p>
      ) : helperText ? (
        <p id={`${groupId}-helper`} className="input-field__helper">
          {helperText}
        </p>
      ) : null}
    </fieldset>
  );
}
