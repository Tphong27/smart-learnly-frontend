import { useId } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./Pagination.css";

function getPageItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-right", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis-left",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis-left",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-right",
    totalPages,
  ];
}

export function Pagination({
  page = 1,
  totalPages = 1,
  totalItems = 0,
  size = 20,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onSizeChange,
  disabled = false,
  ariaLabel = "Pagination",
  className = "",
}) {
  const selectId = useId();
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const currentPage = Math.min(Math.max(1, Number(page) || 1), safeTotalPages);
  const safeTotalItems = Math.max(0, Number(totalItems) || 0);
  const safeSize = Math.max(1, Number(size) || 1);
  const pageItems = getPageItems(currentPage, safeTotalPages);
  const sizeOptions = Array.from(
    new Set([...pageSizeOptions, safeSize].map(Number).filter((value) => value > 0)),
  ).sort((left, right) => left - right);

  if (safeTotalItems === 0 || (safeTotalPages <= 1 && !onSizeChange)) return null;

  const startItem = (currentPage - 1) * safeSize + 1;
  const endItem = Math.min(currentPage * safeSize, safeTotalItems);

  function changePage(nextPage) {
    if (disabled || nextPage === currentPage || nextPage < 1 || nextPage > safeTotalPages) return;
    onPageChange?.(nextPage);
  }

  return (
    <nav className={`modern-pagination-container ${className}`.trim()} aria-label={ariaLabel}>
      <span className="pagination-screen-reader-status" aria-live="polite">
        Page {currentPage} of {safeTotalPages}. Showing items {startItem} through {endItem} of {safeTotalItems}.
      </span>
      <div className="pagination-summary">
        <p className="pagination-info">
          Showing <strong>{startItem}–{endItem}</strong> of <strong>{safeTotalItems}</strong>
        </p>

        {onSizeChange && (
          <label className="pagination-size" htmlFor={selectId}>
            <span>Rows per page</span>
            <select
              id={selectId}
              value={safeSize}
              disabled={disabled}
              onChange={(event) => onSizeChange(Number(event.target.value))}
            >
              {sizeOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        )}

        <span className="pagination-mobile-status" aria-hidden="true">
          Page {currentPage} of {safeTotalPages}
        </span>
      </div>

      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-nav-btn"
          disabled={disabled || currentPage === 1}
          aria-label="Go to previous page"
          onClick={() => changePage(currentPage - 1)}
        >
          <ChevronLeft size={17} aria-hidden="true" />
          <span>Previous</span>
        </button>

        <div className="page-numbers" aria-label={`Page ${currentPage} of ${safeTotalPages}`}>
          {pageItems.map((item) => {
            if (typeof item === "string") {
              return (
                <span key={item} className="pagination-ellipsis" aria-hidden="true">…</span>
              );
            }

            const isActive = item === currentPage;
            return (
              <button
                key={item}
                type="button"
                className={`page-number-btn${isActive ? " active" : ""}`}
                aria-label={isActive ? `Page ${item}, current page` : `Go to page ${item}`}
                aria-current={isActive ? "page" : undefined}
                disabled={disabled}
                onClick={() => changePage(item)}
              >
                {item}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="pagination-nav-btn"
          disabled={disabled || currentPage === safeTotalPages}
          aria-label="Go to next page"
          onClick={() => changePage(currentPage + 1)}
        >
          <span>Next</span>
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
