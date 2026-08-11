import { Search } from "lucide-react";
import { useEffect, useState } from "react";

/** Hiển thị bộ lọc tên lớp, khóa học và trạng thái lớp. */
export function ClassListFilters({
  courseId = "",
  courseOptions = [],
  courseOptionsLoading = false,
  courseOptionsError = "",
  onCourseChange,
  onFilterChange,
}) {
  const [filters, setFilters] = useState({
    keyword: "",
    status: "",
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onFilterChange?.(filters);
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [filters, onFilterChange]);

  /** Cập nhật một điều kiện lọc nội bộ. */
  function updateFilter(key, value) {
    setFilters((current) => {
      if (current[key] === value) {
        return current;
      }

      return {
        ...current,
        [key]: value,
      };
    });
  }

  return (
    <div className="class-filters">
      <label className="class-filters__item">
        <Search size={18} aria-hidden="true" />

        <span className="sr-only">Search classes</span>

        <input
          type="search"
          placeholder="Search by class name..."
          value={filters.keyword}
          onChange={(event) =>
            updateFilter("keyword", event.target.value)
          }
          className="class-filters__input"
        />
      </label>

      <select
        value={courseId}
        onChange={(event) => onCourseChange?.(event.target.value)}
        className="class-filters__select"
        aria-label="Filter classes by course"
        disabled={courseOptionsLoading}
      >
        <option value="">
          {courseOptionsLoading ? "Loading courses..." : "All Courses"}
        </option>

        {courseOptions.map((course) => (
          <option key={course.id} value={course.id}>
            {course.title || course.name || "Untitled course"}
          </option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(event) =>
          updateFilter("status", event.target.value)
        }
        className="class-filters__select"
        aria-label="Filter classes by status"
      >
        <option value="">All Status</option>
        <option value="upcoming">Upcoming</option>
        <option value="ongoing">Ongoing</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>

      {courseOptionsError && (
        <p className="class-filters__error" role="status">
          {courseOptionsError}
        </p>
      )}
    </div>
  );
}