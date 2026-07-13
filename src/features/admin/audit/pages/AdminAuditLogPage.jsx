import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, Search } from "lucide-react";
import { FormField, Modal, useToast } from "@/shared/components/ui";
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

function toDateTimeLocal(value) {
  if (!value) return "";
  if (!value.endsWith("Z")) return value.slice(0, 16);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function ResultBadge({ result }) {
  const normalized = String(result || "").toLowerCase();
  return (
    <span className={`admin-status admin-status--${normalized || "draft"}`}>
      {result || "--"}
    </span>
  );
}

function KeyValueList({ title, value }) {
  const entries = value && typeof value === "object" ? Object.entries(value) : [];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <h3 style={{ margin: 0, fontSize: 14 }}>{title}</h3>
      {entries.length === 0 ? (
        <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>No data.</p>
      ) : (
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
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
                {typeof item === "object" ? JSON.stringify(item) : String(item ?? "--")}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AuditDetailModal({ auditLogId, open, onClose }) {
  const toast = useToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !auditLogId) return undefined;

    let cancelled = false;

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
    <Modal open={open} title="Audit event detail" size="lg" onClose={onClose}>
      {loading ? (
        <div className="admin-loading">Loading audit detail...</div>
      ) : error ? (
        <div className="admin-error">{error}</div>
      ) : !detail ? null : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
            <div><strong>Event ID</strong><br />{detail.id}</div>
            <div><strong>Time</strong><br />{formatDateTime(detail.occurredAt)}</div>
            <div><strong>Actor</strong><br />{detail.actorEmail || detail.actorType || "--"}</div>
            <div><strong>Role</strong><br />{detail.actorRole || "--"}</div>
            <div><strong>Action</strong><br />{detail.action || "--"}</div>
            <div><strong>Domain</strong><br />{detail.domain || "--"}</div>
            <div><strong>Target</strong><br />{detail.targetType || "--"} {detail.targetId ? `#${detail.targetId}` : ""}</div>
            <div><strong>Result</strong><br /><ResultBadge result={detail.result} /></div>
            <div><strong>Correlation ID</strong><br />{detail.correlationId || "--"}</div>
            <div><strong>Error code</strong><br />{detail.errorCode || "--"}</div>
            <div><strong>IP address</strong><br />{detail.ipAddress || "--"}</div>
            <div><strong>User agent</strong><br />{detail.userAgent || "--"}</div>
          </div>

          <div>
            <strong>Summary</strong>
            <p style={{ margin: "6px 0 0", color: "#475569" }}>{detail.summary || "--"}</p>
          </div>

          <KeyValueList title="Old values" value={detail.oldValues} />
          <KeyValueList title="New values" value={detail.newValues} />
          <KeyValueList title="Metadata" value={detail.metadata} />
        </div>
      )}
    </Modal>
  );
}

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

  const filters = useMemo(() => ({
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
    size: Math.max(1, Number(searchParams.get("size")) || DEFAULT_PAGE_SIZE),
  }), [searchParams]);

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "0");
    setSearchParams(next);
  }

  function updatePage(nextPage) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    setSearchParams(next);
  }

  function clearFilters() {
    setSearchParams({ page: "0", size: String(filters.size) });
  }

  function updatePageSize(nextSize) {
    const next = new URLSearchParams(searchParams);
    next.set("page", "0");
    next.set("size", String(nextSize));
    setSearchParams(next);
  }

  function applyFilters(nextFilters) {
    const next = new URLSearchParams(searchParams);
    ["domain", "action", "result", "actorRole", "targetType", "from", "to"].forEach((key) => {
      const rawValue = nextFilters[key];
      const value = key === "actorRole" || key === "targetType"
        ? String(rawValue || "").trim().toUpperCase()
        : rawValue;
      if (value) next.set(key, value);
      else next.delete(key);
    });
    next.set("page", "0");
    setSearchParams(next);
  }

  useEffect(() => {
    let cancelled = false;

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
          search={(
            <FormField
              id="audit-log-search"
              aria-label="Search audit logs"
              placeholder="Search actor, action, summary, or target..."
              value={filters.keyword}
              onChange={(event) => updateFilter("keyword", event.target.value)}
              leftIcon={<Search size={16} />}
            />
          )}
          fields={[
            {
              name: "domain",
              label: "Domain",
              type: "select",
              value: filters.domain,
              options: [
                { value: "", label: "All domains" },
                ...AUDIT_DOMAINS.map((domain) => ({ value: domain, label: domain })),
              ],
            },
            {
              name: "action",
              label: "Action",
              type: "select",
              value: filters.action,
              options: [
                { value: "", label: "All actions" },
                ...AUDIT_ACTIONS.map((action) => ({ value: action, label: formatLabel(action) })),
              ],
            },
            {
              name: "result",
              label: "Result",
              type: "select",
              value: filters.result,
              options: [
                { value: "", label: "All results" },
                ...AUDIT_RESULTS.map((result) => ({ value: result, label: result })),
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
          activeFilterCount={[
            filters.domain,
            filters.action,
            filters.result,
            filters.actorRole,
            filters.targetType,
            filters.from,
            filters.to,
          ].filter(Boolean).length}
          canClear={Boolean(
            filters.keyword
            || filters.domain
            || filters.action
            || filters.result
            || filters.actorRole
            || filters.targetType
            || filters.from
            || filters.to
          )}
          resultLabel={`${totalItems} events`}
          onApply={applyFilters}
          onClear={clearFilters}
        />

        {loading ? (
          <div className="admin-loading">Loading audit logs...</div>
        ) : error ? (
          <div className="admin-error">{error}</div>
        ) : items.length === 0 ? (
          <div className="admin-empty">No audit events match the current filters.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Domain</th>
                  <th>Target</th>
                  <th>Result</th>
                  <th>Summary</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTime(row.occurredAt)}</td>
                    <td>
                      <strong>{row.actorEmail || row.actorType || "--"}</strong>
                      <div style={{ color: "#94a3b8", fontSize: 12 }}>{row.actorRole || "--"}</div>
                    </td>
                    <td>{formatLabel(row.action)}</td>
                    <td>{row.domain || "--"}</td>
                    <td>
                      <strong>{row.targetType || "--"}</strong>
                      <div style={{ color: "#94a3b8", fontSize: 12 }}>{shortId(row.targetId)}</div>
                    </td>
                    <td><ResultBadge result={row.result} /></td>
                    <td style={{ minWidth: 240 }}>{row.summary || "--"}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="admin-table__icon-btn" type="button" onClick={() => setDetailId(row.id)} aria-label="View audit detail">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      <AuditDetailModal auditLogId={detailId} open={Boolean(detailId)} onClose={() => setDetailId(null)} />
    </section>
  );
}
