/** Hiển thị trạng thái validation của một import row. */
export function QuestionImportStatusBadge({ row }) {
  if (!row.errors?.length) {
    return <span className="admin-status admin-status--approved">Valid</span>;
  }
  return (
    <span className="admin-status admin-status--archived">
      Invalid ({row.errors.length})
    </span>
  );
}

/** Tóm tắt tổng số row hợp lệ và lỗi trong preview batch. */
export function QuestionImportSummary({ parsedRows }) {
  const total = parsedRows.length;
  const valid = parsedRows.filter((row) => !row.errors?.length).length;
  const invalid = total - valid;
  if (!total) return null;
  return (
    <div className="question-import__summary">
      <span><strong>Total rows:</strong> {total}</span>
      <span><strong>Valid:</strong> {valid}</span>
      <span><strong>Errors:</strong> {invalid}</span>
    </div>
  );
}
