import { Pagination } from "@/shared/components/Pagination";
import {
  formatDateTime,
  formatNumber,
  formatPercent,
  toNumber,
} from "@/shared/utils/formatters";
import { StudentPerformanceFilters } from "./StudentPerformanceFilters";

function clampProgress(value) {
  return Math.min(100, Math.max(0, toNumber(value)));
}

export function StudentPerformanceTable({
  studentPage,
  totalStudents,
  filters,
  refreshing = false,
  onKeywordChange,
  onProgressChange,
  onIndicatorChange,
  onClearFilters,
  onPageChange,
  onSizeChange,
}) {
  const students = Array.isArray(studentPage?.items) ? studentPage.items : [];

  const filteredTotal = Number(studentPage?.totalItems) || 0;

  const page = Number(studentPage?.page) || 0;

  const size = Number(studentPage?.size) || filters.size;

  const totalPages = Number(studentPage?.totalPages) || 0;

  const hasActiveFilters =
    filters.keyword.trim() !== "" ||
    filters.progress !== "all" ||
    filters.indicator !== "all";

  const countLabel = hasActiveFilters
    ? `${filteredTotal} of ${totalStudents} students`
    : `${totalStudents} students`;

  const emptyMessage =
    totalStudents === 0
      ? "No student analytics available."
      : "No students match the current filters.";

  return (
    <section className="analytics-panel" aria-busy={refreshing}>
      <div className="analytics-panel__header">
        <h2>Student Performance</h2>

        <span className="analytics-panel__count" aria-live="polite">
          {countLabel}
        </span>
      </div>

      <StudentPerformanceFilters
        keyword={filters.keyword}
        progress={filters.progress}
        indicator={filters.indicator}
        debounceMs={350}
        onKeywordChange={onKeywordChange}
        onProgressChange={onProgressChange}
        onIndicatorChange={onIndicatorChange}
        onClear={onClearFilters}
      />

      <div className="analytics-table-wrapper">
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Progress</th>
              <th>Test Average</th>
              <th>Assignment Average</th>
              <th>Last Activity</th>
              <th>Indicators</th>
            </tr>
          </thead>

          <tbody>
            {students.map((student) => {
              const progress = clampProgress(student.progressPercent);

              return (
                <tr key={student.studentId}>
                  <td>
                    <div className="analytics-student">
                      <strong>{student.studentName}</strong>
                      <span>{student.email}</span>
                    </div>
                  </td>

                  <td>
                    <div className="analytics-progress-cell">
                      <div className="analytics-progress-track">
                        <div
                          className="analytics-progress-fill"
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>

                      <span>{formatPercent(progress)}</span>
                    </div>
                  </td>

                  <td>{formatNumber(student.averageTestScore)}</td>

                  <td>{formatNumber(student.averageAssignmentScore)}</td>

                  <td>{formatDateTime(student.lastActivityAt)}</td>

                  <td>
                    <div className="analytics-indicators">
                      {student.inactive && (
                        <span className="analytics-badge analytics-badge--warning">
                          Inactive
                        </span>
                      )}

                      {student.hasLateSubmission && (
                        <span className="analytics-badge analytics-badge--danger">
                          Late submission
                        </span>
                      )}

                      {!student.inactive && !student.hasLateSubmission && (
                        <span className="analytics-badge analytics-badge--success">
                          No alert
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {students.length === 0 && (
              <tr>
                <td colSpan={6} className="analytics-table__empty">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page + 1}
        totalPages={totalPages}
        totalItems={filteredTotal}
        size={size}
        pageSizeOptions={[5, 10, 20, 50]}
        disabled={refreshing}
        ariaLabel="Student performance pagination"
        onPageChange={onPageChange}
        onSizeChange={onSizeChange}
      />
    </section>
  );
}
