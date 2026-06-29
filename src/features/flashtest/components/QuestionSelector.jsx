import { useEffect, useState } from "react";
import { Eye, Plus, Trash2 } from "lucide-react";
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

  const loadQuestions = async () => {
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
  };

  useEffect(() => {
    loadQuestions();
  }, [courseId]);

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

      <strong>Question Bank</strong>
      <div className="ft-question-list" style={{ marginTop: 10 }}>
        {!courseId ? (
          <p className="ft-muted">Choose a course to load questions.</p>
        ) : loading ? (
          <p className="ft-muted">Loading questions...</p>
        ) : questions.length === 0 ? (
          <p className="ft-muted">No questions found for this course.</p>
        ) : (
          questions.map((question) => {
            const id = questionId(question);
            const selected = selectedQuestions.some((item) => questionId(item) === id);
            return (
              <div className="ft-question-row" key={id}>
                <span className="ft-question-text">{questionText(question)}</span>
                <button
                  className="ft-button ft-button--secondary"
                  type="button"
                  disabled={selected}
                  onClick={() => handleSelect(question)}
                >
                  <Plus size={14} /> {selected ? "Added" : "Add"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
