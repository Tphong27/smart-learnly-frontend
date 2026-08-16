import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CheckSquare,
  ClipboardList,
  Edit2,
  Eye,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { assignmentService } from "@/features/assignment";
import { testService } from "../services/testService";
import { getCurrentUser } from "@/services/api-client";
import { normalizeRole, ROLES } from "@/shared/constants/roles";
import Pagination from "@/shared/components/Pagination";
import { StatusBadge } from "@/shared/components/status";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  FilterBar,
  IconButton,
  LoadingState,
  SearchInput,
  Select,
  Table,
  useToast,
} from "@/shared/components/ui";
import "../test.css";

/** Chuẩn hóa trạng thái published của test từ response cũ và mới. */
function isPublishedTest(item) {
  return (
    (item?.isPublished ?? item?.is_published ?? item?.published ?? false) ===
    true
  );
}

/** Xác định assignment essay được tạo từ lesson trong curriculum. */
function isCurriculumEssay(item) {
  return Boolean(item?.lessonId || item?.lesson_id);
}

/** Lấy lesson ID tương thích với hai kiểu đặt tên field. */
function getLessonId(item) {
  return item?.lessonId || item?.lesson_id || "";
}

/** Lấy class ID tương thích với hai kiểu đặt tên field. */
function getClassId(item) {
  return item?.classId || item?.class_id || "";
}

/** Lấy course ID tương thích với hai kiểu đặt tên field. */
function getCourseId(item) {
  return item?.courseId || item?.course_id || "";
}

/** Tạo đường dẫn editor đúng scope class hoặc course cho curriculum essay. */
function getCurriculumEssayEditPath(item, fallbackCourseId, fallbackClassId) {
  const lessonId = getLessonId(item);
  if (!lessonId) return null;
  const rowClassId = getClassId(item) || fallbackClassId;
  if (rowClassId) {
    return `/trainer/classes/${rowClassId}/curriculum/lessons/${lessonId}`;
  }
  const rowCourseId = getCourseId(item) || fallbackCourseId;
  if (rowCourseId) {
    return `/staff/courses/${rowCourseId}/lessons/${lessonId}`;
  }
  return null;
}

/** Tính thời lượng hiển thị từ duration hoặc khoảng thời gian đến hạn. */
function getDuration(item) {
  if (item.durationMinutes ?? item.duration_minutes ?? item.duration) {
    return item.durationMinutes ?? item.duration_minutes ?? item.duration;
  }
  const dueDate = item.dueDate || item.due_date;
  const baseTime =
    item.updatedAt || item.updated_at || item.createdAt || item.created_at;
  if (!dueDate || !baseTime) return "--";
  const diff = new Date(dueDate).getTime() - new Date(baseTime).getTime();
  return Number.isFinite(diff) ? Math.max(0, Math.round(diff / 60000)) : "--";
}

/** Định dạng ngày giờ cho bảng staff và giữ placeholder khi thiếu dữ liệu. */
function formatDate(value) {
  if (!value) return "--";
  return new Date(value).toLocaleString();
}

/** Hiển thị danh sách assignment và khóa toàn bộ mutation đối với TMO. */
export function StaffAssessmentListPage({ variant = "assignment" }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const currentRole = normalizeRole(currentUser?.role);
  const isAssignmentMode = variant !== "test";
  const canManageItems = currentRole !== ROLES.TMO;
  const courseId = searchParams.get("courseId") || "";
  const classId = searchParams.get("classId") || "";
  const basePath = isAssignmentMode ? "/staff/assignments" : "/staff/tests";
  const backPath = isAssignmentMode
    ? classId
      ? `/staff/classrooms/${classId}/workspace`
      : courseId
        ? `/staff/courses/${courseId}/content`
        : "/staff/courses"
    : "/staff/courses";
  const pathParams = new URLSearchParams();
  if (courseId) pathParams.set("courseId", courseId);
  if (classId) pathParams.set("classId", classId);
  const pathQuery = pathParams.toString() ? `?${pathParams.toString()}` : "";
  const pageTitle = isAssignmentMode
    ? canManageItems
      ? "Assignment Management"
      : "Assignments"
    : "Manage test";
  const createLabel = isAssignmentMode
    ? "Create Class Assignment"
    : "Create Test";
  const [tests, setTests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [assignmentView, setAssignmentView] = useState("daily");
  const [nowMs, setNowMs] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const showCurriculumEssays =
    isAssignmentMode && assignmentView === "curriculum";
  const emptyTitle = isAssignmentMode
    ? showCurriculumEssays
      ? "No curriculum essays yet"
      : "No class assignments yet"
    : "No tests yet";
  const emptyDescription = isAssignmentMode
    ? showCurriculumEssays
      ? "Essay lessons configured in the class course curriculum will appear here."
      : canManageItems
        ? "Create the first class assignment for this course."
        : "Assignments created for this class will appear here."
    : "Create your first MCQ test to begin tracking trainee progress.";

  /** Tải và gộp các nguồn test/assignment trong phạm vi course hoặc class hiện tại. */
  const loadAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const [testResult, assignmentResult] = await Promise.allSettled([
        isAssignmentMode
          ? Promise.resolve([])
          : testService.getMine({
              ...(courseId && { courseId }),
              ...(classId && { classId }),
            }),
        isAssignmentMode
          ? assignmentService.getMine({
              ...(courseId && { courseId }),
            })
          : Promise.resolve([]),
      ]);

      setTests(
        testResult.status === "fulfilled"
          ? testResult.value || []
          : [],
      );
      setAssignments(
        isAssignmentMode &&
          assignmentResult?.status === "fulfilled"
          ? assignmentResult.value || []
          : [],
      );
    } catch (error) {
      console.error("Failed to load assessments", error);
    } finally {
      setLoading(false);
    }
  }, [classId, courseId, isAssignmentMode]);

  useEffect(() => {
    const timer = window.setTimeout(loadAssessments, 0);
    return () => window.clearTimeout(timer);
  }, [loadAssessments]);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNowMs(Date.now()), 0);
    const interval = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, []);

  const rows = useMemo(() => {
    const merged = [
      ...tests.map((item) => ({ ...item, assessmentType: "mcq" })),
      ...assignments.map((item) => ({ ...item, assessmentType: "essay" })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt || b.created_at || 0).getTime() -
        new Date(a.createdAt || a.created_at || 0).getTime(),
    );
    const scopedRows = classId
      ? merged.filter((item) => String(getClassId(item)) === String(classId))
      : merged;
    const viewRows = isAssignmentMode
      ? scopedRows.filter((item) =>
          showCurriculumEssays
            ? isCurriculumEssay(item)
            : !isCurriculumEssay(item),
        )
      : scopedRows;

    const q = keyword.trim().toLowerCase();
    if (!q) return viewRows;
    return viewRows.filter((item) => {
      const haystack = [
        item.title,
        item.name,
        item.description,
        item.assessmentType === "essay" ? "essay assignment" : "mcq practice",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    assignments,
    classId,
    isAssignmentMode,
    keyword,
    showCurriculumEssays,
    tests,
  ]);

  const total = useMemo(() => {
    const merged = [...tests, ...assignments];
    const scopedRows = classId
      ? merged.filter((item) => String(getClassId(item)) === String(classId))
      : merged;
    const viewRows = isAssignmentMode
      ? scopedRows.filter((item) =>
          showCurriculumEssays
            ? isCurriculumEssay(item)
            : !isCurriculumEssay(item),
        )
      : scopedRows;
    return viewRows.length;
  }, [assignments, classId, isAssignmentMode, showCurriculumEssays, tests]);

  const summary = useMemo(() => {
    const activeCount = rows.filter((item) => {
      if (item.assessmentType === "mcq" && !isPublishedTest(item)) {
        return false;
      }
      const dueDate = item.dueDate || item.due_date;
      return !(
        item.assessmentType === "essay" &&
        dueDate &&
        new Date(dueDate).getTime() <= nowMs
      );
    }).length;
    return {
      active: activeCount,
      expired: Math.max(0, rows.length - activeCount),
      mcq: rows.filter((item) => item.assessmentType === "mcq").length,
      essay: rows.filter((item) => item.assessmentType === "essay").length,
    };
  }, [nowMs, rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(
    () => rows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, pageSize, rows],
  );

  /** Xóa item khi role hiện tại có quyền quản lý và item không thuộc curriculum. */
  const handleDelete = useCallback(async (item) => {
    if (!canManageItems) return;
    if (isCurriculumEssay(item)) return;
    const isEssay = item.assessmentType === "essay";
    const itemLabel = isEssay ? "assignment" : "test";
    setDeletingId(item.id);
    try {
      if (isEssay) {
        await assignmentService.remove(item.id);
        setAssignments((current) =>
          current.filter((entry) => entry.id !== item.id),
        );
      } else {
        await testService.remove(item.id);
        setTests((current) => current.filter((entry) => entry.id !== item.id));
      }
      setPendingDelete(null);
      toast.success(`The ${itemLabel} was deleted.`);
    } catch (error) {
      console.error(`Failed to delete ${itemLabel}`, error);
      toast.error(error.message || `Could not delete this ${itemLabel}.`);
    } finally {
      setDeletingId(null);
    }
  }, [canManageItems, toast]);

  return (
    <section className="ft-page ft-page--staff-list">
      <header className="ft-staff-hero">
        <div className="ft-staff-hero__content">
          <span className="ft-page-kicker">Staff workspace</span>
          <h1 className="ft-page-title">{pageTitle}</h1>
          <p className="ft-page-subtitle">
            {isAssignmentMode
              ? canManageItems
                ? "Manage essay assignments for enrolled classes."
                : "Review class assignments and curriculum essays in read-only mode."
              : "Manage MCQ tests and realtime trainee progress."}
          </p>
          <div
            className="ft-staff-hero__meta"
            aria-label={`${pageTitle} summary`}
          >
            <span>
              <BarChart3 size={15} />
              {summary.active} active
            </span>
            <span>
              <CheckSquare size={15} />
              {summary.mcq} MCQ
            </span>
            <span>
              <FileText size={15} />
              {summary.essay} essay
            </span>
          </div>
        </div>
        <div className="ft-toolbar ft-staff-hero__actions">
          <IconButton
            icon={<ArrowLeft size={18} />}
            label="Back"
            onClick={() => navigate(backPath)}
          />
          <IconButton
            icon={<RefreshCw size={18} className={loading ? "ft-spin" : ""} />}
            label="Refresh"
            disabled={loading}
            onClick={loadAssessments}
          />
          {canManageItems && (
            <Button
              to={`${basePath}/create${pathQuery}`}
              leftIcon={<Plus size={16} />}
            >
              {createLabel}
            </Button>
          )}
        </div>
      </header>

      <div className="ft-ops-stats" aria-label="Assessment operations overview">
        <div className="ft-ops-stat ft-ops-stat--primary">
          <span>Visible items</span>
          <strong>{rows.length}</strong>
        </div>
        <div className="ft-ops-stat">
          <span>Active</span>
          <strong>{summary.active}</strong>
        </div>
        <div className="ft-ops-stat">
          <span>Expired</span>
          <strong>{summary.expired}</strong>
        </div>
      </div>

      <div className="ft-ops-panel ft-ops-panel--flat">
        <FilterBar
          className="ft-list-toolbar"
          ariaLabel={`${pageTitle} filters`}
          search={
            <SearchInput
              placeholder="Search by title, type, or description..."
              ariaLabel={`Search ${pageTitle.toLowerCase()}`}
              value={keyword}
              onChange={(nextKeyword) => {
                setKeyword(nextKeyword);
                setPage(1);
              }}
            />
          }
          meta={`${total} ${isAssignmentMode ? "assignments" : "tests"}`}
        >
          {isAssignmentMode && (
            <Select
              value={assignmentView}
              onChange={(event) => {
                setAssignmentView(event.target.value);
                setPage(1);
              }}
              aria-label="Assignment source"
            >
              <option value="daily">Class Assignment</option>
              <option value="curriculum">Essay in Course</option>
            </Select>
          )}
        </FilterBar>

        {loading ? (
          <LoadingState
            label={
              isAssignmentMode ? "Loading assignments..." : "Loading tests..."
            }
          />
        ) : total === 0 ? (
          <EmptyState
            icon={<ClipboardList size={26} />}
            title={emptyTitle}
            description={emptyDescription}
            action={
              canManageItems ? (
              <Button
                to={`${basePath}/create${pathQuery}`}
                leftIcon={<Plus size={16} />}
              >
                {createLabel}
              </Button>
              ) : null
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Search size={26} />}
            title={
              isAssignmentMode
                ? "No matching assignments"
                : "No matching tests"
            }
            description="Try another keyword or clear the search box."
          />
        ) : (
          <Table
            className="ft-table-wrap ft-table-wrap--ops"
            tableClassName="ft-table"
            ariaLabel={pageTitle}
          >
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  {!showCurriculumEssays && <th>Duration</th>}
                  <th>Due / Created</th>
                  <th>Status</th>
                  {canManageItems && <th className="ft-table-action">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((item) => {
                  const type = item.assessmentType;
                  const isEssay = type === "essay";
                  const curriculumEssayEditPath = showCurriculumEssays
                    ? getCurriculumEssayEditPath(item, courseId, classId)
                    : null;
                  const dueDate = item.dueDate || item.due_date;
                  const expired =
                    isEssay && dueDate && new Date(dueDate).getTime() <= nowMs;
                  const inactive = !isEssay && !isPublishedTest(item);
                  const hasAttempts = Boolean(
                    item.hasAttempts ?? item.has_attempts,
                  );
                  const canEditItem = isEssay || !hasAttempts;
                  return (
                    <tr key={`${type}-${item.id}`}>
                      <td data-label="Title">
                        <div className="ft-table-title">
                          <strong>
                            {item.title || item.name || "Untitled test"}
                          </strong>
                        </div>
                      </td>
                      <td data-label="Type">
                        <StatusBadge
                          status={isEssay ? "essay" : "mcq"}
                          tone={isEssay ? "warning" : "info"}
                          label={
                            showCurriculumEssays
                            ? "Essay Curriculum"
                            : isEssay
                              ? "Essay"
                              : "MCQ"
                          }
                        />
                      </td>
                      {!showCurriculumEssays && (
                        <td data-label="Duration">{getDuration(item)} mins</td>
                      )}
                      <td data-label="Due / Created">
                        {formatDate(
                          dueDate || item.createdAt || item.created_at,
                        )}
                      </td>
                      <td data-label="Status">
                        <StatusBadge
                          status={inactive ? "inactive" : expired ? "expired" : "active"}
                          tone={inactive ? "neutral" : expired ? "danger" : "success"}
                          label={
                            inactive
                            ? "Inactive"
                            : expired
                              ? "Expired"
                              : "Active"
                          }
                        />
                      </td>
                      {canManageItems && (
                        <td data-label="Actions" className="ft-table-action">
                          <div className="ft-table-actions">
                            {canEditItem && (
                              <IconButton
                                icon={<Edit2 size={16} />}
                                label={
                                  isAssignmentMode ? "Edit assignment" : "Edit test"
                                }
                                to={
                                  curriculumEssayEditPath
                                    ? curriculumEssayEditPath
                                    : `${basePath}/edit/${item.id}/${type}${pathQuery}`
                                }
                              />
                            )}
                            <IconButton
                              icon={<Eye size={16} />}
                              label="Monitor progress"
                              to={`${basePath}/monitor/${item.id}/${type}${pathQuery}`}
                            />
                            {isAssignmentMode &&
                              !showCurriculumEssays && (
                                <IconButton
                                  icon={<Trash2 size={16} />}
                                  variant="danger"
                                  label={
                                    isEssay ? "Delete assignment" : "Delete test"
                                  }
                                  disabled={deletingId === item.id}
                                  onClick={() => setPendingDelete(item)}
                                />
                              )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
          </Table>
        )}
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={rows.length}
          size={pageSize}
          onPageChange={setPage}
          onSizeChange={(nextSize) => {
            setPageSize(nextSize);
            setPage(1);
          }}
          disabled={loading}
          ariaLabel={`${pageTitle} pagination`}
        />
      </div>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete this ${pendingDelete?.assessmentType === "essay" ? "assignment" : "test"}?`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        loading={Boolean(deletingId)}
        loadingLabel="Deleting..."
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && handleDelete(pendingDelete)}
      />
    </section>
  );
}
