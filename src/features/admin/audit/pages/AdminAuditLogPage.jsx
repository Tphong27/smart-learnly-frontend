import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye } from "lucide-react";
import {
    DataTable,
    ErrorState,
    IconButton,
    LoadingState,
    Modal,
    SearchInput,
    useToast,
} from "@/shared/components/ui";
import { StatusBadge } from "@/shared/components/status";
import { AdminFilterToolbar } from "@/features/admin/components/AdminFilterToolbar";
import Pagination from "@/shared/components/Pagination";
import {
    AUDIT_ACTIONS,
    AUDIT_DOMAINS,
    AUDIT_RESULTS,
    auditLogService,
} from "@/services";
import {
    formatDateTime,
    formatLabel,
    shortId,
} from "@/shared/utils/formatters";
import { DEFAULT_PAGE_SIZE } from "@/shared/constants/pagination";
import "../../admin-shared.css";

/** Chuyển ISO timestamp sang giá trị phù hợp cho datetime-local. */
function toDateTimeLocal(value) {
    if (!value) return "";
    if (!value.endsWith("Z")) return value.slice(0, 16);

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

/** Chuyển datetime-local hợp lệ về ISO timestamp cho API audit. */
function fromDateTimeLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

/** Hiển thị kết quả audit bằng nhãn có text rõ ràng. */
function ResultBadge({ result }) {
    const normalized = String(result || "").toLowerCase();
    const tone = normalized === "success"
        ? "success"
        : normalized === "failure" || normalized === "failed"
          ? "danger"
          : "neutral";
    return <StatusBadge status={normalized || "draft"} label={result || "--"} tone={tone} />;
}

/** Hiển thị object audit theo danh sách key-value dễ đọc. */
function KeyValueList({ title, value }) {
    const entries =
        value && typeof value === "object" ? Object.entries(value) : [];

    return (
        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>{title}</h3>
            {entries.length === 0 ? (
                <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
                    No data.
                </p>
            ) : (
                <div
                    style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 10,
                        overflow: "hidden",
                    }}
                >
                    {entries.map(([key, item]) => (
                        <div
                            key={key}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "160px 1fr",
                                gap: 10,
                                padding: "10px 12px",
                                borderBottom: "1px solid #f1f5f9",
                                fontSize: 13,
                            }}
                        >
                            <strong style={{ color: "#475569" }}>{key}</strong>
                            <span style={{ wordBreak: "break-word" }}>
                                {typeof item === "object"
                                    ? JSON.stringify(item)
                                    : String(item ?? "--")}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

/** Tải và hiển thị chi tiết một audit log trong modal. */
function AuditDetailModal({ auditLogId, open, onClose }) {
    const toast = useToast();
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open || !auditLogId) return undefined;

        let cancelled = false;

        /** Tải chi tiết audit được chọn và bỏ qua kết quả khi modal đã đóng. */
        async function loadDetail() {
            setLoading(true);
            setError(null);

            try {
                const data = await auditLogService.get(auditLogId);
                if (!cancelled) setDetail(data);
            } catch (err) {
                const message = err?.message || "Could not load audit detail.";
                if (!cancelled) {
                    setError(message);
                    toast.error(message);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadDetail();

        return () => {
            cancelled = true;
        };
    }, [auditLogId, open, toast]);

    return (
        <Modal
            open={open}
            title="Audit event detail"
            size="lg"
            onClose={onClose}
        >
            {loading ? (
                <LoadingState compact label="Loading audit detail..." />
            ) : error ? (
                <ErrorState title="Could not load audit detail" description={error} />
            ) : !detail ? null : (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 18,
                    }}
                >
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                            gap: 12,
                        }}
                    >
                        <div>
                            <strong>Event ID</strong>
                            <br />
                            {detail.id}
                        </div>
                        <div>
                            <strong>Time</strong>
                            <br />
                            {formatDateTime(detail.occurredAt)}
                        </div>
                        <div>
                            <strong>Actor</strong>
                            <br />
                            {detail.actorEmail || detail.actorType || "--"}
                        </div>
                        <div>
                            <strong>Role</strong>
                            <br />
                            {detail.actorRole || "--"}
                        </div>
                        <div>
                            <strong>Action</strong>
                            <br />
                            {detail.action || "--"}
                        </div>
                        <div>
                            <strong>Domain</strong>
                            <br />
                            {detail.domain || "--"}
                        </div>
                        <div>
                            <strong>Target</strong>
                            <br />
                            {detail.targetType || "--"}{" "}
                            {detail.targetId ? `#${detail.targetId}` : ""}
                        </div>
                        <div>
                            <strong>Result</strong>
                            <br />
                            <ResultBadge result={detail.result} />
                        </div>
                        <div>
                            <strong>Correlation ID</strong>
                            <br />
                            {detail.correlationId || "--"}
                        </div>
                        <div>
                            <strong>Error code</strong>
                            <br />
                            {detail.errorCode || "--"}
                        </div>
                        <div>
                            <strong>IP address</strong>
                            <br />
                            {detail.ipAddress || "--"}
                        </div>
                        <div>
                            <strong>User agent</strong>
                            <br />
                            {detail.userAgent || "--"}
                        </div>
                    </div>

                    <div>
                        <strong>Summary</strong>
                        <p style={{ margin: "6px 0 0", color: "#475569" }}>
                            {detail.summary || "--"}
                        </p>
                    </div>

                    <KeyValueList title="Old values" value={detail.oldValues} />
                    <KeyValueList title="New values" value={detail.newValues} />
                    <KeyValueList title="Metadata" value={detail.metadata} />
                </div>
            )}
        </Modal>
    );
}

/** Điều phối danh sách audit, filter theo URL và modal chi tiết. */
export function AdminAuditLogPage() {
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [detailId, setDetailId] = useState(null);

    const filters = useMemo(
        () => ({
            keyword: searchParams.get("keyword") || "",
            domain: searchParams.get("domain") || "",
            action: searchParams.get("action") || "",
            result: searchParams.get("result") || "",
            actorRole: searchParams.get("actorRole") || "",
            targetType: searchParams.get("targetType") || "",
            targetId: searchParams.get("targetId") || "",
            from: searchParams.get("from") || "",
            to: searchParams.get("to") || "",
            page: Number(searchParams.get("page") || 0),
            size: Math.max(
                1,
                Number(searchParams.get("size")) || DEFAULT_PAGE_SIZE,
            ),
        }),
        [searchParams],
    );

    /** Cập nhật một filter vào URL và quay về trang đầu. */
    function updateFilter(key, value) {
        const next = new URLSearchParams(searchParams);
        if (value) next.set(key, value);
        else next.delete(key);
        next.set("page", "0");
        setSearchParams(next);
    }

    /** Đồng bộ trang audit mới vào URL. */
    function updatePage(nextPage) {
        const next = new URLSearchParams(searchParams);
        next.set("page", String(nextPage));
        setSearchParams(next);
    }

    /** Xóa filter audit nhưng giữ nguyên kích thước trang. */
    function clearFilters() {
        setSearchParams({ page: "0", size: String(filters.size) });
    }

    /** Đổi kích thước trang và quay về trang đầu. */
    function updatePageSize(nextSize) {
        const next = new URLSearchParams(searchParams);
        next.set("page", "0");
        next.set("size", String(nextSize));
        setSearchParams(next);
    }

    /** Chuẩn hóa filter nháp rồi ghi toàn bộ vào URL. */
    function applyFilters(nextFilters) {
        const next = new URLSearchParams(searchParams);
        [
            "domain",
            "action",
            "result",
            "actorRole",
            "targetType",
            "from",
            "to",
        ].forEach((key) => {
            const rawValue = nextFilters[key];
            const value =
                key === "actorRole" || key === "targetType"
                    ? String(rawValue || "")
                          .trim()
                          .toUpperCase()
                    : rawValue;
            if (value) next.set(key, value);
            else next.delete(key);
        });
        next.set("page", "0");
        setSearchParams(next);
    }

    useEffect(() => {
        let cancelled = false;

        /** Tải audit log theo filter URL hiện tại và bỏ qua request đã hủy. */
        async function loadLogs() {
            setLoading(true);
            setError(null);

            try {
                const data = await auditLogService.list({
                    ...filters,
                    from: fromDateTimeLocal(filters.from),
                    to: fromDateTimeLocal(filters.to),
                    page: filters.page,
                    size: filters.size,
                });

                if (cancelled) return;
                setItems(data.items || []);
                setPage(data.page ?? filters.page);
                setTotalPages(data.totalPages || 0);
                setTotalItems(data.totalItems || 0);
            } catch (err) {
                if (cancelled) return;
                const message = err?.message || "Could not load audit logs.";
                setError(message);
                toast.error(message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadLogs();

        return () => {
            cancelled = true;
        };
    }, [filters, toast]);

    const auditColumns = useMemo(
        () => [
            { key: "occurredAt", header: "Time", render: (row) => formatDateTime(row.occurredAt) },
            {
                key: "actor",
                header: "Actor",
                render: (row) => (
                    <div>
                        <strong>{row.actorEmail || row.actorType || "--"}</strong>
                        <div className="admin-user-cell__meta">{row.actorRole || "--"}</div>
                    </div>
                ),
            },
            { key: "action", header: "Action", render: (row) => formatLabel(row.action) },
            { key: "domain", header: "Domain", render: (row) => row.domain || "--" },
            {
                key: "target",
                header: "Target",
                render: (row) => (
                    <div>
                        <strong>{row.targetType || "--"}</strong>
                        <div className="admin-user-cell__meta">{shortId(row.targetId)}</div>
                    </div>
                ),
            },
            { key: "result", header: "Result", render: (row) => <ResultBadge result={row.result} /> },
            { key: "summary", header: "Summary", render: (row) => row.summary || "--" },
            {
                key: "actions",
                header: "Actions",
                render: (row) => (
                    <IconButton
                        label="View audit detail"
                        icon={<Eye size={16} />}
                        variant="ghost"
                        onClick={() => setDetailId(row.id)}
                    />
                ),
            },
        ],
        [],
    );

    return (
        <section className="admin-page">
            <header className="admin-page__header">
                <div>
                    <h1 className="admin-page__title">System Activity Log</h1>
                </div>
            </header>

            <section className="admin-card admin-card--flush admin-card--filterable">
                <AdminFilterToolbar
                    ariaLabel="Audit log search and filters"
                    search={
                        <SearchInput
                            id="audit-log-search"
                            ariaLabel="Search audit logs"
                            placeholder="Search actor, action, summary, or target..."
                            value={filters.keyword}
                            onChange={(value) => updateFilter("keyword", value)}
                        />
                    }
                    fields={[
                        {
                            name: "domain",
                            label: "Domain",
                            type: "select",
                            value: filters.domain,
                            options: [
                                { value: "", label: "All domains" },
                                ...AUDIT_DOMAINS.map((domain) => ({
                                    value: domain,
                                    label: domain,
                                })),
                            ],
                        },
                        {
                            name: "action",
                            label: "Action",
                            type: "select",
                            value: filters.action,
                            options: [
                                { value: "", label: "All actions" },
                                ...AUDIT_ACTIONS.map((action) => ({
                                    value: action,
                                    label: formatLabel(action),
                                })),
                            ],
                        },
                        {
                            name: "result",
                            label: "Result",
                            type: "select",
                            value: filters.result,
                            options: [
                                { value: "", label: "All results" },
                                ...AUDIT_RESULTS.map((result) => ({
                                    value: result,
                                    label: result,
                                })),
                            ],
                        },
                        {
                            name: "actorRole",
                            label: "Actor role",
                            value: filters.actorRole,
                            placeholder: "For example: ADMIN",
                        },
                        {
                            name: "targetType",
                            label: "Target type",
                            value: filters.targetType,
                            placeholder: "For example: USER",
                        },
                        {
                            name: "from",
                            label: "From date and time",
                            type: "datetime-local",
                            value: toDateTimeLocal(filters.from),
                        },
                        {
                            name: "to",
                            label: "To date and time",
                            type: "datetime-local",
                            value: toDateTimeLocal(filters.to),
                        },
                    ]}
                    activeFilterCount={
                        [
                            filters.domain,
                            filters.action,
                            filters.result,
                            filters.actorRole,
                            filters.targetType,
                            filters.from,
                            filters.to,
                        ].filter(Boolean).length
                    }
                    canClear={Boolean(
                        filters.keyword ||
                        filters.domain ||
                        filters.action ||
                        filters.result ||
                        filters.actorRole ||
                        filters.targetType ||
                        filters.from ||
                        filters.to,
                    )}
                    resultLabel={`${totalItems} events`}
                    onApply={applyFilters}
                    onClear={clearFilters}
                />

                {error ? (
                    <ErrorState title="Could not load audit logs" description={error} />
                ) : (
                    <DataTable
                        ariaLabel="Audit log data"
                        columns={auditColumns}
                        rows={items}
                        loading={loading}
                        loadingLabel="Loading audit logs..."
                        emptyTitle="No audit events found"
                        emptyDescription="No events match the current search and filters."
                    />
                )}

                <Pagination
                    page={page + 1}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    size={filters.size}
                    disabled={loading}
                    ariaLabel="Audit log pagination"
                    onPageChange={(nextPage) => updatePage(nextPage - 1)}
                    onSizeChange={updatePageSize}
                />
            </section>

            <AuditDetailModal
                auditLogId={detailId}
                open={Boolean(detailId)}
                onClose={() => setDetailId(null)}
            />
        </section>
    );
}
