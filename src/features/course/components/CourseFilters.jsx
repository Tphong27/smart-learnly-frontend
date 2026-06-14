import { Search } from 'lucide-react'

export function CourseFilters({
  keyword,
  categoryId,
  categories,
  onKeywordChange,
  onCategoryChange,
}) {
  return (
    <div className="course-filters">
      <label className="course-filters__search">
        <Search size={18} />
        <input
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="Search courses..."
        />
      </label>

      <select
        value={categoryId}
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
    </div>
  )
}