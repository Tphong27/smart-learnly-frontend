import React, { useCallback, useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, Clock, Download, FileUp, Loader2 } from "lucide-react";
import { getCurrentUser } from "@/services/api-client";
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

function secondsUntil(endTime) {
  if (!endTime) return 0;
  return Math.max(0, Math.floor((new Date(endTime).getTime() - Date.now()) / 1000));
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

export function StudentTakeTestPage() {
  const { id, type } = useParams();
  const navigate = useNavigate();
  const normalizedType = type === "assignment" || type === "essay" ? "essay" : "mcq";
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
          const started = await attemptService.start(id, student.id, null, student.name);
          const mappings = await testService.getQuestions(id);
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
              console.warn("Could not load current submission", submissionError);
            }
          }
          setSubmission(existingSubmission);
          if (assignment.dueDate && new Date(assignment.dueDate).getTime() <= Date.now()) {
            setError("This essay assignment has expired.");
            setTestData(assignment);
            setTimeLeft(0);
            return;
          }
          const started = await assignmentService.start({
            assignmentId: id,
            studentId: student.id,
            studentName: student.name,
          });
          setTestData(assignment);
          setSubmission(started);
          setTimeLeft(secondsUntil(assignment.dueDate));
          publishMonitor({
            submissionId: started.id,
            status: "DOING",
            startTime: started.startTime,
            endTime: assignment.dueDate,
          });
        }
      } catch (initError) {
        setError(initError.message || "Could not load this assessment.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id, normalizedType]);

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
      setError(downloadError.message || "Could not download your submitted file.");
    }
  };

  const handleSubmit = useCallback(async () => {
    if (submittedRef.current || submitting) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      if (normalizedType === "mcq") {
        const result = await attemptService.submit(attempt.id, { forceSubmit: true });
        publishMonitor({
          attemptId: attempt.id,
          status: result.status,
          score: result.score,
          percentage: result.percentage,
          startTime: result.startTime,
          endTime: result.endTime,
        });
      } else {
        if (!file) {
          submittedRef.current = false;
          setSubmitting(false);
          alert("Please choose a submission file before submitting.");
          return;
        }
        const uploaded = await assignmentService.uploadFile(file);
        const result = await assignmentService.submit({
          assignmentId: id,
          studentId: student.id,
          studentName: student.name,
          fileUrl: uploaded.fileUrl,
          fileName: uploaded.fileName || file.name,
        });
        setSubmission(result);
        publishMonitor({
          submissionId: submission?.id || result.id,
          status: result.status,
          fileUrl: result.fileUrl,
          fileName: result.fileName,
          startTime: result.startTime,
          endTime: testData?.dueDate,
        });
      }
      navigate("/learning/flashtests");
    } catch (submitError) {
      submittedRef.current = false;
      setError(submitError.message || "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  }, [
    attempt,
    file,
    id,
    navigate,
    normalizedType,
    publishMonitor,
    student.id,
    student.name,
    submission,
    submitting,
    testData,
  ]);

  useEffect(() => {
    if (!testData || loading || submittedRef.current) return undefined;
    const timer = window.setInterval(() => {
      const end = normalizedType === "mcq" ? attempt?.endTime : testData?.dueDate;
      const next = secondsUntil(end);
      setTimeLeft(next);
      if (next <= 0 && normalizedType === "mcq") {
        window.clearInterval(timer);
        handleSubmit();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [attempt?.endTime, handleSubmit, loading, normalizedType, testData]);

  const handleSelectAnswer = async (questionId, answerId) => {
    setAnswers((current) => ({ ...current, [questionId]: answerId }));
    if (!attempt?.id) return;
    try {
      await attemptService.saveAnswer(attempt.id, questionId, answerId, "");
    } catch (saveError) {
      setError(saveError.message || "Could not save the answer. The timer may be over.");
    }
  };

  if (loading) {
    return (
      <section className="ft-page">
        <button
          className="ft-button ft-button--secondary"
          type="button"
          onClick={() => navigate(-1)}
          style={{ marginBottom: 14 }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="ft-empty">
          <Loader2 className="ft-spin" size={24} />
          <strong>Loading assessment...</strong>
        </div>
      </section>
    );
  }

  return (
    <section className="ft-page">
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
          <button
            className="ft-icon-button"
            type="button"
            title="Back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
          </button>
          <span className={`ft-timer ${timeLeft < 60 ? "is-danger" : ""}`}>
            <Clock size={20} /> {formatTime(timeLeft)}
          </span>
          <button
            className="ft-button ft-button--primary"
            type="button"
            disabled={submitting || Boolean(error && normalizedType === "essay")}
            onClick={handleSubmit}
          >
            <CheckCircle size={18} /> {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </header>

      {error && <div className="ft-alert">{error}</div>}

      {normalizedType === "mcq" ? (
        <div className="ft-question-stack">
          {questions.map((question, index) => (
            <article className="ft-question-card" key={question.id}>
              <strong>
                Question {index + 1}: {question.questionText || question.content}
              </strong>
              <div className="ft-option-list">
                {(question.options || []).map((answer) => (
                  <label className="ft-option" key={answer.id}>
                    <input
                      type="radio"
                      name={`q-${question.id}`}
                      checked={answers[question.id] === answer.id}
                      onChange={() => handleSelectAnswer(question.id, answer.id)}
                    />
                    <span>{answer.answerText || answer.content}</span>
                  </label>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="ft-upload-panel">
          <h2 className="ft-card-title">Essay prompt</h2>
          <p className="ft-card-text" style={{ minHeight: "auto", WebkitLineClamp: "unset" }}>
            {testData?.description || "No prompt provided."}
          </p>
          {submission?.fileUrl && (
            <div className="ft-submission-summary">
              <div>
                <strong>Current submission</strong>
                <p className="ft-muted">
                  {submission.fileName || "Submitted file"}
                  {submission.submittedAt
                    ? ` · submitted ${new Date(submission.submittedAt).toLocaleString()}`
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
    </section>
  );
}
