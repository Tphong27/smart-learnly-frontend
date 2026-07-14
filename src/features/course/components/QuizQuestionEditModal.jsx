import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal, Button } from "@/shared/components/ui";
import { courseService } from "@/services/course.service";
import {
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  validateQuizQuestions,
  normalizeMedia,
} from "../utils/quiz-question-schema";
import "@/features/admin/admin-shared.css";
import "./quiz-question-manager.css";

const TYPE_OPTIONS = [
  QUESTION_TYPES.SINGLE,
  QUESTION_TYPES.MULTIPLE,
  QUESTION_TYPES.FILL,
];

function toOptionState(option) {
  if (typeof option === "string") return { text: option, media: null };
  if (option && typeof option === "object") {
    return {
      text: typeof option.text === "string" ? option.text : "",
      media: normalizeMedia(option.media),
    };
  }
  return { text: "", media: null };
}

function buildInitialState(question) {
  if (!question) {
    return {
      title: "",
      media: null,
      explain_question: "",
      type: QUESTION_TYPES.SINGLE,
      options: [toOptionState(""), toOptionState("")],
      correct_answers: [1],
    };
  }
  const isChoice =
    question.type === QUESTION_TYPES.SINGLE ||
    question.type === QUESTION_TYPES.MULTIPLE;
  return {
    title: question.title || "",
    media: normalizeMedia(question.media),
    explain_question: question.explain_question || "",
    type: question.type || QUESTION_TYPES.SINGLE,
    options: isChoice
      ? [...(question.options || ["", ""])].map(toOptionState)
      : [toOptionState(""), toOptionState("")],
    correct_answers: Array.isArray(question.correct_answers)
      ? [...question.correct_answers]
      : isChoice
        ? [1]
        : [""],
  };
}

function buildMediaFromUpload(uploaded, type) {
  return normalizeMedia({
    type,
    url: uploaded?.url,
    objectPath: uploaded?.objectPath,
    fileName: uploaded?.fileName,
    contentType: uploaded?.contentType,
    size: uploaded?.fileSize ?? uploaded?.size,
  });
}

function MediaUploader({ label, media, onChange, onError }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const isAudio = file.type.startsWith("audio/");
    if (!isImage && !isVideo && !isAudio) {
      onError("Only image, video, or audio files are supported.");
      return;
    }

    setUploading(true);
    try {
      const uploaded = isVideo
        ? await courseService.uploadLessonMaterial(file)
        : await courseService.uploadLessonResource(file);
      const mediaType = isVideo ? "video" : isAudio ? "audio" : "image";
      onChange(buildMediaFromUpload(uploaded, mediaType));
    } catch (error) {
      const message =
        error?.response?.data?.message || "Failed to upload media file.";
      onError(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="quiz-question-edit-form__media">
      <label className="quiz-question-edit-form__label">{label}</label>
      {media ? (
        <div className="quiz-question-edit-form__media-preview">
          <span>
            {media.type === "video" ? "Video" : media.type === "audio" ? "Audio" : "Image"}: {media.fileName || media.url || media.objectPath}
          </span>
          <button
            type="button"
            className="quiz-question-edit-form__icon-btn quiz-question-edit-form__icon-btn--danger"
            onClick={() => onChange(null)}
            title="Remove media"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <p className="quiz-question-edit-form__hint">Optional. Leave empty for text-only content.</p>
      )}
      <input
        type="file"
        accept="image/*,audio/*,video/mp4,video/webm,video/quicktime"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <p className="quiz-question-edit-form__hint">Uploading media...</p>}
    </div>
  );
}

function serializeOption(option) {
  const text = option.text.trim();
  const media = normalizeMedia(option.media);
  if (!media) return text;
  return { text, media };
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
        options = [toOptionState(""), toOptionState("")];
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
  const updateOptionText = (idx, value) => {
    setForm((prev) => {
      const options = prev.options.map((option, i) =>
        i === idx ? { ...option, text: value } : option,
      );
      return { ...prev, options };
    });
  };

  const updateOptionMedia = (idx, media) => {
    setForm((prev) => {
      const options = prev.options.map((option, i) =>
        i === idx ? { ...option, media } : option,
      );
      return { ...prev, options };
    });
  };

  const addOption = () => {
    setForm((prev) => ({ ...prev, options: [...prev.options, toOptionState("")] }));
  };
  const removeOption = (idx) => {
    setForm((prev) => {
      if (prev.options.length <= 2) return prev;
      const optionNumber = idx + 1;
      const options = prev.options.filter((_, i) => i !== idx);
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
    const base = {
      title: form.title.trim(),
      media: normalizeMedia(form.media),
      explain_question: form.explain_question.trim(),
      type: form.type,
    };

    if (isChoice) {
      const options = form.options.map(serializeOption);
      return {
        ...base,
        number_of_options: options.length,
        options,
        correct_answers: [...form.correct_answers],
      };
    }
    return {
      ...base,
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
      <div className="quiz-question-edit-form">
        <label className="quiz-question-edit-form__label">
          Question title <span className="quiz-question-edit-form__hint">(optional if media exists)</span>
        </label>
        <textarea
          className="quiz-question-edit-form__textarea"
          rows={2}
          value={form.title}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder="Supports <b>, <i>, <u> tags"
        />

        <MediaUploader
          label="Question media"
          media={form.media}
          onChange={(media) => setForm((prev) => ({ ...prev, media }))}
          onError={setError}
        />

        <label className="quiz-question-edit-form__label">Explanation</label>
        <textarea
          className="quiz-question-edit-form__textarea"
          rows={2}
          value={form.explain_question}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, explain_question: e.target.value }))
          }
          placeholder="Optional"
        />

        <label className="quiz-question-edit-form__label">Question type</label>
        <select
          className="quiz-question-edit-form__select"
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
          <div className="quiz-question-edit-form__options">
            <label className="quiz-question-edit-form__label">
              Options{" "}
              <span className="quiz-question-edit-form__hint">
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
                <div key={idx} className="quiz-question-edit-form__option-row">
                  <input
                    type={
                      form.type === QUESTION_TYPES.SINGLE ? "radio" : "checkbox"
                    }
                    checked={checked}
                    onChange={() => toggleCorrect(optionNumber)}
                    name="quiz-edit-correct"
                  />
                  <div style={{ flex: 1 }}>
                    <input
                      type="text"
                      className="quiz-question-edit-form__option-input"
                      value={opt.text}
                      onChange={(e) => updateOptionText(idx, e.target.value)}
                      placeholder={`Option ${optionNumber} text (optional if media exists)`}
                    />
                    <MediaUploader
                      label={`Option ${optionNumber} media`}
                      media={opt.media}
                      onChange={(media) => updateOptionMedia(idx, media)}
                      onError={setError}
                    />
                  </div>
                  {form.options.length > 2 && (
                    <button
                      type="button"
                      className="quiz-question-edit-form__icon-btn"
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
                className="quiz-question-edit-form__add-btn"
                onClick={addOption}
              >
                <Plus size={15} /> Add option
              </button>
            )}
          </div>
        )}

        {isFill && (
          <div className="quiz-question-edit-form__options">
            <label className="quiz-question-edit-form__label">
              Accepted answers{" "}
              <span className="quiz-question-edit-form__hint">
                (any match is correct)
              </span>
            </label>
            {form.correct_answers.map((ans, idx) => (
              <div key={idx} className="quiz-question-edit-form__option-row">
                <input
                  type="text"
                  className="quiz-question-edit-form__option-input"
                  value={ans}
                  onChange={(e) => updateFillAnswer(idx, e.target.value)}
                  placeholder={`Answer ${idx + 1}`}
                />
                {form.correct_answers.length > 1 && (
                  <button
                    type="button"
                    className="quiz-question-edit-form__icon-btn"
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
              className="quiz-question-edit-form__add-btn"
              onClick={addFillAnswer}
            >
              <Plus size={15} /> Add answer
            </button>
          </div>
        )}

        {error && <p className="quiz-question-edit-form__error">{error}</p>}
      </div>
    </Modal>
  );
}
