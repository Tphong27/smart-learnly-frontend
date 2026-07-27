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
  if (value == null || value === "") return null;
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

function booleanOrNull(value) {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return null;
}

function scoreFromGradedAnswers(answers, questions) {
  if (!answers.some((answer) => answer?.isCorrect != null || answer?.is_correct != null)) {
    return null;
  }
  const totalMarks = questions.reduce(
    (sum, question) => sum + (numberOrNull(question?.marks) || 1),
    0,
  );
  const earnedMarks = answers.reduce(
    (sum, answer) =>
      sum +
      (numberOrNull(answer?.scoreAwarded ?? answer?.score_awarded) || 0),
    0,
  );
  const percentage = totalMarks > 0 ? (earnedMarks / totalMarks) * 100 : 0;
  return {
    score: formatScoreValue(percentage / 10),
    percentage: Math.round(percentage),
  };
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
  const [attempt, setAttempt] = useState(location.state?.attempt || {});
  const studentName = location.state?.studentName || attempt?.studentName || "";

  const questionTotal = useMemo(
    () => getQuestionTotal(attempt, { questions }),
    [attempt, questions],
  );
  const score = useMemo(
    () =>
      scoreFromGradedAnswers(answers, questions) ||
      formatMcqScore(attempt, questionTotal),
    [answers, attempt, questionTotal, questions],
  );

  const loadDetail = useCallback(async () => {
    if (!testId || !attemptId) return;
    setLoading(true);
    setError("");
    try {
      const [testData, attemptData, questionMappings, answerData] = await Promise.all([
        testService.getById(testId).catch(() => null),
        attemptService.getById(attemptId),
        testService.getLearnerQuestions(testId),
        attemptService.getStudentAnswers(attemptId),
      ]);
      setTest(testData);
      setAttempt(attemptData || {});
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
            const gradedCorrect = booleanOrNull(
              studentAnswer?.isCorrect ??
                studentAnswer?.is_correct ??
                studentAnswer?.correct,
            );
            const awardedScore = numberOrNull(
              studentAnswer?.scoreAwarded ?? studentAnswer?.score_awarded,
            );
            const gradedCorrectAnswerId =
              studentAnswer?.correctAnswerId ||
              studentAnswer?.correct_answer_id ||
              "";
            const answerOptions = question.answers || question.options || [];
            const correctAnswer = answerOptions.find(
              (answer) =>
                String(answerId(answer)) === String(gradedCorrectAnswerId) ||
                answer.correct ||
                answer.isCorrect,
            );
            const isCorrect =
              gradedCorrect ??
              (awardedScore != null
                ? awardedScore > 0
                : Boolean(
                    selectedId &&
                      correctAnswer &&
                      String(selectedId) === String(answerId(correctAnswer)),
                  ));
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
                    const correct =
                      String(id) === String(gradedCorrectAnswerId) ||
                      answer.correct ||
                      answer.isCorrect ||
                      (isCorrect && selected);
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
