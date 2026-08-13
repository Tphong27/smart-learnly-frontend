import "./FilterBar.css";

/** Gom search, filter, sort và metadata của một danh sách vào cùng toolbar responsive. */
export function FilterBar({
  children,
  search,
  actions,
  meta,
  ariaLabel = "List filters",
  className = "",
}) {
  return (
    <section
      className={`filter-bar${className ? ` ${className}` : ""}`}
      role="search"
      aria-label={ariaLabel}
    >
      {search ? <div className="filter-bar__search">{search}</div> : null}
      {children ? <div className="filter-bar__fields">{children}</div> : null}
      {actions ? <div className="filter-bar__actions">{actions}</div> : null}
      {meta ? <div className="filter-bar__meta" aria-live="polite">{meta}</div> : null}
    </section>
  );
}
