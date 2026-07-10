import { Grid2X2, List, ChevronDown } from "lucide-react";

export function CourseListToolbar({
  totalElements,
  viewMode,
  onViewModeChange,
  categories = [],
  categorySlug = "",
  onCategoryChange,
  showFilter = true,
}) {
  return (
    <div className="courses-toolbar">
      {showFilter ? (
        <div className="filter-dropdown">
          <select
            className="filter-dropdown__select"
            value={categorySlug || ""}
            onChange={(event) => onCategoryChange?.(event.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.slug || category.id} value={category.slug || ""}>
                {category.name}
              </option>
            ))}
          </select>
          <ChevronDown size={18} className="filter-dropdown__icon" />
        </div>
      ) : (
        <div />
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
  );
}