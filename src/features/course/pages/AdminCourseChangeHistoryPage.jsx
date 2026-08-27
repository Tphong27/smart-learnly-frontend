import { useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowLeft, Eye } from "lucide-react";
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
  COURSE_CHANGE_ACTIONS,
  COURSE_CHANGE_ACTOR_ROLES,
  // COURSE_CHANGE_RESULTS,
  courseChangeHistoryService,
} from "../services/courseChangeHistoryService";
import {
  formatDateTime,
  shortId,
} from "@/shared/utils/formatters";
import { DEFAULT_PAGE_SIZE } from "@/shared/constants/pagination";
import "../../admin/admin-shared.css";

/** Short English labels for course-scoped action enums. */
const ACTION_LABELS = {
  COURSE_CREATED: "Course created",
  COURSE_UPDATED: "Course updated",
  COURSE_PUBLISHED: "Course published",
  COURSE_DEACTIVATED: "Course deactivated",
  COURSE_DELETED: "Course deleted",
  SECTION_CREATED: "Section created",
  SECTION_UPDATED: "Section updated",
  SECTION_DELETED: "Section deleted",
  SECTIONS_REORDERED: "Sections reordered",
  LESSON_CREATED: "Lesson created",
  LESSON_UPDATED: "Lesson updated",
  LESSON_DEACTIVATED: "Lesson deactivated",
  LESSON_DELETED: "Lesson deleted",
  LESSONS_REORDERED: "Lessons reordered",
  CLASS_CURRICULUM_DRAFT_INITIALIZED: "Class curriculum draft initialized",
  CLASS_CURRICULUM_PUBLISHED: "Class curriculum published",
  QUESTION_BANK_CREATED: "Question created",
  QUESTION_BANK_UPDATED: "Question updated",
  QUESTION_BANK_ARCHIVED: "Question archived",
  QUESTION_BANK_RESTORED: "Question restored",
  FLASHCARD_SET_CREATED: "Flashcard set created",
  FLASHCARD_SET_UPDATED: "Flashcard set updated",
  FLASHCARD_SET_DELETED: "Flashcard set deleted",
  FLASHCARD_CARD_CREATED: "Flashcard card created",
  FLASHCARD_CARD_UPDATED: "Flashcard card updated",
  FLASHCARD_CARD_DELETED: "Flashcard card deleted",
  FLASHCARD_CARDS_REORDERED: "Flashcard cards reordered",
  ASSIGNMENT_CREATED: "Assignment created",
  ASSIGNMENT_UPDATED: "Assignment updated",
  ASSIGNMENT_DELETED: "Assignment deleted",
};

function formatCourseChangeAction(action) {
  if (!action) return "--";
  return ACTION_LABELS[action] || String(action).replaceAll("_", " ");
}

/** Convert ISO timestamp to datetime-local value. */
function toDateTimeLocal(value) {
  if (!value) return "";
  if (!value.endsWith("Z")) return value.slice(0, 16);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

/** Convert valid datetime-local to ISO for the API. */
function fromDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function ResultBadge({ result }) {
  const normalized = String(result || "").toLowerCase();
  const tone =
    normalized === "success"
      ? "success"
      : normalized === "failure" || normalized === "failed"
        ? "danger"
        : "neutral";
  return (
    <StatusBadge
      status={normalized || "draft"}
      label={result || "--"}
      tone={tone}
    />
  );
}

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

function ChangeHistoryDetailModal({ courseId, auditLogId, open, onClose }) {
  const toast = useToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !auditLogId || !courseId) return undefined;

    let cancelled = false;

    async function loadDetail() {
      setLoading(true);
      setError(null);

      try {
        const data = await courseChangeHistoryService.get(courseId, auditLogId);
        if (!cancelled) setDetail(data);
      } catch (err) {
        const message =
          err?.message || "Could not load change history detail.";
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
  }, [auditLogId, courseId, open, toast]);

  return (
    <Modal
      open={open}
      title="Change detail"
      size="lg"
      onClose={onClose}
    >
      {loading ? (
        <LoadingState compact label="Loading detail..." />
      ) : error ? (
        <ErrorState title="Could not load detail" description={error} />
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
              {formatCourseChangeAction(detail.action)}
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

/**
 * Per-course change history timeline — TMO/SME only (route guard).
 * Clones AdminAuditLogPage pattern; calls course-scoped API, not global audit.
 */
export default function AdminCourseChangeHistoryPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const courseId = params.courseId || params.id;
  const [searchParams, setSearchParams] = useSearchParams();

  const isStaffRoute = location.pathname.startsWith("/staff/");
  const courseBasePath = isStaffRoute ? "/staff/courses" : "/admin/courses";
  const courseContentPath = `${courseBasePath}/${courseId}/content`;
  const courseListPath = courseBasePath;

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
      action: searchParams.get("action") || "",
      actorRole: searchParams.get("actorRole") || "",
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
    ["action", "actorRole", "from", "to"].forEach((key) => {
      const rawValue = nextFilters[key];
      const value =
        key === "actorRole"
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
    if (!courseId) return undefined;

    let cancelled = false;

    async function loadLogs() {
      setLoading(true);
      setError(null);

      try {
        const data = await courseChangeHistoryService.list(courseId, {
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
        const message =
          err?.message || "Could not load course change history.";
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
  }, [courseId, filters, toast]);

  const columns = useMemo(
    () => [
      {
        key: "occurredAt",
        header: "Time",
        render: (row) => formatDateTime(row.occurredAt),
      },
      {
        key: "actor",
        header: "Actor",
        render: (row) => (
          <div>
            <strong>{row.actorEmail || row.actorType || "--"}</strong>
            <div className="admin-user-cell__meta">
              {row.actorRole || "--"}
            </div>
          </div>
        ),
      },
      {
        key: "action",
        header: "Action",
        render: (row) => formatCourseChangeAction(row.action),
      },
      {
        key: "target",
        header: "Target",
        render: (row) => (
          <div>
            <strong>{row.targetType || "--"}</strong>
            <div className="admin-user-cell__meta">
              {shortId(row.targetId)}
            </div>
          </div>
        ),
      },
      {
        key: "result",
        header: "Result",
        render: (row) => <ResultBadge result={row.result} />,
      },
      {
        key: "summary",
        header: "Summary",
        render: (row) => row.summary || "--",
      },
      {
        key: "actions",
        header: "",
        render: (row) => (
          <IconButton
            label="View detail"
            icon={<Eye size={16} />}
            variant="ghost"
            onClick={() => setDetailId(row.id)}
          />
        ),
      },
    ],
    [],
  );

  if (!courseId) {
    return (
      <section className="admin-page">
        <ErrorState
          title="Missing course ID"
          description="Could not determine courseId from the URL."
        />
      </section>
    );
  }

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            <button
              type="button"
              className="sl-cm-btn sl-cm-btn--ghost"
              onClick={() => navigate(courseContentPath)}
            >
              <ArrowLeft size={16} aria-hidden="true" /> Course structure
            </button>
            <button
              type="button"
              className="sl-cm-btn sl-cm-btn--ghost"
              onClick={() => navigate(courseListPath)}
            >
              Course list
            </button>
          </div>
          <div>
            <h1 className="admin-page__title">
              Change history
            </h1>
            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>
              Track content changes by SME, Trainer, and TMO on this course
              (up to 90 days).
            </p>
          </div>
        </div>
      </header>

      <section className="admin-card admin-card--flush admin-card--filterable">
        <AdminFilterToolbar
          ariaLabel="Course change history filters"
          search={
            <SearchInput
              id="course-change-history-search"
              ariaLabel="Search change history"
              placeholder="Search actor, action, summary, target..."
              value={filters.keyword}
              onChange={(value) => updateFilter("keyword", value)}
            />
          }
          fields={[
            {
              name: "action",
              label: "Action",
              type: "select",
              value: filters.action,
              options: [
                { value: "", label: "All actions" },
                ...COURSE_CHANGE_ACTIONS.map((action) => ({
                  value: action,
                  label: formatCourseChangeAction(action),
                })),
              ],
            },
            {
              name: "actorRole",
              label: "Role",
              type: "select",
              value: filters.actorRole,
              options: [
                { value: "", label: "All roles" },
                ...COURSE_CHANGE_ACTOR_ROLES.map((role) => ({
                  value: role,
                  label: role,
                })),
              ],
            },
            {
              name: "from",
              label: "From",
              type: "datetime-local",
              value: toDateTimeLocal(filters.from),
            },
            {
              name: "to",
              label: "To",
              type: "datetime-local",
              value: toDateTimeLocal(filters.to),
            },
          ]}
          activeFilterCount={
            [filters.action, filters.actorRole, filters.from, filters.to].filter(
              Boolean,
            ).length
          }
          canClear={Boolean(
            filters.keyword ||
              filters.action ||
              filters.actorRole ||
              filters.from ||
              filters.to,
          )}
          resultLabel={`${totalItems} events`}
          onApply={applyFilters}
          onClear={clearFilters}
        />

        {error ? (
          <ErrorState
            title="Could not load change history"
            description={error}
          />
        ) : (
          <DataTable
            ariaLabel="Course change history table"
            columns={columns}
            rows={items}
            loading={loading}
            loadingLabel="Loading change history..."
            emptyTitle="No changes recorded yet"
            emptyDescription="No events match the current filters. History is recorded only after this module was enabled (no backfill of older logs)."
          />
        )}

        <Pagination
          page={page + 1}
          totalPages={totalPages}
          totalItems={totalItems}
          size={filters.size}
          disabled={loading}
          ariaLabel="Change history pagination"
          onPageChange={(nextPage) => updatePage(nextPage - 1)}
          onSizeChange={updatePageSize}
        />
      </section>

      <ChangeHistoryDetailModal
        courseId={courseId}
        auditLogId={detailId}
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
      />
    </section>
  );
}
