import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal, Button } from "@/shared/components/ui";
import {
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  validateQuizQuestions,
} from "../utils/quiz-question-schema";

const TYPE_OPTIONS = [
  QUESTION_TYPES.SINGLE,
  QUESTION_TYPES.MULTIPLE,
  QUESTION_TYPES.FILL,
];

function buildInitialState(question) {
  if (!question) {
    return {
      title: "",
      explain_question: "",
      type: QUESTION_TYPES.SINGLE,
      options: ["", ""],
      correct_answers: [1],
    };
  }
  const isChoice =
    question.type === QUESTION_TYPES.SINGLE ||
    question.type === QUESTION_TYPES.MULTIPLE;
  return {
    title: question.title || "",
    explain_question: question.explain_question || "",
    type: question.type || QUESTION_TYPES.SINGLE,
    options: isChoice
      ? [...(question.options || ["", ""])]
      : ["", ""],
    correct_answers: Array.isArray(question.correct_answers)
      ? [...question.correct_answers]
      : isChoice
        ? [1]
        : [""],
  };
}

/**
 * Modal thêm/sửa 1 câu hỏi quiz theo định dạng mới.
 * Props: { open, question, onClose, onSubmit(question) }
 */
export function QuizQuestionEditModal({ open, question, onClose, onSubmit }) {
  const [form, setForm] = useState(() => buildInitialState(question));
  const [error, setError] = useState("");

  const isChoice =
    form.type === QUESTION_TYPES.SINGLE ||
    form.type === QUESTION_TYPES.MULTIPLE;
  const isFill = form.type === QUESTION_TYPES.FILL;

  const handleTypeChange = (newType) => {
    setForm((prev) => {
      const wasChoice =
        prev.type === QUESTION_TYPES.SINGLE ||
        prev.type === QUESTION_TYPES.MULTIPLE;
      const nowChoice =
        newType === QUESTION_TYPES.SINGLE ||
        newType === QUESTION_TYPES.MULTIPLE;
      let options = prev.options;
      let correct = prev.correct_answers;
      if (nowChoice && !wasChoice) {
        options = ["", ""];
        correct = [1];
      } else if (!nowChoice && wasChoice) {
        correct = [""];
      } else if (newType === QUESTION_TYPES.SINGLE && correct.length > 1) {
        correct = [correct[0]];
      }
      return { ...prev, type: newType, options, correct_answers: correct };
    });
  };

  // ── Choice option helpers ────────────────────────────────────────────────
  const updateOption = (idx, value) => {
    setForm((prev) => {
      const options = prev.options.map((o, i) => (i === idx ? value : o));
      return { ...prev, options };
    });
  };
  const addOption = () => {
    setForm((prev) => ({ ...prev, options: [...prev.options, ""] }));
  };
  const removeOption = (idx) => {
    setForm((prev) => {
      if (prev.options.length <= 2) return prev;
      const optionNumber = idx + 1;
      const options = prev.options.filter((_, i) => i !== idx);
      // Bỏ đáp án đúng trỏ tới option bị xoá, reindex các đáp án sau nó.
      const correct_answers = prev.correct_answers
        .filter((n) => n !== optionNumber)
        .map((n) => (n > optionNumber ? n - 1 : n));
      return { ...prev, options, correct_answers };
    });
  };

  const toggleCorrect = (optionNumber) => {
    setForm((prev) => {
      if (prev.type === QUESTION_TYPES.SINGLE) {
        return { ...prev, correct_answers: [optionNumber] };
      }
      const exists = prev.correct_answers.includes(optionNumber);
      const correct_answers = exists
        ? prev.correct_answers.filter((n) => n !== optionNumber)
        : [...prev.correct_answers, optionNumber].sort((a, b) => a - b);
      return { ...prev, correct_answers };
    });
  };

  // ── Fill answer helpers ──────────────────────────────────────────────────
  const updateFillAnswer = (idx, value) => {
    setForm((prev) => ({
      ...prev,
      correct_answers: prev.correct_answers.map((a, i) =>
        i === idx ? value : a,
      ),
    }));
  };
  const addFillAnswer = () => {
    setForm((prev) => ({
      ...prev,
      correct_answers: [...prev.correct_answers, ""],
    }));
  };
  const removeFillAnswer = (idx) => {
    setForm((prev) => {
      if (prev.correct_answers.length <= 1) return prev;
      return {
        ...prev,
        correct_answers: prev.correct_answers.filter((_, i) => i !== idx),
      };
    });
  };

  const buildQuestion = () => {
    if (isChoice) {
      const options = form.options.map((o) => o.trim());
      return {
        title: form.title.trim(),
        explain_question: form.explain_question.trim(),
        type: form.type,
        number_of_options: options.length,
        options,
        correct_answers: [...form.correct_answers],
      };
    }
    return {
      title: form.title.trim(),
      explain_question: form.explain_question.trim(),
      type: form.type,
      correct_answers: form.correct_answers
        .map((a) => (typeof a === "string" ? a.trim() : a))
        .filter((a) => a !== ""),
    };
  };

  const handleSubmit = () => {
    const candidate = buildQuestion();
    const { valid, errors } = validateQuizQuestions([candidate]);
    if (!valid) {
      setError(errors.map((e) => e.message).join(" "));
      return;
    }
    onSubmit(candidate);
  };

  const footer = useMemo(
    () => (
      <>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          Save question
        </Button>
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form],
  );

  return (
    <Modal
      open={open}
      title={question ? "Edit question" : "Add question"}
      size="lg"
      onClose={onClose}
      footer={footer}
    >
      <div className="quiz-edit-form">
        <label className="quiz-edit-form__label">
          Question title <span className="quiz-edit-form__req">*</span>
        </label>
        <textarea
          className="quiz-edit-form__textarea"
          rows={2}
          value={form.title}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder="Supports <b>, <i>, <u> tags"
        />

        <label className="quiz-edit-form__label">Explanation</label>
        <textarea
          className="quiz-edit-form__textarea"
          rows={2}
          value={form.explain_question}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, explain_question: e.target.value }))
          }
          placeholder="Optional"
        />

        <label className="quiz-edit-form__label">Question type</label>
        <select
          className="quiz-edit-form__select"
          value={form.type}
          onChange={(e) => handleTypeChange(e.target.value)}
        >
          {TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {QUESTION_TYPE_LABELS[type]}
            </option>
          ))}
        </select>

        {isChoice && (
          <div className="quiz-edit-form__options">
            <label className="quiz-edit-form__label">
              Options{" "}
              <span className="quiz-edit-form__hint">
                ({form.type === QUESTION_TYPES.SINGLE
                  ? "select one correct"
                  : "select all correct"}
                )
              </span>
            </label>
            {form.options.map((opt, idx) => {
              const optionNumber = idx + 1;
              const checked = form.correct_answers.includes(optionNumber);
              return (
                <div key={idx} className="quiz-edit-form__option-row">
                  <input
                    type={
                      form.type === QUESTION_TYPES.SINGLE ? "radio" : "checkbox"
                    }
                    checked={checked}
                    onChange={() => toggleCorrect(optionNumber)}
                    name="quiz-edit-correct"
                  />
                  <input
                    type="text"
                    className="quiz-edit-form__option-input"
                    value={opt}
                    onChange={(e) => updateOption(idx, e.target.value)}
                    placeholder={`Option ${optionNumber}`}
                  />
                  {form.options.length > 2 && (
                    <button
                      type="button"
                      className="quiz-edit-form__icon-btn"
                      onClick={() => removeOption(idx)}
                      title="Remove option"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
            {form.options.length < 6 && (
              <button
                type="button"
                className="quiz-edit-form__add-btn"
                onClick={addOption}
              >
                <Plus size={15} /> Add option
              </button>
            )}
          </div>
        )}

        {isFill && (
          <div className="quiz-edit-form__options">
            <label className="quiz-edit-form__label">
              Accepted answers{" "}
              <span className="quiz-edit-form__hint">
                (any match is correct)
              </span>
            </label>
            {form.correct_answers.map((ans, idx) => (
              <div key={idx} className="quiz-edit-form__option-row">
                <input
                  type="text"
                  className="quiz-edit-form__option-input"
                  value={ans}
                  onChange={(e) => updateFillAnswer(idx, e.target.value)}
                  placeholder={`Answer ${idx + 1}`}
                />
                {form.correct_answers.length > 1 && (
                  <button
                    type="button"
                    className="quiz-edit-form__icon-btn"
                    onClick={() => removeFillAnswer(idx)}
                    title="Remove answer"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="quiz-edit-form__add-btn"
              onClick={addFillAnswer}
            >
              <Plus size={15} /> Add answer
            </button>
          </div>
        )}

        {error && <p className="quiz-edit-form__error">{error}</p>}
      </div>
    </Modal>
  );
}
