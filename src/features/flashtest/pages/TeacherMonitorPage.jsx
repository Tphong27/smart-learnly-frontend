import { useCallback, useEffect, useMemo, useState } from "react";
import { Client } from "@stomp/stompjs";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Download,
  Eye,
  RefreshCw,
  RotateCcw,
  X,
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
    return { label: "Submitted", className: "ft-status--submitted", done: true };
  }
  if (normalized === "EXPIRED" || normalized === "TIMEOUT") {
    return { label: "Expired", className: "ft-status--expired", done: false };
  }
  return { label: "Doing", className: "ft-status--doing", done: false };
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

function questionId(question) {
  return question?.questionId || question?.id || "";
}

function answerId(answer) {
  return answer?.answerId || answer?.id || "";
}

function questionText(question) {
  return question?.questionText || question?.content || question?.title || "Untitled question";
}

function answerText(answer) {
  return answer?.answerText || answer?.content || "Untitled answer";
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

export function TeacherMonitorPage() {
  const { id, type } = useParams();
  const navigate = useNavigate();
  const normalizedType = type === "essay" || type === "assignment" ? "essay" : "mcq";
  const [rows, setRows] = useState({});
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [reopeningId, setReopeningId] = useState(null);
  const [detailState, setDetailState] = useState({
    row: null,
    answers: [],
    loading: false,
    error: "",
  });
  const [connected, setConnected] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const [questionTotal, setQuestionTotal] = useState(null);
  const [testQuestions, setTestQuestions] = useState([]);
  const [accessInfo, setAccessInfo] = useState(null);

  const rowList = useMemo(
    () =>
      Object.values(rows).sort((a, b) =>
        String(a.studentName || a.studentId).localeCompare(
          String(b.studentName || b.studentId),
        ),
      ),
    [rows],
  );

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

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      if (normalizedType === "essay") {
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
            type: "essay",
            status: item.status,
            startTime: item.startTime,
            endTime: assignment.dueDate,
            fileUrl: item.fileUrl,
            fileName: item.fileName,
            score: item.score,
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
        setTestQuestions(questionMappings || []);
        attempts.forEach((item) =>
          mergeEvent({
            targetId: item.testId,
            attemptId: item.id,
            studentId: item.studentId,
            type: "mcq",
            status: item.status,
            startTime: item.startTime,
            endTime: item.endTime,
            score: item.score,
            percentage: item.percentage,
            totalQuestions: getQuestionTotal(item),
          }),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id, mergeEvent, normalizedType]);

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

  const handleViewMcqDetail = async (row) => {
    if (!row.attemptId) return;
    setDetailState({ row, answers: [], loading: true, error: "" });
    try {
      const answers = await attemptService.getStudentAnswers(row.attemptId);
      setDetailState({ row, answers, loading: false, error: "" });
    } catch (error) {
      console.error("Failed to load MCQ attempt detail", error);
      setDetailState({
        row,
        answers: [],
        loading: false,
        error: error.message || "Could not load this attempt detail.",
      });
    }
  };

  const closeDetail = () =>
    setDetailState({ row: null, answers: [], loading: false, error: "" });

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
        client.subscribe(topic, (message) => mergeEvent(JSON.parse(message.body)));
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    });
    client.activate();
    return () => client.deactivate();
  }, [id, mergeEvent, normalizedType]);

  return (
    <section className="ft-page">
      <header className="ft-page-header">
        <div>
          <span className="ft-page-kicker">Realtime monitor</span>
          <h1 className="ft-page-title">Monitor Progress</h1>
          <p className="ft-page-subtitle">
            {normalizedType === "essay" ? "Essay assignment" : "MCQ practice"} ·{" "}
            {connected ? "Realtime connected" : "Connecting realtime..."}
          </p>
          {accessInfo?.code && (
            <div className="ft-access-code-panel">
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
        <div className="ft-toolbar">
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

      <div className="ft-table-wrap">
        <table className="ft-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Status</th>
              <th>Started</th>
              <th>Remaining</th>
              <th>{normalizedType === "essay" ? "Submission" : "Score"}</th>
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
              const remaining =
                row.endTime
                  ? Math.max(
                      0,
                      Math.floor((new Date(row.endTime).getTime() - clockTick) / 1000),
                    )
                  : row.remainingSeconds ?? null;
              return (
                <tr key={row.studentId}>
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
                  <td>{row.startTime ? new Date(row.startTime).toLocaleString() : "--"}</td>
                  <td>{remainingText(remaining)}</td>
                  <td>
                    {normalizedType === "essay" ? (
                      row.fileUrl && info.done ? (
                        <button
                          className="ft-button ft-button--secondary"
                          type="button"
                          disabled={downloadingId === (row.submissionId || row.studentId)}
                          onClick={() => handleDownload(row)}
                        >
                          <Download size={16} />
                          {downloadingId === (row.submissionId || row.studentId)
                            ? "Downloading..."
                            : "Download file"}
                        </button>
                      ) : (
                        <span className="ft-muted">Waiting for submission</span>
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
                        {info.done ? (
                          <>
                            <button
                              className="ft-icon-button"
                              type="button"
                              title="View MCQ attempt detail"
                              disabled={!row.attemptId}
                              onClick={() => handleViewMcqDetail(row)}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className="ft-button ft-button--secondary"
                              type="button"
                              disabled={reopeningId === row.studentId}
                              onClick={() => handleReopen(row)}
                            >
                              <RotateCcw size={16} />
                              {reopeningId === row.studentId ? "Opening..." : "Reopen"}
                            </button>
                          </>
                        ) : (
                          <span className="ft-muted">--</span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
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

      {detailState.row && (
        <div className="ft-modal-overlay" role="dialog" aria-modal="true">
          <div className="ft-detail-dialog">
            <div className="ft-detail-dialog__header">
              <div>
                <span className="ft-page-kicker">MCQ attempt detail</span>
                <h2>{detailState.row.studentName}</h2>
              </div>
              <button
                className="ft-icon-button"
                type="button"
                title="Close"
                onClick={closeDetail}
              >
                <X size={18} />
              </button>
            </div>

            {detailState.loading ? (
              <p className="ft-muted">Loading answers...</p>
            ) : detailState.error ? (
              <div className="ft-alert">{detailState.error}</div>
            ) : (
              <div className="ft-attempt-detail-list">
                {testQuestions.map((question, index) => {
                  const currentQuestionId = questionId(question);
                  const studentAnswer = detailState.answers.find(
                    (item) => questionId(item) === currentQuestionId,
                  );
                  const selectedAnswerId = studentAnswer?.selectedAnswerId;
                  const answers = question.answers || question.options || [];
                  const correctAnswer = answers.find(
                    (answer) => answer.correct || answer.isCorrect,
                  );
                  const isCorrect =
                    selectedAnswerId &&
                    correctAnswer &&
                    String(selectedAnswerId) === String(answerId(correctAnswer));
                  const resultLabel = selectedAnswerId
                    ? isCorrect
                      ? "Correct"
                      : "Incorrect"
                    : "No answer";

                  return (
                    <div className="ft-attempt-question" key={currentQuestionId || index}>
                      <div className="ft-attempt-question__title">
                        <strong>
                          Question {index + 1}: {questionText(question)}
                        </strong>
                        <span
                          className={`ft-badge ${
                            isCorrect ? "ft-status--submitted" : "ft-status--expired"
                          }`}
                        >
                          {resultLabel}
                        </span>
                      </div>
                      <div className="ft-attempt-answers">
                        {answers.map((answer, answerIndex) => {
                          const id = answerId(answer);
                          const selected = String(selectedAnswerId || "") === String(id);
                          const correct = answer.correct || answer.isCorrect;
                          return (
                            <div
                              className={`ft-attempt-answer ${
                                correct ? "is-correct" : ""
                              } ${selected ? "is-selected" : ""}`}
                              key={id || answerIndex}
                            >
                              <span>{answerText(answer)}</span>
                              <div className="ft-attempt-answer__tags">
                                {selected && <strong>Selected</strong>}
                                {correct && <strong>Answer</strong>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {testQuestions.length === 0 && (
                  <p className="ft-muted">No questions found for this test.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
