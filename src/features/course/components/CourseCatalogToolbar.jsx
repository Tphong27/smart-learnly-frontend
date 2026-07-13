import { ArrowDownUp, Grid2X2, List } from "lucide-react";

export function CourseCatalogActions({
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
}) {
  return (
    <div className="course-catalog-toolbar__actions">
      <label className="course-catalog-toolbar__sort">
        <ArrowDownUp size={16} aria-hidden="true" />
        <span className="sr-only">Sort courses</span>
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value)}
          aria-label="Sort courses"
        >
          <option value="POPULAR">Most popular</option>
          <option value="PRICE_ASC">Price: low to high</option>
          <option value="PRICE_DESC">Price: high to low</option>
        </select>
      </label>

      <div
        className="course-catalog-toolbar__views"
        role="group"
        aria-label="Course view"
      >
        <button
          type="button"
          className={viewMode === "grid" ? "is-active" : ""}
          aria-label="Grid view"
          aria-pressed={viewMode === "grid"}
          onClick={() => onViewModeChange("grid")}
        >
          <Grid2X2 size={18} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={viewMode === "list" ? "is-active" : ""}
          aria-label="List view"
          aria-pressed={viewMode === "list"}
          onClick={() => onViewModeChange("list")}
        >
          <List size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function CourseCatalogToolbar({
  categories,
  categorySlug,
  onCategoryChange,
}) {
  return (
    <div className="course-catalog-toolbar">
      <div
        className="course-catalog-toolbar__categories"
        role="group"
        aria-label="Course categories"
      >
        <button
          type="button"
          className={!categorySlug ? "is-active" : ""}
          aria-pressed={!categorySlug}
          onClick={() => onCategoryChange("")}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id || category.slug}
            type="button"
            className={categorySlug === category.slug ? "is-active" : ""}
            aria-pressed={categorySlug === category.slug}
            onClick={() => onCategoryChange(category.slug)}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
