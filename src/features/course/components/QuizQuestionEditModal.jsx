import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Alert,
  Button,
  IconButton,
  Input,
  Modal,
  Select,
  Textarea,
} from "@/shared/components/ui";
import { courseContentService } from "../services/courseContentService";
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

/** Chuẩn hóa option cũ dạng chuỗi hoặc object về state editor thống nhất. */
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

/** Tạo state form mới hoặc sao chép dữ liệu câu hỏi hiện có để chỉnh sửa. */
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

/** Chuyển response upload thành media object đúng quiz schema. */
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

/** Quản lý ảnh tùy chọn cho question hoặc answer option. */
function MediaUploader({
  label,
  media,
  disabled,
  onChange,
  onError,
  onUploadingChange,
}) {
  const [uploading, setUploading] = useState(false);

  /** Kiểm tra file ảnh và báo trạng thái upload về editor cha. */
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      onError("Only image files are supported.");
      return;
    }

    setUploading(true);
    onUploadingChange?.(true);
    try {
      const uploaded = await courseContentService.uploadLessonResource(file);
      onChange(buildMediaFromUpload(uploaded, "image"));
    } catch (error) {
      const message =
        error?.response?.data?.message || "Failed to upload image file.";
      onError(message);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
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
          <IconButton
            icon={<Trash2 size={16} />}
            label={`Remove ${label.toLowerCase()}`}
            variant="danger"
            onClick={() => onChange(null)}
            disabled={disabled || uploading}
          />
        </div>
      ) : (
        <p className="quiz-question-edit-form__hint">Optional. Leave empty for text-only content. Only images are supported.</p>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />
      {uploading && <p className="quiz-question-edit-form__hint">Uploading image...</p>}
    </div>
  );
}

/** Serialize option editor state về dạng ngắn khi không có media. */
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
  const [submitting, setSubmitting] = useState(false);
  const [activeUploads, setActiveUploads] = useState(0);
  const submittingRef = useRef(false);
  const activeUploadsRef = useRef(0);

  const uploadBusy = activeUploads > 0;
  const formBusy = submitting || uploadBusy;

  /** Theo dõi đồng thời nhiều media upload để khóa save đến khi hoàn tất. */
  const handleUploadingChange = (isUploading) => {
    const nextCount = Math.max(
      0,
      activeUploadsRef.current + (isUploading ? 1 : -1),
    );
    activeUploadsRef.current = nextCount;
    setActiveUploads(nextCount);
  };

  const isChoice =
    form.type === QUESTION_TYPES.SINGLE ||
    form.type === QUESTION_TYPES.MULTIPLE;
  const isFill = form.type === QUESTION_TYPES.FILL;

  /** Chuyển question type và tái tạo answer state tương thích khi cần. */
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

  /** Cập nhật text của một choice option theo vị trí hiện tại. */
  const updateOptionText = (idx, value) => {
    setForm((prev) => {
      const options = prev.options.map((option, i) =>
        i === idx ? { ...option, text: value } : option,
      );
      return { ...prev, options };
    });
  };

  /** Cập nhật media của một choice option theo vị trí hiện tại. */
  const updateOptionMedia = (idx, media) => {
    setForm((prev) => {
      const options = prev.options.map((option, i) =>
        i === idx ? { ...option, media } : option,
      );
      return { ...prev, options };
    });
  };

  /** Thêm option rỗng trong giới hạn được kiểm soát ở giao diện. */
  const addOption = () => {
    setForm((prev) => ({ ...prev, options: [...prev.options, toOptionState("")] }));
  };
  /** Xóa option và đánh lại chỉ số correct answer để giữ schema hợp lệ. */
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

  /** Chọn một đáp án cho single choice hoặc toggle nhiều đáp án cho multiple choice. */
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

  /** Cập nhật một accepted answer của câu hỏi điền khuyết. */
  const updateFillAnswer = (idx, value) => {
    setForm((prev) => ({
      ...prev,
      correct_answers: prev.correct_answers.map((a, i) =>
        i === idx ? value : a,
      ),
    }));
  };
  /** Thêm accepted answer rỗng cho câu hỏi điền khuyết. */
  const addFillAnswer = () => {
    setForm((prev) => ({
      ...prev,
      correct_answers: [...prev.correct_answers, ""],
    }));
  };
  /** Xóa accepted answer nhưng luôn giữ ít nhất một dòng. */
  const removeFillAnswer = (idx) => {
    setForm((prev) => {
      if (prev.correct_answers.length <= 1) return prev;
      return {
        ...prev,
        correct_answers: prev.correct_answers.filter((_, i) => i !== idx),
      };
    });
  };

  /** Chuyển state editor thành question payload đúng theo từng loại câu hỏi. */
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

  /** Validate question, chờ media hoàn tất rồi giao payload cho manager lưu. */
  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (activeUploadsRef.current > 0) {
      setError("Wait for all media uploads to finish before saving.");
      return;
    }

    const candidate = buildQuestion();
    const { valid, errors } = validateQuizQuestions([candidate]);
    if (!valid) {
      setError(errors.map((item) => item.message).join(" "));
      return;
    }

    submittingRef.current = true;
    setError("");
    setSubmitting(true);
    try {
      const saved = await onSubmit(candidate);
      if (!saved) {
        setError("Question could not be saved. Please try again.");
        return;
      }
      onClose();
    } catch (submitError) {
      console.error("Save question error:", submitError);
      setError("Question could not be saved. Please try again.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={formBusy}>
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handleSubmit}
        loading={submitting}
        disabled={uploadBusy}
      >
        Save question
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      title={question ? "Edit question" : "Add question"}
      size="lg"
      onClose={onClose}
      closeDisabled={formBusy}
      footer={footer}
    >
      <div className="quiz-question-edit-form">
        <Textarea
          label="Question title"
          helperText="Optional if question media is provided."
          rows={2}
          value={form.title}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, title: e.target.value }))
          }
          placeholder="Supports <b>, <i>, <u> tags"
          disabled={formBusy}
        />

        <MediaUploader
          label="Question media"
          media={form.media}
          disabled={formBusy}
          onChange={(media) => setForm((prev) => ({ ...prev, media }))}
          onError={setError}
          onUploadingChange={handleUploadingChange}
        />

        <Textarea
          label="Explanation"
          helperText="Optional explanation shown after answering."
          rows={2}
          value={form.explain_question}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, explain_question: e.target.value }))
          }
          placeholder="Optional"
          disabled={formBusy}
        />

        <Select
          label="Question type"
          value={form.type}
          onChange={(e) => handleTypeChange(e.target.value)}
          disabled={formBusy}
        >
          {TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {QUESTION_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>

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
                    disabled={formBusy}
                  />
                  <div className="quiz-question-edit-form__option-content">
                    <Input
                      type="text"
                      value={opt.text}
                      onChange={(e) => updateOptionText(idx, e.target.value)}
                      placeholder={`Option ${optionNumber} text (optional if media exists)`}
                      disabled={formBusy}
                    />
                    <MediaUploader
                      label={`Option ${optionNumber} media`}
                      media={opt.media}
                      disabled={formBusy}
                      onChange={(media) => updateOptionMedia(idx, media)}
                      onError={setError}
                      onUploadingChange={handleUploadingChange}
                    />
                  </div>
                  {form.options.length > 2 && (
                    <IconButton
                      icon={<Trash2 size={16} />}
                      label={`Remove option ${optionNumber}`}
                      onClick={() => removeOption(idx)}
                      disabled={formBusy}
                    />
                  )}
                </div>
              );
            })}
            {form.options.length < 6 && (
              <Button
                type="button"
                variant="secondary"
                leftIcon={<Plus size={15} />}
                onClick={addOption}
                disabled={formBusy}
              >
                Add option
              </Button>
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
                <Input
                  type="text"
                  className="quiz-question-edit-form__option-content"
                  value={ans}
                  onChange={(e) => updateFillAnswer(idx, e.target.value)}
                  placeholder={`Answer ${idx + 1}`}
                  disabled={formBusy}
                />
                {form.correct_answers.length > 1 && (
                  <IconButton
                    icon={<Trash2 size={16} />}
                    label={`Remove answer ${idx + 1}`}
                    onClick={() => removeFillAnswer(idx)}
                    disabled={formBusy}
                  />
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              leftIcon={<Plus size={15} />}
              onClick={addFillAnswer}
              disabled={formBusy}
            >
              Add answer
            </Button>
          </div>
        )}

        {error && (
          <Alert tone="danger">{error}</Alert>
        )}
      </div>
    </Modal>
  );
}
