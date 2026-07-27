import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { courseService } from "@/services";

export function ClassListFilters({
  initialCourseId = "",
  onClearCourseFilter,
  onFilterChange,
}) {
  const [filters, setFilters] = useState({
    keyword: "",
    status: "",
  });
  const [courseInfo, setCourseInfo] = useState({
    courseId: "",
    title: "",
    loaded: false,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onFilterChange?.({
        ...filters,
        courseId: initialCourseId,
      });
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [filters, initialCourseId, onFilterChange]);

  useEffect(() => {
    if (!initialCourseId) {
      return undefined;
    }

    let cancelled = false;

    async function fetchCourseTitle() {
      try {
        const course = await courseService.getAdmin(initialCourseId);

        if (cancelled) {
          return;
        }

        setCourseInfo({
          courseId: initialCourseId,
          title:
            course?.title?.trim() ||
            course?.name?.trim() ||
            "Course unavailable",
          loaded: true,
        });
      } catch {
        if (cancelled) {
          return;
        }

        setCourseInfo({
          courseId: initialCourseId,
          title: "Course unavailable",
          loaded: true,
        });
      }
    }

    fetchCourseTitle();

    return () => {
      cancelled = true;
    };
  }, [initialCourseId]);

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

  const displayedCourseTitle =
    courseInfo.courseId === initialCourseId && courseInfo.loaded
      ? courseInfo.title
      : "Loading...";

  return (
    <div className="class-filters">
      <label className="class-filters__item">
        <Search size={18} aria-hidden="true" />

        <span className="sr-only">Search classes</span>

        <input
          type="search"
          placeholder="Search by class name..."
          value={filters.keyword}
          onChange={(event) => updateFilter("keyword", event.target.value)}
          className="class-filters__input"
        />
      </label>

      <select
        value={filters.status}
        onChange={(event) => updateFilter("status", event.target.value)}
        className="class-filters__select"
        aria-label="Filter classes by status"
      >
        <option value="">All Status</option>
        <option value="upcoming">Upcoming</option>
        <option value="ongoing">Ongoing</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>

      {initialCourseId && (
        <div className="class-filters__course-chip">
          <span>Filtered by course:</span>

          <strong title={displayedCourseTitle}>{displayedCourseTitle}</strong>

          <button
            type="button"
            onClick={onClearCourseFilter}
            aria-label="Clear course filter"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}