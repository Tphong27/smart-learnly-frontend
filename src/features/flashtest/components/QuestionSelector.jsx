import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Plus, Shuffle, Trash2, X } from "lucide-react";
import { questionService } from "@/services/flashtest.service.js";
import "../flashtest.css";

function questionText(question) {
  return question.questionText || question.content || question.title || "Untitled question";
}

function questionId(question) {
  return question?.id || question?.questionId || "";
}

export function QuestionSelector({
  courseId,
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

  const loadQuestions = useCallback(async () => {
    if (!courseId) {
      setQuestions([]);
      return;
    }
    setLoading(true);
    try {
      setQuestions(
        await questionService.getByCourse(courseId, {
          size: 100,
        }),
      );
    } catch (error) {
      console.error("Failed to load questions", error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    const timer = window.setTimeout(loadQuestions, 0);
    return () => window.clearTimeout(timer);
  }, [loadQuestions]);

  const handleSelect = (question) => {
    const id = questionId(question);
    if (!selectedQuestions.some((item) => questionId(item) === id)) {
      onQuestionsChange([...selectedQuestions, question]);
    }
  };

  const handleRemove = (id) => {
    onQuestionsChange(
      selectedQuestions.filter((question) => questionId(question) !== id),
    );
    if (expandedQuestionId === id) {
      setExpandedQuestionId(null);
    }
  };

  const handleRandomSelect = () => {
    const count = Math.max(1, Number(randomCount || 0));
    if (!Number.isFinite(count)) return;

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
                  <span className="ft-question-text">{questionText(question)}</span>
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
                          <span>{answer.answerText || answer.content}</span>
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
        <strong>Question Bank</strong>
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
      <div className="ft-question-list" style={{ marginTop: 10 }}>
        {!courseId ? (
          <p className="ft-muted">Choose a course to load questions.</p>
        ) : loading ? (
          <p className="ft-muted">Loading questions...</p>
        ) : questions.length === 0 ? (
          <p className="ft-muted">No questions found for this course.</p>
        ) : availableQuestions.length === 0 ? (
          <p className="ft-muted">All questions in this course are selected.</p>
        ) : (
          availableQuestions.map((question) => {
            const id = questionId(question);
            return (
              <div className="ft-question-row" key={id}>
                <span className="ft-question-text">{questionText(question)}</span>
                <button
                  className="ft-button ft-button--secondary"
                  type="button"
                  onClick={() => handleSelect(question)}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            );
          })
        )}
      </div>

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
                disabled={!Number(randomCount || 0)}
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
