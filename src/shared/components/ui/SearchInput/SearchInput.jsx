import { Search, X } from "lucide-react";
import { Input } from "../Input";
import "./SearchInput.css";

/** Hiển thị ô tìm kiếm chuẩn có icon, nút xóa và nhãn accessible. */
export function SearchInput({
  value = "",
  onChange,
  onClear,
  label,
  ariaLabel = "Search",
  clearLabel = "Clear search",
  clearable = true,
  className = "",
  ...props
}) {
  const clearButton = clearable && value ? (
    <button
      type="button"
      className="search-input__clear"
      aria-label={clearLabel}
      onClick={() => {
        onChange?.("");
        onClear?.();
      }}
    >
      <X size={16} aria-hidden="true" />
    </button>
  ) : null;

  return (
    <Input
      type="search"
      value={value}
      label={label}
      aria-label={label ? undefined : ariaLabel}
      leftIcon={<Search size={18} aria-hidden="true" />}
      rightIcon={clearButton}
      className={`search-input${className ? ` ${className}` : ""}`}
      onChange={(event) => onChange?.(event.target.value)}
      {...props}
    />
  );
}
