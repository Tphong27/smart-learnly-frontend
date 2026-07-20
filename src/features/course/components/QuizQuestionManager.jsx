import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2, Plus, Upload, CheckCircle2 } from "lucide-react";
import { Button, Modal, useToast } from "@/shared/components/ui";
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

function QuizQuestionCard({ question, index, onEdit, onDelete, disabled }) {
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
            aria-label={`Edit question ${index + 1}`}
            disabled={disabled}
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            className="admin-table__icon-btn admin-table__icon-btn--danger"
            onClick={() => onDelete(index)}
            title="Delete question"
            aria-label={`Delete question ${index + 1}`}
            disabled={disabled}
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
 * Panel quản lý câu hỏi quiz - render inline trong lesson editor.
 * Mỗi thao tác thay đổi câu hỏi được lưu ngay để tránh content local cũ
 * bị nút Save changes của lesson ghi đè.
 */
export function QuizQuestionsPanel({
  lessonId,
  lessonTitle,
  onSaved,
  onBusyChange,
  disabled = false,
  service = courseService,
}) {
  const toast = useToast();

  const [questions, setQuestions] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const [editIndex, setEditIndex] = useState(null); // null = đóng, -1 = thêm mới
  const [importOpen, setImportOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);

  const busy = loading || saving;
  const mutationDisabled = disabled || busy;

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(
    () => () => {
      onBusyChange?.(false);
    },
    [onBusyChange],
  );

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

  const persistQuestions = async (nextQuestions, successMessage) => {
    if (!lessonId || savingRef.current) return false;

    const { valid, errors: validationErrors } =
      validateQuizQuestions(nextQuestions);
    if (!valid) {
      setErrors(validationErrors);
      toast.error("Cannot save: some questions are invalid.");
      return false;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const detail = await service.getLessonDetail(lessonId);
      const latestLesson = detail?.data || detail;
      const persistedTitle = String(latestLesson?.title || lessonTitle || "").trim();
      const content = serializeQuizContent(persistedTitle, nextQuestions);
      const payload = {
        title: persistedTitle,
        lessonType: latestLesson.lessonType || latestLesson.type || "QUIZ",
        content,
        videoUrl: latestLesson.videoUrl ?? null,
        attachmentUrl: latestLesson.attachmentUrl ?? null,
        durationSeconds: Number(latestLesson.durationSeconds || 0),
        isPreview: Boolean(
          latestLesson.isPreview ?? latestLesson.isPreviewable,
        ),
        status: normalizeLessonStatus(latestLesson.status),
        resources: Array.isArray(latestLesson.resources)
          ? latestLesson.resources
          : [],
        sortOrder: latestLesson.sortOrder ?? 0,
      };

      const response = await service.updateLesson(lessonId, payload);
      const responseLesson = response?.data || response;
      const savedLesson = {
        ...latestLesson,
        ...payload,
        ...(responseLesson && typeof responseLesson === "object"
          ? responseLesson
          : {}),
        content,
      };

      setQuestions(nextQuestions);
      setErrors([]);
      try {
        await onSaved?.(content, savedLesson);
      } catch (callbackError) {
        console.error("Sync saved quiz state error:", callbackError);
      }
      toast.success(successMessage);
      return true;
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
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleImported = (importedQuestions) =>
    persistQuestions(
      [...questions, ...importedQuestions],
      `Imported ${importedQuestions.length} question(s).`,
    );

  const openEdit = (index) => {
    if (!mutationDisabled) setEditIndex(index);
  };

  const handleEditSubmit = (question) => {
    const nextQuestions =
      editIndex === -1
        ? [...questions, question]
        : questions.map((current, index) =>
            index === editIndex ? question : current,
          );
    return persistQuestions(
      nextQuestions,
      editIndex === -1 ? "Question added." : "Question updated.",
    );
  };

  const handleConfirmDelete = async () => {
    if (deleteIndex == null) return;
    const nextQuestions = questions.filter((_, index) => index !== deleteIndex);
    const saved = await persistQuestions(nextQuestions, "Question deleted.");
    if (saved) setDeleteIndex(null);
  };

  return (
    <div className="quiz-question-panel">
      <section className="admin-card admin-card--flush">
        <div className="admin-toolbar">
          <div className="admin-toolbar__filters">
            <span className="quiz-question-panel__count">
              {questions.length} question(s)
            </span>
          </div>
          <div className="quiz-question-panel__actions">
            <Button
              variant="secondary"
              leftIcon={<Upload size={15} />}
              onClick={() => setImportOpen(true)}
              disabled={mutationDisabled}
            >
              Import questions
            </Button>
            <Button
              variant="secondary"
              leftIcon={<Plus size={15} />}
              onClick={() => openEdit(-1)}
              disabled={mutationDisabled}
            >
              Add question
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
                    onDelete={setDeleteIndex}
                    disabled={mutationDisabled}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <QuizQuestionEditModal
        key={editIndex == null ? "closed" : `edit-${editIndex}`}
        open={editIndex != null}
        question={editIndex != null && editIndex >= 0 ? questions[editIndex] : null}
        onClose={() => setEditIndex(null)}
        onSubmit={handleEditSubmit}
      />

      <QuizImportModal
        key={importOpen ? "import-open" : "import-closed"}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        existingQuestions={questions}
        onImport={handleImported}
      />

      <Modal
        open={deleteIndex != null}
        title="Delete question"
        description={
          deleteIndex == null
            ? ""
            : `Question ${deleteIndex + 1} will be permanently removed from this quiz.`
        }
        onClose={() => setDeleteIndex(null)}
        closeDisabled={saving}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setDeleteIndex(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDelete}
              loading={saving}
            >
              Delete question
            </Button>
          </>
        }
      >
        <p>This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
