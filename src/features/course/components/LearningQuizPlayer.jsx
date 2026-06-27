import { useState, useCallback } from "react";
import {
  HelpCircle,
  ListChecks,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";
import {
  QUESTION_TYPES,
  sanitizeQuizHtml,
  parseQuizContent,
} from "../utils/quiz-question-schema";

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs}s`;
}

function Html({ html }) {
  return <span dangerouslySetInnerHTML={{ __html: sanitizeQuizHtml(html) }} />;
}

// ─── Scoring helpers ────────────────────────────────────────────────────────

function isAnswerCorrect(question, answer) {
  if (question.type === QUESTION_TYPES.SINGLE) {
    // answer = option index (0-based); correct_answers 1-based.
    return Array.isArray(question.correct_answers)
      ? question.correct_answers[0] === (answer ?? -1) + 1
      : false;
  }
  if (question.type === QUESTION_TYPES.MULTIPLE) {
    const selected = Array.isArray(answer) ? answer.map((i) => i + 1) : [];
    const correct = question.correct_answers || [];
    if (selected.length !== correct.length) return false;
    const correctSet = new Set(correct);
    return selected.every((n) => correctSet.has(n));
  }
  if (question.type === QUESTION_TYPES.FILL) {
    const normalized = String(answer ?? "").trim().toLowerCase();
    if (!normalized) return false;
    return (question.correct_answers || []).some(
      (accepted) => String(accepted).trim().toLowerCase() === normalized,
    );
  }
  return false;
}

function isAnswered(question, answer) {
  if (question.type === QUESTION_TYPES.MULTIPLE) {
    return Array.isArray(answer) && answer.length > 0;
  }
  if (question.type === QUESTION_TYPES.FILL) {
    return String(answer ?? "").trim().length > 0;
  }
  return answer != null;
}

// ─── Start Screen ─────────────────────────────────────────────────────────────

function QuizStartScreen({ title, questionCount, duration, onStart }) {
  return (
    <div className="quiz-start">
      <div className="quiz-start__icon">
        <HelpCircle size={48} strokeWidth={1.5} />
      </div>
      <h2 className="quiz-start__title">{title || "Quiz"}</h2>

      <div className="quiz-start__meta">
        <span className="quiz-start__meta-item">
          <ListChecks size={14} />
          {questionCount} {questionCount === 1 ? "question" : "questions"}
        </span>
        {duration && (
          <span className="quiz-start__meta-item">
            <Clock size={14} />
            {duration}
          </span>
        )}
      </div>

      <ul className="quiz-start__instructions">
        <li>Read each question carefully before selecting your answer.</li>
        <li>
          Once you submit, you will see your score and which answers were
          correct or incorrect.
        </li>
        <li>You can retake the quiz as many times as you like.</li>
      </ul>

      <button type="button" className="quiz-start__btn" onClick={onStart}>
        Start quiz
      </button>
    </div>
  );
}

// ─── Question renderers ───────────────────────────────────────────────────────

function ChoiceOptions({ question, qIdx, answer, onSelect }) {
  const multiple = question.type === QUESTION_TYPES.MULTIPLE;
  return (
    <div className="quiz-question__options">
      {(question.options || []).map((option, oIdx) => {
        const optId = `q${qIdx}-opt${oIdx}`;
        const isSelected = multiple
          ? Array.isArray(answer) && answer.includes(oIdx)
          : answer === oIdx;
        return (
          <div
            key={oIdx}
            className={`quiz-option${isSelected ? " quiz-option--selected" : ""}`}
          >
            <input
              type={multiple ? "checkbox" : "radio"}
              id={optId}
              name={`question-${qIdx}`}
              value={oIdx}
              checked={isSelected}
              onChange={() => onSelect(qIdx, oIdx)}
              className="quiz-option__radio"
            />
            <label htmlFor={optId} className="quiz-option__label">
              <span className="quiz-option__letter">
                {String.fromCharCode(65 + oIdx)}
              </span>
              <span className="quiz-option__text">
                <Html html={option} />
              </span>
            </label>
          </div>
        );
      })}
    </div>
  );
}

function FillInput({ qIdx, answer, onSelect }) {
  return (
    <div className="quiz-question__fill">
      <input
        type="text"
        className="quiz-question__fill-input"
        value={answer ?? ""}
        onChange={(e) => onSelect(qIdx, e.target.value)}
        placeholder="Type your answer"
      />
    </div>
  );
}

// ─── Quiz-Taking Screen ───────────────────────────────────────────────────────

function QuizTakingScreen({ quizData, answers, onSelectAnswer, onSubmit }) {
  const total = quizData.questions.length;
  const answered = quizData.questions.filter((q, i) =>
    isAnswered(q, answers[i]),
  ).length;
  const allAnswered = answered === total;

  const handleSubmit = () => {
    if (!allAnswered) {
      const confirmed = window.confirm(
        `You have answered ${answered} out of ${total} questions. Submit anyway?`,
      );
      if (!confirmed) return;
    }
    onSubmit();
  };

  return (
    <div className="quiz-taking">
      <div className="quiz-taking__header">
        <div className="quiz-progress">
          <span className="quiz-progress__count">
            {answered} / {total} answered
          </span>
          <span className="quiz-progress__fraction">
            {Math.round((answered / total) * 100)}%
          </span>
        </div>
        <div className="quiz-progress__bar-track">
          <div
            className="quiz-progress__bar-fill"
            style={{ width: `${(answered / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="quiz-questions">
        {quizData.questions.map((question, qIdx) => (
          <fieldset key={qIdx} className="quiz-question">
            <legend className="quiz-question__legend">
              <span className="quiz-question__number">{qIdx + 1}.</span>
              <Html html={question.title} />
            </legend>

            {question.type === QUESTION_TYPES.FILL ? (
              <FillInput
                qIdx={qIdx}
                answer={answers[qIdx]}
                onSelect={onSelectAnswer}
              />
            ) : (
              <ChoiceOptions
                question={question}
                qIdx={qIdx}
                answer={answers[qIdx]}
                onSelect={onSelectAnswer}
              />
            )}
          </fieldset>
        ))}
      </div>

      {!allAnswered && (
        <div className="quiz-taking__warning">
          <AlertCircle size={15} />
          <span>
            {answered === 0
              ? "Please answer at least one question before submitting."
              : `${total - answered} question${
                  total - answered > 1 ? "s" : ""
                } unanswered. Submit anyway?`}
          </span>
        </div>
      )}

      <div className="quiz-taking__actions">
        <button
          type="button"
          className="quiz-taking__submit"
          onClick={handleSubmit}
        >
          Submit quiz
        </button>
      </div>
    </div>
  );
}

// ─── Results helpers ──────────────────────────────────────────────────────────

function formatUserAnswer(question, answer) {
  if (question.type === QUESTION_TYPES.FILL) {
    return String(answer ?? "").trim() || null;
  }
  if (question.type === QUESTION_TYPES.MULTIPLE) {
    if (!Array.isArray(answer) || answer.length === 0) return null;
    return answer.map((i) => question.options?.[i]).filter(Boolean).join(", ");
  }
  return answer != null ? question.options?.[answer] : null;
}

function formatCorrectAnswer(question) {
  if (question.type === QUESTION_TYPES.FILL) {
    return (question.correct_answers || []).join(" / ");
  }
  return (question.correct_answers || [])
    .map((n) => question.options?.[n - 1])
    .filter(Boolean)
    .join(", ");
}

// ─── Results Screen ───────────────────────────────────────────────────────────

function QuizResultsScreen({ quizData, answers, onTryAgain }) {
  const total = quizData.questions.length;
  let correctCount = 0;
  const questionResults = quizData.questions.map((question, qIdx) => {
    const userAnswer = answers[qIdx];
    const correct = isAnswerCorrect(question, userAnswer);
    if (correct) correctCount++;
    return { question, userAnswer, isCorrect: correct };
  });
  const percentage = Math.round((correctCount / total) * 100);
  const passed = percentage >= 80;

  return (
    <div className="quiz-results">
      <div className="quiz-results__score-card">
        <div
          className={`quiz-results__status-badge ${
            passed
              ? "quiz-results__status-badge--pass"
              : "quiz-results__status-badge--fail"
          }`}
        >
          {passed ? "Passed" : "Not Passed"}
        </div>
        <div className="quiz-results__percentage">{percentage}%</div>
        <div className="quiz-results__fraction">
          {correctCount} out of {total} correct
        </div>
        <div className="quiz-results__pass-threshold">
          Passing threshold: 80%
        </div>
      </div>

      <h3 className="quiz-results__review-title">Review your answers</h3>

      <div className="quiz-review-list">
        {questionResults.map(({ question, userAnswer, isCorrect }, qIdx) => {
          const userText = formatUserAnswer(question, userAnswer);
          const correctText = formatCorrectAnswer(question);

          return (
            <div key={qIdx} className="quiz-review-item">
              <div className="quiz-review-item__header">
                <span className="quiz-review-item__question-text">
                  {qIdx + 1}. <Html html={question.title} />
                </span>
                <span
                  className={`quiz-review-item__badge quiz-review-item__badge--${
                    isCorrect ? "correct" : "incorrect"
                  }`}
                >
                  {isCorrect ? (
                    <>
                      <CheckCircle2 size={13} />
                      Correct
                    </>
                  ) : (
                    <>
                      <XCircle size={13} />
                      Incorrect
                    </>
                  )}
                </span>
              </div>

              {userText != null ? (
                <div
                  className={`quiz-review-item__answer quiz-review-item__answer--${
                    isCorrect ? "correct" : "incorrect"
                  }`}
                >
                  <span className="quiz-review-item__answer-label">
                    Your answer:
                  </span>
                  <span className="quiz-review-item__answer-text">
                    <Html html={userText} />
                  </span>
                </div>
              ) : (
                <div className="quiz-review-item__answer quiz-review-item__answer--skipped">
                  <span className="quiz-review-item__answer-label">
                    Your answer:
                  </span>
                  <span className="quiz-review-item__answer-text quiz-review-item__answer-text--skipped">
                    Not answered
                  </span>
                </div>
              )}

              {!isCorrect && (
                <div className="quiz-review-item__answer quiz-review-item__answer--correct-answer">
                  <span className="quiz-review-item__answer-label">
                    Correct answer:
                  </span>
                  <span className="quiz-review-item__answer-text">
                    <Html html={correctText} />
                  </span>
                </div>
              )}

              {question.explain_question && (
                <div className="quiz-review-item__explanation">
                  <strong>Explanation:</strong>{" "}
                  <Html html={question.explain_question} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="quiz-results__actions">
        <button
          type="button"
          className="quiz-results__try-again"
          onClick={onTryAgain}
        >
          <RotateCcw size={15} />
          Try again
        </button>
      </div>
    </div>
  );
}

// ─── Main QuizPlayer Component ────────────────────────────────────────────────

export function LearningQuizPlayer({ content, durationSeconds, onCompleted }) {
    const quizData = parseQuizContent(content);

  const [phase, setPhase] = useState("start");
  const [answers, setAnswers] = useState({});

  const handleStart = useCallback(() => {
    setPhase("taking");
  }, []);

  // Đa năng: single/fill thay thế giá trị; multiple toggle index trong mảng.
  const handleSelectAnswer = useCallback(
    (questionIndex, value) => {
      const question = quizData.questions[questionIndex];
      setAnswers((prev) => {
        if (question?.type === QUESTION_TYPES.MULTIPLE) {
          const current = Array.isArray(prev[questionIndex])
            ? prev[questionIndex]
            : [];
          const next = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value].sort((a, b) => a - b);
          return { ...prev, [questionIndex]: next };
        }
        return { ...prev, [questionIndex]: value };
      });
    },
    [quizData.questions],
  );

  const handleSubmit = useCallback(() => {
  setPhase("results");
  onCompleted?.();
}, [onCompleted]);

  const handleTryAgain = useCallback(() => {
    setAnswers({});
    setPhase("start");
  }, []);

  if (
    !quizData ||
    !Array.isArray(quizData.questions) ||
    quizData.questions.length === 0
  ) {
    return (
      <div className="quiz-player quiz-player--error">
        <div className="quiz-player__error">
          <HelpCircle size={24} />
          <p>Unable to load quiz content. Please try again later.</p>
        </div>
      </div>
    );
  }

  const totalQuestions = quizData.questions.length;
  const duration = formatDuration(durationSeconds);

  return (
    <div className="quiz-player" data-phase={phase}>
      {phase === "start" && (
        <QuizStartScreen
          title={quizData.title}
          questionCount={totalQuestions}
          duration={duration}
          onStart={handleStart}
        />
      )}
      {phase === "taking" && (
        <QuizTakingScreen
          quizData={quizData}
          answers={answers}
          onSelectAnswer={handleSelectAnswer}
          onSubmit={handleSubmit}
        />
      )}
      {phase === "results" && (
        <QuizResultsScreen
          quizData={quizData}
          answers={answers}
          onTryAgain={handleTryAgain}
        />
      )}
    </div>
  );
}
