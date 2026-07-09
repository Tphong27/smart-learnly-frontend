import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { courseService } from "@/services";

export function ClassListFilters({ initialCourseId = "", onClearCourseFilter, onFilterChange }) {
  const [filters, setFilters] = useState({
    keyword: "",
    status: "",
    courseId: initialCourseId,
  });
  // Cache tiêu đề khoá học đang lọc để hiển thị thân thiện thay vì UUID.
  const [courseTitle, setCourseTitle] = useState("");

  useEffect(() => {
    setFilters((current) => {
      if (current.courseId === initialCourseId) {
        return current;
      }

      return {
        ...current,
        courseId: initialCourseId,
      };
    });
  }, [initialCourseId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onFilterChange?.(filters);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [filters, onFilterChange]);

  // Fetch course title theo id để hiển thị tên khoá học trong filter chip.
  useEffect(() => {
    let cancelled = false;
    if (!filters.courseId) {
      setCourseTitle("");
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const course = await courseService.getAdmin(filters.courseId);
        if (!cancelled) {
          setCourseTitle(course?.title || course?.name || "");
        }
      } catch {
        if (!cancelled) setCourseTitle("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.courseId]);

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
      <div className="class-filters__item">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search by class name..."
          value={filters.keyword}
          onChange={(event) => updateFilter("keyword", event.target.value)}
          className="class-filters__input"
        />
      </div>

      <select
        value={filters.status}
        onChange={(event) => updateFilter("status", event.target.value)}
        className="class-filters__select"
      >
        <option value="">All Status</option>
        <option value="upcoming">Upcoming</option>
        <option value="ongoing">Ongoing</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>

      {filters.courseId && (
        <div className="class-filters__course-chip">
          <span>Filtered by course:</span>
          <strong title={filters.courseId}>
            {courseTitle || "Loading..."}
          </strong>
          <button type="button" onClick={onClearCourseFilter}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}