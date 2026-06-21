import { Grid2X2, List } from 'lucide-react'

export function CourseListToolbar({
  totalElements,
  viewMode,
  onViewModeChange,
}) {
  return (
    <div className="course-list-toolbar">
      <p>
        Found <strong>{totalElements}</strong> courses
      </p>

      <div className="course-list-toolbar__actions">
        <button
          type="button"
          className={viewMode === 'grid' ? 'is-active' : ''}
          onClick={() => onViewModeChange('grid')}
          aria-label="Grid view"
        >
          <Grid2X2 size={18} />
        </button>

        <button
          type="button"
          className={viewMode === 'list' ? 'is-active' : ''}
          onClick={() => onViewModeChange('list')}
          aria-label="List view"
        >
          <List size={18} />
        </button>
      </div>
    </div>
  )
}