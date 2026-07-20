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
  RefreshCw,
  RotateCcw,
  Users,
  XCircle,
} from "lucide-react";
import {
  assignmentService,
  attemptService,
  testService,
} from "@/services/flashtest.service.js";
import "../flashtest.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080/api/v1";

function wsUrl() {
  return API_BASE_URL.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "/ws");
}

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

function isCompletedAttempt(status) {
  const normalized = String(status || "").toUpperCase();
  return (
    normalized === "SUBMITTED" ||
    normalized === "GRADED" ||
    normalized === "EXPIRED" ||
    normalized === "TIMEOUT"
  );
}

function remainingText(seconds) {
  if (seconds == null) return "--";
  const safe = Math.max(0, Number(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function accessCodeSecondsLeft(expiresAt, clockTick) {
  if (!expiresAt) return null;
  return Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - clockTick) / 1000),
  );
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

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

function formatScoreValue(value) {
  if (!Number.isFinite(value)) return "--";
  const score = Math.max(0, Math.min(10, value));
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

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

export function TeacherMonitorPage() {
  const { id, type } = useParams();
  const navigate = useNavigate();
  const normalizedType =
    type === "essay" || type === "assignment" ? "essay" : "mcq";
  const [rows, setRows] = useState({});
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [reopeningId, setReopeningId] = useState(null);
  const [gradingId, setGradingId] = useState(null);
  const [gradeForms, setGradeForms] = useState({});
  const [connected, setConnected] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const [questionTotal, setQuestionTotal] = useState(null);
  const [accessInfo, setAccessInfo] = useState(null);
  const [activeTab, setActiveTab] = useState("live");
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [expandedStudentId, setExpandedStudentId] = useState(null);

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
    const submitted = rowList.filter((row) => statusInfo(row.status).done).length;
    const doing = rowList.filter((row) => {
      const info = statusInfo(row.status);
      return !info.done && info.className !== "ft-status--expired";
    }).length;
    const expired = rowList.filter(
      (row) => statusInfo(row.status).className === "ft-status--expired",
    ).length;
    return { submitted, doing, expired };
  }, [rowList]);

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

  const toggleStudentAttempts = (studentId) => {
    setExpandedStudentId((current) =>
      current === studentId ? null : studentId,
    );
  };

  const openAttemptDetail = (attempt, studentName) => {
    const attemptId = attempt?.id || attempt?.attemptId;
    const testId = attempt?.testId || id;
    if (!attemptId || !testId) return;
    navigate(`/staff/tests/attempts/${testId}/${attemptId}`, {
      state: { attempt, studentName },
    });
  };

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
                <button
                  className="ft-history-attempt__toggle"
                  type="button"
                  title="View answer detail"
                  aria-label="View answer detail"
                  disabled={!attemptId}
                  onClick={() => openAttemptDetail(attempt, studentName)}
                >
                  <Eye size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const updateGradeForm = (submissionId, patch) => {
    setGradeForms((current) => ({
      ...current,
      [submissionId]: {
        score: "",
        ...(current[submissionId] || {}),
        ...patch,
      },
    }));
  };

  const handleGradeSubmission = async (row) => {
    if (!row.submissionId) return;
    const form = gradeForms[row.submissionId] || {};
    const score = Number(form.score);
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

  const handleReopen = async (row) => {
    if (!row.studentId || normalizedType !== "mcq") return;
    const confirmed = window.confirm(
      "Reopen this MCQ attempt? The student's previous answers and score will be cleared.",
    );
    if (!confirmed) return;

    setReopeningId(row.studentId);
    try {
      await attemptService.reopen(id, row.studentId);
      setRows((current) => {
        const next = { ...current };
        delete next[row.studentId];
        return next;
      });
    } catch (error) {
      console.error("Failed to reopen attempt", error);
      alert(error.message || "Could not reopen this attempt.");
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
          <span className="ft-page-kicker">Trainer monitor</span>
          <h1 className="ft-page-title">
            {normalizedType === "essay" ? "Assignment Monitor" : "Test Monitor"}
          </h1>
          <p className="ft-page-subtitle">
            {normalizedType === "essay"
              ? "Review submissions, download files, and grade trainee work."
              : "Watch live attempts, reopen access, and inspect completed answers."}
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
          <button
            className="ft-icon-button"
            type="button"
            title="Back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            className="ft-button ft-button--secondary"
            type="button"
            onClick={loadInitial}
          >
            <RefreshCw size={16} className={loading ? "ft-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      <div className="ft-ops-stats ft-monitor-stats" aria-label="Monitor summary">
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

      {normalizedType === "mcq" && (
        <div
          className="ft-monitor-tabs"
          role="tablist"
          aria-label="Test monitor tabs"
        >
          <button
            className={`ft-tab ${activeTab === "live" ? "is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTab === "live"}
            onClick={() => setActiveTab("live")}
          >
            Live monitor
          </button>
          <button
            className={`ft-tab ${activeTab === "history" ? "is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={activeTab === "history"}
            onClick={() => setActiveTab("history")}
          >
            Attempt history
          </button>
        </div>
      )}

      {(normalizedType !== "mcq" || activeTab === "live") && (
        <div className="ft-table-wrap ft-table-wrap--ops">
          <table className="ft-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th>Started</th>
                <th>Remaining</th>
                <th>
                  {normalizedType === "essay" ? "Submission / Grade" : "Score"}
                </th>
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
                      <td>
                        {normalizedType === "essay" ? (
                          info.done ? (
                            <div className="ft-grade-cell">
                              {row.fileUrl ? (
                                <button
                                  className="ft-button ft-button--secondary"
                                  type="button"
                                  disabled={
                                    downloadingId ===
                                    (row.submissionId || row.studentId)
                                  }
                                  onClick={() => handleDownload(row)}
                                >
                                  <Download size={16} />
                                  {downloadingId ===
                                  (row.submissionId || row.studentId)
                                    ? "Downloading..."
                                    : "Download file"}
                                </button>
                              ) : (
                                <span className="ft-muted">No file</span>
                              )}
                              {row.score != null ? (
                                <strong>{row.score}/10</strong>
                              ) : (
                                <>
                                  <input
                                    className="ft-input"
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.1"
                                    placeholder="Score"
                                    value={
                                      gradeForms[row.submissionId]?.score || ""
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
                                        !Number.isFinite(nextScore) ||
                                        nextScore < 0 ||
                                        nextScore > 10
                                      ) {
                                        return;
                                      }
                                      updateGradeForm(row.submissionId, {
                                        score: value,
                                      });
                                    }}
                                  />
                                  <button
                                    className="ft-button ft-button--primary"
                                    type="button"
                                    disabled={gradingId === row.submissionId}
                                    onClick={() => handleGradeSubmission(row)}
                                  >
                                    {gradingId === row.submissionId
                                      ? "Saving..."
                                      : "Grade"}
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="ft-muted">
                              Waiting for submission
                            </span>
                          )
                        ) : row.score != null || row.percentage != null ? (
                          <strong>
                            {mcqScore.score}/10
                            {mcqScore.percentage != null
                              ? ` (${mcqScore.percentage}%)`
                              : ""}
                          </strong>
                        ) : (
                          <span className="ft-muted">Waiting for auto grade</span>
                        )}
                      </td>
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
                                  isExpanded
                                    ? "Hide attempts"
                                    : "Show attempts"
                                }
                                aria-label={
                                  isExpanded
                                    ? "Hide attempts"
                                    : "Show attempts"
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
                              <button
                                className="ft-button ft-button--secondary"
                                type="button"
                                disabled={reopeningId === row.studentId}
                                onClick={() => handleReopen(row)}
                              >
                                <RotateCcw size={16} />
                                {reopeningId === row.studentId
                                  ? "Opening..."
                                  : "Reopen"}
                              </button>
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
                  <td colSpan={normalizedType === "mcq" ? 6 : 5}>
                    No student activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {normalizedType === "mcq" && activeTab === "history" && (
        <div className="ft-table-wrap ft-table-wrap--ops">
          <table className="ft-table">
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
          </table>
        </div>
      )}

    </section>
  );
}
