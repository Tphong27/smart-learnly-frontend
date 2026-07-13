import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/shared/components/ui";

function valuesFromFields(fields, source = "value") {
  return Object.fromEntries(
    fields.map((field) => [
      field.name,
      source === "defaultValue" ? (field.defaultValue ?? "") : (field.value ?? ""),
    ]),
  );
}

function focusTrigger(triggerRef) {
  window.requestAnimationFrame(() => triggerRef.current?.focus());
}

export function AdminFilterToolbar({
  ariaLabel = "List filters",
  search,
  fields = [],
  activeFilterCount = 0,
  canClear = activeFilterCount > 0,
  resultLabel,
  onApply,
  onClear,
}) {
  const [open, setOpen] = useState(false);
  const [draftValues, setDraftValues] = useState(() => valuesFromFields(fields));
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const generatedId = useId().replace(/:/g, "");
  const panelId = `admin-filter-panel-${generatedId}`;
  const isWide = fields.length > 4;
  const hasDraftFilters = fields.some((field) => (
    String(draftValues[field.name] ?? "") !== String(field.defaultValue ?? "")
  ));

  useEffect(() => {
    if (!open) return undefined;

    const focusFrame = window.requestAnimationFrame(() => {
      const firstField = panelRef.current?.querySelector(
        "select:not(:disabled), input:not(:disabled)",
      );
      const fallbackButton = panelRef.current?.querySelector("button:not(:disabled)");
      (firstField || fallbackButton)?.focus();
    });

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        focusTrigger(triggerRef);
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusableElements = Array.from(
        panelRef.current.querySelectorAll(
          'button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function openPanel() {
    setDraftValues(valuesFromFields(fields));
    setOpen(true);
  }

  function closePanel({ restoreFocus = true } = {}) {
    setOpen(false);
    if (restoreFocus) focusTrigger(triggerRef);
  }

  function handleSubmit(event) {
    event.preventDefault();
    onApply?.(draftValues);
    closePanel();
  }

  function handleClear() {
    setDraftValues(valuesFromFields(fields, "defaultValue"));
    onClear?.();
    closePanel();
  }

  return (
    <div className="admin-toolbar admin-toolbar--filter-popover" role="search" aria-label={ariaLabel}>
      <div className="admin-filter-bar">
        <div className="admin-filter-bar__search">{search}</div>

        <div className="admin-filter-bar__actions">
          <div ref={rootRef} className="admin-filter-popover">
            <Button
              ref={triggerRef}
              type="button"
              variant={activeFilterCount > 0 ? "secondary" : "ghost"}
              className="admin-filter-popover__trigger"
              leftIcon={<SlidersHorizontal size={16} />}
              rightIcon={<ChevronDown size={16} />}
              aria-expanded={open}
              aria-controls={panelId}
              aria-haspopup="dialog"
              onClick={() => {
                if (open) closePanel({ restoreFocus: false });
                else openPanel();
              }}
            >
              Filters
              {activeFilterCount > 0 && (
                <span className="admin-filter-popover__count" aria-label={`${activeFilterCount} active filters`}>
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {open && (
              <>
                <button
                  type="button"
                  className="admin-filter-popover__backdrop"
                  tabIndex={-1}
                  aria-hidden="true"
                  onClick={() => closePanel({ restoreFocus: false })}
                />
                <form
                  ref={panelRef}
                  id={panelId}
                  className={`admin-filter-popover__panel${isWide ? " admin-filter-popover__panel--wide" : ""}`}
                  role="dialog"
                  aria-label="Filter options"
                  onSubmit={handleSubmit}
                >
                  <div className="admin-filter-popover__header">
                    <div>
                      <strong>Filters</strong>
                      <span>Refine the displayed results.</span>
                    </div>
                    <button
                      type="button"
                      className="admin-filter-popover__close"
                      aria-label="Close filters"
                      onClick={() => closePanel()}
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="admin-filter-popover__fields">
                    {fields.map((field) => {
                      const fieldId = field.id || `${panelId}-${field.name}`;
                      const commonProps = {
                        id: fieldId,
                        className: "admin-toolbar__select",
                        value: draftValues[field.name] ?? "",
                        disabled: field.disabled,
                        onChange: (event) => {
                          const nextValue = event.target.value;
                          setDraftValues((current) => ({ ...current, [field.name]: nextValue }));
                        },
                      };

                      return (
                        <div key={field.name} className="admin-filter-popover__field">
                          <label htmlFor={fieldId}>{field.label}</label>
                          {field.type === "select" ? (
                            <select {...commonProps}>
                              {(field.options || []).map((option) => (
                                <option key={option.value || "all"} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              {...commonProps}
                              type={field.type || "text"}
                              placeholder={field.placeholder}
                              autoComplete={field.autoComplete || "off"}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="admin-filter-popover__footer">
                    <Button type="button" variant="ghost" onClick={handleClear} disabled={!canClear && !hasDraftFilters}>
                      Clear all
                    </Button>
                    <Button type="submit">Apply filters</Button>
                  </div>
                </form>
              </>
            )}
          </div>

          {resultLabel && (
            <span className="admin-toolbar__meta" aria-live="polite">
              {resultLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
