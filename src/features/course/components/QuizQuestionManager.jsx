import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus, Upload, CheckCircle2 } from "lucide-react";
import { Button, useToast } from "@/shared/components/ui";
import { courseService } from "@/services/course.service";
import { normalizeLessonStatus } from "@/features/course/utils/lesson-status";
import {
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  validateQuizQuestions,
  sanitizeQuizHtml,
  parseQuizContent,
  serializeQuizContent,
  getOptionMedia,
  getOptionText,
} from "../utils/quiz-question-schema";
import { QuizQuestionEditModal } from "./QuizQuestionEditModal";
import { QuizImportModal } from "./QuizImportModal";
import "@/features/admin/admin-shared.css";
import "./quiz-question-manager.css";

const TYPE_BADGE_CLASS = {
  [QUESTION_TYPES.SINGLE]: "admin-status admin-status--approved",
  [QUESTION_TYPES.MULTIPLE]: "admin-status admin-status--pending_verify",
  [QUESTION_TYPES.FILL]: "admin-status admin-status--draft",
};

function HtmlText({ html }) {
  return <span dangerouslySetInnerHTML={{ __html: sanitizeQuizHtml(html) }} />;
}

function mediaLabel(media) {
  if (!media) return "";
  if (media.type === "video") return "Video";
  if (media.type === "audio") return "Audio";
  if (media.type === "image") return "Image";
  return "";
}

function mediaChipClass(media) {
  const type = media?.type;
  if (type === "video") return "quiz-question-card__media-chip quiz-question-card__media-chip--video";
  if (type === "audio") return "quiz-question-card__media-chip quiz-question-card__media-chip--audio";
  return "quiz-question-card__media-chip quiz-question-card__media-chip--image";
}

function optionLetter(index) {
  return String.fromCharCode(65 + index);
}

function QuizQuestionCard({ question, index, onEdit, onDelete }) {
  const type = question.type;
  const isChoice = type === QUESTION_TYPES.SINGLE || type === QUESTION_TYPES.MULTIPLE;
  const isFill = type === QUESTION_TYPES.FILL;
  const options = Array.isArray(question.options) ? question.options : [];
  const correctSet = new Set(
    Array.isArray(question.correct_answers) ? question.correct_answers : [],
  );
  const optionMediaCount = options.filter((opt) => getOptionMedia(opt)).length;

  return (
    <article className="quiz-question-card">
      <div className="quiz-question-card__header">
        <div>
          <div className="quiz-question-card__eyebrow">
            <span>Question {index + 1}</span>
            <span className={TYPE_BADGE_CLASS[type] || "admin-status admin-status--draft"}>
              {QUESTION_TYPE_LABELS[type] || type || "Unknown"}
            </span>
          </div>
          {question.title ? (
            <h3 className="quiz-question-card__title">
              <HtmlText html={question.title} />
            </h3>
          ) : (
            <h3 className="quiz-question-card__title quiz-question-card__title--empty">
              Media-only question
            </h3>
          )}
          <div className="quiz-question-card__meta">
            {question.media && (
              <span className={mediaChipClass(question.media)}>
                Question {mediaLabel(question.media)}
              </span>
            )}
            {optionMediaCount > 0 && (
              <span className="quiz-question-card__media-chip">
                {optionMediaCount} option media
              </span>
            )}
          </div>
        </div>
        <div className="quiz-question-card__actions">
          <button
            type="button"
            className="admin-table__icon-btn"
            onClick={() => onEdit(index)}
            title="Edit question"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            className="admin-table__icon-btn admin-table__icon-btn--danger"
            onClick={() => onDelete(index)}
            title="Delete question"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {isChoice && options.length > 0 && (
        <div className="quiz-question-card__answers">
          {options.map((option, optIdx) => {
            const optionNumber = optIdx + 1;
            const isCorrect = correctSet.has(optionNumber);
            const optMedia = getOptionMedia(option);
            const text = getOptionText(option);
            return (
              <div
                key={optIdx}
                className={`quiz-question-card__answer${isCorrect ? " quiz-question-card__answer--correct" : ""}`}
              >
                <span className="quiz-question-card__answer-index">{optionLetter(optIdx)}</span>
                <span className="quiz-question-card__answer-text">
                  {text ? <HtmlText html={text} /> : <em>-</em>}
                  {optMedia && (
                    <>
                      {" "}
                      <span className={mediaChipClass(optMedia)}>{mediaLabel(optMedia)}</span>
                    </>
                  )}
                </span>
                {isCorrect && (
                  <span className="quiz-question-card__correct">
                    <CheckCircle2 size={14} /> Correct
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isFill && (
        <div className="quiz-question-card__answers">
          {(Array.isArray(question.correct_answers) ? question.correct_answers : []).map(
            (answer, idx) => (
              <div
                key={idx}
                className="quiz-question-card__answer quiz-question-card__answer--correct"
              >
                <span className="quiz-question-card__answer-index">{idx + 1}</span>
                <span className="quiz-question-card__answer-text">{answer}</span>
                <span className="quiz-question-card__correct">
                  <CheckCircle2 size={14} /> Accepted
                </span>
              </div>
            ),
          )}
        </div>
      )}

      {question.explain_question && (
        <div className="quiz-question-card__explanation">
          <strong>Explanation:</strong> <HtmlText html={question.explain_question} />
        </div>
      )}
    </article>
  );
}

/**
 * Panel quản lý câu hỏi quiz - render inline trong tab lesson editor.
 * Không còn Modal wrapper. Nhận `service` qua prop để dùng chung
 * cho admin (courseService) và trainer (trainerLessonService).
 * Props: { lessonId, lessonTitle, onSaved, service }
 */
export function QuizQuestionsPanel({
  lessonId,
  lessonTitle,
  onSaved,
  service = courseService,
}) {
  const toast = useToast();

  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editIndex, setEditIndex] = useState(null); // null = đóng, -1 = thêm mới
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Load câu hỏi hiện có khi lessonId đổi.
  useEffect(() => {
    if (!lessonId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrors([]);
      try {
        const response = await service.getLessonDetail(lessonId);
        const data = response?.data || response;
        const parsed = parseQuizContent(data?.content || "");
        if (!cancelled) {
          setQuizTitle(parsed.title || data?.title || "");
          setQuestions(parsed.questions || []);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error("Failed to load quiz questions.");
          console.error("Load quiz error:", error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, toast, service]);

  const handleImported = (importedQuestions) => {
    setQuestions((prev) => [...prev, ...importedQuestions]);
    setImportOpen(false);
    toast.success(`Added ${importedQuestions.length} question(s) to current list.`);
  };

  const handleDelete = (idx) => {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
    toast.success("Question deleted.");
  };

  const openEdit = (idx) => {
    setEditIndex(idx);
    setEditOpen(true);
  };

  const handleEditSubmit = (question) => {
    setQuestions((prev) => {
      if (editIndex === -1) return [...prev, question];
      return prev.map((q, i) => (i === editIndex ? question : q));
    });
    setEditOpen(false);
    setEditIndex(null);
    toast.success(editIndex === -1 ? "Question added." : "Question updated.");
  };

  const handleSave = async () => {
    if (!lessonId) return;
    const { valid, errors: validationErrors } = validateQuizQuestions(questions);
    if (!valid) {
      setErrors(validationErrors);
      toast.error("Cannot save: some questions are invalid.");
      return;
    }
    setSaving(true);
    try {
      const detail = await service.getLessonDetail(lessonId);
      const lessonData = detail?.data || detail;
      const content = serializeQuizContent(quizTitle, questions);
      const payload = {
        title: lessonData.title,
        lessonType: lessonData.lessonType || lessonData.type || "QUIZ",
        content,
        videoUrl: lessonData.videoUrl ?? null,
        attachmentUrl: lessonData.attachmentUrl ?? null,
        durationSeconds: Number(lessonData.durationSeconds || 0),
        isPreview: Boolean(lessonData.isPreview ?? lessonData.isPreviewable),
        status: normalizeLessonStatus(lessonData.status),
        resources: Array.isArray(lessonData.resources)
          ? lessonData.resources
          : [],
        sortOrder: lessonData.sortOrder ?? 0,
      };
      await service.updateLesson(lessonId, payload);
      toast.success("Quiz questions saved.");
      setErrors([]);
      onSaved?.();
    } catch (error) {
      const responseData = error?.response?.data;
      let message = "Failed to save quiz questions.";
      if (responseData?.message) message = responseData.message;
      else if (Array.isArray(responseData?.errors)) {
        message = responseData.errors
          .map((item) => `${item.field}: ${item.message}`)
          .join(", ");
      }
      toast.error(message);
      console.error("Save quiz error:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="quiz-question-panel">
      <section className="admin-card admin-card--flush">
        <div className="admin-toolbar">
          <div className="admin-toolbar__filters">
            <label className="quiz-question-panel__title-label" htmlFor="quiz-question-panel-title">
              Quiz title
            </label>
            <input
              id="quiz-question-panel-title"
              type="text"
              className="quiz-question-panel__title-input"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder={lessonTitle || "Quiz title"}
            />
            <span className="quiz-question-panel__count">
              {questions.length} question(s)
            </span>
          </div>
          <div className="quiz-question-panel__actions">
            <Button
              variant="secondary"
              leftIcon={<Upload size={15} />}
              onClick={() => setImportOpen(true)}
              disabled={saving}
            >
              Import questions
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Plus size={15} />}
              onClick={() => openEdit(-1)}
              disabled={saving}
            >
              Add question
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              loading={saving}
            >
              Save questions
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">Loading quiz questions...</div>
        ) : (
          <>
            {errors.length > 0 && (
              <ul className="quiz-question-panel__errors">
                {errors.map((err, i) => (
                  <li key={i}>{err.message}</li>
                ))}
              </ul>
            )}

            {questions.length === 0 ? (
              <div className="admin-empty">
                No questions yet. Import JSON/Excel or add manually.
              </div>
            ) : (
              <div className="quiz-question-card-list">
                {questions.map((question, idx) => (
                  <QuizQuestionCard
                    key={idx}
                    question={question}
                    index={idx}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <QuizQuestionEditModal
        key={editOpen ? `edit-${editIndex}` : "closed"}
        open={editOpen}
        question={editIndex != null && editIndex >= 0 ? questions[editIndex] : null}
        onClose={() => {
          setEditOpen(false);
          setEditIndex(null);
        }}
        onSubmit={handleEditSubmit}
      />

      <QuizImportModal
        key={importOpen ? "import-open" : "import-closed"}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImported}
      />
    </div>
  );
}
