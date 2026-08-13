import { EmptyState, LoadingState } from "../State";
import "./Table.css";

/** Bọc semantic table trong vùng responsive và cung cấp accessible label. */
export function Table({
  children,
  ariaLabel,
  className = "",
  tableClassName = "",
}) {
  return (
    <div className={`ui-table-wrap${className ? ` ${className}` : ""}`} role="region" aria-label={ariaLabel} tabIndex={0}>
      <table className={`ui-table${tableClassName ? ` ${tableClassName}` : ""}`}>{children}</table>
    </div>
  );
}

/** Render bảng từ cấu hình cột cho các danh sách quản trị đơn giản và nhất quán. */
export function DataTable({
  columns,
  rows,
  rowKey = "id",
  ariaLabel = "Data table",
  loading = false,
  loadingLabel = "Loading data...",
  emptyTitle = "No data found",
  emptyDescription,
  emptyAction,
  getRowClassName,
}) {
  if (loading) return <LoadingState label={loadingLabel} />;
  if (!rows?.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <Table ariaLabel={ariaLabel}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col" className={column.headerClassName}>{column.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={typeof rowKey === "function" ? rowKey(row) : row[rowKey]} className={getRowClassName?.(row)}>
            {columns.map((column) => {
              const value = column.render
                ? column.render(row, rowIndex)
                : row[column.accessor || column.key];
              return (
                <td key={column.key} data-label={column.mobileLabel || column.header} className={column.cellClassName}>
                  {value}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
