import { RotateCcw, Search } from 'lucide-react'

export function CourseFilterBar({
  filters,
  categories,
  levels,
  statuses,
  resultCount,
  totalCourses,
  onFilterChange,
  onReset,
}) {
  return (
    <div className="course-catalog-filter">
      <div className="course-search-box">
        <Search size={17} />
        <input
          type="search"
          value={filters.keyword}
          placeholder="Search course, category, outcome..."
          onChange={(event) => onFilterChange('keyword', event.target.value)}
        />
      </div>

      <div className="course-filter-row">
        <select
          value={filters.category}
          onChange={(event) => onFilterChange('category', event.target.value)}
          aria-label="Filter courses by category"
        >
          {categories.map((category) => (
            <option value={category} key={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          value={filters.level}
          onChange={(event) => onFilterChange('level', event.target.value)}
          aria-label="Filter courses by level"
        >
          {levels.map((level) => (
            <option value={level} key={level}>
              {level}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(event) => onFilterChange('status', event.target.value)}
          aria-label="Filter courses by status"
        >
          {statuses.map((status) => (
            <option value={status} key={status}>
              {status === 'published'
                ? 'Published only'
                : status === 'draft'
                  ? 'Draft only'
                  : status}
            </option>
          ))}
        </select>

        <button className="course-reset-button" type="button" onClick={onReset}>
          <RotateCcw size={15} />
          Reset
        </button>
      </div>

      <p className="course-result-count">
        Showing <strong>{resultCount}</strong> of <strong>{totalCourses}</strong> courses
      </p>
    </div>
  )
}