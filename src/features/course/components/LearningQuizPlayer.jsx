import { useState, useCallback } from "react";
import { HelpCircle, ListChecks, Clock, AlertCircle, CheckCircle2, XCircle, RotateCcw } from "lucide-react";

function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins} min`;
    return `${mins} min ${secs}s`;
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
                <li>Once you submit, you will see your score and which answers were correct or incorrect.</li>
                <li>You can retake the quiz as many times as you like.</li>
            </ul>

            <button
                type="button"
                className="quiz-start__btn"
                onClick={onStart}
            >
                Start quiz
            </button>
        </div>
    );
}

// ─── Quiz-Taking Screen ───────────────────────────────────────────────────────

function QuizTakingScreen({ quizData, answers, onSelectAnswer, onSubmit }) {
    const total = quizData.questions.length;
    const answered = Object.keys(answers).length;
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
                {quizData.questions.map((question, qIdx) => {
                    const selected = answers[qIdx] ?? null;
                    return (
                        <fieldset
                            key={qIdx}
                            className="quiz-question"
                        >
                            <legend className="quiz-question__legend">
                                <span className="quiz-question__number">{qIdx + 1}.</span>
                                {question.question}
                            </legend>

                            <div className="quiz-question__options">
                                {question.options.map((option, oIdx) => {
                                    const optId = `q${qIdx}-opt${oIdx}`;
                                    const isSelected = selected === oIdx;
                                    return (
                                        <div key={oIdx} className={`quiz-option${isSelected ? " quiz-option--selected" : ""}`}>
                                            <input
                                                type="radio"
                                                id={optId}
                                                name={`question-${qIdx}`}
                                                value={oIdx}
                                                checked={isSelected}
                                                onChange={() => onSelectAnswer(qIdx, oIdx)}
                                                className="quiz-option__radio"
                                            />
                                            <label htmlFor={optId} className="quiz-option__label">
                                                <span className="quiz-option__letter">
                                                    {String.fromCharCode(65 + oIdx)}
                                                </span>
                                                <span className="quiz-option__text">{option}</span>
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </fieldset>
                    );
                })}
            </div>

            {!allAnswered && (
                <div className="quiz-taking__warning">
                    <AlertCircle size={15} />
                    <span>
                        {answered === 0
                            ? "Please answer at least one question before submitting."
                            : `${total - answered} question${total - answered > 1 ? "s" : ""} unanswered. Submit anyway?`}
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

// ─── Results Screen ───────────────────────────────────────────────────────────

function QuizResultsScreen({ quizData, answers, onTryAgain }) {
    const total = quizData.questions.length;
    let correctCount = 0;
    const questionResults = quizData.questions.map((question, qIdx) => {
        const userAnswer = answers[qIdx];
        const isCorrect = userAnswer === question.correctIndex;
        if (isCorrect) correctCount++;
        return { question, userAnswer, isCorrect };
    });
    const percentage = Math.round((correctCount / total) * 100);
    const passed = percentage >= 80;

    return (
        <div className="quiz-results">
            <div className="quiz-results__score-card">
                <div className={`quiz-results__status-badge ${passed ? "quiz-results__status-badge--pass" : "quiz-results__status-badge--fail"}`}>
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
                    const userText = userAnswer != null ? question.options[userAnswer] : null;
                    const correctText = question.options[question.correctIndex];

                    return (
                        <div key={qIdx} className="quiz-review-item">
                            <div className="quiz-review-item__header">
                                <span className="quiz-review-item__question-text">
                                    {qIdx + 1}. {question.question}
                                </span>
                                <span className={`quiz-review-item__badge quiz-review-item__badge--${isCorrect ? "correct" : "incorrect"}`}>
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
                                <div className={`quiz-review-item__answer quiz-review-item__answer--${isCorrect ? "correct" : "incorrect"}`}>
                                    <span className="quiz-review-item__answer-label">Your answer:</span>
                                    <span className="quiz-review-item__answer-text">{userText}</span>
                                </div>
                            ) : (
                                <div className="quiz-review-item__answer quiz-review-item__answer--skipped">
                                    <span className="quiz-review-item__answer-label">Your answer:</span>
                                    <span className="quiz-review-item__answer-text quiz-review-item__answer-text--skipped">Not answered</span>
                                </div>
                            )}

                            {!isCorrect && (
                                <div className="quiz-review-item__answer quiz-review-item__answer--correct-answer">
                                    <span className="quiz-review-item__answer-label">Correct answer:</span>
                                    <span className="quiz-review-item__answer-text">{correctText}</span>
                                </div>
                            )}

                            {question.explanation && (
                                <div className="quiz-review-item__explanation">
                                    <strong>Explanation:</strong> {question.explanation}
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

export function LearningQuizPlayer({ content, durationSeconds }) {
    let quizData;
    try {
        quizData = JSON.parse(content);
    } catch {
        quizData = null;
    }

    const [phase, setPhase] = useState("start");
    const [answers, setAnswers] = useState({});

    const handleStart = useCallback(() => {
        setPhase("taking");
    }, []);

    const handleSelectAnswer = useCallback((questionIndex, optionIndex) => {
        setAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
    }, []);

    const handleSubmit = useCallback(() => {
        setPhase("results");
    }, []);

    const handleTryAgain = useCallback(() => {
        setAnswers({});
        setPhase("start");
    }, []);

    if (!quizData || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
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
