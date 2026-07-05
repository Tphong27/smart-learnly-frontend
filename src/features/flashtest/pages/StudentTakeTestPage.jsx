import { useCallback, useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileUp,
  Loader2,
} from "lucide-react";
import { getCurrentUser } from "@/services/api-client";
import {
  assignmentService,
  attemptService,
  testService,
} from "@/services/flashtest.service.js";
import { sanitizeLessonHtml } from "@/shared/utils/htmlSanitizer";
import "../flashtest.css";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:8080/api/v1";

function wsUrl() {
  return API_BASE_URL.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "/ws");
}

function secondsUntil(endTime) {
  if (!endTime) return 0;
  return Math.max(
    0,
    Math.floor((new Date(endTime).getTime() - Date.now()) / 1000),
  );
}

function formatTime(seconds) {
  const safe = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function getStudent() {
  const user = getCurrentUser();
  return {
    id: user?.id || user?.userId || user?.accountId,
    name: user?.fullName || user?.name || user?.email || "Student",
  };
}

function isCompletedAttempt(status) {
  const normalized = String(status || "").toUpperCase();
  return ["SUBMITTED", "GRADED", "EXPIRED", "TIMEOUT"].includes(normalized);
}

function submitWarningTitle(warning) {
  if (warning?.type === "essay-empty") {
    return "You have not attached a submission file.";
  }
  if (warning?.type === "mcq-incomplete") {
    return "You have not answered all questions.";
  }
  return warning?.title || "Submit warning";
}

function submitWarningMessage(warning) {
  if (warning?.type === "essay-empty") {
    return "Do you want to submit without uploading anything?";
  }
  if (warning?.type === "mcq-incomplete") {
    return `You answered ${warning.answeredCount}/${warning.totalQuestions} questions. Do you still want to submit?`;
  }
  return warning?.message || "";
}

export function StudentTakeTestPage({
  listPath = "/learning/flashtests",
  accessStoragePrefix = "flashAccess",
  resultKicker = "Flash test result",
} = {}) {
  const { id, type } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const normalizedType =
    type === "assignment" || type === "essay" ? "essay" : "mcq";
  const student = getStudent();
  const stompRef = useRef(null);
  const submittedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [testData, setTestData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempt, setAttempt] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitWarning, setSubmitWarning] = useState(null);
  const [completedResult, setCompletedResult] = useState(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  const accessCode =
    location.state?.accessCode ||
    window.sessionStorage.getItem(`${accessStoragePrefix}:${normalizedType}:${id}`) ||
    "";

  const publishMonitor = useCallback(
    (payload) => {
      const client = stompRef.current;
      if (!client?.connected) return;
      client.publish({
        destination:
          normalizedType === "essay"
            ? "/app/assignments/monitor"
            : "/app/tests/monitor",
        body: JSON.stringify({
          targetId: id,
          studentId: student.id,
          studentName: student.name,
          type: normalizedType,
          ...payload,
        }),
      });
    },
    [id, normalizedType, student.id, student.name],
  );

  useEffect(() => {
    const client = new Client({ brokerURL: wsUrl(), reconnectDelay: 3000 });
    stompRef.current = client;
    client.activate();
    return () => client.deactivate();
  }, []);

  useEffect(() => {
    async function init() {
      if (!student.id) {
        setError("Cannot find the current student profile.");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (normalizedType === "mcq") {
          const test = await testService.getById(id);
          const started = await attemptService.start(
            id,
            student.id,
            null,
            student.name,
            accessCode,
          );
          if (isCompletedAttempt(started.status)) {
            setTestData(test);
            setAttempt(started);
            setCompletedResult(started);
            setQuestions([]);
            setTimeLeft(0);
            return;
          }
          const mappings = await testService.getLearnerQuestions(id);
          const hydrated = mappings.map((mapping) => ({
            id: mapping.questionId,
            questionText: mapping.questionText,
            questionType: mapping.questionType,
            marks: mapping.marks,
            options: mapping.answers || [],
          }));
          setTestData(test);
          setAttempt(started);
          setQuestions(hydrated);
          setActiveQuestionIndex(0);
          setTimeLeft(secondsUntil(started.endTime));
          publishMonitor({
            attemptId: started.id,
            status: "DOING",
            startTime: started.startTime,
            endTime: started.endTime,
          });
        } else {
          const assignment = await assignmentService.getById(id);
          let existingSubmission = null;
          try {
            existingSubmission = await assignmentService.getSubmissionByStudent(
              id,
              student.id,
            );
          } catch (submissionError) {
            if (submissionError?.originalError?.response?.status !== 404) {
              console.warn(
                "Could not load current submission",
                submissionError,
              );
            }
          }
          setSubmission(existingSubmission);
          if (
            assignment.dueDate &&
            new Date(assignment.dueDate).getTime() <= Date.now()
          ) {
            setError("This essay assignment has expired.");
            setTestData(assignment);
            setTimeLeft(0);
            return;
          }
          setTestData(assignment);
          setTimeLeft(secondsUntil(assignment.dueDate));
          try {
            const started = await assignmentService.start({
              assignmentId: id,
              studentId: student.id,
              studentName: student.name,
              accessCode,
            });
            setSubmission(started);
            publishMonitor({
              submissionId: started.id,
              status: "DOING",
              startTime: started.startTime,
              endTime: assignment.dueDate,
            });
          } catch (startError) {
            console.warn("Could not start essay session yet", startError);
          }
        }
      } catch (initError) {
        setError(initError.message || "Could not load this assessment.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [accessCode, id, normalizedType, publishMonitor, student.id, student.name]);

  const handleDownloadCurrentSubmission = async () => {
    if (!submission?.fileUrl) return;
    try {
      const blob = await assignmentService.downloadFile(submission.fileUrl);
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = submission.fileName || "submission";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (downloadError) {
      setError(
        downloadError.message || "Could not download your submitted file.",
      );
    }
  };

  const handleDownloadInstructionFile = async () => {
    if (!testData?.instructionFileUrl) return;
    try {
      const blob = await assignmentService.downloadFile(
        testData.instructionFileUrl,
      );
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = testData.instructionFileName || "essay-instructions";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (downloadError) {
      setError(
        downloadError.message || "Could not download the instruction file.",
      );
    }
  };

  const ensureEssayStarted = useCallback(async () => {
    if (normalizedType !== "essay" || submission?.id) {
      return submission;
    }
    const started = await assignmentService.start({
      assignmentId: id,
      studentId: student.id,
      studentName: student.name,
      accessCode,
    });
    setSubmission(started);
    publishMonitor({
      submissionId: started.id,
      status: "DOING",
      startTime: started.startTime,
      endTime: testData?.dueDate,
    });
    return started;
  }, [
    id,
    accessCode,
    normalizedType,
    publishMonitor,
    student.id,
    student.name,
    submission,
    testData?.dueDate,
  ]);

  const handleSubmit = useCallback(async ({ skipWarning = false } = {}) => {
    if (submittedRef.current || submitting) return;
    if (!skipWarning) {
      if (normalizedType === "essay" && !file && !submission?.fileUrl) {
        setSubmitWarning({
          type: "essay-empty",
          title: "Bạn chưa làm gì cho bài essay.",
          message: "Bạn có muốn tiếp tục nộp bài trống hay ở lại để làm tiếp?",
        });
        return;
      }
      if (normalizedType === "mcq") {
        const answeredCount = questions.filter(
          (question) => answers[question.id],
        ).length;
        if (answeredCount < questions.length) {
          setSubmitWarning({
            type: "mcq-incomplete",
            answeredCount,
            totalQuestions: questions.length,
            title: "Bạn chưa làm hết các câu hỏi.",
            message: `Bạn đã trả lời ${answeredCount}/${questions.length} câu. Bạn có muốn tiếp tục nộp không?`,
          });
          return;
        }
      }
    }
    submittedRef.current = true;
    setSubmitting(true);
    try {
      if (normalizedType === "mcq") {
        const result = await attemptService.submit(attempt.id, {
          forceSubmit: true,
        });
        setCompletedResult(result);
        publishMonitor({
          attemptId: attempt.id,
          status: result.status,
          score: result.score,
          percentage: result.percentage,
          startTime: result.startTime,
          endTime: result.endTime,
        });
      } else {
        const activeSubmission = await ensureEssayStarted();
        const uploaded = file ? await assignmentService.uploadFile(file) : null;
        const result = await assignmentService.submit({
          assignmentId: id,
          studentId: student.id,
          studentName: student.name,
          fileUrl: uploaded?.fileUrl || submission?.fileUrl || null,
          fileName: uploaded?.fileName || file?.name || submission?.fileName || null,
        });
        setSubmission(result);
        publishMonitor({
          submissionId: activeSubmission?.id || result.id,
          status: result.status,
          fileUrl: result.fileUrl,
          fileName: result.fileName,
          startTime: result.startTime,
          endTime: testData?.dueDate,
        });
      }
      if (normalizedType === "essay") {
        navigate(listPath);
      }
    } catch (submitError) {
      submittedRef.current = false;
      setError(submitError.message || "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  }, [
    attempt,
    answers,
    file,
    id,
    ensureEssayStarted,
    navigate,
    listPath,
    normalizedType,
    publishMonitor,
    questions,
    student.id,
    student.name,
    submission,
    submitting,
    testData,
  ]);

  useEffect(() => {
    if (!testData || loading || submittedRef.current || completedResult) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      const end =
        normalizedType === "mcq" ? attempt?.endTime : testData?.dueDate;
      const next = secondsUntil(end);
      setTimeLeft(next);
      if (next <= 0 && normalizedType === "mcq") {
        window.clearInterval(timer);
        handleSubmit({ skipWarning: true });
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [
    attempt?.endTime,
    completedResult,
    handleSubmit,
    loading,
    normalizedType,
    testData,
  ]);

  const handleSelectAnswer = async (questionId, answerId) => {
    setAnswers((current) => ({ ...current, [questionId]: answerId }));
    if (!attempt?.id) return;
    try {
      await attemptService.saveAnswer(attempt.id, questionId, answerId, "");
    } catch (saveError) {
      setError(
        saveError.message ||
          "Could not save the answer. The timer may be over.",
      );
    }
  };

  if (loading) {
    return (
      <section className="ft-page ft-take-workspace">
        <div className="ft-empty">
          <Loader2 className="ft-spin" size={24} />
          <strong>Loading assessment...</strong>
        </div>
      </section>
    );
  }

  return (
    <section className="ft-page ft-take-workspace">
      <header className="ft-take-header">
        <div>
          <span className="ft-page-kicker">
            {normalizedType === "essay" ? "Essay assignment" : "MCQ practice"}
          </span>
          <h1 className="ft-page-title">{testData?.title || testData?.name}</h1>
          <p className="ft-page-subtitle">
            {normalizedType === "essay"
              ? "Upload your file before the due date."
              : "Your personal timer starts when the attempt is created."}
          </p>
        </div>
        <div className="ft-toolbar">
          <span className={`ft-timer ${timeLeft < 60 ? "is-danger" : ""}`}>
            <Clock size={20} /> {formatTime(timeLeft)}
          </span>
          {!completedResult && (
            <button
              className="ft-button ft-button--primary"
              type="button"
              disabled={
                submitting ||
                Boolean(error && normalizedType === "mcq") ||
                Boolean(error && normalizedType === "essay" && timeLeft <= 0)
              }
              onClick={handleSubmit}
            >
              <CheckCircle size={18} /> {submitting ? "Submitting..." : "Submit"}
            </button>
          )}
        </div>
      </header>

      {error && <div className="ft-alert">{error}</div>}

      {completedResult ? (
        <div className="ft-result-panel">
          <div className="ft-result-panel__icon">
            <Eye size={24} />
          </div>
          <div className="ft-result-panel__body">
            <span className="ft-page-kicker">{resultKicker}</span>
            <h2>{testData?.title || testData?.name || "MCQ practice"}</h2>
            <p>
              Status: <strong>{completedResult.status || "SUBMITTED"}</strong>
            </p>
          </div>
          <div className="ft-result-panel__score">
            <span>Score</span>
            <strong>{completedResult.score ?? "--"}</strong>
            {completedResult.percentage != null && (
              <small>{completedResult.percentage}%</small>
            )}
          </div>
          <div className="ft-result-panel__actions">
            <button
              className="ft-button ft-button--primary"
              type="button"
              onClick={() => navigate(listPath)}
            >
              <ArrowLeft size={16} /> Back to list
            </button>
          </div>
        </div>
      ) : normalizedType === "mcq" ? (
        <div className="ft-question-layout">
          <aside className="ft-question-sidebar" aria-label="Question navigation">
            <div className="ft-question-sidebar__header">
              <strong>Questions</strong>
              <span>
                {
                  questions.filter((question) => Boolean(answers[question.id]))
                    .length
                }
                /{questions.length}
              </span>
            </div>
            <div className="ft-question-nav">
              {questions.map((question, index) => (
                <button
                  key={question.id}
                  className={`ft-question-nav__item ${
                    index === activeQuestionIndex ? "is-active" : ""
                  } ${answers[question.id] ? "is-answered" : ""}`}
                  type="button"
                  aria-current={index === activeQuestionIndex ? "true" : undefined}
                  title={`Question ${index + 1}`}
                  onClick={() => setActiveQuestionIndex(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </aside>

          {questions[activeQuestionIndex] ? (
            <article className="ft-question-card">
              <div className="ft-question-card__header">
                <span className="ft-page-kicker">
                  Question {activeQuestionIndex + 1} of {questions.length}
                </span>
                {answers[questions[activeQuestionIndex].id] && (
                  <span className="ft-badge ft-badge--mcq">Answered</span>
                )}
              </div>
              <strong>
                {questions[activeQuestionIndex].questionText ||
                  questions[activeQuestionIndex].content}
              </strong>
              <div className="ft-option-list">
                {(questions[activeQuestionIndex].options || []).map((answer) => (
                  <label className="ft-option" key={answer.id}>
                    <input
                      type="radio"
                      name={`q-${questions[activeQuestionIndex].id}`}
                      checked={
                        answers[questions[activeQuestionIndex].id] === answer.id
                      }
                      onChange={() =>
                        handleSelectAnswer(
                          questions[activeQuestionIndex].id,
                          answer.id,
                        )
                      }
                    />
                    <span>{answer.answerText || answer.content}</span>
                  </label>
                ))}
              </div>
            </article>
          ) : (
            <div className="ft-empty">
              <strong>No questions available.</strong>
            </div>
          )}
        </div>
      ) : (
        <div className="ft-upload-panel">
          <div className="ft-essay-prompt">
            <span className="ft-page-kicker">Teacher instructions</span>
            <h2>Description</h2>
            {testData?.description ? (
              <div
                className="ft-rich-content"
                dangerouslySetInnerHTML={{
                  __html: sanitizeLessonHtml(testData.description),
                }}
              />
            ) : (
              <p>No description provided.</p>
            )}
            {testData?.instructionFileUrl && (
              <button
                className="ft-button ft-button--secondary"
                type="button"
                onClick={handleDownloadInstructionFile}
              >
                <Download size={16} />
                Download instruction file
              </button>
            )}
          </div>
          {submission?.fileUrl && (
            <div className="ft-submission-summary">
              <div>
                <strong>Current submission</strong>
                <p className="ft-muted">
                  {submission.fileName || "Submitted file"}
                  {submission.submittedAt
                    ? ` - submitted ${new Date(submission.submittedAt).toLocaleString()}`
                    : ""}
                </p>
              </div>
              <button
                className="ft-button ft-button--secondary"
                type="button"
                onClick={handleDownloadCurrentSubmission}
              >
                <Download size={16} /> Download
              </button>
            </div>
          )}
          <label className="ft-upload-zone" style={{ marginTop: 18 }}>
            <FileUp size={32} />
            <strong>
              {file
                ? file.name
                : submission?.fileUrl
                  ? "Choose another file to replace your submission"
                  : "Choose a PDF, Word, or ZIP file"}
            </strong>
            <span className="ft-muted">
              The selected file will be uploaded when you submit.
            </span>
            <input
              type="file"
              accept=".pdf,.doc,.docx,.zip"
              hidden
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>
        </div>
      )}
      {submitWarning && (
        <div className="ft-modal-overlay" role="presentation">
          <div className="ft-confirm-dialog" role="dialog" aria-modal="true">
            <h2>{submitWarningTitle(submitWarning)}</h2>
            <p>{submitWarningMessage(submitWarning)}</p>
            <div className="ft-confirm-dialog__actions">
              <button
                className="ft-button ft-button--secondary"
                type="button"
                onClick={() => setSubmitWarning(null)}
              >
                <span>Continue working</span>
                Tiếp tục làm bài
              </button>
              <button
                className="ft-button ft-button--primary"
                type="button"
                onClick={() => {
                  setSubmitWarning(null);
                  handleSubmit({ skipWarning: true });
                }}
              >
                <span>Continue submit</span>
                Tiếp tục nộp
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
