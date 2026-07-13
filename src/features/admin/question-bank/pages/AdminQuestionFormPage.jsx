import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FileAudio, FileVideo, Image as ImageIcon, ImagePlus, Loader2, Plus, Trash2, X, AlertTriangle } from "lucide-react";
import { Button, FormField, Modal, useToast } from "@/shared/components/ui";
import { courseService, getCurrentUser, questionBankService } from "@/services";
import { isEmptyQuestionHtml, sanitizeQuestionHtml } from "@/shared/utils/htmlSanitizer";
import { QuestionMediaManager } from "../components/QuestionMediaManager";
import { QuestionTextRichEditor } from "../components/QuestionTextRichEditor";
import "../../admin-shared.css";
import "./question-bank.css";

function canWriteQuestionBank() {
  const role = getCurrentUser()?.role;
  return role === "ADMIN" || role === "SME";
}

const blankAnswer = (index = 0) => ({
  answerText: "",
  correct: index === 0,
  displayOrder: index + 1,
});

function normalizeAnswers(type, answers) {
  if (type === "true_false") {
    return [
      {
        answerText: "True",
        correct: answers?.[0]?.correct ?? true,
        displayOrder: 1,
      },
      {
        answerText: "False",
        correct: answers?.[1]?.correct ?? false,
        displayOrder: 2,
      },
    ];
  }
  return answers?.length
    ? answers
    : [blankAnswer(0), blankAnswer(1), blankAnswer(2), blankAnswer(3)];
}

function mediaId(item) {
  return item?.attachmentId || item?.id || null;
}

function normalizeQuestionMedia(question) {
  const attachments = Array.isArray(question?.mediaAttachments)
    ? question.mediaAttachments
    : [];
  const images = attachments
    .filter((item) => item.mediaType === "image")
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    .map((item) => ({
      ...item,
      localId: item.attachmentId || item.id,
      source: "remote",
    }));
  const audios = attachments
    .filter((item) => item.mediaType === "audio")
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    .map((item) => ({
      ...item,
      localId: item.attachmentId || item.id,
      source: "remote",
    }));
  const videos = attachments
    .filter((item) => item.mediaType === "video")
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    .map((item) => ({
      ...item,
      localId: item.attachmentId || item.id,
      source: "remote",
    }));
  return { images, audios, videos };
}
function normalizeModules(payload) {
  const root = payload?.data ?? payload;
  const items = Array.isArray(root)
    ? root
    : (root?.items ?? root?.content ?? root?.sections ?? []);
  return items
    .map((item, index) => ({
      id: item.sectionId || item.id,
      title: item.title || item.name || `Module ${index + 1}`,
    }))
    .filter((item) => item.id);
}

function pendingMediaItem(file, mediaType, previewUrl) {
  return {
    localId: `${mediaType}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    mediaType,
    file,
    fileName: file.name,
    previewUrl,
    source: "pending",
  };
}

const ANSWER_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ANSWER_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function answerImageUrl(answer) {
  return answer?.answerImage?.url || answer?.answerImage?.previewUrl || "";
}

function parseAnswerContent(value) {
  const rawValue = String(value || "");
  if (!/<[a-z][\s\S]*>/i.test(rawValue) || typeof DOMParser === "undefined") {
    return { answerText: rawValue, answerImage: null };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${rawValue}</div>`, "text/html");
  const wrapper = doc.body.firstElementChild;
  const image = wrapper?.querySelector('img[data-answer-image="true"], img');
  const answerImage = image?.getAttribute("src")
    ? {
        url: image.getAttribute("src"),
        fileName: image.getAttribute("alt") || "Answer image",
        source: "remote",
      }
    : null;

  if (image) image.remove();
  const answerText = (wrapper?.textContent || "").replace(/\s+/g, " ").trim();
  return { answerText, answerImage };
}

function buildAnswerContent(answer) {
  const text = answer.answerText.trim();
  const imageUrl = answerImageUrl(answer);
  if (!imageUrl) return text;

  const imageName = answer.answerImage?.fileName || "Answer image";
  const textHtml = text ? `<p>${escapeHtml(text)}</p>` : "";
  return `${textHtml}<p><img data-answer-image="true" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageName)}" /></p>`;
}

function answerHasContent(answer) {
  return Boolean(answer.answerText.trim() || answerImageUrl(answer));
}
function validate(values) {
  if (isEmptyQuestionHtml(values.questionText)) return "Question text is required.";
  if (!values.questionType) return "Question type is required.";
  const answers = normalizeAnswers(values.questionType, values.answers);
  if (answers.length < 2) return "At least two answers are required.";
  if (values.questionType === "multiple_choice" && answers.length > 6)
    return "Multiple choice supports 2 to 6 answers.";
  if (answers.some((answer) => !answerHasContent(answer)))
    return "Answer text or image must not be empty.";
  if (answers.filter((answer) => answer.correct).length !== 1)
    return "Exactly one correct answer is required.";
  if (values.questionType === "true_false") {
    const labels = answers.map((answer) =>
      answer.answerText.trim().toLowerCase(),
    );
    if (!labels.includes("true") || !labels.includes("false"))
      return "True/False answers must be True and False.";
  }
  return null;
}

export function AdminQuestionForm({
  bankId: bankIdProp,
  questionId: questionIdProp,
  onCancel,
  onSaved,
  framed = true,
}) {
  const params = useParams();
  const bankId = bankIdProp ?? params.bankId;
  const questionId = questionIdProp ?? params.questionId;
  const navigate = useNavigate();
  const toast = useToast();
  const writable = canWriteQuestionBank();
  const editing = Boolean(questionId);
  const [bank, setBank] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [values, setValues] = useState({
    questionText: "",
    questionType: "multiple_choice",
    difficulty: "",
    status: "draft",
    explanation: "",
    moduleId: "",
    answers: normalizeAnswers("multiple_choice"),
  });
  const pendingPreviewUrls = useRef(new Set());
  const [imageMedia, setImageMedia] = useState([]);
  const [audioMedia, setAudioMedia] = useState([]);
  const [videoMedia, setVideoMedia] = useState([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState([]);
  const [activeMediaTab, setActiveMediaTab] = useState("image");
  const [uploadingAnswerIndex, setUploadingAnswerIndex] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (editing) {
          const question = await questionBankService.getQuestion(questionId);
          if (cancelled) return;
          const normalizedMedia = normalizeQuestionMedia(question);
          setImageMedia(normalizedMedia.images);
          setAudioMedia(normalizedMedia.audios);
          setVideoMedia(normalizedMedia.videos || []);
          setRemovedAttachmentIds([]);
          setValues({
            questionText: question.questionText || "",
            questionType: question.questionType || "multiple_choice",
            difficulty: question.difficulty ? String(question.difficulty) : "",
            status: question.status || "draft",
            explanation: question.explanation || "",
            moduleId: question.moduleId || "",
            answers: normalizeAnswers(
              question.questionType || "multiple_choice",
              (question.answers || []).map((answer, index) => ({
                ...parseAnswerContent(answer.answerText),
                correct: Boolean(answer.correct || answer.isCorrect),
                displayOrder: answer.displayOrder ?? index + 1,
              })),
            ),
          });
          const resolvedBankId = question.bankId || question.questionBankId;
          if (resolvedBankId) {
            const bankData = await questionBankService.getBank(resolvedBankId);
            if (!cancelled) {
              setBank(bankData);
              if (bankData?.courseId) {
                const moduleData = await courseService.getCourseContent(bankData.courseId);
                if (!cancelled) setModules(normalizeModules(moduleData));
              }
            }
          }
        } else {
          const bankData = await questionBankService.getBank(bankId);
          if (!cancelled) {
            setBank(bankData);
            if (bankData?.courseId) {
              const moduleData = await courseService.getCourseContent(bankData.courseId);
              if (!cancelled) setModules(normalizeModules(moduleData));
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
  }, [bankId, editing, questionId]);

  const returnBankId = useMemo(
    () => bank?.bankId || bank?.id || bankId,
    [bank, bankId],
  );

  const renderFrame = (content) =>
    framed ? <div className="admin-page">{content}</div> : content;

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }
    navigate(`/admin/question-banks/${returnBankId}`);
  }

  function setType(nextType) {
    setValues((current) => ({
      ...current,
      questionType: nextType,
      answers: normalizeAnswers(nextType, current.answers),
    }));
  }

  function setCorrect(index) {
    setValues((current) => ({
      ...current,
      answers: current.answers.map((answer, answerIndex) => ({
        ...answer,
        correct: answerIndex === index,
      })),
    }));
  }

  function updateAnswer(index, answerText) {
    setValues((current) => ({
      ...current,
      answers: current.answers.map((answer, answerIndex) =>
        answerIndex === index ? { ...answer, answerText } : answer,
      ),
    }));
  }

  function updateAnswerImage(index, answerImage) {
    setValues((current) => ({
      ...current,
      answers: current.answers.map((answer, answerIndex) =>
        answerIndex === index ? { ...answer, answerImage } : answer,
      ),
    }));
  }

  function removeAnswerImage(index) {
    const currentImage = values.answers[index]?.answerImage;
    if (currentImage?.previewUrl) {
      URL.revokeObjectURL(currentImage.previewUrl);
      pendingPreviewUrls.current.delete(currentImage.previewUrl);
    }
    updateAnswerImage(index, null);
  }

  async function uploadAnswerImage(index, event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ANSWER_IMAGE_TYPES.includes(file.type)) {
      toast.error("Answer image must be PNG, JPEG, or WebP.");
      return;
    }
    if (file.size > ANSWER_IMAGE_MAX_SIZE) {
      toast.error("Answer image must not exceed 5MB.");
      return;
    }

    const previousImage = values.answers[index]?.answerImage;
    if (previousImage?.previewUrl) {
      URL.revokeObjectURL(previousImage.previewUrl);
      pendingPreviewUrls.current.delete(previousImage.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    pendingPreviewUrls.current.add(previewUrl);
    updateAnswerImage(index, {
      previewUrl,
      fileName: file.name,
      fileSize: file.size,
      uploading: true,
      source: "pending",
    });
    setUploadingAnswerIndex(index);

    try {
      const uploaded = await courseService.uploadLessonResource(file);
      URL.revokeObjectURL(previewUrl);
      pendingPreviewUrls.current.delete(previewUrl);
      updateAnswerImage(index, {
        url: uploaded?.url || uploaded?.fileUrl,
        objectPath: uploaded?.objectPath,
        fileName: uploaded?.fileName || file.name,
        fileSize: uploaded?.fileSize || file.size,
        contentType: uploaded?.contentType || file.type,
        source: "remote",
      });
      toast.success("Answer image uploaded");
    } catch (uploadError) {
      URL.revokeObjectURL(previewUrl);
      pendingPreviewUrls.current.delete(previewUrl);
      updateAnswerImage(index, previousImage || null);
      toast.error(uploadError?.message || "Could not upload answer image.");
    } finally {
      setUploadingAnswerIndex((current) => (current === index ? null : current));
    }
  }

  function addAnswer() {
    setValues((current) => {
      if (current.answers.length >= 6) return current;
      return {
        ...current,
        answers: [...current.answers, blankAnswer(current.answers.length)],
      };
    });
  }

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

  function mediaSetter(mediaType) {
    if (mediaType === "image") return setImageMedia;
    if (mediaType === "audio") return setAudioMedia;
    if (mediaType === "video") return setVideoMedia;
    throw new Error(`Unsupported media type: ${mediaType}`);
  }

  function addMediaFiles(mediaType, files) {
    const nextItems = files.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      pendingPreviewUrls.current.add(previewUrl);
      return pendingMediaItem(file, mediaType, previewUrl);
    });
    mediaSetter(mediaType)((current) => [...current, ...nextItems]);
  }

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

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validate(values);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (uploadingAnswerIndex !== null) {
      setError("Please wait for the answer image upload to finish.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload = {
      bankId: returnBankId,
      questionText: sanitizeQuestionHtml(values.questionText).trim(),
      questionType: values.questionType,
      difficulty: values.difficulty ? Number(values.difficulty) : null,
      status: values.status,
      explanation: values.explanation.trim() || null,
      moduleId: values.moduleId || null,
      answers: normalizeAnswers(values.questionType, values.answers).map(
        (answer, index) => ({
          answerText: buildAnswerContent(answer),
          correct: Boolean(answer.correct),
          displayOrder: index + 1,
        }),
      ),
    };
    try {
      let savedQuestion;
      if (editing) {
        savedQuestion = await questionBankService.updateQuestion(
          questionId,
          payload,
        );
      } else {
        savedQuestion = await questionBankService.createQuestion(payload);
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
          navigate(`/admin/question-banks/${returnBankId}`);
        }
        return;
      }
      toast.success(editing ? "Question updated" : "Question created");
      if (onSaved) {
        onSaved({ question: savedQuestion, bankId: returnBankId });
      } else {
        navigate(`/admin/question-banks/${returnBankId}`);
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
          <p className="admin-page__subtitle">
            Only Admin and SME users can create or edit questions.
          </p>
          <Link to="/admin/question-banks" className="button button--secondary">
            Back to Question Bank
          </Link>
        </section>
      </div>
    );
  }

  if (loading)
    return (
      <div className="admin-page">
        <div className="admin-loading">Loading question form...</div>
      </div>
    );

  const bankIsArchived = bank?.status === "archived";

  if (bankIsArchived) {
    return (
      <div className="admin-page">
        {framed && (
          <header className="admin-page__header">
            <div>
              <Link
                to={
                  returnBankId
                    ? `/admin/question-banks/${returnBankId}`
                    : "/admin/question-banks"
                }
                className="button button--ghost button--sm"
              >
                Back
              </Link>
              <h1 className="admin-page__title" style={{ marginTop: 8 }}>
                Cannot edit question
              </h1>
            </div>
          </header>
        )}
        <section
          className="admin-card"
          style={{
            borderLeft: "4px solid #f59e0b",
            background: "#fffbeb",
          }}
          role="alert"
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <AlertTriangle size={20} style={{ color: "#b45309", flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ color: "#92400e" }}>
                The question bank "{bank?.name || ""}" is archived.
              </strong>
              <p style={{ margin: "4px 0 8px", color: "#78350f", fontSize: 14 }}>
                Restore the bank before editing any of its questions.
              </p>
              <Link
                to={
                  returnBankId
                    ? `/admin/question-banks/${returnBankId}`
                    : "/admin/question-banks"
                }
                className="button button--secondary button--sm"
              >
                Back to question bank
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return renderFrame(
    <>
      {framed && (
        <header className="admin-page__header">
        <div>
          <Link
            to={
              returnBankId
                ? `/admin/question-banks/${returnBankId}`
                : "/admin/question-banks"
            }
            className="button button--ghost button--sm"
          >
            Back
          </Link>
          <h1 className="admin-page__title" style={{ marginTop: 8 }}>
            {editing ? "Edit question" : "Create question"}
          </h1>
          <p className="admin-page__subtitle">
            {bank?.name || "Question Bank"} - supports multiple choice and
            true/false.
          </p>
        </div>
        </header>
      )}

      <section className={framed ? "admin-card" : "question-authoring-modal-body"}>
        {error && (
          <div className="auth-card__alert" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}
        <form className="question-authoring-form" onSubmit={handleSubmit}>
          <section className="question-authoring-block question-authoring-block--metadata">
            <div className="question-authoring-block__header">
              <h2>Settings</h2>
            </div>
            <div className="question-authoring-meta-grid">
              <div className="input-field">
                <label className="input-field__label" htmlFor="question-module">
                  Module
                </label>
                <select
                  id="question-module"
                  className="admin-toolbar__select"
                  value={values.moduleId}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      moduleId: event.target.value,
                    }))
                  }
                >
                  <option value="">No module</option>
                  {modules.map((module) => (
                    <option key={module.id} value={module.id}>
                      {module.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-field">
                <label className="input-field__label" htmlFor="question-type">
                  Question type
                </label>
                <select
                  id="question-type"
                  className="admin-toolbar__select"
                  value={values.questionType}
                  onChange={(event) => setType(event.target.value)}
                >
                  <option value="multiple_choice">Multiple choice</option>
                  <option value="true_false">True/False</option>
                </select>
              </div>
              <div className="input-field">
                <label
                  className="input-field__label"
                  htmlFor="question-difficulty"
                >
                  Difficulty
                </label>
                <select
                  id="question-difficulty"
                  className="admin-toolbar__select"
                  value={values.difficulty}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      difficulty: event.target.value,
                    }))
                  }
                >
                  <option value="">Not set</option>
                  <option value="1">1 - Easy</option>
                  <option value="2">2</option>
                  <option value="3">3 - Medium</option>
                  <option value="4">4</option>
                  <option value="5">5 - Hard</option>
                </select>
              </div>
              <div className="input-field">
                <label className="input-field__label" htmlFor="question-status">
                  Status
                </label>
                <select
                  id="question-status"
                  className="admin-toolbar__select"
                  value={values.status}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
            </div>
          </section>
          <section className="question-authoring-block">
            <div className="question-authoring-block__header">
              <h2>Question text</h2>
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
              <h2>Answers</h2>
              {values.questionType === "multiple_choice" && (
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
                    className={`question-authoring-answer ${answer.correct ? "question-authoring-answer--correct" : ""}`}
                    key={`${values.questionType}-${index}`}
                  >
                    <label className="question-authoring-answer__choice">
                      <input
                        type="radio"
                        name="correct-answer"
                        checked={answer.correct}
                        onChange={() => setCorrect(index)}
                        aria-label={`Mark answer ${index + 1} correct`}
                      />
                    </label>
                    <div className="question-authoring-answer__content">
                      <FormField
                        value={answer.answerText}
                        disabled={values.questionType === "true_false"}
                        onChange={(event) =>
                          updateAnswer(index, event.target.value)
                        }
                        placeholder={`Answer ${index + 1}`}
                      />
                      {answer.answerImage ? (
                        <div className="question-authoring-answer__image">
                          <img
                            src={answerImageUrl(answer)}
                            alt={answer.answerImage.fileName || `Answer ${index + 1} image`}
                          />
                          <div>
                            <strong>{answer.answerImage.fileName || "Answer image"}</strong>
                            {answer.answerImage.uploading ? <span>Uploading...</span> : null}
                          </div>
                          <button
                            type="button"
                            className="admin-table__icon-btn admin-table__icon-btn--danger"
                            onClick={() => removeAnswerImage(index)}
                            disabled={submitting || uploadingAnswerIndex === index}
                            aria-label="Remove answer image"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <div className="question-authoring-answer__actions">
                      <label
                        className={`admin-table__icon-btn question-authoring-answer__upload ${submitting || uploadingAnswerIndex === index ? "is-disabled" : ""}`}
                        title="Upload answer image"
                        aria-label="Upload answer image"
                      >
                        {uploadingAnswerIndex === index ? <Loader2 size={15} /> : <ImagePlus size={15} />}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          hidden
                          disabled={submitting || uploadingAnswerIndex === index}
                          onChange={(event) => uploadAnswerImage(index, event)}
                        />
                      </label>
                      {values.questionType === "multiple_choice" && (
                        <button
                          type="button"
                          className="admin-table__icon-btn admin-table__icon-btn--danger"
                          onClick={() => removeAnswer(index)}
                          aria-label="Remove answer"
                        >
                          <Trash2 size={15} />
                        </button>
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
            <div className="question-authoring-media-tabs" role="tablist" aria-label="Question media type">
              <button
                type="button"
                className={`question-authoring-media-tab ${activeMediaTab === "image" ? "is-active" : ""}`}
                role="tab"
                aria-selected={activeMediaTab === "image"}
                onClick={() => setActiveMediaTab("image")}
              >
                <ImageIcon size={15} /> Images <span>{imageMedia.length}</span>
              </button>
              <button
                type="button"
                className={`question-authoring-media-tab ${activeMediaTab === "audio" ? "is-active" : ""}`}
                role="tab"
                aria-selected={activeMediaTab === "audio"}
                onClick={() => setActiveMediaTab("audio")}
              >
                <FileAudio size={15} /> Audio <span>{audioMedia.length}</span>
              </button>
              <button
                type="button"
                className={`question-authoring-media-tab ${activeMediaTab === "video" ? "is-active" : ""}`}
                role="tab"
                aria-selected={activeMediaTab === "video"}
                onClick={() => setActiveMediaTab("video")}
              >
                <FileVideo size={15} /> Video <span>{videoMedia.length}</span>
              </button>
            </div>
            <div className="question-authoring-media-panel">
              {activeMediaTab === "image" ? (
                <QuestionMediaManager
                  mediaType="image"
                  items={imageMedia}
                  disabled={submitting || values.status === "archived"}
                  onAddFiles={(files) => addMediaFiles("image", files)}
                  onRemove={(item) => removeMedia("image", item)}
                  onMoveTo={(from, to) => moveMediaTo("image", from, to)}
                />
              ) : activeMediaTab === "audio" ? (
                <QuestionMediaManager
                  mediaType="audio"
                  items={audioMedia}
                  disabled={submitting || values.status === "archived"}
                  onAddFiles={(files) => addMediaFiles("audio", files)}
                  onRemove={(item) => removeMedia("audio", item)}
                  onMoveTo={(from, to) => moveMediaTo("audio", from, to)}
                />
              ) : (
                <QuestionMediaManager
                  mediaType="video"
                  items={videoMedia}
                  disabled={submitting || values.status === "archived"}
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
            <textarea
              id="question-explanation"
              className="admin-textarea"
              rows={4}
              value={values.explanation}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  explanation: event.target.value,
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
              {editing ? "Update question" : "Create question"}
            </Button>
          </div>
        </form>
      </section>
    </>,
  );
}

export function AdminQuestionFormModal({
  open,
  bankId,
  questionId,
  onClose,
  onSaved,
}) {
  const editing = Boolean(questionId);

  return (
    <Modal
      open={open}
      title={editing ? "Edit question" : "Create question"}
      size="xl"
      closeOnOverlayClick={false}
      onClose={onClose}
    >
      <AdminQuestionForm
        bankId={bankId}
        questionId={questionId}
        framed={false}
        onCancel={onClose}
        onSaved={onSaved}
      />
    </Modal>
  );
}

export function AdminQuestionFormPage() {
  return <AdminQuestionForm />;
}









