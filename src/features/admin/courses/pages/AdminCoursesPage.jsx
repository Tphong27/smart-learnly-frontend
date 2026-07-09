import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Edit2, Eye, Plus, Search, Trash2, Users } from "lucide-react";
import { Button, FormField, Modal, useToast } from "@/shared/components/ui";
import { categoryService, courseService } from "@/services";
import "../../admin-shared.css";

const PAGE_SIZE = 10;

function formatPrice(value, isFree) {
  if (isFree) return "Free";
  if (value == null) return "--";
  const num = Number(value);
  if (Number.isNaN(num) || num <= 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(value) {
  if (!value) return "--";
  try {
    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "--";
  }
}

function CourseStatusBadge({ status }) {
  const normalized = (status || "").toLowerCase();
  const className = `admin-status admin-status--${normalized || "draft"}`;
  const labels = {
    draft: "Draft",
    published: "Published",
    inactive: "Inactive",
  };
  return (
    <span className={className}>{labels[normalized] || status || "Draft"}</span>
  );
}

function DeleteCourseModal({ open, target, onClose, onConfirmed }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleConfirm() {
    if (!target) return;
    setError(null);
    setLoading(true);
    try {
      await courseService.remove(target.id);
      toast.success("Course deleted");
      onConfirmed(target);
    } catch (err) {
      setError(err?.message || "Could not delete this course.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Confirm course deletion"
      size="sm"
      onClose={loading ? undefined : onClose}
    >
      <p style={{ margin: 0, color: "#475569", fontSize: 14, lineHeight: 1.6 }}>
        Are you sure you want to delete <strong>{target?.title}</strong>? The
        course will be soft-deleted and may no longer be visible to learners.
      </p>
      {error && (
        <div className="auth-card__alert" style={{ marginTop: 14 }}>
          {error}
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 18,
        }}
      >
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={handleConfirm}
          loading={loading}
        >
          Delete
        </Button>
      </div>
    </Modal>
  );
}

export function AdminCoursesPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState([]);

  const [deleteState, setDeleteState] = useState({ open: false, target: null });
  const [pageRequest, setPageRequest] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cats = await categoryService.list();
        if (!cancelled) setCategories(cats || []);
      } catch {
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await courseService.listAdmin({
          page: pageRequest,
          size: PAGE_SIZE,
        });
        if (cancelled) return;
        setItems(data.items || []);
        setTotalPages(data.totalPages || 0);
        setTotalItems(data.totalItems || 0);
        setPage(data.page ?? pageRequest);
      } catch (err) {
        if (cancelled) return;
        const message = err?.message || "Could not load the course list.";
        setError(message);
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageRequest, toast]);

  const filteredItems = useMemo(() => {
    return items.filter((c) => {
      if (
        statusFilter !== "all" &&
        (c.status || "").toLowerCase() !== statusFilter
      )
        return false;
      if (categoryFilter !== "all" && c.categoryId !== categoryFilter)
        return false;
      if (keyword.trim()) {
        const q = keyword.trim().toLowerCase();
        const haystack =
          `${c.title} ${c.slug} ${c.shortDescription || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, keyword, statusFilter, categoryFilter]);

  function handleDeleted(target) {
    setDeleteState({ open: false, target: null });
    setItems((prev) => prev.filter((c) => c.id !== target.id));
    setTotalItems((n) => Math.max(0, n - 1));
  }

  function handlePrev() {
    if (page > 0) setPageRequest(page - 1);
  }
  function handleNext() {
    if (page + 1 < totalPages) setPageRequest(page + 1);
  }

  return (
    // 📌 SỬA TẠI ĐÂY: Sử dụng khối cô lập hoàn toàn để ép các phần tử xếp dọc tự nhiên, không thể chồng chéo
    <div
      style={{
        display: "block",
        width: "100%",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      {/* Khối Header độc lập */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          gap: "16px",
        }}
      >
        <div style={{ display: "block" }}>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "700",
              margin: "0 0 4px 0",
              color: "#0f172a",
              lineHeight: "1.2",
            }}
          >
            Course management
          </h1>
          <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
            Create, update, and manage the lifecycle of every course on the
            platform.
          </p>
        </div>
        <Button
          leftIcon={<Plus size={16} />}
          onClick={() => navigate("/admin/courses/new")}
        >
          Add course
        </Button>
      </div>

      {/* Khối Content Box độc lập */}
      <div
        style={{
          display: "block",
          background: "#ffffff",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          padding: "24px",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          className="admin-toolbar"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div
            className="admin-toolbar__filters"
            style={{
              display: "flex",
              gap: "12px",
              flex: 1,
              alignItems: "center",
            }}
          >
            <div
              className="admin-toolbar__search"
              style={{ minWidth: "300px" }}
            >
              <FormField
                placeholder="Search by title, slug, or description..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                leftIcon={<Search size={16} />}
              />
            </div>
            <select
              className="admin-toolbar__select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                background: "#fff",
                height: "40px",
              }}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              className="admin-toolbar__select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                background: "#fff",
                height: "40px",
              }}
            >
              <option value="all">All categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <span style={{ color: "#64748b", fontSize: 13, fontWeight: "500" }}>
            {totalItems} courses
          </span>
        </div>

        <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
          {loading ? (
            <div
              className="admin-loading"
              style={{ padding: "40px", textAlign: "center" }}
            >
              Loading...
            </div>
          ) : error ? (
            <div
              className="admin-error"
              style={{ padding: "40px", color: "red" }}
            >
              {error}
            </div>
          ) : filteredItems.length === 0 ? (
            <div
              className="admin-empty"
              style={{ padding: "40px", textAlign: "center", color: "#64748b" }}
            >
              No courses match the current filters.
            </div>
          ) : (
            <table
              className="admin-table"
              style={{ width: "100%", borderCollapse: "collapse" }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #e2e8f0",
                    textAlign: "left",
                    background: "#f8fafc",
                  }}
                >
                  <th
                    style={{
                      padding: "12px 16px",
                      color: "#475569",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Title
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      color: "#475569",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Category
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      color: "#475569",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Level
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      color: "#475569",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Price
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      color: "#475569",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      color: "#475569",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Updated
                  </th>
                  <th
                    style={{
                      width: 140,
                      textAlign: "right",
                      padding: "12px 16px",
                      color: "#475569",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((course) => (
                  <tr
                    key={course.id}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <strong style={{ color: "#1e293b" }}>
                          {course.title}
                        </strong>
                        <code style={{ color: "#94a3b8", fontSize: 12 }}>
                          {course.slug}
                        </code>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {course.categoryName || (
                        <span style={{ color: "#94a3b8" }}>--</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textTransform: "capitalize",
                      }}
                    >
                      {course.level || (
                        <span style={{ color: "#94a3b8" }}>--</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {formatPrice(
                        course.discountedPrice ?? course.price,
                        course.isFree,
                      )}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <CourseStatusBadge status={course.status} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {formatDate(course.updatedAt || course.createdAt)}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div
                        className="admin-table__actions"
                        style={{
                          display: "flex",
                          gap: "12px",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Link
                          to={`/staff/classrooms?courseId=${encodeURIComponent(course.id)}`}
                          className="admin-table__icon-btn"
                          title="View classes for this course"
                          style={{ color: "#0f766e" }}
                        >
                          <Users size={16} />
                        </Link>
                        <Link
                          to={`/admin/courses/${course.id}/preview`}
                          className="admin-table__icon-btn"
                          title="Preview sample content"
                          style={{ color: "#64748b" }}
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          to={`/admin/courses/${course.id}`}
                          className="admin-table__icon-btn"
                          title="Edit"
                          style={{ color: "#3b82f6" }}
                        >
                          <Edit2 size={16} />
                        </Link>
                        <button
                          type="button"
                          className="admin-table__icon-btn admin-table__icon-btn--danger"
                          title="Delete"
                          onClick={() =>
                            setDeleteState({ open: true, target: course })
                          }
                          style={{
                            color: "#ef4444",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div
            className="admin-pagination"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "20px",
              paddingTop: "16px",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <span style={{ fontSize: "14px", color: "#64748b" }}>
              Page {page + 1} / {totalPages}
            </span>
            <div
              className="admin-pagination__controls"
              style={{ display: "flex", gap: "8px" }}
            >
              <button
                type="button"
                className="admin-pagination__btn"
                onClick={handlePrev}
                disabled={page === 0}
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  cursor: page === 0 ? "not-allowed" : "pointer",
                  background: "#fff",
                }}
              >
                Previous
              </button>
              <button
                type="button"
                className="admin-pagination__btn"
                onClick={handleNext}
                disabled={page + 1 >= totalPages}
                style={{
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: "1px solid #cbd5e1",
                  cursor: page + 1 >= totalPages ? "not-allowed" : "pointer",
                  background: "#fff",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <DeleteCourseModal
        open={deleteState.open}
        target={deleteState.target}
        onClose={() => setDeleteState({ open: false, target: null })}
        onConfirmed={handleDeleted}
      />
      <div style={{ height: "40px" }}></div>
    </div>
  );
}
