import { Search } from "lucide-react";
import { useEffect, useState } from "react";

export function ClassListFilters({ onFilterChange }) {
  const [filters, setFilters] = useState({
    keyword: "",
    status: "",
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onFilterChange?.(filters);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [filters, onFilterChange]);

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
        <option value="">All Statuses</option>
        <option value="upcoming">Upcoming</option>
        <option value="ongoing">Ongoing</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>
  );
}