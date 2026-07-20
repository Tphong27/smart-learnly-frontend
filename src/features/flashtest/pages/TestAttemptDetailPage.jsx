import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, RefreshCw, XCircle } from "lucide-react";
import {
  attemptService,
  testService,
} from "@/services/flashtest.service.js";
import {
  sanitizeAnswerHtml,
  sanitizeQuestionHtml,
} from "@/shared/utils/htmlSanitizer";
import "../flashtest.css";

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

function formatMcqScore(attempt, questionTotal) {
  const percentage = numberOrNull(attempt?.percentage);
  const rawScore = numberOrNull(attempt?.score);
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

function questionId(question) {
  return question?.questionId || question?.id || "";
}

function answerId(answer) {
  return answer?.answerId || answer?.id || "";
}

function questionText(question) {
  return (
    question?.questionText ||
    question?.content ||
    question?.title ||
    "Untitled question"
  );
}

function answerText(answer) {
  return answer?.answerText || answer?.content || "Untitled answer";
}

function selectedAnswerId(answer) {
  return (
    answer?.selectedAnswerId ||
    answer?.selected_answer_id ||
    answer?.answerId ||
    answer?.answer_id ||
    ""
  );
}

export function TestAttemptDetailPage() {
  const { testId, attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const attempt = useMemo(
    () => location.state?.attempt || {},
    [location.state],
  );
  const studentName = location.state?.studentName || attempt?.studentName || "";

  const questionTotal = useMemo(
    () => getQuestionTotal(attempt, { questions }),
    [attempt, questions],
  );
  const score = useMemo(
    () => formatMcqScore(attempt, questionTotal),
    [attempt, questionTotal],
  );

  const loadDetail = useCallback(async () => {
    if (!testId || !attemptId) return;
    setLoading(true);
    setError("");
    try {
      const [testData, questionMappings, answerData] = await Promise.all([
        testService.getById(testId).catch(() => null),
        testService.getLearnerQuestions(testId),
        attemptService.getStudentAnswers(attemptId),
      ]);
      setTest(testData);
      setQuestions(questionMappings || []);
      setAnswers(answerData || []);
    } catch (detailError) {
      console.error("Failed to load attempt detail", detailError);
      setError(detailError.message || "Could not load this attempt detail.");
    } finally {
      setLoading(false);
    }
  }, [attemptId, testId]);

  useEffect(() => {
    const timer = window.setTimeout(loadDetail, 0);
    return () => window.clearTimeout(timer);
  }, [loadDetail]);

  return (
    <section className="ft-page ft-page--monitor ft-attempt-detail-page">
      <header className="ft-monitor-hero">
        <div className="ft-monitor-hero__content">
          <span className="ft-page-kicker">Attempt detail</span>
          <h1 className="ft-page-title">
            {test?.title || test?.name || "Test attempt"}
          </h1>
          <p className="ft-page-subtitle">
            {studentName || "Trainee"} - Attempt answers and correct options.
          </p>
          <div className="ft-monitor-hero__meta">
            <span>
              Score {score.score}/10
              {score.percentage != null ? ` (${score.percentage}%)` : ""}
            </span>
            <span>{questionTotal || questions.length} questions</span>
          </div>
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
            disabled={loading}
            onClick={loadDetail}
          >
            <RefreshCw size={16} className={loading ? "ft-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {loading ? (
        <div className="ft-empty">
          <RefreshCw size={28} className="ft-spin" />
          <strong>Loading attempt detail...</strong>
        </div>
      ) : error ? (
        <div className="ft-alert">{error}</div>
      ) : (
        <div className="ft-attempt-detail-list">
          {questions.map((question, index) => {
            const currentQuestionId = questionId(question);
            const studentAnswer = answers.find(
              (item) => questionId(item) === currentQuestionId,
            );
            const selectedId = selectedAnswerId(studentAnswer);
            const answerOptions = question.answers || question.options || [];
            const correctAnswer = answerOptions.find(
              (answer) => answer.correct || answer.isCorrect,
            );
            const isCorrect =
              selectedId &&
              correctAnswer &&
              String(selectedId) === String(answerId(correctAnswer));
            const resultLabel = selectedId
              ? isCorrect
                ? "Correct"
                : "Incorrect"
              : "No answer";

            return (
              <div className="ft-attempt-question" key={currentQuestionId || index}>
                <div className="ft-attempt-question__title">
                  <div className="ft-attempt-question__heading">
                    <span className="ft-attempt-question__eyebrow">
                      Question {index + 1}
                    </span>
                    <div
                      className="ft-attempt-question__text"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeQuestionHtml(questionText(question)),
                      }}
                    />
                  </div>
                  <span
                    className={`ft-badge ${
                      isCorrect ? "ft-status--submitted" : "ft-status--expired"
                    }`}
                  >
                    {isCorrect ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {resultLabel}
                  </span>
                </div>
                <div className="ft-attempt-answers">
                  {answerOptions.map((answer, answerIndex) => {
                    const id = answerId(answer);
                    const selected = String(selectedId || "") === String(id);
                    const correct = answer.correct || answer.isCorrect;
                    return (
                      <div
                        className={`ft-attempt-answer ${
                          correct ? "is-correct" : ""
                        } ${selected ? "is-selected" : ""}`}
                        key={id || answerIndex}
                      >
                        <span
                          dangerouslySetInnerHTML={{
                            __html: sanitizeAnswerHtml(answerText(answer)),
                          }}
                        />
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
          {questions.length === 0 && (
            <p className="ft-muted">No questions found for this test.</p>
          )}
        </div>
      )}
    </section>
  );
}
