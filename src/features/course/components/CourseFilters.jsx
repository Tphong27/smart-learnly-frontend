import { useEffect, useState } from "react";
import { Search } from "lucide-react";

export function CourseFilters({
  keyword,
  categorySlug,
  categories,
  onKeywordChange,
  onCategoryChange,
  debounceMs = 0,
  showCategory = true,
}) {
  const [searchValue, setSearchValue] = useState(keyword);

  useEffect(() => {
    if (debounceMs <= 0 || searchValue === keyword) return undefined;

    const timer = window.setTimeout(() => {
      onKeywordChange(searchValue);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [debounceMs, keyword, onKeywordChange, searchValue]);

  return (
    <div className="course-filters">
      <label className="course-filters__search">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Search courses</span>
        <input
          type="search"
          value={debounceMs > 0 ? searchValue : keyword}
          onChange={(event) => {
            if (debounceMs > 0) {
              setSearchValue(event.target.value);
            } else {
              onKeywordChange(event.target.value);
            }
          }}
          placeholder="Search courses..."
          aria-label="Search courses"
        />
      </label>

      {showCategory && (
        <select
          value={categorySlug}
          onChange={(event) => onCategoryChange(event.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
