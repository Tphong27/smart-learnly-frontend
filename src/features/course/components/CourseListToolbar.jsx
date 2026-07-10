import { useEffect, useRef, useState } from "react";
import {
  ArrowDownUp,
  BadgePercent,
  Check,
  ChevronDown,
  Grid2X2,
  List,
  Sparkles,
  X,
} from "lucide-react";

function CatalogFilterDropdown({
  ariaLabel,
  className = "",
  onChange,
  options,
  value,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function handlePointerDown(event) {
      if (!dropdownRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      ref={dropdownRef}
      className={`filter-dropdown filter-dropdown--custom ${className}${isOpen ? " is-open" : ""}`}
    >
      <button
        type="button"
        className="filter-dropdown__trigger"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="filter-dropdown__value">{selectedOption.label}</span>
        <ChevronDown size={18} className="filter-dropdown__icon" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="filter-dropdown__menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value || "all"}
                type="button"
                className={`filter-dropdown__option${isSelected ? " is-selected" : ""}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange?.(option.value);
                  setIsOpen(false);
                }}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={17} strokeWidth={3} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CourseListToolbar({
  viewMode,
  onViewModeChange,
  categories = [],
  categorySlug = "",
  onCategoryChange,
  showFilter = true,
  showAdvancedFilters = false,
  priceRange = "",
  onPriceRangeChange,
  onSaleChange,
  onFeaturedChange,
  onClearFilters,
  onSale = false,
  featured = false,
  sort = "POPULAR",
  onSortChange,
}) {
  const hasActiveFilters =
    Boolean(categorySlug) ||
    Boolean(priceRange) ||
    onSale ||
    featured ||
    sort !== "POPULAR";
  const categoryOptions = [
    { value: "", label: "All categories" },
    ...categories.map((category) => ({
      value: category.slug || "",
      label: category.name,
    })),
  ];
  const priceOptions = [
    { value: "", label: "All prices" },
    { value: "FREE", label: "Free" },
    { value: "UNDER_500K", label: "Under 500K" },
    { value: "BETWEEN_500K_AND_1M", label: "500K – 1M" },
    { value: "OVER_1M", label: "Over 1M" },
  ];

  return (
    <div className={`courses-toolbar${showAdvancedFilters ? " courses-toolbar--advanced" : ""}`}>
      <div className="courses-toolbar__filters">
        {showFilter ? (
          <CatalogFilterDropdown
            ariaLabel="Filter by category"
            options={categoryOptions}
            value={categorySlug || ""}
            onChange={onCategoryChange}
          />
        ) : null}

        {showAdvancedFilters && (
          <>
            <CatalogFilterDropdown
              ariaLabel="Filter by price"
              className="filter-dropdown--price"
              options={priceOptions}
              value={priceRange}
              onChange={onPriceRangeChange}
            />

            <button
              type="button"
              className={`catalog-filter-chip${onSale ? " is-active" : ""}`}
              aria-pressed={onSale}
              onClick={() => onSaleChange?.(!onSale)}
            >
              <BadgePercent size={16} /> On sale
            </button>

            <button
              type="button"
              className={`catalog-filter-chip${featured ? " is-active" : ""}`}
              aria-pressed={featured}
              onClick={() => onFeaturedChange?.(!featured)}
            >
              <Sparkles size={16} /> Featured
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                className="catalog-filter-clear"
                onClick={onClearFilters}
              >
                <X size={15} /> Clear
              </button>
            )}
          </>
        )}
      </div>

      <div className="courses-toolbar__actions">
        {showAdvancedFilters && (
          <label className="catalog-sort">
            <ArrowDownUp size={16} aria-hidden="true" />
            <span className="sr-only">Sort courses</span>
            <select
              value={sort}
              onChange={(event) => onSortChange?.(event.target.value)}
              aria-label="Sort courses"
            >
              <option value="POPULAR">Most popular</option>
              <option value="PRICE_ASC">Price: low to high</option>
              <option value="PRICE_DESC">Price: high to low</option>
            </select>
          </label>
        )}

        <div className="view-toggles">
          <button
            type="button"
            className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => onViewModeChange("grid")}
            aria-label="Grid view"
          >
            <Grid2X2 size={18} />
          </button>

          <button
            type="button"
            className={`view-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => onViewModeChange("list")}
            aria-label="List view"
          >
            <List size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
