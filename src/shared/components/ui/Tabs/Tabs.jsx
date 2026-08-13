import { useRef } from "react";
import "./Tabs.css";

/** Hiển thị tab list semantic theo kiểu underline hoặc compact và giao quyền render panel cho caller. */
export function Tabs({
  items,
  value,
  onChange,
  ariaLabel = "Tabs",
  orientation = "horizontal",
  variant = "underline",
  className = "",
}) {
  const buttonRefs = useRef(new Map());

  /** Di chuyển focus và lựa chọn giữa các tab đang hoạt động bằng bàn phím. */
  function handleKeyDown(event, currentValue) {
    const previousKey = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
    const nextKey = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
    const navigationKeys = [previousKey, nextKey, "Home", "End"];
    if (!navigationKeys.includes(event.key)) return;

    event.preventDefault();
    const enabledItems = items.filter((item) => !item.disabled);
    const currentIndex = enabledItems.findIndex((item) => item.value === currentValue);
    let nextIndex = currentIndex;

    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = enabledItems.length - 1;
    if (event.key === previousKey) {
      nextIndex = (currentIndex - 1 + enabledItems.length) % enabledItems.length;
    }
    if (event.key === nextKey) {
      nextIndex = (currentIndex + 1) % enabledItems.length;
    }

    const nextItem = enabledItems[nextIndex];
    if (!nextItem) return;
    onChange?.(nextItem.value);
    buttonRefs.current.get(nextItem.value)?.focus();
  }

  return (
    <div
      className={`tabs tabs--${variant} tabs--${orientation}${className ? ` ${className}` : ""}`}
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation={orientation}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            ref={(node) => {
              if (node) buttonRefs.current.set(item.value, node);
              else buttonRefs.current.delete(item.value);
            }}
            key={item.value}
            id={item.id}
            type="button"
            className={`tabs__tab${selected ? " is-active" : ""}`}
            role="tab"
            aria-selected={selected}
            aria-controls={item.panelId}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange?.(item.value)}
            onKeyDown={(event) => handleKeyDown(event, item.value)}
          >
            {item.icon ? <span className="tabs__icon" aria-hidden="true">{item.icon}</span> : null}
            <span>{item.label}</span>
            {item.count != null ? <span className="tabs__count">{item.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
