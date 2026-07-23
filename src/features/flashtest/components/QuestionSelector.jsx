import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Shuffle, Trash2, X } from "lucide-react";
import { questionService } from "@/services/flashtest.service.js";
import { sanitizeAnswerHtml, sanitizeQuestionHtml } from "@/shared/utils/htmlSanitizer";
import "../flashtest.css";

function questionText(question) {
  return question.questionText || question.content || question.title || "Untitled question";
}

function questionId(question) {
  return question?.id || question?.questionId || "";
}

export function QuestionSelector({
  courseId,
  moduleId,
  selectedQuestions = [],
  onQuestionsChange,
}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const [randomCount, setRandomCount] = useState("");
  const [randomModalOpen, setRandomModalOpen] = useState(false);

  const selectedIds = useMemo(
    () => new Set(selectedQuestions.map((question) => questionId(question))),
    [selectedQuestions],
  );
  const availableQuestions = useMemo(
    () => questions.filter((question) => !selectedIds.has(questionId(question))),
    [questions, selectedIds],
  );

  const randomCountNumber = Number(randomCount || 0);
  const randomCountError =
    randomCount && (!Number.isInteger(randomCountNumber) || randomCountNumber < 1)
      ? "Enter a whole number greater than 0."
      : randomCountNumber > availableQuestions.length
      ? `Only ${availableQuestions.length} questions are available.`
      : "";

  const loadQuestions = useCallback(async () => {
    if (!courseId) {
      setQuestions([]);
      return;
    }
    setLoading(true);
    try {
      const pageSize = 100;
      const loaded = [];
      for (let page = 0; page < 20; page += 1) {
        const batch = await questionService.getByCourse(courseId, {
          size: pageSize,
          page,
          ...(moduleId && moduleId !== "all" ? { moduleId } : {}),
        });
        loaded.push(...batch);
        if (batch.length < pageSize) break;
      }
      setQuestions(loaded);
    } catch (error) {
      console.error("Failed to load questions", error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, moduleId]);

  useEffect(() => {
    const timer = window.setTimeout(loadQuestions, 0);
    return () => window.clearTimeout(timer);
  }, [loadQuestions]);

  const handleRemove = (id) => {
    onQuestionsChange(
      selectedQuestions.filter((question) => questionId(question) !== id),
    );
    if (expandedQuestionId === id) {
      setExpandedQuestionId(null);
    }
  };

  const handleRandomSelect = () => {
    const count = Number(randomCount || 0);
    if (!Number.isInteger(count) || count < 1 || count > availableQuestions.length) {
      return;
    }

    const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
    const pickedQuestions = shuffled.slice(0, count);
    if (pickedQuestions.length === 0) return;
    onQuestionsChange([...selectedQuestions, ...pickedQuestions]);
    setRandomModalOpen(false);
    setRandomCount("");
  };

  return (
    <div className="ft-question-selector">
      <div className="ft-row-between" style={{ marginBottom: 10 }}>
        <strong>Selected Questions ({selectedQuestions.length})</strong>
      </div>

      <div className="ft-question-list" style={{ maxHeight: 180, marginBottom: 14 }}>
        {selectedQuestions.length === 0 ? (
          <p className="ft-muted">No question selected.</p>
        ) : (
          selectedQuestions.map((question) => {
            const id = questionId(question);
            const answers = question.answers || question.options || [];
            return (
              <div className="ft-question-row-wrap" key={id}>
                <div className="ft-question-row">
                  <span
                    className="ft-question-text ft-question-rich-text"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeQuestionHtml(questionText(question)),
                    }}
                  />
                  <div className="ft-question-actions">
                    <button
                      className="ft-icon-button"
                      type="button"
                      title="View answers"
                      onClick={() =>
                        setExpandedQuestionId(expandedQuestionId === id ? null : id)
                      }
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="ft-icon-button"
                      type="button"
                      title="Remove"
                      onClick={() => handleRemove(id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {expandedQuestionId === id && (
                  <div className="ft-answer-preview">
                    {answers.length === 0 ? (
                      <p className="ft-muted">No answers available for this question.</p>
                    ) : (
                      answers.map((answer, index) => (
                        <div
                          className={`ft-answer-preview__item ${
                            answer.correct || answer.isCorrect ? "is-correct" : ""
                          }`}
                          key={answer.id || answer.answerId || index}
                        >
                          <span
                            className="ft-answer-rich-text"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeAnswerHtml(answer.answerText || answer.content),
                            }}
                          />
                          {(answer.correct || answer.isCorrect) && <strong>Correct</strong>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="ft-question-bank-header">
        <button
          className="ft-button ft-button--secondary"
          type="button"
          disabled={loading || !courseId || availableQuestions.length === 0}
          onClick={() => {
            setRandomCount("");
            setRandomModalOpen(true);
          }}
        >
          <Shuffle size={14} /> Random
        </button>
      </div>
      {loading && <p className="ft-muted">Loading available questions...</p>}
      {!loading && courseId && questions.length === 0 && (
        <p className="ft-muted">
          No questions found for the selected {moduleId === "all" ? "course" : "module"}.
        </p>
      )}

      {randomModalOpen && (
        <div className="ft-modal-overlay" role="dialog" aria-modal="true">
          <div className="ft-random-dialog">
            <div className="ft-random-dialog__header">
              <div>
                <span className="ft-page-kicker">Random questions</span>
                <h2>Choose quantity</h2>
              </div>
              <button
                className="ft-icon-button"
                type="button"
                title="Close"
                onClick={() => setRandomModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <label className="ft-field">
              <span className="ft-label">
                Available questions: {availableQuestions.length}
              </span>
              <input
                className="ft-input"
                autoFocus
                min="1"
                max={availableQuestions.length}
                type="number"
                value={randomCount}
                placeholder="Enter number of questions"
                onChange={(event) => setRandomCount(event.target.value)}
              />
              {randomCountError && (
                <span className="ft-field-error">{randomCountError}</span>
              )}
            </label>
            <div className="ft-confirm-dialog__actions">
              <button
                className="ft-button ft-button--secondary"
                type="button"
                onClick={() => setRandomModalOpen(false)}
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
              <button
                className="ft-button ft-button--primary"
                type="button"
                disabled={!randomCountNumber || Boolean(randomCountError)}
                onClick={handleRandomSelect}
              >
                <Shuffle size={16} />
                <span>Random</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

