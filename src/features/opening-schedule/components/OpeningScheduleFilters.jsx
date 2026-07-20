import { RotateCcw, Search } from "lucide-react";

export function OpeningScheduleFilters({
  filters,
  onChange,
  onReset,
}) {
  function handleChange(event) {
    const { name, value } = event.target;

    onChange({
      ...filters,
      [name]: value,
    });
  }

  function preventSubmit(event) {
    event.preventDefault();
  }

  return (
    <form
      className="opening-filters"
      onSubmit={preventSubmit}
      aria-label="Opening schedule filters"
    >
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

      <label className="opening-filters__field">
        <span>Opening from</span>

        <input
          type="date"
          name="startFrom"
          value={filters.startFrom}
          onChange={handleChange}
        />
      </label>

      <label className="opening-filters__field">
        <span>Opening to</span>

        <input
          type="date"
          name="startTo"
          value={filters.startTo}
          onChange={handleChange}
        />
      </label>

      <label className="opening-filters__field">
        <span>Minimum price</span>

        <input
          type="number"
          name="minPrice"
          min="0"
          step="1000"
          value={filters.minPrice}
          placeholder="0"
          onChange={handleChange}
        />
      </label>

      <label className="opening-filters__field">
        <span>Maximum price</span>

        <input
          type="number"
          name="maxPrice"
          min="0"
          step="1000"
          value={filters.maxPrice}
          placeholder="No limit"
          onChange={handleChange}
        />
      </label>

      <div className="opening-filters__actions">
        <button
          type="button"
          className="opening-button opening-button--secondary"
          onClick={onReset}
        >
          <RotateCcw size={17} aria-hidden="true" />
          Reset
        </button>
      </div>
    </form>
  );
}