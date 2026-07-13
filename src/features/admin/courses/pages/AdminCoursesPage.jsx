import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    AlertTriangle,
    BookOpen,
    Edit2,
    Eye,
    MoreVertical,
    Plus,
    RotateCcw,
    Search,
    SlidersHorizontal,
    Trash2,
    Users,
    X,
} from "lucide-react";
import { Button, Modal, useToast } from "@/shared/components/ui";
import Pagination from "@/shared/components/Pagination";
import { categoryService, courseService } from "@/services";
import { getCurrentUser } from "@/services/api-client";
import { formatDate, formatPrice } from "@/shared/utils/formatters";
import { DEFAULT_PAGE_SIZE } from "@/shared/constants/pagination";
import "@/features/course/course-admin.css";
import "./AdminCoursesPage.css";

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

function CourseThumbnail({ course }) {
    const imageUrl = course.thumbnailUrl || course.avatarUrl;
    return (
        <span className="course-management__thumbnail">
            {imageUrl ? (
                <img src={imageUrl} alt="" />
            ) : (
                <BookOpen size={19} aria-hidden="true" />
            )}
        </span>
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
                    Delete <strong>{target?.title}</strong>? Learners will no longer be able to access it. This action is reversible only through system recovery.
                </p>
                {error ? <p className="course-management-delete__error">{error}</p> : null}
                <div className="course-management-delete__actions">
                    <Button
                        type="button"
                        variant="outline"
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
                        Delete course
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

function RowActionsMenu({
    course,
    basePath,
    canViewClasses,
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
        const top = below + menuHeight <= window.innerHeight - gutter
            ? below
            : Math.max(gutter, rect.top - menuHeight - gap);

        setMenuPosition({ top, left });
    }, []);

    useEffect(() => {
        if (!open) return undefined;

        const frame = window.requestAnimationFrame(updateMenuPosition);

        function handlePointerDown(event) {
            if (
                !triggerRef.current?.contains(event.target)
                && !menuRef.current?.contains(event.target)
            ) {
                setOpen(false);
            }
        }

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

    const contentPath = `${basePath}/${course.id}/content`;
    const previewPath = `${basePath}/${course.id}/preview?returnTo=${encodeURIComponent(previewReturnPath)}`;
    const editPath = basePath.startsWith("/staff")
        ? `${basePath}/${course.id}/edit`
        : `${basePath}/${course.id}`;

    const menu = open ? (
        <ul
            ref={menuRef}
            role="menu"
            className="course-management__menu-list course-management__menu-list--portal"
            style={menuPosition}
        >
            <li role="none">
                <Link
                    role="menuitem"
                    to={contentPath}
                    className="course-management__menu-item"
                    onClick={() => setOpen(false)}
                >
                    <BookOpen size={14} aria-hidden="true" /> Open curriculum
                </Link>
            </li>
            {canViewClasses ? (
                <li role="none">
                    <Link
                        role="menuitem"
                        to={`/staff/classrooms?courseId=${encodeURIComponent(course.id)}`}
                        className="course-management__menu-item"
                        onClick={() => setOpen(false)}
                    >
                        <Users size={14} aria-hidden="true" /> View classes
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

export function AdminCoursesPage() {
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const currentUser = getCurrentUser();
    const currentRole = String(currentUser?.role || "").toLowerCase();
    const isTrainer = currentRole === "trainer";
    const isStaffRoute = location.pathname.startsWith("/staff/");
    const courseBasePath = isStaffRoute ? "/staff/courses" : "/admin/courses";
    const previewReturnPath = isStaffRoute ? "/staff/courses" : "/admin/courses";
    const canViewClasses = currentRole === "tmo";
    const canDelete = !isTrainer;

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
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [reloadRequest, setReloadRequest] = useState(0);

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

        async function loadCourses() {
            setLoading(true);
            setError(null);
            try {
                const data = await courseService.listAdmin({
                    page: pageRequest,
                    size: pageSize,
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
    }, [pageRequest, pageSize, reloadRequest, toast]);

    const filteredItems = useMemo(() => {
        const query = keyword.trim().toLowerCase();

        return items.filter((course) => {
            if (statusFilter !== "all" && (course.status || "").toLowerCase() !== statusFilter) return false;
            if (categoryFilter !== "all" && String(course.categoryId) !== String(categoryFilter)) return false;
            if (!query) return true;

            const haystack = `${course.title || ""} ${course.slug || ""} ${course.shortDescription || ""}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [items, keyword, statusFilter, categoryFilter]);

    const hasFilters = Boolean(keyword || statusFilter !== "all" || categoryFilter !== "all");

    const attentionCounts = useMemo(() => {
        let draft = 0;
        let inactive = 0;
        for (const c of items) {
            const s = String(c.status || "").toLowerCase();
            if (s === "draft") draft += 1;
            else if (s === "inactive") inactive += 1;
        }
        return { draft, inactive, total: draft + inactive };
    }, [items]);

    function clearFilters() {
        setKeyword("");
        setStatusFilter("all");
        setCategoryFilter("all");
    }

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
                    <span className="course-management__eyebrow">Course catalog</span>
                    <h1>Course management</h1>
                    <p>
                        {isTrainer
                            ? "Review the courses assigned to your classes and open their learning content."
                            : "Create, organize, and manage the learning experiences available on the platform."}
                    </p>
                </div>

                {!isTrainer ? (
                    <Button
                        leftIcon={<Plus size={17} />}
                        onClick={() => navigate("/admin/courses/new")}
                    >
                        Create course
                    </Button>
                ) : null}
            </header>

            {!isTrainer && !loading && attentionCounts.total > 0 ? (
                <div className="sl-cm-attention" role="status" aria-live="polite">
                    <span className="sl-cm-attention__icon" aria-hidden="true">
                        <AlertTriangle size={18} color="#8a5b00" />
                    </span>
                    <div className="sl-cm-attention__body">
                        <p className="sl-cm-attention__title">
                            {attentionCounts.draft > 0
                                ? `${attentionCounts.draft} course${attentionCounts.draft === 1 ? "" : "s"} still in draft`
                                : `${attentionCounts.inactive} inactive course${attentionCounts.inactive === 1 ? "" : "s"}`}
                        </p>
                        <div className="sl-cm-attention__links">
                            <span>Review and publish so learners can enrol.</span>
                        </div>
                    </div>
                </div>
            ) : null}

            <section className="sl-cm-workspace course-management__panel" aria-labelledby="course-list-title">
                <div className="course-management__panel-header">
                    <div>
                        <span className="course-management__eyebrow">Manage catalog</span>
                        <h2 id="course-list-title">All courses</h2>
                    </div>
                    <span className="course-management__count">{totalItems} courses</span>
                </div>

                <div className="course-management__filters">
                    <label className="course-management__search">
                        <Search size={18} aria-hidden="true" />
                        <span className="sr-only">Search courses</span>
                        <input
                            type="search"
                            placeholder="Search title, slug, or description"
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                        />
                    </label>

                    <label className="course-management__select">
                        <SlidersHorizontal size={16} aria-hidden="true" />
                        <span className="sr-only">Filter by status</span>
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                        >
                            <option value="all">All statuses</option>
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </label>

                    <label className="course-management__select">
                        <span className="sr-only">Filter by category</span>
                        <select
                            value={categoryFilter}
                            onChange={(event) => setCategoryFilter(event.target.value)}
                        >
                            <option value="all">All categories</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    {hasFilters ? (
                        <button
                            type="button"
                            className="course-management__clear"
                            onClick={clearFilters}
                        >
                            <X size={15} /> Clear filters
                        </button>
                    ) : null}
                </div>

                <div className="course-management__results">
                    <span>{filteredItems.length} shown on this page</span>
                    {hasFilters ? <span>Filters are applied</span> : null}
                </div>

                <div className="course-management__table-wrap" role="region" aria-label="Course list">
                    {loading ? (
                        <div className="course-management__state">Loading courses…</div>
                    ) : null}
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
                    {!loading && !error && filteredItems.length === 0 ? (
                        <div className="course-management__state">
                            <BookOpen size={28} aria-hidden="true" />
                            <strong>
                                {isTrainer ? "No courses assigned yet" : "No courses match these filters"}
                            </strong>
                            <span>
                                {isTrainer
                                    ? "Courses assigned to your classes will appear here."
                                    : "Try another search term or clear your filters."}
                            </span>
                            {!isTrainer && !hasFilters ? (
                                <Button
                                    leftIcon={<Plus size={16} />}
                                    onClick={() => navigate("/admin/courses/new")}
                                >
                                    Create course
                                </Button>
                            ) : null}
                        </div>
                    ) : null}
                    {!loading && !error && filteredItems.length > 0 ? (
                        <>
                            <table className="course-management__table">
                                <thead>
                                    <tr>
                                        <th>Course</th>
                                        <th>Category &amp; level</th>
                                        <th>Access</th>
                                        <th>Status</th>
                                        <th>Updated</th>
                                        <th><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map((course) => (
                                        <tr key={course.id}>
                                            <td data-label="Course">
                                                <div className="course-management__course-cell">
                                                    <CourseThumbnail course={course} />
                                                    <div>
                                                        <strong>{course.title}</strong>
                                                        <code>{course.slug || "No slug"}</code>
                                                    </div>
                                                </div>
                                            </td>
                                            <td data-label="Category">
                                                <div className="course-management__meta-cell">
                                                    <strong>{course.categoryName || "Uncategorized"}</strong>
                                                    <span>{course.level || "Level not set"}</span>
                                                </div>
                                            </td>
                                            <td data-label="Access">
                                                <div className="course-management__meta-cell">
                                                    <strong>
                                                        {formatPrice(course.discountedPrice ?? course.price, course.isFree)}
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
                                                    <Link
                                                        to={isTrainer
                                                            ? `${courseBasePath}/${course.id}/edit`
                                                            : `${courseBasePath}/${course.id}/content`}
                                                        className="course-management__action course-management__action--primary"
                                                        title="Open"
                                                        aria-label={`Open ${course.title}`}
                                                    >
                                                        Open
                                                    </Link>
                                                    <RowActionsMenu
                                                        course={course}
                                                        basePath={courseBasePath}
                                                        canViewClasses={canViewClasses}
                                                        canDelete={canDelete}
                                                        previewReturnPath={previewReturnPath}
                                                        onRequestDelete={(c) =>
                                                            setDeleteState({ open: true, target: c })
                                                        }
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Mobile stacked cards — same data, compact layout */}
                            <ul className="course-management__cards" aria-label="Course list">
                                {filteredItems.map((course) => (
                                    <li key={course.id} className="course-management__card">
                                        <div className="course-management__card-head">
                                            <CourseThumbnail course={course} />
                                            <div>
                                                <strong>{course.title}</strong>
                                                <code>{course.slug || "No slug"}</code>
                                            </div>
                                        </div>
                                        <div className="course-management__card-meta">
                                            <CourseStatusBadge status={course.status} />
                                            <span>
                                                {course.categoryName || "Uncategorized"} · {course.level || "—"}
                                            </span>
                                            <span>
                                                {formatPrice(course.discountedPrice ?? course.price, course.isFree)}
                                            </span>
                                            <time dateTime={course.updatedAt || course.createdAt}>
                                                {formatDate(course.updatedAt || course.createdAt)}
                                            </time>
                                        </div>
                                        <div className="course-management__card-actions">
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    navigate(
                                                        isTrainer
                                                            ? `${courseBasePath}/${course.id}/edit`
                                                            : `${courseBasePath}/${course.id}/content`,
                                                    )
                                                }
                                            >
                                                Open
                                            </Button>
                                            <RowActionsMenu
                                                course={course}
                                                basePath={courseBasePath}
                                                canViewClasses={canViewClasses}
                                                canDelete={canDelete}
                                                previewReturnPath={previewReturnPath}
                                                onRequestDelete={(c) =>
                                                    setDeleteState({ open: true, target: c })
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
