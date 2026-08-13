import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Client } from "@stomp/stompjs";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle,
  ChevronUp,
  Clock,
  Download,
  Eye,
  MessageSquareText,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  RotateCcw,
  Users,
  XCircle,
} from "lucide-react";
import {
  Alert,
  Button,
  ConfirmDialog,
  IconButton,
  Input,
  Modal,
  Table,
  Tabs,
  Textarea,
  useToast,
} from "@/shared/components/ui";
import { assignmentService } from "@/features/assignment";
import { attemptService } from "../services/attemptService";
import { testService } from "../services/testService";
import "../test.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080/api/v1";

/** Tạo websocket URL từ API base URL hiện tại. */
function wsUrl() {
  return API_BASE_URL.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "/ws");
}

/** Chuẩn hóa attempt status thành metadata hiển thị. */
function statusInfo(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "SUBMITTED" || normalized === "GRADED") {
    return {
      label: "Submitted",
      className: "ft-status--submitted",
      done: true,
    };
  }
  if (normalized === "EXPIRED" || normalized === "TIMEOUT") {
    return { label: "Expired", className: "ft-status--expired", done: false };
  }
  return { label: "Doing", className: "ft-status--doing", done: false };
}

/** Kiểm tra attempt đã kết thúc hay chưa. */
function isCompletedAttempt(status) {
  const normalized = String(status || "").toUpperCase();
  return (
    normalized === "SUBMITTED" ||
    normalized === "GRADED" ||
    normalized === "EXPIRED" ||
    normalized === "TIMEOUT"
  );
}

/** Format số giây còn lại thành phút:giây. */
function remainingText(seconds) {
  if (seconds == null) return "--";
  const safe = Math.max(0, Number(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** Tính số giây còn hiệu lực của access code. */
function accessCodeSecondsLeft(expiresAt, clockTick) {
  if (!expiresAt) return null;
  return Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - clockTick) / 1000),
  );
}

/** Chuyển giá trị sang số hữu hạn hoặc null. */
function numberOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** Suy ra tổng số question từ các response shape khả dụng. */
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

/** Giới hạn và format điểm theo thang 10. */
function formatScoreValue(value) {
  if (!Number.isFinite(value)) return "--";
  const score = Math.max(0, Math.min(10, value));
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

/** Chuẩn hóa điểm MCQ về điểm thang 10 và phần trăm. */
function formatMcqScore(row, questionTotal) {
  const percentage = numberOrNull(row?.percentage);
  const rawScore = numberOrNull(row?.score);
  if (percentage && percentage > 0) {
    return {
      score: formatScoreValue(percentage / 10),
      percentage: Math.round(percentage),
    };
  }
  if (rawScore != null && questionTotal) {
    const computedPercentage = (rawScore / questionTotal) * 100;
    return {
      score: formatScoreValue(computedPercentage / 10),
      percentage: Math.round(computedPercentage),
    };
  }
  if (percentage === 0) {
    return { score: "0", percentage: 0 };
  }
  return { score: "--", percentage: null };
}

/** Suy ra phần trăm điểm MCQ cho thao tác so sánh attempt. */
function getMcqScorePercentage(row, questionTotal) {
  const percentage = numberOrNull(row?.percentage);
  const rawScore = numberOrNull(row?.score);
  if (percentage && percentage > 0) return percentage;
  if (rawScore != null && questionTotal) {
    return (rawScore / questionTotal) * 100;
  }
  if (percentage != null) return percentage;
  return null;
}

/** Điều phối giám sát trực tiếp, lịch sử attempt và chấm essay. */
export function TeacherMonitorPage() {
  const { id, type } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const normalizedType =
    type === "essay" || type === "assignment" ? "essay" : "mcq";
  const [rows, setRows] = useState({});
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [reopeningId, setReopeningId] = useState(null);
  const [pendingReopen, setPendingReopen] = useState(null);
  const [gradingId, setGradingId] = useState(null);
  const [gradeForms, setGradeForms] = useState({});
  const [connected, setConnected] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const [questionTotal, setQuestionTotal] = useState(null);
  const [accessInfo, setAccessInfo] = useState(null);
  const [assignmentRubric, setAssignmentRubric] = useState("");
  const [activeTab, setActiveTab] = useState("live");
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [expandedStudentId, setExpandedStudentId] = useState(null);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [aiFeedbackDraft, setAiFeedbackDraft] = useState("");
  const [generatingFeedback, setGeneratingFeedback] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [feedbackCopied, setFeedbackCopied] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  const rowList = useMemo(
    () =>
      Object.values(rows).sort((a, b) =>
        String(a.studentName || a.studentId).localeCompare(
          String(b.studentName || b.studentId),
        ),
      ),
    [rows],
  );

  const historyRows = useMemo(() => {
    const completedAttempts = attemptHistory.filter((attempt) =>
      isCompletedAttempt(attempt.status),
    );
    const grouped = completedAttempts.reduce((acc, attempt) => {
      if (!attempt.studentId) return acc;
      const key = attempt.studentId;
      const current = acc[key] || {
        studentId: attempt.studentId,
        studentName:
          attempt.studentName ||
          `Student ${String(attempt.studentId).slice(0, 8)}`,
        attempts: [],
      };
      current.studentName =
        attempt.studentName ||
        current.studentName ||
        `Student ${String(attempt.studentId).slice(0, 8)}`;
      current.attempts.push(attempt);
      acc[key] = current;
      return acc;
    }, {});

    return Object.values(grouped)
      .map((item) => ({
        ...item,
        attempts: item.attempts.sort(
          (a, b) =>
            new Date(a.startTime || 0).getTime() -
            new Date(b.startTime || 0).getTime(),
        ),
      }))
      .sort((a, b) =>
        String(a.studentName).localeCompare(String(b.studentName)),
      );
  }, [attemptHistory]);

  const monitorStats = useMemo(() => {
    const submitted = rowList.filter(
      (row) => statusInfo(row.status).done,
    ).length;
    const doing = rowList.filter((row) => {
      const info = statusInfo(row.status);
      return !info.done && info.className !== "ft-status--expired";
    }).length;
    const expired = rowList.filter(
      (row) => statusInfo(row.status).className === "ft-status--expired",
    ).length;
    return { submitted, doing, expired };
  }, [rowList]);

  /** Ghép websocket event mới vào row monitor hiện tại. */
  const mergeEvent = useCallback((event) => {
    if (!event?.studentId) return;
    if (String(event.status || "").toUpperCase() === "REOPENED") {
      setRows((current) => {
        const next = { ...current };
        delete next[event.studentId];
        return next;
      });
      return;
    }
    if (event.attemptId) {
      setAttemptHistory((current) => {
        const attempt = {
          id: event.attemptId,
          testId: event.targetId,
          studentId: event.studentId,
          studentName:
            event.studentName ||
            current.find((item) => item.studentId === event.studentId)
              ?.studentName ||
            `Student ${String(event.studentId).slice(0, 8)}`,
          startTime: event.startTime,
          endTime: event.endTime,
          score: event.score,
          percentage: event.percentage,
          status: event.status,
          totalQuestions: event.totalQuestions,
        };
        const exists = current.some((item) => item.id === attempt.id);
        const next = exists
          ? current.map((item) =>
              item.id === attempt.id ? { ...item, ...attempt } : item,
            )
          : [...current, attempt];
        return next.sort(
          (a, b) =>
            new Date(a.startTime || 0).getTime() -
            new Date(b.startTime || 0).getTime(),
        );
      });
    }
    setRows((current) => ({
      ...current,
      [event.studentId]: {
        ...current[event.studentId],
        ...event,
        studentName:
          event.studentName ||
          current[event.studentId]?.studentName ||
          `Student ${String(event.studentId).slice(0, 8)}`,
      },
    }));
  }, []);

  /** Ghép attempt mới vào lịch sử và tránh trùng ID. */
  const mergeAttemptHistory = useCallback((attempt) => {
    if (!attempt?.id) return;
    setAttemptHistory((current) => {
      const exists = current.some((item) => item.id === attempt.id);
      const next = exists
        ? current.map((item) =>
            item.id === attempt.id ? { ...item, ...attempt } : item,
          )
        : [...current, attempt];
      return next.sort(
        (a, b) =>
          new Date(a.startTime || 0).getTime() -
          new Date(b.startTime || 0).getTime(),
      );
    });
  }, []);

  /** Tải snapshot monitor, lịch sử và rubric ban đầu. */
  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      if (normalizedType === "essay") {
        setAttemptHistory([]);
        const [assignment, submissions] = await Promise.all([
          assignmentService.getById(id),
          assignmentService.getSubmissionsByAssignment(id),
        ]);
        setAccessInfo({
          code: assignment.accessCode,
          expiresAt: assignment.accessCodeExpiresAt,
        });
        setAssignmentRubric(assignment.rubric || "");
        submissions.forEach((item) =>
          mergeEvent({
            targetId: item.assignmentId,
            submissionId: item.id,
            studentId: item.studentId,
            studentName: item.studentName,
            type: "essay",
            status: item.status,
            startTime: item.startTime,
            endTime: item.endTime || assignment.dueDate,
            fileUrl: item.fileUrl,
            fileName: item.fileName,
            score: item.score,
            trainerFeedback: item.trainerFeedback,
          }),
        );
      } else {
        const [test, attempts, questionMappings] = await Promise.all([
          testService.getById(id),
          attemptService.getByTest(id),
          testService.getStaffQuestions(id).catch((questionError) => {
            console.warn("Could not load MCQ question total", questionError);
            return [];
          }),
        ]);
        setAccessInfo({
          code: test.accessCode,
          expiresAt: test.accessCodeExpiresAt,
        });
        setQuestionTotal(getQuestionTotal({ questions: questionMappings }));
        setAttemptHistory([]);
        attempts.forEach((item) => {
          const normalizedAttempt = {
            ...item,
            studentName:
              item.studentName ||
              `Student ${String(item.studentId).slice(0, 8)}`,
            totalQuestions: getQuestionTotal(item),
          };
          mergeAttemptHistory(normalizedAttempt);
          mergeEvent({
            targetId: item.testId,
            attemptId: item.id,
            studentId: item.studentId,
            studentName: normalizedAttempt.studentName,
            type: "mcq",
            status: item.status,
            startTime: item.startTime,
            endTime: item.endTime,
            score: item.score,
            percentage: item.percentage,
            totalQuestions: getQuestionTotal(item),
          });
        });
      }
    } finally {
      setLoading(false);
    }
  }, [id, mergeAttemptHistory, mergeEvent, normalizedType]);

  /** Tải file submission của trainee. */
  const handleDownload = async (row) => {
    if (!row.fileUrl) return;
    setDownloadingId(row.submissionId || row.studentId);
    try {
      const blob = await assignmentService.downloadFile(row.fileUrl);
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = row.fileName || "submission";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (error) {
      console.error("Failed to download submission", error);
      alert(error.message || "Could not download this submission.");
    } finally {
      setDownloadingId(null);
    }
  };

  /** Mở hoặc đóng danh sách attempt của trainee. */
  const toggleStudentAttempts = (studentId) => {
    setExpandedStudentId((current) =>
      current === studentId ? null : studentId,
    );
  };

  /** Điều hướng tới chi tiết answer của một attempt. */
  const openAttemptDetail = (attempt, studentName) => {
    const attemptId = attempt?.id || attempt?.attemptId;
    const testId = attempt?.testId || id;
    if (!attemptId || !testId) return;
    navigate(`/staff/tests/attempts/${testId}/${attemptId}`, {
      state: { attempt, studentName },
    });
  };

  /** Render danh sách attempt có action mở chi tiết. */
  const renderAttemptList = (attempts, studentName) => (
    <div className="ft-inline-attempts">
      <div className="ft-inline-attempts__header">
        <strong>{attempts.length} attempts</strong>
      </div>
      <div className="ft-attempt-detail-list">
        {attempts.map((attempt, index) => {
          const attemptId = attempt.id || attempt.attemptId;
          const score = formatMcqScore(
            attempt,
            getQuestionTotal(attempt) || questionTotal,
          );
          return (
            <div className="ft-history-attempt" key={attemptId || index}>
              <div className="ft-history-attempt__summary">
                <div className="ft-history-attempt__meta">
                  <strong>Attempt {index + 1}</strong>
                  <span>{studentName}</span>
                </div>
                <strong>{score.score}/10</strong>
                <span className="ft-muted">
                  {attempt.startTime
                    ? new Date(attempt.startTime).toLocaleString()
                    : "--"}
                </span>
                <IconButton
                  icon={<Eye size={18} />}
                  label="View answer detail"
                  disabled={!attemptId}
                  onClick={() => openAttemptDetail(attempt, studentName)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  /** Cập nhật draft điểm/feedback cho một submission. */
  const updateGradeForm = (submissionId, patch) => {
    setGradeForms((current) => ({
      ...current,
      [submissionId]: {
        ...(current[submissionId] || {}),
        ...patch,
      },
    }));
  };

  /** Validate và lưu điểm essay submission. */
  const handleGradeSubmission = async (row) => {
    if (!row.submissionId) return;
    const form = gradeForms[row.submissionId] || {};
    const scoreValue =
      form.score === undefined || form.score === "" ? row.score : form.score;
    const score = Number(scoreValue);
    if (!Number.isFinite(score) || score < 0 || score > 10) {
      alert("Please enter a score from 0 to 10.");
      return;
    }

    setGradingId(row.submissionId);
    try {
      const graded = await assignmentService.gradeSubmission(row.submissionId, {
        score,
        status: "GRADED",
      });
      mergeEvent({
        targetId: graded.assignmentId,
        submissionId: graded.id,
        studentId: graded.studentId,
        studentName: row.studentName,
        type: "essay",
        status: graded.status,
        startTime: graded.startTime,
        endTime: row.endTime,
        fileUrl: graded.fileUrl,
        fileName: graded.fileName,
        score: graded.score,
        trainerFeedback: graded.trainerFeedback,
      });
      setGradeForms((current) => {
        const next = { ...current };
        delete next[row.submissionId];
        return next;
      });
    } catch (error) {
      console.error("Failed to grade submission", error);
      alert(error.message || "Could not grade this submission.");
    } finally {
      setGradingId(null);
    }
  };

  /** Mở modal feedback và hydrate dữ liệu của submission. */
  const openFeedbackModal = (row) => {
    setFeedbackModal(row);
    setFeedbackText(row.trainerFeedback || "");
    setAiFeedbackDraft("");
    setFeedbackError("");
    setFeedbackCopied(false);
  };

  /** Đóng modal feedback và reset draft AI liên quan. */
  const closeFeedbackModal = () => {
    if (generatingFeedback || savingFeedback) return;
    setFeedbackModal(null);
  };

  /** Yêu cầu AI tạo feedback dựa trên rubric và submission. */
  const handleGenerateFeedback = async () => {
    if (!feedbackModal?.submissionId) return;
    setGeneratingFeedback(true);
    setFeedbackError("");
    setAiFeedbackDraft("");
    try {
      const result = await assignmentService.generateSubmissionFeedback(
        feedbackModal.submissionId,
      );
      setAiFeedbackDraft(result?.feedback || "");
    } catch (error) {
      setFeedbackError(error.message || "Could not generate AI feedback.");
    } finally {
      setGeneratingFeedback(false);
    }
  };

  /** Sao chép feedback AI vào clipboard. */
  const handleCopyFeedback = async () => {
    if (!aiFeedbackDraft) return;
    try {
      await navigator.clipboard.writeText(aiFeedbackDraft);
      setFeedbackCopied(true);
      window.setTimeout(() => setFeedbackCopied(false), 1600);
    } catch {
      setFeedbackError("Could not copy the feedback. Please select it manually.");
    }
  };

  /** Lưu feedback trainer cho submission hiện tại. */
  const handleSaveFeedback = async () => {
    if (!feedbackModal?.submissionId) return;
    setSavingFeedback(true);
    setFeedbackError("");
    try {
      const graded = await assignmentService.gradeSubmission(
        feedbackModal.submissionId,
        {
          score: feedbackModal.score ?? null,
          trainerFeedback: feedbackText.trim(),
          status: feedbackModal.status || "SUBMITTED",
        },
      );
      mergeEvent({
        ...feedbackModal,
        targetId: graded.assignmentId,
        submissionId: graded.id,
        studentId: graded.studentId,
        status: graded.status,
        score: graded.score,
        trainerFeedback: graded.trainerFeedback,
      });
      setFeedbackModal(null);
    } catch (error) {
      setFeedbackError(error.message || "Could not save feedback.");
    } finally {
      setSavingFeedback(false);
    }
  };

  /** Mở lại attempt để trainee có thể làm lại. */
  const handleReopen = async (row) => {
    if (!row.studentId || normalizedType !== "mcq") return;
    setReopeningId(row.studentId);
    try {
      await attemptService.reopen(id, row.studentId);
      setRows((current) => {
        const next = { ...current };
        delete next[row.studentId];
        return next;
      });
      setPendingReopen(null);
      toast.success("The MCQ attempt was reopened.");
    } catch (error) {
      console.error("Failed to reopen attempt", error);
      toast.error(error.message || "Could not reopen this attempt.");
    } finally {
      setReopeningId(null);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(loadInitial, 0);
    return () => window.clearTimeout(timer);
  }, [loadInitial]);

  useEffect(() => {
    if (!accessInfo?.expiresAt) return undefined;
    const delay = Math.max(
      0,
      new Date(accessInfo.expiresAt).getTime() - Date.now() + 500,
    );
    const timer = window.setTimeout(loadInitial, delay);
    return () => window.clearTimeout(timer);
  }, [accessInfo?.expiresAt, loadInitial]);

  useEffect(() => {
    /** Đồng bộ clock tick để countdown access code cập nhật. */
    const updateClock = () => setClockTick(Date.now());
    const initialTimer = window.setTimeout(updateClock, 0);
    const interval = window.setInterval(updateClock, 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const topic =
      normalizedType === "essay"
        ? `/topic/assignments/monitor/${id}`
        : `/topic/tests/monitor/${id}`;
    const client = new Client({
      brokerURL: wsUrl(),
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true);
        client.subscribe(topic, (message) =>
          mergeEvent(JSON.parse(message.body)),
        );
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    });
    client.activate();
    return () => client.deactivate();
  }, [id, mergeEvent, normalizedType]);

  return (
    <section className="ft-page ft-page--monitor">
      <header className="ft-monitor-hero">
        <div className="ft-monitor-hero__content">
          <span className="ft-page-kicker"></span>
          <h1 className="ft-page-title">
            {normalizedType === "essay" ? "Assignment Monitor" : "Test Monitor"}
          </h1>
          <p className="ft-page-subtitle">
            {normalizedType === "essay" ? "" : ""}
          </p>
          <div className="ft-monitor-hero__meta">
            <span>
              <Users size={15} />
              {rowList.length} trainees
            </span>
            <span>
              <BarChart3 size={15} />
              {connected ? "Live connected" : "Manual refresh"}
            </span>
          </div>
          {accessInfo?.code && (
            <div className="ft-access-code-panel ft-access-code-panel--monitor">
              <span>Access code</span>
              <strong>{accessInfo.code}</strong>
              <small>
                Refreshes in{" "}
                {remainingText(
                  accessCodeSecondsLeft(accessInfo.expiresAt, clockTick),
                )}
              </small>
            </div>
          )}
        </div>
        <div className="ft-toolbar ft-monitor-hero__actions">
          <IconButton
            icon={<ArrowLeft size={18} />}
            label="Back"
            onClick={() => navigate(-1)}
          />
          <Button
            variant="secondary"
            leftIcon={<RefreshCw size={16} className={loading ? "ft-spin" : ""} />}
            onClick={loadInitial}
          >
            Refresh
          </Button>
        </div>
      </header>

      <div
        className="ft-ops-stats ft-monitor-stats"
        aria-label="Monitor summary"
      >
        <div className="ft-ops-stat ft-ops-stat--primary">
          <span>Submitted</span>
          <strong>{monitorStats.submitted}</strong>
        </div>
        <div className="ft-ops-stat">
          <span>Doing</span>
          <strong>{monitorStats.doing}</strong>
        </div>
        <div className="ft-ops-stat">
          <span>Expired</span>
          <strong>{monitorStats.expired}</strong>
        </div>
      </div>

      {normalizedType === "essay" && (
        <div className="ft-panel ft-monitor-rubric">
          <div className="ft-field">
            <Textarea
              label="Assignment rubric"
              rows={6}
              value={assignmentRubric}
              readOnly
              placeholder="No rubric was saved for this assignment."
            />
          </div>
        </div>
      )}

      {normalizedType === "mcq" && (
        <Tabs
          className="ft-monitor-tabs"
          ariaLabel="Test monitor tabs"
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { value: "live", label: "Live monitor" },
            { value: "history", label: "Attempt history" },
          ]}
        />
      )}

      {(normalizedType !== "mcq" || activeTab === "live") && (
        <Table ariaLabel="Live test monitor" tableClassName="ft-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th>Started</th>
                <th>Remaining</th>
                {normalizedType === "essay" ? (
                  <>
                    <th>Submission</th>
                    <th>Score</th>
                    <th>Feedback</th>
                    <th className="ft-table-action">Grade</th>
                  </>
                ) : (
                  <th>Score</th>
                )}
                {normalizedType === "mcq" && (
                  <th className="ft-table-action">Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rowList.map((row) => {
                const info = statusInfo(row.status);
                const mcqScore = formatMcqScore(
                  row,
                  getQuestionTotal(row) || questionTotal,
                );
                const historyRow = historyRows.find(
                  (item) => item.studentId === row.studentId,
                );
                const attempts = historyRow?.attempts || [];
                const isExpanded = expandedStudentId === row.studentId;
                const remaining = row.endTime
                  ? Math.max(
                      0,
                      Math.floor(
                        (new Date(row.endTime).getTime() - clockTick) / 1000,
                      ),
                    )
                  : (row.remainingSeconds ?? null);
                return (
                  <Fragment key={row.studentId}>
                    <tr>
                      <td>{row.studentName}</td>
                      <td>
                        <span className={`ft-badge ${info.className}`}>
                          {info.className === "ft-status--expired" ? (
                            <XCircle size={14} />
                          ) : info.done ? (
                            <CheckCircle size={14} />
                          ) : (
                            <Clock size={14} />
                          )}
                          {info.label}
                        </span>
                      </td>
                      <td>
                        {row.startTime
                          ? new Date(row.startTime).toLocaleString()
                          : "--"}
                      </td>
                      <td>{remainingText(remaining)}</td>
                      {normalizedType === "essay" ? (
                        <>
                          <td>
                            {info.done ? (
                              row.fileUrl ? (
                                <Button
                                  variant="secondary"
                                  leftIcon={<Download size={16} />}
                                  loading={downloadingId === (row.submissionId || row.studentId)}
                                  loadingLabel="Downloading..."
                                  onClick={() => handleDownload(row)}
                                >
                                  Download file
                                </Button>
                              ) : (
                                <span className="ft-muted">No file</span>
                              )
                            ) : (
                              <span className="ft-muted">
                                Waiting for submission
                              </span>
                            )}
                          </td>
                          <td>
                            {info.done ? (
                              <div className="ft-score-cell">
                                {row.score != null && (
                                  <strong aria-live="polite">
                                    {row.score}/10
                                  </strong>
                                )}
                                <Input
                                  inputClassName="ft-score-input"
                                  aria-label={`Score for ${row.studentName}`}
                                  type="number"
                                  min="0"
                                  max="10"
                                  step="0.1"
                                  placeholder="Score"
                                  value={
                                    gradeForms[row.submissionId]?.score ??
                                    row.score ??
                                    ""
                                  }
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    if (value === "") {
                                      updateGradeForm(row.submissionId, {
                                        score: "",
                                      });
                                      return;
                                    }
                                    const nextScore = Number(value);
                                    if (
                                      Number.isFinite(nextScore) &&
                                      nextScore >= 0 &&
                                      nextScore <= 10
                                    ) {
                                      updateGradeForm(row.submissionId, {
                                        score: value,
                                      });
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <span className="ft-muted">--</span>
                            )}
                          </td>
                          <td>
                            {info.done ? (
                              <Button
                                variant="secondary"
                                leftIcon={<MessageSquareText size={16} />}
                                disabled={!row.submissionId}
                                onClick={() => openFeedbackModal(row)}
                              >
                                {row.trainerFeedback ? "View feedback" : "Add feedback"}
                              </Button>
                            ) : (
                              <span className="ft-muted">--</span>
                            )}
                          </td>
                          <td className="ft-table-action">
                            {info.done ? (
                              <Button
                                loading={gradingId === row.submissionId}
                                loadingLabel="Saving..."
                                onClick={() => handleGradeSubmission(row)}
                              >
                                {row.score != null
                                    ? "Update grade"
                                    : "Grade"}
                              </Button>
                            ) : (
                              <span className="ft-muted">--</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <td>
                          {row.score != null || row.percentage != null ? (
                            <strong>
                              {mcqScore.score}/10
                              {mcqScore.percentage != null
                                ? ` (${mcqScore.percentage}%)`
                                : ""}
                            </strong>
                          ) : (
                            <span className="ft-muted">
                              Waiting for auto grade
                            </span>
                          )}
                        </td>
                      )}
                      {normalizedType === "mcq" && (
                        <td>
                          <div className="ft-table-actions">
                            {attempts.length > 0 ? (
                              <button
                                className={`ft-history-attempt__toggle ft-history-attempt__toggle--chevron ${
                                  isExpanded ? "is-expanded" : ""
                                }`}
                                type="button"
                                title={
                                  isExpanded ? "Hide attempts" : "Show attempts"
                                }
                                aria-label={
                                  isExpanded ? "Hide attempts" : "Show attempts"
                                }
                                aria-expanded={isExpanded}
                                onClick={() =>
                                  toggleStudentAttempts(row.studentId)
                                }
                              >
                                <ChevronUp size={18} />
                              </button>
                            ) : (
                              <span className="ft-muted">--</span>
                            )}
                            {info.done && (
                              <Button
                                variant="secondary"
                                leftIcon={<RotateCcw size={16} />}
                                loading={reopeningId === row.studentId}
                                loadingLabel="Opening..."
                                onClick={() => setPendingReopen(row)}
                              >
                                Reopen
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                    {normalizedType === "mcq" && isExpanded && (
                      <tr className="ft-expanded-row">
                        <td colSpan={6}>
                          {renderAttemptList(attempts, row.studentName)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!loading && rowList.length === 0 && (
                <tr>
                  <td colSpan={normalizedType === "mcq" ? 6 : 8}>
                    No student activity yet.
                  </td>
                </tr>
              )}
            </tbody>
        </Table>
      )}

      {normalizedType === "mcq" && activeTab === "history" && (
        <Table ariaLabel="Test attempt history" tableClassName="ft-table">
            <thead>
              <tr>
                <th>Trainee</th>
                <th>Attempts</th>
                <th>Latest attempt</th>
                <th>Highest score</th>
                <th className="ft-table-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map((row) => {
                const bestAttempt = row.attempts.reduce((best, attempt) => {
                  const score =
                    getMcqScorePercentage(
                      attempt,
                      getQuestionTotal(attempt) || questionTotal,
                    ) ?? -1;
                  const bestScore =
                    getMcqScorePercentage(
                      best,
                      getQuestionTotal(best) || questionTotal,
                    ) ?? -1;
                  return score > bestScore ? attempt : best;
                }, row.attempts[0]);
                const latestAttempt = row.attempts[row.attempts.length - 1];
                const bestScore = formatMcqScore(
                  bestAttempt,
                  getQuestionTotal(bestAttempt) || questionTotal,
                );
                const isExpanded = expandedStudentId === row.studentId;
                return (
                  <Fragment key={row.studentId}>
                    <tr>
                      <td>{row.studentName}</td>
                      <td>{row.attempts.length}</td>
                      <td>
                        {latestAttempt?.startTime
                          ? new Date(latestAttempt.startTime).toLocaleString()
                          : "--"}
                      </td>
                      <td>
                        <strong>
                          {bestScore.score}/10
                          {bestScore.percentage != null
                            ? ` (${bestScore.percentage}%)`
                            : ""}
                        </strong>
                      </td>
                      <td>
                        <div className="ft-table-actions">
                          <button
                            className={`ft-history-attempt__toggle ft-history-attempt__toggle--chevron ${
                              isExpanded ? "is-expanded" : ""
                            }`}
                            type="button"
                            title={
                              isExpanded ? "Hide attempts" : "Show attempts"
                            }
                            aria-label={
                              isExpanded ? "Hide attempts" : "Show attempts"
                            }
                            aria-expanded={isExpanded}
                            onClick={() => toggleStudentAttempts(row.studentId)}
                          >
                            <ChevronUp size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="ft-expanded-row">
                        <td colSpan={5}>
                          {renderAttemptList(row.attempts, row.studentName)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!loading && historyRows.length === 0 && (
                <tr>
                  <td colSpan={5}>No attempt history yet.</td>
                </tr>
              )}
            </tbody>
        </Table>
      )}

      <ConfirmDialog
        open={Boolean(pendingReopen)}
        title="Reopen this MCQ attempt?"
        description="The trainee's previous answers and score will be cleared."
        confirmLabel="Reopen attempt"
        tone="danger"
        loading={Boolean(reopeningId)}
        loadingLabel="Reopening..."
        onClose={() => setPendingReopen(null)}
        onConfirm={() => pendingReopen && handleReopen(pendingReopen)}
      />

      <Modal
        open={Boolean(feedbackModal)}
        title={`Feedback for ${feedbackModal?.studentName || "trainee"}`}
        description="Write feedback directly or generate a plain-text evaluation from the assignment, rubric, and submitted file."
        size="lg"
        closeDisabled={generatingFeedback || savingFeedback}
        onClose={closeFeedbackModal}
        footer={
          <>
            <Button
              variant="secondary"
              disabled={generatingFeedback || savingFeedback}
              onClick={closeFeedbackModal}
            >
              Cancel
            </Button>
            <Button
              loading={savingFeedback}
              loadingLabel="Saving..."
              disabled={generatingFeedback}
              onClick={handleSaveFeedback}
            >
              Save feedback
            </Button>
          </>
        }
      >
        <div className="ft-feedback-modal">
          <div className="ft-field">
            <Textarea
              label="Trainer feedback"
              rows={7}
              value={feedbackText}
              placeholder="Enter feedback for this trainee..."
              disabled={savingFeedback}
              onChange={(event) => setFeedbackText(event.target.value)}
            />
          </div>

          <div className="ft-feedback-ai">
            <div className="ft-feedback-ai__heading">
              <div>
                <strong>AI feedback assistant</strong>
                <span>
                  Evaluates the submission against the description, attached
                  instructions, and rubric.
                </span>
              </div>
              <Button
                variant="secondary"
                leftIcon={<Sparkles size={16} />}
                loading={generatingFeedback}
                loadingLabel="Generating..."
                disabled={!feedbackModal?.fileUrl}
                onClick={handleGenerateFeedback}
              >
                Generate feedback
              </Button>
            </div>

            {aiFeedbackDraft && (
              <div className="ft-feedback-ai__result">
                <div className="ft-feedback-ai__actions">
                  <Button
                    variant="secondary"
                    leftIcon={feedbackCopied ? <Check size={16} /> : <Copy size={16} />}
                    onClick={handleCopyFeedback}
                  >
                    {feedbackCopied ? "Copied" : "Copy"}
                  </Button>
                  <Button
                    onClick={() => setFeedbackText(aiFeedbackDraft)}
                  >
                    Use this feedback
                  </Button>
                </div>
                <div className="ft-feedback-ai__content">{aiFeedbackDraft}</div>
              </div>
            )}

            {feedbackError && <Alert tone="danger">{feedbackError}</Alert>}
          </div>
        </div>
      </Modal>
    </section>
  );
}
