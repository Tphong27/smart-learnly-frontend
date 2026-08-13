import { Button } from "../Button";

/** Hiển thị action chỉ có icon với nhãn bắt buộc và vùng tương tác 44px. */
export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "sm",
  className = "",
  ...props
}) {
  if (!label) {
    throw new Error("IconButton requires a non-empty label.");
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={`button--icon${className ? ` ${className}` : ""}`}
      aria-label={label}
      title={props.title || label}
      {...props}
    >
      <span className="button__icon" aria-hidden="true">
        {icon}
      </span>
    </Button>
  );
}
