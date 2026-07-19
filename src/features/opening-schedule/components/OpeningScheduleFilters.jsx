import { Search } from "lucide-react";
import {
  addOneMonthToDateValue,
  getTodayDateValue,
  PRICE_RANGE_OPTIONS,
} from "../utils/opening-schedule-filters";

export function OpeningScheduleFilters({
  filters,
  onChange,
  showKeywordSearch = true,
}) {
  function handleChange(event) {
    const { name, value } = event.target;

    if (name === "startFrom") {
      onChange({
        ...filters,
        startFrom: value,
        startTo: value ? addOneMonthToDateValue(value) : "",
      });

      return;
    }

    onChange({
      ...filters,
      [name]: value,
    });
  }

  return (
    <div
      className={
        showKeywordSearch
          ? "opening-filters"
          : "opening-filters opening-filters--without-search"
      }
      role="search"
      aria-label="Opening schedule filters"
    >
      {showKeywordSearch && (
        <div className="opening-filters__search">
          <Search size={18} aria-hidden="true" />

          <input
            type="search"
            name="keyword"
            value={filters.keyword}
            placeholder="Search course or class..."
            aria-label="Search course or class"
            onChange={handleChange}
          />
        </div>
      )}

      <label className="opening-filters__field">
        <span>Opening from</span>

        <input
          type="date"
          name="startFrom"
          value={filters.startFrom}
          min={getTodayDateValue()}
          max={filters.startTo || undefined}
          onChange={handleChange}
        />
      </label>

      <label className="opening-filters__field">
        <span>Opening to</span>

        <input
          type="date"
          name="startTo"
          value={filters.startTo}
          min={filters.startFrom || getTodayDateValue()}
          onChange={handleChange}
        />
      </label>

      <label className="opening-filters__field opening-filters__field--price">
        <span>Price</span>

        <select
          name="priceRange"
          value={filters.priceRange}
          aria-label="Filter classes by price"
          onChange={handleChange}
        >
          {PRICE_RANGE_OPTIONS.map((option) => (
            <option key={option.value || "ALL"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
