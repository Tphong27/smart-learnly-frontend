import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Plus, Upload } from "lucide-react";
import { Modal, Button, useToast } from "@/shared/components/ui";
import { courseService } from "@/services/course.service";
import {
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  validateQuizQuestions,
  sanitizeQuizHtml,
  parseQuizContent,
  serializeQuizContent,
  getOptionMedia,
} from "../utils/quiz-question-schema";
import { QuizQuestionEditModal } from "./QuizQuestionEditModal";
import { QuizImportModal } from "./QuizImportModal";
import "./QuizQuestionManager.css";

function correctAnswerLabel(question) {
  if (!Array.isArray(question.correct_answers)) return "-";
  if (question.type === QUESTION_TYPES.FILL) {
    return question.correct_answers.join(", ");
  }
  return question.correct_answers.join(", ");
}

function HtmlCell({ html }) {
  return <span dangerouslySetInnerHTML={{ __html: sanitizeQuizHtml(html) }} />;
}

function mediaLabel(media) {
  if (!media) return "";
  return media.type === "video" ? "Video" : "Image";
}

function questionMediaSummary(question) {
  const optionMediaCount = Array.isArray(question.options)
    ? question.options.filter((option) => getOptionMedia(option)).length
    : 0;
  const parts = [];
  if (question.media) parts.push(`Question ${mediaLabel(question.media)}`);
  if (optionMediaCount > 0) parts.push(`${optionMediaCount} option media`);
  return parts.join(" • ");
}

/**
 * Modal quản lý câu hỏi quiz: import JSON/Excel, validate, bảng câu hỏi, edit/delete, save.
 * Props: { open, lesson, onClose, onSaved }
 */
export function QuizQuestionManager({ open, lesson, onClose, onSaved }) {
  const toast = useToast();

  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editIndex, setEditIndex] = useState(null); // null = đóng, -1 = thêm mới
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Load câu hỏi hiện có khi mở modal.
  useEffect(() => {
    if (!open || !lesson?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrors([]);
      try {
        const response = await courseService.getLessonDetail(lesson.id);
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
  }, [open, lesson?.id, toast]);

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
    if (!lesson?.id) return;
    const { valid, errors: validationErrors } = validateQuizQuestions(questions);
    if (!valid) {
      setErrors(validationErrors);
      toast.error("Cannot save: some questions are invalid.");
      return;
    }
    setSaving(true);
    try {
      const detail = await courseService.getLessonDetail(lesson.id);
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
        status: String(lessonData.status || "DRAFT").toUpperCase(),
        resources: Array.isArray(lessonData.resources) ? lessonData.resources : [],
        sortOrder: lessonData.sortOrder ?? 0,
      };
      await courseService.updateLesson(lesson.id, payload);
      toast.success("Quiz questions saved.");
      onSaved?.();
      onClose?.();
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

  const footer = useMemo(
    () => (
      <>
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Close
        </Button>
        <Button variant="primary" onClick={handleSave} loading={saving}>
          Save questions
        </Button>
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saving, questions, quizTitle],
  );

  return (
    <>
      <Modal
        open={open}
        title={`Manage questions${lesson?.title ? ` — ${lesson.title}` : ""}`}
        size="lg"
        onClose={onClose}
        footer={footer}
      >
        {loading ? (
          <p className="quiz-mgr__loading">Loading quiz questions...</p>
        ) : (
          <div className="quiz-mgr">
            <label className="quiz-mgr__label">Quiz title</label>
            <input
              type="text"
              className="quiz-mgr__title-input"
              value={quizTitle}
              onChange={(e) => setQuizTitle(e.target.value)}
              placeholder="Quiz title"
            />

            <div className="quiz-mgr__table-header">
              <span className="quiz-mgr__label">Questions ({questions.length})</span>
              <div className="quiz-mgr__header-actions">
                <button type="button" className="quiz-mgr__add-btn" onClick={() => setImportOpen(true)}>
                  <Upload size={15} /> Import questions
                </button>
                <button type="button" className="quiz-mgr__add-btn" onClick={() => openEdit(-1)}>
                  <Plus size={15} /> Add question
                </button>
              </div>
            </div>

            {errors.length > 0 && (
              <ul className="quiz-mgr__errors">
                {errors.map((err, i) => (
                  <li key={i}>{err.message}</li>
                ))}
              </ul>
            )}

            {questions.length === 0 ? (
              <div className="quiz-mgr__empty">
                No questions imported yet. Paste JSON or import an Excel/CSV file.
              </div>
            ) : (
              <table className="quiz-mgr__table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Question</th>
                    <th>Media</th>
                    <th>Type</th>
                    <th>Options</th>
                    <th>Correct answer</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((question, idx) => (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>
                        {question.title ? <HtmlCell html={question.title} /> : <em>Media-only question</em>}
                      </td>
                      <td>{questionMediaSummary(question) || "-"}</td>
                      <td>
                        <span className={`quiz-mgr__badge quiz-mgr__badge--${question.type}`}>
                          {QUESTION_TYPE_LABELS[question.type] || question.type}
                        </span>
                      </td>
                      <td>
                        {question.type === QUESTION_TYPES.FILL
                          ? "-"
                          : question.number_of_options ?? question.options?.length ?? 0}
                      </td>
                      <td>{correctAnswerLabel(question)}</td>
                      <td>
                        <div className="quiz-mgr__row-actions">
                          <button
                            type="button"
                            className="quiz-mgr__icon-btn"
                            onClick={() => openEdit(idx)}
                            title="Edit question"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="quiz-mgr__icon-btn quiz-mgr__icon-btn--danger"
                            onClick={() => handleDelete(idx)}
                            title="Delete question"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </Modal>

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
    </>
  );
}
