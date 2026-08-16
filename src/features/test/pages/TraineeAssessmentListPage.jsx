import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckSquare,
  Eye,
  FileText,
  KeyRound,
  MessageSquareText,
  RefreshCw,
} from "lucide-react";
import { assignmentService } from "@/features/assignment";
import { attemptService } from "../services/attemptService";
import { testService } from "../services/testService";
import { getCurrentUser } from "@/services/api-client";
import Pagination from "@/shared/components/Pagination";
import { StatusBadge } from "@/shared/components/status";
import {
  Button,
  EmptyState,
  IconButton,
  Input,
  Modal,
  SearchInput,
  Select,
  Table,
  Tabs,
} from "@/shared/components/ui";
import "../test.css";

/** Phân biệt assignment độc lập với essay được gắn vào lesson trong course. */
function isCurriculumEssay(item) {
  return Boolean(item?.lessonId || item?.lesson_id);
}

/** Chuẩn hóa feedback từ cả response camelCase và snake_case. */
function getTrainerFeedback(submission) {
  return submission?.trainerFeedback ?? submission?.trainer_feedback ?? "";
}

/** Xác định attempt trắc nghiệm đã kết thúc và được tính là hoàn thành. */
function isCompletedStatus(status) {
  return ["SUBMITTED", "GRADED", "EXPIRED", "TIMEOUT"].includes(
    String(status || "").toUpperCase(),
  );
}

/** Xác định submission tự luận đã được nộp hoặc chấm. */
function isCompletedAssignmentStatus(status) {
  return ["SUBMITTED", "GRADED", "LATE"].includes(
    String(status || "").toUpperCase(),
  );
}

/** Lấy mốc thời gian phù hợp nhất để sắp xếp attempt. */
function getAttemptTime(attempt) {
  return new Date(
    attempt?.submittedAt ||
      attempt?.submitted_at ||
      attempt?.endTime ||
      attempt?.end_time ||
      attempt?.updatedAt ||
      attempt?.updated_at ||
      attempt?.createdAt ||
      attempt?.created_at ||
      0,
  ).getTime();
}

/** Chuyển giá trị số hợp lệ hoặc trả về null để tránh lan truyền NaN. */
function numberOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** Tìm tổng số câu hỏi từ các response tương thích cũ và mới. */
function getQuestionTotal(...sources) {
  for (const source of sources) {
    const total =
      numberOrNull(source?.totalQuestions) ??
      numberOrNull(source?.total_questions) ??
      numberOrNull(source?.questionCount) ??
      numberOrNull(source?.question_count) ??
      numberOrNull(source?.numberOfQuestions) ??
      numberOrNull(source?.questions?.length);
    if (total && total > 0) return total;
  }
  return null;
}

/** Tính thời lượng hiển thị của assessment theo phút. */
function getDurationMinutes(item) {
  const explicitDuration =
    numberOrNull(item?.durationMinutes) ??
    numberOrNull(item?.duration_minutes) ??
    numberOrNull(item?.duration);
  if (explicitDuration != null)
    return Math.max(1, Math.round(explicitDuration));

  const dueDate = item?.dueDate || item?.due_date;
  const baseTime =
    item?.updatedAt || item?.updated_at || item?.createdAt || item?.created_at;
  if (!dueDate || !baseTime) return null;

  const durationMs = new Date(dueDate).getTime() - new Date(baseTime).getTime();
  return Number.isFinite(durationMs)
    ? Math.max(1, Math.round(durationMs / 60000))
    : null;
}

/** Chuẩn hóa điểm về thang 10 và định dạng ngắn gọn. */
function formatScoreValue(value) {
  if (!Number.isFinite(value)) return "--";
  const score = Math.max(0, Math.min(10, value));
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

/** Quy đổi kết quả trắc nghiệm về thang điểm 10. */
function formatMcqScore(attempt, questionTotal) {
  const percentage = numberOrNull(attempt?.percentage);
  const rawScore = numberOrNull(attempt?.score);
  if (percentage && percentage > 0) {
    return formatScoreValue(percentage / 10);
  }
  if (rawScore != null && questionTotal) {
    return formatScoreValue((rawScore / questionTotal) * 10);
  }
  if (percentage === 0) return "0";
  return "--";
}

/** Kiểm tra một mốc thời gian đã hết hạn tại thời điểm tham chiếu. */
function isPastDate(value, referenceMs) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time <= referenceMs;
}

/** Lấy hạn dùng mã truy cập từ response xác thực hoặc dữ liệu danh sách. */
function getAccessExpiresAt(item, result) {
  return (
    result?.expiresAt ||
    result?.accessCodeExpiresAt ||
    result?.access_code_expires_at ||
    item?.accessCodeExpiresAt ||
    item?.access_code_expires_at ||
    item?.codeExpiresAt ||
    item?.code_expires_at ||
    ""
  );
}

/** Phân loại assessment theo một trạng thái duy nhất, ưu tiên hoàn thành trước hết hạn. */
function getAssessmentState(item, result, referenceMs) {
  if (result?.taken) return "done";
  const dueDate = item?.dueDate || item?.due_date;
  if (item?.assessmentType === "essay" && isPastDate(dueDate, referenceMs)) {
    return "expired";
  }
  return "ready";
}

/** Hiển thị danh sách assignment dành cho trainee. */
export function TraineeAssessmentListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAssignmentMode = true;
  const showsFeedbackColumn = true;
  const courseId = searchParams.get("courseId") || "";
  const classId = searchParams.get("classId") || "";
  const takePath = "/learning/assignments/take";
  const accessStoragePrefix = "assignmentAccess";
  const currentUser = useMemo(() => getCurrentUser(), []);
  const studentId = useMemo(
    () =>
      currentUser?.id || currentUser?.userId || currentUser?.accountId || "",
    [currentUser],
  );
  const [tests, setTests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [resultMap, setResultMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [nowMs, setNowMs] = useState(0);
  const [accessModal, setAccessModal] = useState({
    open: false,
    item: null,
    isEssay: false,
  });
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const [verifyingAccess, setVerifyingAccess] = useState(false);
  const [filterTab, setFilterTab] = useState("all");
  const [assignmentView, setAssignmentView] = useState("daily");
  const [expandedResultKey, setExpandedResultKey] = useState("");
  const [visibleFeedback, setVisibleFeedback] = useState(null);
  const pageTitle = "My Assignments";
  const pageSubtitle =
    "Track essay work from your enrolled classes and continue before each due date.";

  /** Tải assessment khả dụng và trạng thái attempt/submission của trainee. */
  const loadAvailableTests = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [
        isAssignmentMode
          ? Promise.resolve([])
          : testService.getAvailable({
              ...(courseId && { courseId }),
              ...(classId && { classId }),
            }),
      ];
      if (isAssignmentMode) {
        requests.push(
          assignmentService.getAvailable({
            ...(courseId && { courseId }),
            ...(classId && { classId }),
          }),
        );
      }
      const [testData, assignmentData] = await Promise.all(requests);
      const availableTests = (testData || []).filter(
        (item) =>
          (item?.isPublished ??
            item?.is_published ??
            item?.published ??
            false) === true,
      );
      const availableAssignments = isAssignmentMode
        ? assignmentData || []
        : [];
      setTests(availableTests);
      setAssignments(availableAssignments);
      setNowMs(Date.now());

      if (!studentId) {
        setResultMap({});
        return;
      }

      const checks = await Promise.allSettled([
        ...availableTests.map(async (test) => {
          // The list only needs attempt summaries. Fetching every question for
          // every historical test created an N+1 burst that could exhaust the
          // API connection pool and delay starting the selected assessment.
          const attempts = await attemptService.getHistory(
            test.id,
            studentId,
            classId ? { classId } : {},
          );
          const questionTotal = getQuestionTotal(test, ...(attempts || []));
          const sortedAttempts = attempts.sort(
            (a, b) => getAttemptTime(b) - getAttemptTime(a),
          );
          const latestAttempt = sortedAttempts[0] || null;
          const completedAttempts = attempts
            .filter((attempt) => isCompletedStatus(attempt.status))
            .sort((a, b) => getAttemptTime(b) - getAttemptTime(a));
          return [
            `mcq-${test.id}`,
            {
              taken:
                Boolean(latestAttempt) &&
                isCompletedStatus(latestAttempt.status) &&
                !latestAttempt.retakeAllowed,
              score: completedAttempts[0]
                ? formatMcqScore(completedAttempts[0], questionTotal)
                : "--",
              status: latestAttempt?.status,
              retakeAllowed: Boolean(latestAttempt?.retakeAllowed),
              attempts: [...completedAttempts].sort(
                (a, b) => getAttemptTime(a) - getAttemptTime(b),
              ),
              questionTotal,
            },
          ];
        }),
        ...availableAssignments.map(async (assignment) => {
          try {
            const submission = await assignmentService.getSubmissionByStudent(
              assignment.id,
              studentId,
            );
            return [
              `essay-${assignment.id}`,
              {
                taken: isCompletedAssignmentStatus(submission?.status),
                score: submission?.score ?? "--",
                status: submission?.status,
                trainerFeedback: getTrainerFeedback(submission),
              },
            ];
          } catch (submissionError) {
            if (submissionError?.originalError?.response?.status !== 404) {
              console.warn(
                "Could not load assignment status",
                submissionError,
              );
            }
            return [`essay-${assignment.id}`, { taken: false, score: "--" }];
          }
        }),
      ]);

      setResultMap(
        Object.fromEntries(
          checks
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value),
        ),
      );
    } catch (error) {
      console.error("Failed to load available assessments", error);
    } finally {
      setLoading(false);
    }
  }, [classId, courseId, isAssignmentMode, studentId]);

  useEffect(() => {
    const timer = window.setTimeout(loadAvailableTests, 0);
    return () => window.clearTimeout(timer);
  }, [loadAvailableTests]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  const assessmentItems = useMemo(() => {
    const merged = [
      ...tests.map((item) => ({ ...item, assessmentType: "mcq" })),
      ...assignments.map((item) => ({ ...item, assessmentType: "essay" })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt || b.created_at || 0).getTime() -
        new Date(a.createdAt || a.created_at || 0).getTime(),
    );

    if (!isAssignmentMode) return merged;
    return merged.filter((item) =>
      assignmentView === "curriculum"
        ? isCurriculumEssay(item)
        : !isCurriculumEssay(item),
    );
  }, [assignmentView, assignments, isAssignmentMode, tests]);

  const total = assessmentItems.length;

  const filterCounts = useMemo(() => {
    const states = assessmentItems.map((item) =>
      getAssessmentState(
        item,
        resultMap[`${item.assessmentType}-${item.id}`],
        nowMs,
      ),
    );
    return {
      all: assessmentItems.length,
      ready: states.filter((state) => state === "ready").length,
      done: states.filter((state) => state === "done").length,
      expired: states.filter((state) => state === "expired").length,
    };
  }, [assessmentItems, resultMap, nowMs]);

  const filteredRows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    let items = assessmentItems;

    if (q) {
      items = items.filter((item) =>
        [
          item.title,
          item.name,
          item.description,
          item.assessmentType === "essay" ? "essay assignment" : "mcq practice",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }

    if (filterTab === "ready") {
      items = items.filter(
        (item) =>
          getAssessmentState(
            item,
            resultMap[`${item.assessmentType}-${item.id}`],
            nowMs,
          ) === "ready",
      );
    } else if (filterTab === "done") {
      items = items.filter(
        (item) =>
          getAssessmentState(
            item,
            resultMap[`${item.assessmentType}-${item.id}`],
            nowMs,
          ) === "done",
      );
    } else if (filterTab === "expired") {
      items = items.filter(
        (item) =>
          getAssessmentState(
            item,
            resultMap[`${item.assessmentType}-${item.id}`],
            nowMs,
          ) === "expired",
      );
    }

    return items;
  }, [assessmentItems, keyword, filterTab, resultMap, nowMs]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(
    () =>
      filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, filteredRows, pageSize],
  );

  /** Mở bước xác thực mã hoặc chuyển thẳng tới bài tự luận. */
  const openAccessModal = (item, isEssay) => {
    const dueDate = item?.dueDate || item?.due_date;
    if (isEssay && dueDate && new Date(dueDate).getTime() <= nowMs) {
      return;
    }
    // Assignments do not have an access-code contract.
    if (isEssay) {
      navigate(`${takePath}/${item.id}/essay`);
      return;
    }
    setAccessModal({ open: true, item, isEssay });
    setAccessCode("");
    setAccessError("");
  };

  /** Đóng modal mã truy cập và làm sạch trạng thái nhập. */
  const closeAccessModal = () => {
    setAccessModal({ open: false, item: null, isEssay: false });
    setAccessCode("");
    setAccessError("");
  };

  /** Mở hoặc đóng lịch sử attempt của một bài trắc nghiệm. */
  const toggleAttemptHistory = (key) => {
    setExpandedResultKey((current) => (current === key ? "" : key));
  };

  /** Điều hướng tới màn hình xem chi tiết câu trả lời của attempt. */
  const openAttemptDetail = (item, attempt) => {
    const attemptId = attempt?.id || attempt?.attemptId;
    const testId = attempt?.testId || item?.id;
    if (!attemptId || !testId) return;
    const detailParams = new URLSearchParams();
    if (classId) detailParams.set("classId", classId);
    const detailQuery = detailParams.toString();
    navigate(
      `/learning/course-quizzes/attempts/${testId}/${attemptId}${detailQuery ? `?${detailQuery}` : ""}`,
      {
        state: {
          attempt,
          studentName: currentUser?.name || currentUser?.fullName || "Trainee",
          classId: classId || null,
        },
      },
    );
  };

  /** Hiển thị lịch sử attempt ngay dưới hàng assessment đang mở rộng. */
  const renderAttemptList = (item, result) => {
    const attempts = Array.isArray(result?.attempts) ? result.attempts : [];
    return (
      <div className="ft-inline-attempts">
        <div className="ft-inline-attempts__header">
          <strong>{attempts.length} attempts</strong>
        </div>
        <div className="ft-attempt-detail-list">
          {attempts.map((attempt, index) => {
            const attemptId = attempt.id || attempt.attemptId;
            const score = formatMcqScore(
              attempt,
              getQuestionTotal(attempt) || result?.questionTotal,
            );
            return (
              <div className="ft-history-attempt" key={attemptId || index}>
                <div className="ft-history-attempt__summary">
                  <div className="ft-history-attempt__meta">
                    <strong>Attempt {index + 1}</strong>
                    <span>
                      {attempt.startTime
                        ? new Date(attempt.startTime).toLocaleString()
                        : "--"}
                    </span>
                  </div>
                  <strong>{score}/10</strong>
                  <span className="ft-muted">
                    {attempt.status || "Submitted"}
                  </span>
                  <IconButton
                    className="ft-history-attempt__toggle"
                    icon={<Eye size={18} />}
                    label="View answer detail"
                    disabled={!attemptId}
                    onClick={() => openAttemptDetail(item, attempt)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /** Xác thực mã truy cập trước khi bắt đầu bài trắc nghiệm. */
  const handleVerifyAccessCode = async () => {
    const code = accessCode.trim();
    if (!code) {
      setAccessError("Please enter the test code.");
      return;
    }

    const item = accessModal.item;
    if (!item?.id) return;

    const currentExpiresAt = getAccessExpiresAt(item);
    if (isPastDate(currentExpiresAt, nowMs)) {
      setAccessError(
        "This code has expired. Please ask your trainer for a new code.",
      );
      return;
    }

    setVerifyingAccess(true);
    setAccessError("");
    try {
      const result = accessModal.isEssay
        ? await assignmentService.verifyAccessCode(item.id, code)
        : await testService.verifyAccessCode(
            item.id,
            code,
            classId ? { classId } : {},
          );
      if (!result?.valid) {
        setAccessError("The code is incorrect or has expired.");
        return;
      }
      if (isPastDate(getAccessExpiresAt(item, result), nowMs)) {
        setAccessError(
          "This code has expired. Please ask your trainer for a new code.",
        );
        return;
      }
      const type = accessModal.isEssay ? "essay" : "mcq";
      window.sessionStorage.setItem(
        `${accessStoragePrefix}:${type}:${item.id}`,
        code,
      );
      const takeParams = new URLSearchParams();
      if (classId) takeParams.set("classId", classId);
      const takeQuery = takeParams.toString();
      navigate(
        `${takePath}/${item.id}/${type}${takeQuery ? `?${takeQuery}` : ""}`,
        {
          state: { accessCode: code, classId: classId || null },
        },
      );
    } catch (verifyError) {
      setAccessError(verifyError.message || "Could not verify this code.");
    } finally {
      setVerifyingAccess(false);
    }
  };

  return (
    <section className="ft-page ft-page--learner-list ft-tests-page">
      <header className="ft-tests-hero">
        <h1 className="ft-tests-hero__title">{pageTitle}</h1>
        <p className="ft-tests-hero__subtitle">{pageSubtitle}</p>
      </header>

      <div className="ft-tests-panel">
        <div className="ft-tests-tabs-panel">
          <div className="ft-tests-tabs-panel__top">
            <div className="ft-tests-filter-group">
              <Tabs
                className="ft-tests-tabs"
                ariaLabel="Filter tests"
                value={filterTab}
                items={[
                  { value: "all", label: "All", count: loading ? "..." : filterCounts.all },
                  { value: "ready", label: "Ready", count: loading ? "..." : filterCounts.ready },
                  { value: "done", label: "Done", count: loading ? "..." : filterCounts.done },
                  { value: "expired", label: "Expired", count: loading ? "..." : filterCounts.expired },
                ]}
                onChange={(nextTab) => {
                  setFilterTab(nextTab);
                  setPage(1);
                }}
              />
              {isAssignmentMode && (
                <Select
                  className="ft-tests-assignment-select"
                  value={assignmentView}
                  onChange={(event) => {
                    setAssignmentView(event.target.value);
                    setFilterTab("all");
                    setPage(1);
                  }}
                  aria-label="Assignment source"
                >
                  <option value="daily">Class Assignment</option>
                  <option value="curriculum">Essay in Course</option>
                </Select>
              )}
            </div>
            <SearchInput
              className="ft-tests-search"
              placeholder="Search tests..."
              ariaLabel="Search tests"
              value={keyword}
              onChange={(nextKeyword) => {
                setKeyword(nextKeyword);
                setPage(1);
              }}
            />
          </div>
        </div>

        {loading ? (
          <Table
            className="ft-tests-table-loading"
            tableClassName="ft-tests-table"
            ariaLabel={`Loading ${pageTitle}`}
          >
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Duration</th>
                  <th>Due Date</th>
                  <th>Score</th>
                  <th>Status</th>
                  {showsFeedbackColumn && <th>Feedback</th>}
                  <th className="ft-tests-action-column">Action</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td data-label="Type">
                      <span className="ft-skeleton" style={{ width: 60 }} />
                    </td>
                    <td data-label="Title">
                      <span className="ft-skeleton" style={{ width: "80%" }} />
                    </td>
                    <td data-label="Duration">
                      <span className="ft-skeleton" style={{ width: 50 }} />
                    </td>
                    <td data-label="Due Date">
                      <span className="ft-skeleton" style={{ width: 80 }} />
                    </td>
                    <td data-label="Score">
                      <span className="ft-skeleton" style={{ width: 40 }} />
                    </td>
                    <td data-label="Status">
                      <span className="ft-skeleton" style={{ width: 70 }} />
                    </td>
                    {showsFeedbackColumn && (
                      <td data-label="Feedback">
                        <span className="ft-skeleton" style={{ width: 70 }} />
                      </td>
                    )}
                    <td data-label="Action">
                      <span className="ft-skeleton" style={{ width: 80 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
          </Table>
        ) : total === 0 ? (
          <EmptyState
            className="ft-tests-empty"
            icon={<BookOpen size={36} strokeWidth={1.5} />}
            title={
              isAssignmentMode
                ? assignmentView === "curriculum"
                  ? "No essay lessons available"
                  : "No class assignments available"
                : "No tests available"
            }
            description={
              isAssignmentMode
                ? assignmentView === "curriculum"
                  ? "No assignment lessons are available in your enrolled course yet."
                  : "Your trainer has not assigned daily essay work yet."
                : "Your instructors have not published any tests yet."
            }
          />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            className="ft-tests-empty"
            title={`No ${filterTab === "all" ? "" : `${filterTab} `}tests found`}
            description="Try a different filter or clear the search box."
          />
        ) : (
          <Table
            className="ft-tests-table-wrapper"
            tableClassName="ft-tests-table"
            ariaLabel={pageTitle}
          >
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Duration</th>
                  <th>Due Date</th>
                  <th>Score</th>
                  <th>Status</th>
                  {showsFeedbackColumn && <th>Feedback</th>}
                  <th className="ft-tests-action-column">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((item) => {
                  const key = `${item.assessmentType}-${item.id}`;
                  const result = resultMap[key];
                  const isEssay = item.assessmentType === "essay";
                  const assessmentState = getAssessmentState(
                    item,
                    result,
                    nowMs,
                  );
                  const taken = assessmentState === "done";
                  const hasAttemptHistory =
                    !isEssay &&
                    Array.isArray(result?.attempts) &&
                    result.attempts.length > 0;
                  const expanded = expandedResultKey === key;
                  const dueDate = item.dueDate || item.due_date;
                  const expired = assessmentState === "expired";
                  const statusLabel = taken
                    ? "Completed"
                    : expired
                      ? "Expired"
                      : "Ready";
                  const typeLabel = isEssay
                    ? isCurriculumEssay(item)
                      ? "Essay in Course"
                      : "Class Assignment"
                    : "MCQ";
                  const TypeIcon = isEssay ? FileText : CheckSquare;
                  const duration = getDurationMinutes(item);
                  const displayDate =
                    dueDate || item.createdAt || item.created_at;
                  const score = result?.score;
                  const displayScore = score != null ? score : "--";

                  return (
                    <Fragment key={key}>
                      <tr
                        className={
                          taken
                            ? "ft-row--completed"
                            : expired
                              ? "ft-row--expired"
                              : ""
                        }
                      >
                        <td data-label="Type">
                          <StatusBadge
                            status={isEssay ? "essay" : "mcq"}
                            label={typeLabel}
                            tone={isEssay ? "warning" : "info"}
                            icon={<TypeIcon size={12} />}
                            className={`ft-badge ft-badge--${isEssay ? "essay" : "mcq"}`}
                          />
                        </td>
                        <td data-label="Title" className="ft-cell--title">
                          <span className="ft-title">
                            {item.title || item.name}
                          </span>
                        </td>
                        <td data-label="Duration">
                          {duration != null ? `${duration} mins` : "--"}
                        </td>
                        <td data-label="Due Date">
                          {displayDate
                            ? new Date(displayDate).toLocaleDateString()
                            : "--"}
                        </td>
                        <td data-label="Score">{displayScore}</td>
                        <td data-label="Status">
                          <StatusBadge
                            status={statusLabel}
                            label={statusLabel}
                            tone={
                              statusLabel === "Expired"
                                ? "danger"
                                : statusLabel === "Completed"
                                  ? "neutral"
                                  : "success"
                            }
                            className={`ft-status ft-status--${statusLabel.toLowerCase()}`}
                          />
                        </td>
                        {showsFeedbackColumn && (
                          <td data-label="Feedback">
                            {isEssay && result?.trainerFeedback ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                leftIcon={<MessageSquareText size={15} />}
                                onClick={() =>
                                  setVisibleFeedback({
                                    title: item.title || item.name,
                                    feedback: result.trainerFeedback,
                                  })
                                }
                              >
                                View feedback
                              </Button>
                            ) : (
                              <span className="ft-muted">--</span>
                            )}
                          </td>
                        )}
                        <td data-label="Action" className="ft-tests-action-column">
                          <div className="ft-table-actions">
                            {hasAttemptHistory && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => toggleAttemptHistory(key)}
                              >
                                {expanded ? "Hide" : "Details"}
                              </Button>
                            )}
                            {taken ? (
                              !hasAttemptHistory && (
                                <Button variant="secondary" size="sm" disabled>
                                  Completed
                                </Button>
                              )
                            ) : expired ? (
                              <Button variant="secondary" size="sm" disabled>
                                Expired
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                rightIcon={<ArrowRight size={15} />}
                                onClick={() => openAccessModal(item, isEssay)}
                              >
                                Start
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {hasAttemptHistory && expanded && (
                        <tr className="ft-expanded-row">
                          <td
                            data-label="Attempt history"
                            colSpan={showsFeedbackColumn ? 8 : 7}
                          >
                            {renderAttemptList(item, result)}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
          </Table>
        )}
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={filteredRows.length}
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

      <Modal
        open={Boolean(visibleFeedback)}
        title="Trainer feedback"
        description={visibleFeedback?.title || ""}
        size="md"
        onClose={() => setVisibleFeedback(null)}
        footer={
          <Button onClick={() => setVisibleFeedback(null)}>
            Close
          </Button>
        }
      >
        <div className="ft-trainee-feedback-text">
          {visibleFeedback?.feedback}
        </div>
      </Modal>

      {loading && (
        <div className="ft-tests-refresh">
          <Button
            variant="secondary"
            className="ft-tests-refresh__button"
            disabled={loading}
            leftIcon={<RefreshCw size={16} className={loading ? "ft-spin" : ""} />}
            onClick={loadAvailableTests}
          >
            Refresh
          </Button>
        </div>
      )}

      <Modal
        open={accessModal.open}
        title="Access Code"
        description="To start this test, enter the access code provided by your trainer."
        size="sm"
        className="ft-access-modal"
        closeDisabled={verifyingAccess}
        onClose={closeAccessModal}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={verifyingAccess}
              onClick={closeAccessModal}
            >
              Cancel
            </Button>
            <Button
              loading={verifyingAccess}
              loadingLabel="Checking..."
              onClick={handleVerifyAccessCode}
            >
              Start Test
            </Button>
          </>
        }
      >
        <div className="ft-access-modal__icon">
          <KeyRound size={32} />
        </div>
        <Input
          autoFocus
          className="ft-access-modal__input-group"
          inputClassName="ft-input--large"
          type="text"
          inputMode="numeric"
          maxLength={12}
          value={accessCode}
          placeholder="Enter 6-digit code"
          aria-label="Access code"
          error={accessError}
          onChange={(event) => {
            setAccessCode(event.target.value.replace(/\D/g, ""));
            setAccessError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleVerifyAccessCode();
            }
          }}
        />
      </Modal>
    </section>
  );
}
