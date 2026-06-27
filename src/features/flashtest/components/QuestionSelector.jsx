import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
          selectedQuestions.map((question) => (
            <div className="ft-question-row" key={questionId(question)}>
              <span className="ft-question-text">{questionText(question)}</span>
              <button
                className="ft-icon-button"
                type="button"
                title="Remove"
                onClick={() => handleRemove(questionId(question))}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
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
