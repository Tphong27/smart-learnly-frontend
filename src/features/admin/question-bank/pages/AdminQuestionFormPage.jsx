import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FileAudio, FileVideo, Image as ImageIcon, Plus, Trash2, X } from "lucide-react";
import {
  Alert,
  Button,
  FormField,
  IconButton,
  LoadingState,
  Modal,
  Select,
  Tabs,
  useToast,
} from "@/shared/components/ui";
import { questionBankService } from "@/features/admin/question-bank";
import { courseAdminService } from "@/features/course";
import { isEmptyQuestionHtml, sanitizeQuestionHtml } from "@/shared/utils/htmlSanitizer";
import { AnswerMediaRow } from "../components/AnswerMediaRow";
import { QuestionMediaManager } from "../components/QuestionMediaManager";
import { QuestionTextRichEditor } from "../components/QuestionTextRichEditor";
import {
  answerImageUrl,
  blankAnswer,
  buildAnswerContent,
  canWriteQuestionBank,
  getSaveableQuestionAnswers,
  mediaId,
  normalizeAnswerMediaFromResponse,
  normalizeAnswers,
  normalizeQuestionMedia,
  parseAnswerContent,
  pendingMediaItem,
  QUESTION_TYPE_OPTIONS,
  validateQuestionForm,
} from "../utils/questionFormUtils";
import "../../admin-shared.css";
import "./question-bank.css";

const EMPTY_QUESTION_FORM_VALUES = {
  questionText: "",
  questionType: "single_choice",
  status: "draft",
  explanation: "",
  answers: [],
};

/** Chuẩn hóa initial values để cùng một AdminQuestionForm dùng được cho API và import draft. */
function createInitialQuestionFormValues(initialValues) {
  const merged = { ...EMPTY_QUESTION_FORM_VALUES, ...(initialValues || {}) };
  return {
    ...merged,
    answers: normalizeAnswers(merged.questionType, merged.answers),
  };
}

/** Form tạo/sửa question dùng chung cho dữ liệu API và import draft cục bộ. */
export function AdminQuestionForm({
  bankId: bankIdProp,
  courseId: courseIdProp,
  questionId: questionIdProp,
  initialValues,
  initialMedia,
  draftMode = false,
  allowDraftMediaEdits = false,
  questionTypeOptions = QUESTION_TYPE_OPTIONS,
  showStatus = true,
  submitLabel,
  onCancel,
  onSaved,
  onDraftSubmit,
  framed = true,
}) {
  const params = useParams();
  const location = useLocation();
  const bankId = bankIdProp ?? params.bankId;
  const courseId = courseIdProp ?? params.courseId;
  const questionId = questionIdProp ?? params.questionId;
  const navigate = useNavigate();
  const toast = useToast();
  const writable = canWriteQuestionBank();
  const editing = Boolean(questionId);
  const courseBasePath = location.pathname.startsWith("/staff/")
    ? "/staff/courses"
    : "/admin/courses";
  const [bank, setBank] = useState(null);
  const [loading, setLoading] = useState(!draftMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [values, setValues] = useState(() =>
    createInitialQuestionFormValues({
      ...initialValues,
    }),
  );
  const pendingPreviewUrls = useRef(new Set());
  const [imageMedia, setImageMedia] = useState(() => initialMedia?.images || []);
  const [audioMedia, setAudioMedia] = useState(() => initialMedia?.audios || []);
  const [videoMedia, setVideoMedia] = useState(() => initialMedia?.videos || []);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState([]);
  const [activeMediaTab, setActiveMediaTab] = useState("image");
  useEffect(() => {
    let cancelled = false;
    if (draftMode) {
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (editing) {
          const question = courseId
            ? await questionBankService.getCourseQuestion(courseId, questionId)
            : await questionBankService.getQuestion(questionId);
          if (cancelled) return;
          const normalizedMedia = normalizeQuestionMedia(question);
          setImageMedia(normalizedMedia.images);
          setAudioMedia(normalizedMedia.audios);
          setVideoMedia(normalizedMedia.videos || []);
          setRemovedAttachmentIds([]);
          setValues({
            questionText: question.questionText || "",
            questionType: question.questionType || "single_choice",
            status: question.status || "draft",
            explanation: question.explanation || "",
            answers: normalizeAnswers(
              question.questionType || "single_choice",
              (question.answers || []).map((answer, index) => ({
                answerId: answer.answerId || answer.id || null,
                id: answer.id || answer.answerId || null,
                ...parseAnswerContent(answer.answerText),
                correct: Boolean(answer.correct || answer.isCorrect),
                displayOrder: answer.displayOrder ?? index + 1,
                answerMedia: normalizeAnswerMediaFromResponse(answer),
              })),
            ),
          });
          if (courseId) {
            const courseData = await courseAdminService.get(courseId);
            if (!cancelled) {
              setBank({
                id: null,
                courseId,
                name: `${courseData?.title || "Course"} Questions`,
              });
            }
          } else {
            const resolvedBankId = question.bankId || question.questionBankId;
            if (resolvedBankId) {
              const bankData = await questionBankService.getBank(resolvedBankId);
              if (!cancelled) {
                setBank(bankData);
              }
            }
          }
        } else {
          const bankData = courseId
            ? await courseAdminService.get(courseId)
            : await questionBankService.getBank(bankId);
          if (!cancelled) {
            if (courseId) {
              setBank({
                id: null,
                courseId,
                name: `${bankData?.title || "Course"} Questions`,
              });
            } else {
              setBank(bankData);
            }
          }
        }
      } catch (err) {
        if (!cancelled)
          setError(err?.message || "Could not load question form.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bankId, courseId, draftMode, editing, questionId]);

  const returnBankId = useMemo(
    () => bank?.bankId || bank?.id || bankId,
    [bank, bankId],
  );
  const returnPath = courseId
    ? `${courseBasePath}/${courseId}/questions`
    : `/admin/question-banks/${returnBankId}`;

  /** Bọc nội dung bằng admin page khi form không nằm trong modal. */
  const renderFrame = (content) =>
    framed ? <div className="admin-page">{content}</div> : content;

  /** Đóng form qua callback hoặc quay về danh sách question. */
  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }
    navigate(returnPath);
  }

  /** Đổi loại question và chuẩn hóa lại đáp án tương ứng. */
  function setType(nextType) {
    setValues((current) => ({
      ...current,
      questionType: nextType,
      answers: normalizeAnswers(nextType, current.answers),
    }));
  }

  /** Cập nhật đáp án đúng theo quy tắc single hoặc multiple choice. */
  function setCorrect(index) {
    setValues((current) => ({
      ...current,
      answers: current.answers.map((answer, answerIndex) => ({
        ...answer,
        correct:
          current.questionType === "multiple_choice"
            ? answerIndex === index
              ? !answer.correct
              : answer.correct
            : answerIndex === index,
      })),
    }));
  }

  /** Cập nhật nội dung text của một đáp án. */
  function updateAnswer(index, answerText) {
    setValues((current) => ({
      ...current,
      answers: current.answers.map((answer, answerIndex) =>
        answerIndex === index ? { ...answer, answerText } : answer,
      ),
    }));
  }

  /** Cập nhật ảnh draft cũ của một đáp án. */
  function updateAnswerImage(index, answerImage) {
    setValues((current) => ({
      ...current,
      answers: current.answers.map((answer, answerIndex) =>
        answerIndex === index ? { ...answer, answerImage } : answer,
      ),
    }));
  }

  /** Gỡ ảnh draft và thu hồi preview URL liên quan. */
  function removeAnswerImage(index) {
    const currentImage = values.answers[index]?.answerImage;
    if (currentImage?.previewUrl) {
      URL.revokeObjectURL(currentImage.previewUrl);
      pendingPreviewUrls.current.delete(currentImage.previewUrl);
    }
    updateAnswerImage(index, null);
  }

  /** Thêm đáp án mới khi chưa đạt giới hạn. */
  function addAnswer() {
    setValues((current) => {
      if (current.answers.length >= 6) return current;
      return {
        ...current,
        answers: [...current.answers, blankAnswer(current.answers.length)],
      };
    });
  }

  /** Xóa đáp án và bảo đảm luôn còn ít nhất một đáp án đúng. */
  function removeAnswer(index) {
    setValues((current) => {
      const nextAnswers = current.answers.filter(
        (_, answerIndex) => answerIndex !== index,
      );
      if (nextAnswers.length < 2) return current;
      if (!nextAnswers.some((answer) => answer.correct))
        nextAnswers[0] = { ...nextAnswers[0], correct: true };
      return {
        ...current,
        answers: nextAnswers.map((answer, answerIndex) => ({
          ...answer,
          displayOrder: answerIndex + 1,
        })),
      };
    });
  }

  useEffect(
    () => () => {
      pendingPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      pendingPreviewUrls.current.clear();
    },
    [],
  );

  /** Trả về setter state tương ứng với loại media question. */
  function mediaSetter(mediaType) {
    if (mediaType === "image") return setImageMedia;
    if (mediaType === "audio") return setAudioMedia;
    if (mediaType === "video") return setVideoMedia;
    throw new Error(`Unsupported media type: ${mediaType}`);
  }

  /** Thêm file media mới vào hàng đợi upload của question. */
  function addMediaFiles(mediaType, files) {
    const nextItems = files.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      pendingPreviewUrls.current.add(previewUrl);
      return pendingMediaItem(file, mediaType, previewUrl);
    });
    mediaSetter(mediaType)((current) => [...current, ...nextItems]);
  }

  /** Áp dụng cập nhật media cho đúng đáp án và loại media. */
  function applyAnswerMediaUpdate(index, mediaType, updater) {
    setValues((current) => ({
      ...current,
      answers: current.answers.map((answer, answerIndex) => {
        if (answerIndex !== index) return answer;
        const currentMedia = answer.answerMedia || { image: null, audio: null, video: null };
        return {
          ...answer,
          answerMedia: {
            ...currentMedia,
            [mediaType]: updater(currentMedia[mediaType]),
          },
        };
      }),
    }));
  }

  /** Giữ media đáp án ở local để upload sau khi question và answer đã có ID. */
  function handleAnswerMediaUpload(index, mediaType, file) {
    const previousItem = values.answers[index]?.answerMedia?.[mediaType] || null;
    if (previousItem?.previewUrl) {
      URL.revokeObjectURL(previousItem.previewUrl);
      pendingPreviewUrls.current.delete(previousItem.previewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    pendingPreviewUrls.current.add(previewUrl);
    applyAnswerMediaUpdate(index, mediaType, () =>
      pendingMediaItem(file, mediaType, previewUrl),
    );
  }

  /** Gỡ media của đáp án và ghi nhận attachment cần xóa. */
  function handleAnswerMediaRemove(index, mediaType) {
    const current = values.answers[index]?.answerMedia?.[mediaType];
    if (current?.previewUrl) {
      URL.revokeObjectURL(current.previewUrl);
      pendingPreviewUrls.current.delete(current.previewUrl);
    }
    if (current?.attachmentId) {
      setRemovedAttachmentIds((prev) =>
        prev.includes(current.attachmentId) ? prev : [...prev, current.attachmentId],
      );
    }
    applyAnswerMediaUpdate(index, mediaType, () => null);
  }

  /** Đồng bộ media đáp án mới sau khi question đã có ID. */
  function syncAnswerMediaAfterSave(savedQuestion) {
    const answers = savedQuestion?.answers || [];
    if (!answers.length) return Promise.resolve();
    const answerIdByIndex = answers.map((answer) => answer.answerId || answer.id);
    const saveableAnswers = getSaveableQuestionAnswers(
      values.questionType,
      values.answers,
    );
    const uploadTasks = [];
    saveableAnswers.forEach((answer, index) => {
      const media = answer.answerMedia || {};
      const answerId = answerIdByIndex[index];
      if (!answerId) return;
      for (const mediaType of ["image", "audio", "video"]) {
        const item = media[mediaType];
        if (item && item.source === "pending" && item.file) {
          uploadTasks.push({ mediaType, file: item.file, answerId });
        }
      }
    });
    return Promise.all(uploadTasks.map((task) =>
      questionBankService.uploadAnswerMedia(
        savedQuestion.questionId || savedQuestion.id,
        task.answerId,
        task.mediaType,
        task.file,
      ),
    ));
  }

  /** Xóa các attachment đáp án đã được người dùng gỡ khỏi form. */
  async function syncRemovedAnswerMedia(savedQuestionId) {
    if (!removedAttachmentIds.length) return;
    const answers = await questionBankService
      .getQuestion(savedQuestionId)
      .then((q) => q?.answers || [])
      .catch(() => []);
    const attachmentIndex = new Map();
    for (const answer of answers) {
      for (const item of answer.media || []) {
        const id = item.attachmentId || item.id;
        if (id) attachmentIndex.set(id, answer.answerId || answer.id);
      }
    }
    const deletionTasks = removedAttachmentIds
      .map((id) => ({ id, answerId: attachmentIndex.get(id) }))
      .filter((entry) => entry.answerId);
    await Promise.all(
      deletionTasks.map((entry) =>
        questionBankService
          .removeAnswerMedia(savedQuestionId, entry.answerId, entry.id)
          .catch(() => null),
      ),
    );
  }

  /** Gỡ media question và thu hồi preview URL nếu là file local. */
  function removeMedia(mediaType, item) {
    const attachmentId = mediaId(item);
    if (attachmentId) {
      setRemovedAttachmentIds((current) =>
        current.includes(attachmentId) ? current : [...current, attachmentId],
      );
    }
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
      pendingPreviewUrls.current.delete(item.previewUrl);
    }
    mediaSetter(mediaType)((current) =>
      current.filter((candidate) => candidate.localId !== item.localId),
    );
  }

  /** Đổi vị trí media question trong danh sách hiện tại. */
  function moveMediaTo(mediaType, fromIndex, toIndex) {
    mediaSetter(mediaType)((current) => {
      if (fromIndex < 0 || fromIndex >= current.length) return current;
      const safeTo = Math.max(0, Math.min(toIndex, current.length - 1));
      if (fromIndex === safeTo) return current;
      const next = [...current];
      const [item] = next.splice(fromIndex, 1);
      next.splice(safeTo, 0, item);
      return next;
    });
  }

  /** Đồng bộ upload, xóa và thứ tự của một loại media question. */
  async function syncMediaType(savedQuestionId, mediaType, items) {
    const pendingItems = items.filter((item) => item.source === "pending");
    let uploadedIds = [];
    if (pendingItems.length) {
      const uploadResponse = await questionBankService.uploadQuestionMedia(
        savedQuestionId,
        mediaType,
        pendingItems.map((item) => item.file),
      );
      uploadedIds = (uploadResponse?.mediaAttachments || [])
        .map((item) => item.attachmentId || item.id)
        .filter(Boolean);
    }

    const orderedIds = [];
    for (const item of items) {
      if (item.source === "pending") {
        const nextUploadedId = uploadedIds.shift();
        if (nextUploadedId) orderedIds.push(nextUploadedId);
      } else {
        const attachmentId = mediaId(item);
        if (attachmentId) orderedIds.push(attachmentId);
      }
    }
    if (editing && orderedIds.length > 1) {
      await questionBankService.reorderQuestionMedia(
        savedQuestionId,
        mediaType,
        orderedIds,
      );
    }
  }

  /** Đồng bộ toàn bộ image, audio và video của question. */
  async function syncQuestionMedia(savedQuestionId) {
    if (!savedQuestionId) return;
    for (const attachmentId of removedAttachmentIds) {
      await questionBankService.removeQuestionMedia(
        savedQuestionId,
        attachmentId,
      );
    }
    await syncMediaType(savedQuestionId, "image", imageMedia);
    await syncMediaType(savedQuestionId, "audio", audioMedia);
    await syncMediaType(savedQuestionId, "video", videoMedia);
  }

  /** Kiểm tra form, lưu question và đồng bộ toàn bộ attachment. */
  async function handleSubmit(event) {
    event.preventDefault();
    if (draftMode) {
      setSubmitting(true);
      setError(null);
      const cleanQuestionText = sanitizeQuestionHtml(values.questionText).trim();
      const cleanExplanation = sanitizeQuestionHtml(values.explanation).trim();
      try {
        await onDraftSubmit?.({
          values: {
            ...values,
            questionText: cleanQuestionText,
            explanation: isEmptyQuestionHtml(cleanExplanation) ? "" : cleanExplanation,
          },
          media: {
            images: imageMedia,
            audios: audioMedia,
            videos: videoMedia,
          },
        });
      } catch (err) {
        setError(err?.message || "Could not update the imported question.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const validationError = validateQuestionForm(values);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    const cleanExplanation = sanitizeQuestionHtml(values.explanation).trim();
    const saveableAnswers = getSaveableQuestionAnswers(
      values.questionType,
      values.answers,
    );
    const payload = {
      bankId: courseId ? undefined : returnBankId,
      courseId,
      questionText: sanitizeQuestionHtml(values.questionText).trim(),
      questionType: values.questionType,
      status: values.status,
      explanation: isEmptyQuestionHtml(cleanExplanation) ? null : cleanExplanation,
      answers: saveableAnswers.map((answer, index) => ({
        answerId: answer.answerId || answer.id || null,
        answerText: buildAnswerContent(answer),
        correct: Boolean(answer.correct),
        displayOrder: index + 1,
      })),
    };
    try {
      let savedQuestion;
      if (editing) {
        if (!courseId) {
          savedQuestion = await questionBankService.updateQuestion(
            questionId,
            payload,
          );
        } else {
          savedQuestion = await questionBankService.updateCourseQuestion(
            courseId,
            questionId,
            payload,
          );
        }
      } else if (!courseId) {
        savedQuestion = await questionBankService.createQuestion(payload);
      } else {
        savedQuestion = await questionBankService.createCourseQuestion(
          courseId,
          payload,
        );
      }
      const savedQuestionId =
        savedQuestion?.questionId || savedQuestion?.id || questionId;
      try {
        await syncQuestionMedia(savedQuestionId);
      } catch {
        toast.error(
          `${editing ? "Question updated" : "Question created"}, but media update failed. Open the question and retry.`,
        );
        if (onSaved) {
          onSaved({ question: savedQuestion, bankId: returnBankId });
        } else {
          navigate(returnPath);
        }
        return;
      }
      try {
        await syncRemovedAnswerMedia(savedQuestionId);
      } catch {
        // Non-fatal: continue to upload new media.
      }
      try {
        await syncAnswerMediaAfterSave(savedQuestion);
      } catch {
        toast.error(
          `${editing ? "Question updated" : "Question created"}, but answer media upload failed. Open the question and retry.`,
        );
        if (onSaved) {
          onSaved({ question: savedQuestion, bankId: returnBankId });
        } else {
          navigate(returnPath);
        }
        return;
      }
      toast.success(editing ? "Question updated" : "Question created");
      if (onSaved) {
        onSaved({ question: savedQuestion, bankId: returnBankId, courseId });
      } else {
        navigate(returnPath);
      }
    } catch (err) {
      setError(err?.message || "Could not save question.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!writable) {
    return (
      <div className="admin-page">
        <section className="admin-card">
          <h1 className="admin-page__title">Unauthorized</h1>
          <Button to={returnPath || "/admin/courses"} variant="secondary">
            Back to questions
          </Button>
        </section>
      </div>
    );
  }

  if (loading)
    return (
      <div className="admin-page">
        <LoadingState label="Loading question form..." />
      </div>
    );

  const bankIsArchived = bank?.status === "archived";

  if (bankIsArchived) {
    return (
      <div className="admin-page">
        {framed && (
          <header className="admin-page__header">
            <div>
              <Button
                to={
                  returnPath
                }
                variant="ghost"
                size="sm"
              >
                Back
              </Button>
              <h1 className="admin-page__title question-authoring-page-title">
                Cannot edit question
              </h1>
            </div>
          </header>
        )}
        <Alert
          tone="warning"
          title={`The question collection "${bank?.name || ""}" is archived.`}
          action={
            <Button to={returnPath} variant="secondary" size="sm">
              Back to questions
            </Button>
          }
        >
          Restore it before editing any of its questions.
        </Alert>
      </div>
    );
  }

  return renderFrame(
    <>
      {framed && (
        <header className="admin-page__header">
        <div>
          <Button
            to={
              returnPath
            }
            variant="ghost"
            size="sm"
          >
            Back
          </Button>
          <h1 className="admin-page__title question-authoring-page-title">
            {editing ? "Edit question" : "Create question"}
          </h1>
        </div>
        </header>
      )}

      <section className={framed ? "admin-card" : "question-authoring-modal-body"}>
        {error && (
          <Alert tone="danger" title="Question could not be saved">
            {error}
          </Alert>
        )}
        <form className="question-authoring-form" onSubmit={handleSubmit}>
          <section className="question-authoring-block question-authoring-block--metadata">
            <div className="question-authoring-meta-grid">
              <Select
                  id="question-type"
                  label="Question type"
                  required
                  value={values.questionType}
                  onChange={(event) => setType(event.target.value)}
                >
                  {questionTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </Select>
              {showStatus && <Select
                  id="question-status"
                  label="Status"
                  value={values.status}
                  disabled={draftMode}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
              </Select>}
            </div>
          </section>
          <section className="question-authoring-block">
            <div className="question-authoring-block__header">
              <h2>
                Question text
                <span className="input-field__required" aria-hidden="true">*</span>
              </h2>
            </div>
            <QuestionTextRichEditor
              value={values.questionText}
              disabled={submitting}
              onChange={(questionText) =>
                setValues((current) => ({
                  ...current,
                  questionText,
                }))
              }
            />
          </section>

          <section className="question-authoring-block">
            <div className="question-authoring-block__header">
              <h2>
                Answers
                <span className="input-field__required" aria-hidden="true">*</span>
              </h2>
              {values.questionType !== "true_false" && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  leftIcon={<Plus size={14} />}
                  onClick={addAnswer}
                >
                  Add answer
                </Button>
              )}
            </div>
            <div className="question-authoring-answers">
              {normalizeAnswers(values.questionType, values.answers).map(
                (answer, index) => (
                  <div
                    className={`question-authoring-answer ${answer.correct && values.questionType !== "fill_in_the_blank" ? "question-authoring-answer--correct" : ""} ${values.questionType === "fill_in_the_blank" ? "question-authoring-answer--fill" : ""}`}
                    key={`${values.questionType}-${index}`}
                  >
                    {values.questionType !== "fill_in_the_blank" && <label className="question-authoring-answer__choice">
                      <input
                        type={values.questionType === "multiple_choice" ? "checkbox" : "radio"}
                        name="correct-answer"
                        checked={answer.correct}
                        onChange={() => setCorrect(index)}
                        aria-label={`Mark answer ${index + 1} correct`}
                      />
                    </label>}
                    <div className="question-authoring-answer__content">
                      <FormField
                        value={answer.answerText}
                        disabled={values.questionType === "true_false"}
                        onChange={(event) =>
                          updateAnswer(index, event.target.value)
                        }
                        placeholder={`Answer ${index + 1}`}
                      />
                      {values.questionType !== "fill_in_the_blank" && <AnswerMediaRow
                        media={answer.answerMedia || { image: null, audio: null, video: null }}
                        disabled={(draftMode && !allowDraftMediaEdits) || submitting || values.status === "archived"}
                        onUpload={(mediaType, file) =>
                          handleAnswerMediaUpload(index, mediaType, file)
                        }
                        onRemove={(mediaType) =>
                          handleAnswerMediaRemove(index, mediaType)
                        }
                      />}
                      {answer.answerImage && !answer.answerMedia?.image ? (
                        <div className="question-authoring-answer__image">
                          <img
                            src={answerImageUrl(answer)}
                            alt={answer.answerImage.fileName || `Answer ${index + 1} image`}
                          />
                          <div>
                            <strong>{answer.answerImage.fileName || "Answer image"}</strong>
                            {answer.answerImage.uploading ? <span>Uploading...</span> : null}
                          </div>
                          <IconButton
                            icon={<X size={15} />}
                            label="Remove answer image"
                            variant="danger"
                            onClick={() => removeAnswerImage(index)}
                            disabled={submitting}
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className="question-authoring-answer__actions">
                      {values.questionType !== "true_false" && (
                        <IconButton
                          icon={<Trash2 size={15} />}
                          label="Remove answer"
                          variant="danger"
                          onClick={() => removeAnswer(index)}
                        />
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>

          <section className="question-authoring-block">
            <div className="question-authoring-block__header">
              <h2>Media</h2>
            </div>
            <Tabs
              variant="compact"
              ariaLabel="Question media type"
              value={activeMediaTab}
              onChange={setActiveMediaTab}
              items={[
                {
                  value: "image",
                  label: "Images",
                  icon: <ImageIcon size={15} />,
                  count: imageMedia.length,
                },
                {
                  value: "audio",
                  label: "Audio",
                  icon: <FileAudio size={15} />,
                  count: audioMedia.length,
                },
                {
                  value: "video",
                  label: "Video",
                  icon: <FileVideo size={15} />,
                  count: videoMedia.length,
                },
              ]}
            />
            <div className="question-authoring-media-panel">
              {activeMediaTab === "image" ? (
                <QuestionMediaManager
                  mediaType="image"
                  items={imageMedia}
                  disabled={submitting || values.status === "archived"}
                  addDisabled={draftMode && !allowDraftMediaEdits}
                  onAddFiles={(files) => addMediaFiles("image", files)}
                  onRemove={(item) => removeMedia("image", item)}
                  onMoveTo={(from, to) => moveMediaTo("image", from, to)}
                />
              ) : activeMediaTab === "audio" ? (
                <QuestionMediaManager
                  mediaType="audio"
                  items={audioMedia}
                  disabled={submitting || values.status === "archived"}
                  addDisabled={draftMode && !allowDraftMediaEdits}
                  onAddFiles={(files) => addMediaFiles("audio", files)}
                  onRemove={(item) => removeMedia("audio", item)}
                  onMoveTo={(from, to) => moveMediaTo("audio", from, to)}
                />
              ) : (
                <QuestionMediaManager
                  mediaType="video"
                  items={videoMedia}
                  disabled={submitting || values.status === "archived"}
                  addDisabled={draftMode && !allowDraftMediaEdits}
                  onAddFiles={(files) => addMediaFiles("video", files)}
                  onRemove={(item) => removeMedia("video", item)}
                  onMoveTo={(from, to) => moveMediaTo("video", from, to)}
                />
              )}
            </div>
          </section>

          <section className="question-authoring-block">
            <div className="question-authoring-block__header">
              <h2>Explanation</h2>
            </div>
            <QuestionTextRichEditor
              value={values.explanation}
              disabled={submitting}
              placeholder="Write the explanation..."
              toolbarLabel="Explanation formatting toolbar"
              onChange={(explanation) =>
                setValues((current) => ({
                  ...current,
                  explanation,
                }))
              }
            />
          </section>

          <div className="question-authoring-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {submitLabel || "Save"}
            </Button>
          </div>
        </form>
      </section>
    </>,
  );
}

/** Bọc AdminQuestionForm trong modal dùng chung cho create, edit và import draft. */
export function AdminQuestionFormModal({
  open,
  title,
  bankId,
  courseId,
  questionId,
  initialValues,
  initialMedia,
  draftMode = false,
  allowDraftMediaEdits = false,
  questionTypeOptions = QUESTION_TYPE_OPTIONS,
  showStatus = true,
  submitLabel,
  onClose,
  onSaved,
  onDraftSubmit,
}) {
  const editing = Boolean(questionId);

  return (
    <Modal
      open={open}
      title={title || (editing ? "Edit question" : "Create question")}
      size="xl"
      closeOnOverlayClick={false}
      onClose={onClose}
    >
      <AdminQuestionForm
        bankId={bankId}
        courseId={courseId}
        questionId={questionId}
        initialValues={initialValues}
        initialMedia={initialMedia}
        draftMode={draftMode}
        allowDraftMediaEdits={allowDraftMediaEdits}
        questionTypeOptions={questionTypeOptions}
        showStatus={showStatus}
        submitLabel={submitLabel}
        framed={false}
        onCancel={onClose}
        onSaved={onSaved}
        onDraftSubmit={onDraftSubmit}
      />
    </Modal>
  );
}

/** Render AdminQuestionForm dưới dạng trang độc lập. */
export function AdminQuestionFormPage() {
  return <AdminQuestionForm />;
}









