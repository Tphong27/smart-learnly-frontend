import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
} from "lucide-react";
import {
  assignmentService,
  testService,
} from "@/services/flashtest.service.js";
import "../flashtest.css";

function isFlashTest(item) {
  return item?.isFlashtest === true ||
    item?.isFlashTest === true ||
    item?.is_flashtest === true;
}

function isRegularTest(item) {
  return !isFlashTest(item);
}

function isCurriculumEssay(item) {
  return Boolean(item?.lessonId || item?.lesson_id);
}

function getLessonId(item) {
  return item?.lessonId || item?.lesson_id || "";
}

function getClassId(item) {
  return item?.classId || item?.class_id || "";
}

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

function formatDate(value) {
  if (!value) return "--";
  return new Date(value).toLocaleString();
}

export function StaffFlashTestListPage({ variant = "flash" }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFlashMode = variant === "flash";
  const isAssignmentMode = variant === "assignment";
  const courseId = searchParams.get("courseId") || "";
  const classId = searchParams.get("classId") || "";
  const basePath = isAssignmentMode
    ? "/staff/assignments"
    : isFlashMode ? "/staff/flashtests" : "/staff/tests";
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
    ? "Assignment Management"
    : isFlashMode ? "Flash Tests Management" : "Tests Management";
  const createLabel = isAssignmentMode
    ? "Create Daily Assignment"
    : isFlashMode ? "Create Flash Test" : "Create Test";
  const itemFilter = isAssignmentMode
    ? isRegularTest
    : isFlashMode ? isFlashTest : isRegularTest;
  const [tests, setTests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [assignmentView, setAssignmentView] = useState("daily");
  const [nowMs, setNowMs] = useState(0);
  const showCurriculumEssays = isAssignmentMode && assignmentView === "curriculum";
  const emptyTitle = isAssignmentMode
    ? showCurriculumEssays
      ? "No curriculum essays yet"
      : "No daily assignments yet"
    : isFlashMode ? "No flash tests yet" : "No tests yet";
  const emptyDescription = isAssignmentMode
    ? showCurriculumEssays
      ? "Essay lessons configured in the class course curriculum will appear here."
      : "Create the first daily assignment for this course."
    : isFlashMode
    ? "Create your first practice quiz or essay assignment to begin tracking student progress."
    : "Create your first MCQ test to begin tracking trainee progress.";

  const loadAllFlashTests = useCallback(async () => {
    setLoading(true);
    try {
      const [testResult, assignmentResult] = await Promise.allSettled([
        isAssignmentMode ? Promise.resolve([]) : testService.getMine(),
        isFlashMode || isAssignmentMode
          ? assignmentService.getMine({
              ...(courseId && { courseId }),
              isFlashtest: isFlashMode,
            })
          : Promise.resolve([]),
      ]);

      setTests(
        testResult.status === "fulfilled"
          ? (testResult.value || []).filter(itemFilter)
          : [],
      );
      setAssignments(
        (isFlashMode || isAssignmentMode) && assignmentResult?.status === "fulfilled"
          ? (assignmentResult.value || []).filter(itemFilter)
          : [],
      );
    } catch (error) {
      console.error("Failed to load flash tests", error);
    } finally {
      setLoading(false);
    }
  }, [courseId, isAssignmentMode, isFlashMode, itemFilter]);

  useEffect(() => {
    const timer = window.setTimeout(loadAllFlashTests, 0);
    return () => window.clearTimeout(timer);
  }, [loadAllFlashTests]);

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
      ...tests.map((item) => ({ ...item, flashType: "mcq" })),
      ...assignments.map((item) => ({ ...item, flashType: "essay" })),
    ].sort((a, b) =>
      new Date(b.createdAt || b.created_at || 0).getTime() -
      new Date(a.createdAt || a.created_at || 0).getTime(),
    );
    const scopedRows = classId
      ? merged.filter(
          (item) => String(getClassId(item)) === String(classId),
        )
      : merged;
    const viewRows = isAssignmentMode
      ? scopedRows.filter((item) =>
          showCurriculumEssays ? isCurriculumEssay(item) : !isCurriculumEssay(item),
        )
      : scopedRows;

    const q = keyword.trim().toLowerCase();
    if (!q) return viewRows;
    return viewRows.filter((item) => {
      const haystack = [
        item.title,
        item.name,
        item.description,
        item.flashType === "essay" ? "essay assignment" : "mcq practice",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [assignments, classId, isAssignmentMode, keyword, showCurriculumEssays, tests]);

  const total = useMemo(() => {
    const merged = [...tests, ...assignments];
    const scopedRows = classId
      ? merged.filter(
          (item) => String(getClassId(item)) === String(classId),
        )
      : merged;
    const viewRows = isAssignmentMode
      ? scopedRows.filter((item) =>
          showCurriculumEssays ? isCurriculumEssay(item) : !isCurriculumEssay(item),
        )
      : scopedRows;
    return viewRows.length;
  }, [assignments, classId, isAssignmentMode, showCurriculumEssays, tests]);

  const summary = useMemo(() => {
    const activeCount = rows.filter((item) => {
      const dueDate = item.dueDate || item.due_date;
      return !(
        item.flashType === "essay" &&
        dueDate &&
        new Date(dueDate).getTime() <= nowMs
      );
    }).length;
    return {
      active: activeCount,
      expired: Math.max(0, rows.length - activeCount),
      mcq: rows.filter((item) => item.flashType === "mcq").length,
      essay: rows.filter((item) => item.flashType === "essay").length,
    };
  }, [nowMs, rows]);

  return (
    <section className="ft-page ft-page--staff-list">
      <header className="ft-staff-hero">
        <div className="ft-staff-hero__content">
          <span className="ft-page-kicker">Staff workspace</span>
          <h1 className="ft-page-title">{pageTitle}</h1>
          <p className="ft-page-subtitle">
            {isAssignmentMode
              ? "Manage essay assignments for enrolled classes without flash-test access codes."
              : isFlashMode
              ? "Manage MCQ practice tests, essay assignments, and realtime progress."
              : "Manage MCQ tests and realtime trainee progress."}
          </p>
          <div className="ft-staff-hero__meta" aria-label={`${pageTitle} summary`}>
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
          <button
            className="ft-icon-button"
            type="button"
            title="Back"
            onClick={() => navigate(backPath)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            className="ft-icon-button"
            type="button"
            disabled={loading}
            title="Refresh"
            onClick={loadAllFlashTests}
          >
            <RefreshCw size={18} className={loading ? "ft-spin" : ""} />
          </button>
          <Link to={`${basePath}/create${pathQuery}`} className="ft-button ft-button--primary">
            <Plus size={16} /> {createLabel}
          </Link>
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

      <div className="ft-panel ft-ops-panel">
        <div className="ft-list-toolbar">
          <label className="ft-search">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search by title, type, or description..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          {isAssignmentMode && (
            <label className="ft-filter-select">
              <select
                value={assignmentView}
                onChange={(event) => setAssignmentView(event.target.value)}
                aria-label="Assignment source"
              >
                <option value="daily">Daily Assignment</option>
                <option value="curriculum">Essay in Course</option>
              </select>
            </label>
          )}
          <span className="ft-list-count">
            {total} {isAssignmentMode ? "assignments" : isFlashMode ? "flash tests" : "tests"}
          </span>
        </div>

        {loading ? (
          <div className="ft-empty">
            <RefreshCw size={28} className="ft-spin" />
            <strong>{isAssignmentMode ? "Loading assignments..." : "Loading flash tests..."}</strong>
          </div>
        ) : total === 0 ? (
          <div className="ft-empty">
            <span className="ft-empty-icon">
              <ClipboardList size={26} />
            </span>
            <strong>{emptyTitle}</strong>
            <p className="ft-muted">
              {emptyDescription}
            </p>
            <Link to={`${basePath}/create${pathQuery}`} className="ft-button ft-button--primary">
              <Plus size={16} /> {createLabel}
            </Link>
          </div>
        ) : rows.length === 0 ? (
          <div className="ft-empty">
            <span className="ft-empty-icon">
              <Search size={26} />
            </span>
            <strong>{isAssignmentMode ? "No matching assignments" : "No matching flash tests"}</strong>
            <p className="ft-muted">Try another keyword or clear the search box.</p>
          </div>
        ) : (
          <div className="ft-table-wrap ft-table-wrap--ops">
            <table className="ft-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  {!showCurriculumEssays && <th>Duration</th>}
                  <th>Due / Created</th>
                  <th>Status</th>
                  <th className="ft-table-action">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const type = item.flashType;
                  const isEssay = type === "essay";
                  const lessonId = getLessonId(item);
                  const rowClassId = getClassId(item);
                  const dueDate = item.dueDate || item.due_date;
                  const expired =
                    isEssay &&
                    dueDate &&
                    new Date(dueDate).getTime() <= nowMs;
                  return (
                    <tr key={`${type}-${item.id}`}>
                      <td>
                        <div className="ft-table-title">
                          <strong>{item.title || item.name || "Untitled flash test"}</strong>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`ft-badge ${
                            isEssay ? "ft-badge--essay" : "ft-badge--mcq"
                          }`}
                        >
                          {showCurriculumEssays ? "Essay Curriculum" : isEssay ? "Essay" : "MCQ"}
                        </span>
                      </td>
                      {!showCurriculumEssays && <td>{getDuration(item)} mins</td>}
                      <td>{formatDate(dueDate || item.createdAt || item.created_at)}</td>
                      <td>
                        <span
                          className={`ft-badge ${
                            expired ? "ft-badge--expired" : "ft-status--submitted"
                          }`}
                        >
                          {expired ? "Expired" : "Active"}
                        </span>
                      </td>
                      <td className="ft-table-action">
                        <div className="ft-table-actions">
                          <Link
                            to={
                              showCurriculumEssays && lessonId && rowClassId
                                ? `/trainer/classes/${rowClassId}/curriculum/lessons/${lessonId}`
                                : `${basePath}/edit/${item.id}/${type}${pathQuery}`
                            }
                            className="ft-icon-button"
                            title={isAssignmentMode ? "Edit assignment" : isFlashMode ? "Edit flash test" : "Edit test"}
                          >
                            <Edit2 size={16} />
                          </Link>
                          <Link
                            to={`${basePath}/monitor/${item.id}/${type}${pathQuery}`}
                            className="ft-icon-button"
                            title="Monitor progress"
                          >
                            <Eye size={16} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
