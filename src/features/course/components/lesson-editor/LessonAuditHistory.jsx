import Pagination from "@/shared/components/Pagination";
import { StatusBadge } from "@/shared/components/status";
import { DataTable } from "@/shared/components/ui";

/** Định dạng thời gian audit theo locale đang dùng ở màn hình quản trị. */
function formatDateTime(isoString) {
    if (!isoString) return "---";
    try {
        const date = new Date(isoString);
        return date.toLocaleString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    } catch {
        return isoString;
    }
}

/** Hiển thị lịch sử audit và chuyển page UI một-based về page API zero-based. */
export function LessonAuditHistory({
    historyLoading,
    editHistory,
    currentPage,
    pageSize,
    totalElements,
    totalPages,
    onPageChange,
}) {
    const columns = [
        {
            key: "occurredAt",
            header: "Timestamp",
            render: (log) => formatDateTime(log.occurredAt),
        },
        {
            key: "actorEmail",
            header: "Actor",
            render: (log) => log.actorEmail || "N/A",
        },
        {
            key: "actorRole",
            header: "Role",
            render: (log) => (
                <StatusBadge
                    status={log.actorRole || "unknown"}
                    label={log.actorRole || "N/A"}
                    tone="neutral"
                />
            ),
        },
        {
            key: "summary",
            header: "Action / Summary",
            render: (log) => log.summary || "---",
        },
        {
            key: "result",
            header: "Status",
            render: (log) => (
                <StatusBadge
                    status={log.result || "unknown"}
                    label={log.result || "Unknown"}
                    tone={log.result === "SUCCESS" ? "success" : "danger"}
                />
            ),
        },
    ];

    return (
        <section className="sl-cm-lesson-editor__audit">
            <h2 className="sl-cm-lesson-editor__audit-title">Activity log</h2>

            <DataTable
                ariaLabel="Lesson activity log"
                columns={columns}
                rows={editHistory}
                loading={historyLoading}
                loadingLabel="Loading lesson activity..."
                emptyTitle="No activity yet"
                emptyDescription="Changes to this lesson will appear here."
            />

            <Pagination
                page={currentPage + 1}
                totalPages={totalPages}
                totalItems={totalElements}
                size={pageSize}
                onPageChange={(nextPage) => onPageChange(nextPage - 1)}
                ariaLabel="Lesson activity pagination"
            />
        </section>
    );
}
