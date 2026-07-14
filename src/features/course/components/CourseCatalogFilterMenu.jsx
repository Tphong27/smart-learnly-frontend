import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";

const PRICE_OPTIONS = [
  { value: "", label: "All prices" },
  { value: "FREE", label: "Free" },
  { value: "UNDER_500K", label: "Under 500K" },
  { value: "BETWEEN_500K_AND_1M", label: "500K – 1M" },
  { value: "OVER_1M", label: "Over 1M" },
];

export function CourseCatalogFilterMenu({
  priceRange,
  onPriceRangeChange,
  onSale,
  onSaleChange,
  featured,
  onFeaturedChange,
  onClearFilters,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const panelRef = useRef(null);
  const activeCount = Number(Boolean(priceRange)) + Number(onSale) + Number(featured);

  function closeFilters(restoreFocus = false) {
    setIsOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  useEffect(() => {
    if (!isOpen) return undefined;

    closeRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closeFilters(true);
        return;
      }

      if (event.key === "Tab") {
        const focusableElements = panelRef.current?.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements?.[0];
        const lastElement = focusableElements?.[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="course-catalog-filter-menu">
      <button
        ref={triggerRef}
        type="button"
        className="course-catalog-filter-menu__trigger"
        aria-expanded={isOpen}
        aria-controls="course-catalog-filter-panel"
        onClick={() => setIsOpen(true)}
      >
        <SlidersHorizontal size={18} aria-hidden="true" />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="course-catalog-filter-menu__count" aria-label={`${activeCount} active filters`}>
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="course-catalog-filter-menu__backdrop"
            aria-label="Close course filters"
            onClick={() => closeFilters(true)}
          />
          <section
            ref={panelRef}
            id="course-catalog-filter-panel"
            className="course-catalog-filter-menu__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-filter-title"
          >
            <header>
              <div>
                <h2 id="course-filter-title">Filters</h2>
                <p>Refine the courses shown in the catalog.</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="course-catalog-filter-menu__close"
                aria-label="Close filters"
                onClick={() => closeFilters(true)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            <fieldset className="course-catalog-filter-menu__group">
              <legend>Price</legend>
              <div className="course-catalog-filter-menu__price-options">
                {PRICE_OPTIONS.map((option) => (
                  <label key={option.value || "all"}>
                    <input
                      type="radio"
                      name="catalog-price-range"
                      value={option.value}
                      checked={priceRange === option.value}
                      onChange={() => onPriceRangeChange(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="course-catalog-filter-menu__group">
              <legend>Course offers</legend>
              <label className="course-catalog-filter-menu__check">
                <input
                  type="checkbox"
                  checked={onSale}
                  onChange={(event) => onSaleChange(event.target.checked)}
                />
                <span>On sale</span>
              </label>
              <label className="course-catalog-filter-menu__check">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(event) => onFeaturedChange(event.target.checked)}
                />
                <span>Featured courses</span>
              </label>
            </fieldset>

            <footer>
              <button
                type="button"
                className="course-catalog-filter-menu__reset"
                disabled={activeCount === 0}
                onClick={onClearFilters}
              >
                Reset filters
              </button>
              <button
                type="button"
                className="course-catalog-filter-menu__apply"
                onClick={() => closeFilters(true)}
              >
                Show courses
              </button>
            </footer>
          </section>
        </>
      )}
    </div>
  );
}
