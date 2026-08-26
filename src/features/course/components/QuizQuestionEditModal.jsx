import { AdminQuestionFormModal } from "@/features/admin/question-bank/pages/AdminQuestionFormPage";
import { courseContentService } from "../services/courseContentService";
import {
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  getOptionMedia,
  getOptionText,
  normalizeMedia,
  validateQuizQuestions,
} from "../utils/quiz-question-schema";

const QUIZ_QUESTION_TYPE_OPTIONS = [
  QUESTION_TYPES.SINGLE,
  QUESTION_TYPES.MULTIPLE,
  QUESTION_TYPES.FILL,
].map((value) => ({ value, label: QUESTION_TYPE_LABELS[value] }));

/** Chuyển media của quiz thành item remote mà form authoring dùng chung có thể hiển thị. */
function toFormMediaItem(media, fallbackType = "image") {
  const normalized = normalizeMedia(media);
  if (!normalized) return null;
  const mediaType = normalized.type || fallbackType;
  return {
    localId: normalized.objectPath || normalized.url || `${mediaType}-remote`,
    mediaType,
    fileName: normalized.fileName,
    contentType: normalized.contentType,
    fileSize: normalized.size,
    size: normalized.size,
    objectPath: normalized.objectPath,
    mediaUrl: normalized.url,
    url: normalized.url,
    source: "remote",
  };
}

/** Đặt một media quiz vào đúng nhóm image, audio hoặc video của form dùng chung. */
function toQuestionMediaState(media) {
  const item = toFormMediaItem(media);
  const state = { images: [], audios: [], videos: [] };
  if (!item) return state;
  if (item.mediaType === "audio") state.audios.push(item);
  else if (item.mediaType === "video") state.videos.push(item);
  else state.images.push(item);
  return state;
}

/** Chuyển media duy nhất của một option quiz thành answerMedia của form chuẩn. */
function toAnswerMediaState(media) {
  const item = toFormMediaItem(media);
  const state = { image: null, audio: null, video: null };
  if (item && Object.hasOwn(state, item.mediaType)) state[item.mediaType] = item;
  return state;
}

/** Chuyển question quiz sang initialValues của AdminQuestionFormModal. */
function toQuestionFormState(question) {
  const type = question?.type || QUESTION_TYPES.SINGLE;
  const correctAnswers = Array.isArray(question?.correct_answers)
    ? question.correct_answers
    : [];
  const answers = type === QUESTION_TYPES.FILL
    ? correctAnswers.map((answer, index) => ({
        answerText: String(answer ?? ""),
        correct: false,
        displayOrder: index + 1,
      }))
    : (question?.options || []).map((option, index) => ({
        answerText: getOptionText(option),
        correct: correctAnswers.includes(index + 1),
        displayOrder: index + 1,
        answerMedia: toAnswerMediaState(getOptionMedia(option)),
      }));

  return {
    values: {
      questionText: question?.title || "",
      questionType: type,
      status: "approved",
      explanation: question?.explain_question || "",
      answers,
    },
    media: toQuestionMediaState(question?.media),
  };
}

/** Upload file mới hoặc giữ nguyên media remote rồi trả về quiz media schema. */
async function resolveQuizMedia(item) {
  if (!item) return null;
  if (item.source === "pending" && item.file) {
    const uploaded = await courseContentService.uploadLessonResource(item.file);
    return normalizeMedia({
      type: item.mediaType,
      url: uploaded?.url,
      objectPath: uploaded?.objectPath,
      fileName: uploaded?.fileName || item.file.name,
      contentType: uploaded?.contentType || item.file.type,
      size: uploaded?.fileSize ?? uploaded?.size ?? item.file.size,
    });
  }
  return normalizeMedia({
    type: item.mediaType,
    url: item.url || item.mediaUrl,
    objectPath: item.objectPath,
    fileName: item.fileName,
    contentType: item.contentType,
    size: item.fileSize ?? item.size,
  });
}

/** Lấy tối đa một media vì quiz schema chỉ lưu một attachment tại mỗi vị trí. */
async function resolveSingleMedia(items, locationLabel) {
  const selectedItems = items.filter(Boolean);
  if (selectedItems.length > 1) {
    throw new Error(`${locationLabel} supports only one media attachment.`);
  }
  return resolveQuizMedia(selectedItems[0]);
}

/** Chuyển kết quả form dùng chung về quiz schema và kiểm tra trước khi lưu lesson. */
async function toQuizQuestion(formState) {
  const { values, media } = formState;
  const questionMedia = await resolveSingleMedia(
    [...media.images, ...media.audios, ...media.videos],
    "Question",
  );
  const base = {
    title: values.questionText.trim(),
    media: questionMedia,
    explain_question: values.explanation.trim(),
    type: values.questionType,
  };

  let candidate;
  if (values.questionType === QUESTION_TYPES.FILL) {
    candidate = {
      ...base,
      correct_answers: values.answers
        .map((answer) => answer.answerText.trim())
        .filter(Boolean),
    };
  } else {
    const options = [];
    const correctAnswers = [];
    for (const [index, answer] of values.answers.entries()) {
      const answerMedia = answer.answerMedia || {};
      const optionMedia = await resolveSingleMedia(
        [answerMedia.image, answerMedia.audio, answerMedia.video],
        `Answer ${index + 1}`,
      );
      const answerText = answer.answerText.trim();
      options.push(optionMedia ? { text: answerText, media: optionMedia } : answerText);
      if (answer.correct) correctAnswers.push(index + 1);
    }
    candidate = {
      ...base,
      number_of_options: options.length,
      options,
      correct_answers: correctAnswers,
    };
  }

  const validation = validateQuizQuestions([candidate]);
  if (!validation.valid) {
    throw new Error(validation.errors.map((item) => item.message).join(" "));
  }
  return candidate;
}

/** Tái sử dụng form Edit question chuẩn để sửa question nằm trong quiz lesson. */
export function QuizQuestionEditModal({ open, question, onClose, onSubmit }) {
  const initialState = toQuestionFormState(question);

  /** Lưu dữ liệu form chuẩn về đúng quiz schema rồi đóng modal khi thành công. */
  async function handleSubmit(formState) {
    const candidate = await toQuizQuestion(formState);
    const saved = await onSubmit(candidate);
    if (!saved) throw new Error("Question could not be saved. Please try again.");
    onClose();
  }

  return (
    <AdminQuestionFormModal
      open={open}
      title="Edit question"
      initialValues={initialState.values}
      initialMedia={initialState.media}
      draftMode
      allowDraftMediaEdits
      questionTypeOptions={QUIZ_QUESTION_TYPE_OPTIONS}
      submitLabel="Save question"
      onClose={onClose}
      onDraftSubmit={handleSubmit}
    />
  );
}
