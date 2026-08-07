import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BookOpen,
  ClipboardCheck,
  Edit2,
  Eye,
  FileQuestion,
  MoreVertical,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button, Modal, useToast } from "@/shared/components/ui";
import Pagination from "@/shared/components/Pagination";
import { categoryService, courseAdminService } from "@/features/course";
import { getCurrentUser } from "@/services/api-client";
import { formatDate, formatPrice } from "@/shared/utils/formatters";
import { DEFAULT_PAGE_SIZE } from "@/shared/constants/pagination";
import { canViewClasses as canViewClassRooms } from "@/shared/constants/roles";
import "@/features/course/course-admin.css";
import "./AdminCoursesPage.css";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "inactive", label: "Inactive" },
];

const LEVEL_FILTERS = [
  { value: "all", label: "All levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

/** Chuẩn hóa level khóa học thành nhãn hiển thị trong bảng. */
function formatLevel(level) {
  if (!level) return "Not set";
  return String(level)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/** Hiển thị trạng thái khóa học bằng badge thống nhất. */
function CourseStatusBadge({ status }) {
  const normalized = (status || "").toLowerCase();
  const labels = {
    draft: "Draft",
    published: "Published",
    inactive: "Inactive",
  };

  return (
    <span className={`admin-status admin-status--${normalized || "draft"}`}>
      {labels[normalized] || status || "Draft"}
    </span>
  );
}

/** Hiển thị ảnh đại diện khóa học hoặc icon mặc định khi chưa có ảnh. */
function CourseThumbnail({ course }) {
  const imageUrl = course.thumbnailUrl || course.avatarUrl;
  return (
    <span className="course-management__thumbnail">
      {imageUrl ? <img src={imageUrl} alt="" /> : <BookOpen size={19} aria-hidden="true" />}
    </span>
  );
}

/** Xác nhận thao tác xóa mềm khóa học trước khi gửi API. */
function DeleteCourseModal({ open, target, onClose, onConfirmed }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /** Gửi yêu cầu xóa khóa học và báo kết quả cho danh sách cha. */
  async function handleConfirm() {
    if (!target) return;

    setError(null);
    setLoading(true);
    try {
      await courseAdminService.remove(target.id);
      toast.success("Course deleted");
      setLoading(false);
      onConfirmed(target);
    } catch (err) {
      setError(err?.message || "Could not delete this course.");
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Delete this course?"
      size="sm"
      onClose={onClose}
      closeDisabled={loading}
    >
      <div className="course-management-delete">
        <p>
          Delete <strong>{target?.title}</strong>? Learners will no longer be able to access it.
          This action is reversible only through system recovery.
        </p>
        {error ? <p className="course-management-delete__error">{error}</p> : null}
        <div className="course-management-delete__actions">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleConfirm} loading={loading}>
            Delete course
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** Hiển thị menu thao tác theo quyền của từng role trên một khóa học. */
function RowActionsMenu({
  course,
  basePath,
  canViewClasses,
  canOpenMasterCurriculum = true,
  canEdit,
  canDelete,
  previewReturnPath,
  onRequestDelete,
}) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const gutter = 12;
    const gap = 6;
    const menuWidth = 220;
    const menuHeight = menuRef.current?.offsetHeight || 220;
    const left = Math.min(
      Math.max(gutter, rect.right - menuWidth),
      window.innerWidth - menuWidth - gutter,
    );
    const below = rect.bottom + gap;
    const top =
      below + menuHeight <= window.innerHeight - gutter
        ? below
        : Math.max(gutter, rect.top - menuHeight - gap);

    setMenuPosition({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const frame = window.requestAnimationFrame(updateMenuPosition);

    /** Đóng menu khi người dùng bấm ra ngoài vùng thao tác. */
    function handlePointerDown(event) {
      if (
        !triggerRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    /** Đóng menu bằng phím Escape và trả focus về nút mở menu. */
    function handleKey(event) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  const questionsPath = `/admin/courses/${course.id}/questions`;
  const testsPath = `/staff/tests?courseId=${encodeURIComponent(course.id)}`;
  const classesBasePath = basePath.startsWith("/admin") ? "/admin/classrooms" : "/staff/classrooms";
  const classesPath = `${classesBasePath}?courseId=${encodeURIComponent(course.id)}`;
  const showManageTest = basePath.startsWith("/staff");
  const previewPath = `${basePath}/${course.id}/preview?returnTo=${encodeURIComponent(previewReturnPath)}`;
  const detailsPath = `${basePath}/${course.id}`;
  const editPath = basePath.startsWith("/staff")
    ? `${basePath}/${course.id}/edit`
    : detailsPath;
  const menu = open ? (
    <ul
      ref={menuRef}
      role="menu"
      className="course-management__menu-list course-management__menu-list--portal"
      style={menuPosition}
    >
      {canOpenMasterCurriculum ? (
        <li role="none">
          <Link
            role="menuitem"
            to={questionsPath}
            className="course-management__menu-item"
            onClick={() => setOpen(false)}
          >
            <FileQuestion size={14} aria-hidden="true" /> Manage questions
          </Link>
        </li>
      ) : null}
      {showManageTest ? (
        <li role="none">
          <Link
            role="menuitem"
            to={testsPath}
            className="course-management__menu-item"
            onClick={() => setOpen(false)}
          >
            <ClipboardCheck size={14} aria-hidden="true" /> Test management
          </Link>
        </li>
      ) : null}
      {canViewClasses ? (
        <li role="none">
          <Link
            role="menuitem"
            to={classesPath}
            className="course-management__menu-item"
            onClick={() => setOpen(false)}
          >
            <Users size={14} aria-hidden="true" />
            {canOpenMasterCurriculum ? "View classes" : "View classes"}
          </Link>
        </li>
      ) : null}
      <li role="none">
        <Link
          role="menuitem"
          to={previewPath}
          className="course-management__menu-item"
          onClick={() => setOpen(false)}
        >
          <Eye size={14} aria-hidden="true" /> Preview
        </Link>
      </li>
      {canEdit ? (
        <li role="none">
          <Link
            role="menuitem"
            to={editPath}
            className="course-management__menu-item"
            onClick={() => setOpen(false)}
          >
            <Edit2 size={14} aria-hidden="true" /> Edit
          </Link>
        </li>
      ) : null}
      {canDelete ? (
        <li role="none">
          <button
            type="button"
            role="menuitem"
            className="course-management__menu-item course-management__menu-item--danger"
            onClick={() => {
              setOpen(false);
              onRequestDelete?.(course);
            }}
          >
            <Trash2 size={14} aria-hidden="true" /> Delete
          </button>
        </li>
      ) : null}
    </ul>
  ) : null;

  return (
    <div className="course-management__menu">
      <button
        ref={triggerRef}
        type="button"
        className="course-management__action"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More actions for ${course.title}`}
        onClick={() => {
          if (!open) updateMenuPosition();
          setOpen((value) => !value);
        }}
      >
        <MoreVertical size={16} aria-hidden="true" />
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}

/** Quản lý và duyệt danh sách khóa học theo quyền hiện tại. */
export function AdminCoursesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getCurrentUser();
  const currentRole = String(currentUser?.role || "").toLowerCase();
  const isTrainer = currentRole === "trainer";
  const isSme = currentRole === "sme";
  const isAssignedOnlyRole = isTrainer || isSme;
  const canManageCourses = currentRole === "admin" || currentRole === "tmo";

  const isStaffRoute = location.pathname.startsWith("/staff/");
  const courseBasePath = isStaffRoute ? "/staff/courses" : "/admin/courses";
  const previewReturnPath = isStaffRoute ? "/staff/courses" : "/admin/courses";
  const canViewClasses = canViewClassRooms(currentRole);
  const canOpenMasterCurriculum = !isTrainer;
  const canCreate = canManageCourses;
  const canDelete = canManageCourses;
  const openCoursePath = (courseId) => {
    if (isTrainer) {
      return `/staff/classrooms?courseId=${encodeURIComponent(courseId)}`;
    }
    // SME luôn mở course theo nhánh admin (`/admin/courses`) để thấy đúng master
    // curriculum, không theo nhánh riêng của trainer (`/staff/courses`).
    if (isSme) {
      return `/admin/courses/${courseId}/content`;
    }
    // Admin/TMO mở course vào trình soạn curriculum (content);
    // `/admin/courses/:courseId/edit` không tồn tại trong adminRoutes.
    return `${courseBasePath}/${courseId}/content`;
  };

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [categories, setCategories] = useState([]);
  const [deleteState, setDeleteState] = useState({
    open: false,
    target: null,
  });

  function handleOpenCourse(course) {
    navigate(openCoursePath(course.id));
  }
  const [pageRequest, setPageRequest] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [reloadRequest, setReloadRequest] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
      setPageRequest(0);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [keyword]);

  useEffect(() => {
    let cancelled = false;
    categoryService
      .list()
      .then((data) => {
        if (!cancelled) setCategories(data || []);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    /** Tải danh sách khóa học từ backend với filter server-side. */
    async function loadCourses() {
      setLoading(true);
      setError(null);
      try {
        const data = await courseAdminService.list({
          page: pageRequest,
          size: pageSize,
          keyword: debouncedKeyword,
          status: statusFilter,
          categoryId: categoryFilter,
          level: levelFilter,
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
    }

    loadCourses();
    return () => {
      cancelled = true;
    };
  }, [
    categoryFilter,
    debouncedKeyword,
    levelFilter,
    pageRequest,
    pageSize,
    reloadRequest,
    statusFilter,
    toast,
  ]);

  const hasFilters = Boolean(
    keyword ||
      statusFilter !== "all" ||
      categoryFilter !== "all" ||
      levelFilter !== "all",
  );

  /** Đưa toàn bộ bộ lọc danh sách về trạng thái mặc định. */
  function clearFilters() {
    setKeyword("");
    setDebouncedKeyword("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setLevelFilter("all");
    setPageRequest(0);
  }

  /** Cập nhật một filter và quay về trang đầu tiên. */
  function changeFilter(setter, value) {
    setter(value);
    setPageRequest(0);
  }

  /** Làm mới danh sách sau khi xóa khóa học thành công. */
  function handleDeleted() {
    setDeleteState({ open: false, target: null });
    if (items.length === 1 && pageRequest > 0) {
      setPageRequest((current) => Math.max(0, current - 1));
    } else {
      setReloadRequest((current) => current + 1);
    }
  }

  return (
    <main className="sl-cm-page admin-page course-management-page">
      <header className="sl-cm-header course-management__header">
        <div>
          <h1>Course management</h1>
          <p>
            {isAssignedOnlyRole
              ? isSme
                ? "Review the courses assigned to you."
                : "Review and update the courses assigned to you."
              : "Create, publish, and maintain the learning experiences available on the platform."}
          </p>
        </div>

        {canCreate ? (
          <Button leftIcon={<Plus size={17} />} onClick={() => navigate("/admin/courses/new")}>
            Create course
          </Button>
        ) : null}
      </header>

      <section className="course-management__panel" aria-labelledby="course-list-title">
        <h2 id="course-list-title" className="sr-only">
          Courses
        </h2>

        <div className="course-management__filters">
          <label className="course-management__field course-management__field--search">
            <span className="course-management__field-label">Search</span>
            <span className="course-management__control course-management__search">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                placeholder="Search title, slug, or description"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </span>
          </label>

          <label className="course-management__field">
            <span className="course-management__field-label">Category</span>
            <span className="course-management__control course-management__select">
              <select
                value={categoryFilter}
                onChange={(event) => changeFilter(setCategoryFilter, event.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </span>
          </label>

          <label className="course-management__field">
            <span className="course-management__field-label">Level</span>
            <span className="course-management__control course-management__select">
              <select
                value={levelFilter}
                onChange={(event) => changeFilter(setLevelFilter, event.target.value)}
              >
                {LEVEL_FILTERS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </span>
          </label>

          <button
            type="button"
            className="course-management__clear"
            onClick={clearFilters}
            disabled={!hasFilters}
          >
            <X size={15} aria-hidden="true" /> Reset
          </button>
        </div>

        <div className="course-management__status-bar">
          <div className="course-management__tabs" aria-label="Filter courses by status">
            {STATUS_FILTERS.map((status) => {
              const selected = statusFilter === status.value;
              return (
                <button
                  key={status.value}
                  type="button"
                  className={`course-management__tab${selected ? " is-active" : ""}`}
                  aria-pressed={selected}
                  onClick={() => changeFilter(setStatusFilter, status.value)}
                >
                  {status.label}
                </button>
              );
            })}
          </div>
          <p className="course-management__result-count" aria-live="polite">
            <strong>{totalItems}</strong> {totalItems === 1 ? "course" : "courses"}
          </p>
        </div>

        <div className="course-management__table-wrap" role="region" aria-label="Course list">
          {loading ? <div className="course-management__state">Loading courses…</div> : null}
          {!loading && error ? (
            <div className="course-management__state course-management__state--error">
              <AlertTriangle size={28} aria-hidden="true" />
              <strong>Could not load courses</strong>
              <span>{error}</span>
              <Button
                variant="outline"
                leftIcon={<RotateCcw size={16} />}
                onClick={() => setReloadRequest((current) => current + 1)}
              >
                Try again
              </Button>
            </div>
          ) : null}
          {!loading && !error && items.length === 0 ? (
            <div className="course-management__state">
              <BookOpen size={28} aria-hidden="true" />
              <strong>
                {isAssignedOnlyRole && !hasFilters
                  ? "No courses assigned yet"
                  : "No courses match these filters"}
              </strong>
              <span>
                {isAssignedOnlyRole && !hasFilters
                  ? "Courses assigned to you will appear here."
                  : "Try another search term or clear your filters."}
              </span>
              {canCreate && !hasFilters ? (
                <Button leftIcon={<Plus size={16} />} onClick={() => navigate("/admin/courses/new")}>
                  Create course
                </Button>
              ) : null}
            </div>
          ) : null}
          {!loading && !error && items.length > 0 ? (
            <>
              <table className="course-management__table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Category</th>
                    <th>Level</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((course) => (
                    <tr key={course.id}>
                      <td data-label="Course">
                        <Link to={openCoursePath(course.id)} className="course-management__course-cell">
                          <CourseThumbnail course={course} />
                          <div>
                            <strong>{course.title}</strong>
                            <code>{course.slug || "No slug"}</code>
                          </div>
                        </Link>
                      </td>
                      <td data-label="Category">
                        <span className="course-management__category">
                          {course.categoryName || "Uncategorized"}
                        </span>
                      </td>
                      <td data-label="Level">
                        <span className="course-management__level">{formatLevel(course.level)}</span>
                      </td>
                      <td data-label="Price">
                        <div className="course-management__meta-cell">
                          <strong>
                            {formatPrice(
                              course.discountedPrice ?? course.price,
                              course.isFree,
                            )}
                          </strong>
                          <span>
                            {course.isFree
                              ? "Free course"
                              : course.discountedPrice != null
                                ? "Discounted price"
                                : "Standard price"}
                          </span>
                        </div>
                      </td>
                      <td data-label="Status">
                        <CourseStatusBadge status={course.status} />
                      </td>
                      <td data-label="Updated">
                        <time dateTime={course.updatedAt || course.createdAt}>
                          {formatDate(course.updatedAt || course.createdAt)}
                        </time>
                      </td>
                      <td data-label="Actions">
                        <div className="course-management__actions">
                          <button
                            type="button"
                            className="course-management__action course-management__action--primary"
                            title="Open"
                            aria-label={`Open ${course.title}`}
                            onClick={() => handleOpenCourse(course)}
                          >
                            Open
                          </button>
                          <RowActionsMenu
                            course={course}
                            basePath={courseBasePath}
                            canViewClasses={canViewClasses}
                            canOpenMasterCurriculum={canOpenMasterCurriculum}
                            canEdit={canManageCourses}
                            canDelete={canDelete}
                            previewReturnPath={previewReturnPath}
                            onRequestDelete={(c) =>
                              setDeleteState({
                                open: true,
                                target: c,
                              })
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="course-management__cards" aria-label="Course list">
                {items.map((course) => (
                  <li key={course.id} className="course-management__card">
                    <div className="course-management__card-head">
                      <CourseThumbnail course={course} />
                      <div>
                        <strong>{course.title}</strong>
                        <code>{course.slug || "No slug"}</code>
                      </div>
                    </div>
                    <dl className="course-management__card-meta">
                      <div>
                        <dt>Category</dt>
                        <dd>{course.categoryName || "Uncategorized"}</dd>
                      </div>
                      <div>
                        <dt>Level</dt>
                        <dd>{formatLevel(course.level)}</dd>
                      </div>
                      <div>
                        <dt>Price</dt>
                        <dd>
                          {formatPrice(
                            course.discountedPrice ?? course.price,
                            course.isFree,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Updated</dt>
                        <dd>
                          <time dateTime={course.updatedAt || course.createdAt}>
                            {formatDate(course.updatedAt || course.createdAt)}
                          </time>
                        </dd>
                      </div>
                    </dl>
                    <div className="course-management__card-status">
                      <CourseStatusBadge status={course.status} />
                    </div>
                    <div className="course-management__card-actions">
                      <Button size="sm" onClick={() => handleOpenCourse(course)}>
                        Open
                      </Button>
                      <RowActionsMenu
                        course={course}
                        basePath={courseBasePath}
                        canViewClasses={canViewClasses}
                        canOpenMasterCurriculum={canOpenMasterCurriculum}
                        canEdit={canManageCourses}
                        canDelete={canDelete}
                        previewReturnPath={previewReturnPath}
                        onRequestDelete={(c) =>
                          setDeleteState({
                            open: true,
                            target: c,
                          })
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <Pagination
          page={page + 1}
          totalPages={totalPages}
          totalItems={totalItems}
          size={pageSize}
          disabled={loading}
          ariaLabel="Course list pagination"
          onPageChange={(nextPage) => setPageRequest(nextPage - 1)}
          onSizeChange={(nextSize) => {
            setPageRequest(0);
            setPageSize(nextSize);
          }}
        />
      </section>

      {deleteState.open ? (
        <DeleteCourseModal
          open
          target={deleteState.target}
          onClose={() => setDeleteState({ open: false, target: null })}
          onConfirmed={handleDeleted}
        />
      ) : null}
    </main>
  );
}
