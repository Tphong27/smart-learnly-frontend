import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Button, Input } from "@/shared/components/ui";
import {
  STUDENT_INDICATOR_OPTIONS,
  STUDENT_PROGRESS_OPTIONS,
} from "../constants/studentPerformanceFilters";

export function StudentPerformanceFilters({
  keyword,
  progress,
  indicator,
  debounceMs = 350,
  onKeywordChange,
  onProgressChange,
  onIndicatorChange,
  onClear,
}) {
  const [searchValue, setSearchValue] = useState(keyword);

  useEffect(() => {
    if (searchValue === keyword || debounceMs <= 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      onKeywordChange(searchValue);
    }, debounceMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [debounceMs, keyword, onKeywordChange, searchValue]);

  const hasActiveFilters =
    searchValue.trim() !== "" || progress !== "all" || indicator !== "all";

  function clearFilters() {
    setSearchValue("");
    onClear();
  }

  return (
    <div
      className="student-performance-filters"
      role="search"
      aria-label="Filter student performance"
    >
      <Input
        id="student-performance-search"
        type="search"
        label="Search student"
        placeholder="Search by name or email..."
        value={searchValue}
        leftIcon={<Search size={18} aria-hidden="true" />}
        onChange={(event) => setSearchValue(event.target.value)}
      />

      <label
        className="student-performance-filter-field"
        htmlFor="student-progress-filter"
      >
        <span>Progress</span>

        <select
          id="student-progress-filter"
          value={progress}
          onChange={(event) => onProgressChange(event.target.value)}
        >
          {STUDENT_PROGRESS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label
        className="student-performance-filter-field"
        htmlFor="student-indicator-filter"
      >
        <span>Indicators</span>

        <select
          id="student-indicator-filter"
          value={indicator}
          onChange={(event) => onIndicatorChange(event.target.value)}
        >
          {STUDENT_INDICATOR_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <Button
        type="button"
        variant="secondary"
        className="student-performance-filters__clear"
        disabled={!hasActiveFilters}
        onClick={clearFilters}
      >
        <X size={17} aria-hidden="true" />
        Clear
      </Button>
    </div>
  );
}