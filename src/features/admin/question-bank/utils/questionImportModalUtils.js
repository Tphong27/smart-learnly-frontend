import { FileAudio, ImagePlus } from "lucide-react";

export const IMPORT_MODES = {
  FILE: "file",
  JSON: "json",
  IMAGE: "image",
};

export const IMAGE_IMPORT_ENABLED = false;
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_IMAGE_FILES = 5;
export const AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
];
export const MAX_AUDIO_FILES = 3;

export const IMPORT_MEDIA_CONFIG = {
  image: {
    label: "Images",
    empty: "No images attached",
    accept: "image/png,image/jpeg,image/webp",
    allowedTypes: IMAGE_TYPES,
    maxSize: 5 * 1024 * 1024,
    maxCount: MAX_IMAGE_FILES,
    maxSizeLabel: "5MB",
    typeLabel: "PNG, JPEG, or WebP",
    Icon: ImagePlus,
  },
  audio: {
    label: "Audio",
    empty: "No audio attached",
    accept: "audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav",
    allowedTypes: AUDIO_TYPES,
    maxSize: 20 * 1024 * 1024,
    maxCount: MAX_AUDIO_FILES,
    maxSizeLabel: "20MB",
    typeLabel: "MP3, M4A, or WAV",
    Icon: FileAudio,
  },
};

/** Chuyển lỗi provider image import thành thông báo dễ hiểu cho quản trị viên. */
export function getImageImportErrorMessage(error) {
  const fallback =
    "Image import is unavailable. Gemini may be misconfigured, rate-limited, or temporarily failing. Check backend logs for the provider status and response body.";
  if (error?.code !== "IMAGE_IMPORT_UNAVAILABLE") {
    return error?.message || "Could not preview image import.";
  }
  const message = typeof error?.message === "string" ? error.message.trim() : "";
  if (!message || message === "IMAGE_IMPORT_UNAVAILABLE") return fallback;
  return `Image import is unavailable. ${message}`;
}

/** Chuẩn hóa một question do provider image import trả về thành state có thể chỉnh sửa. */
export function normalizeImageQuestion(question, index) {
  const answers = Array.isArray(question?.answers) ? question.answers : [];
  return {
    clientImportId: question?.clientImportId || `tmp-${index + 1}`,
    questionNumber: question?.questionNumber || index + 1,
    questionText: question?.questionText || "",
    questionType: question?.questionType || "single_choice",
    answers: answers.map((answer, answerIndex) => ({
      answerText: answer?.answerText || "",
      correct: Boolean(answer?.correct || answer?.isCorrect),
      displayOrder: answerIndex + 1,
    })),
    difficulty: question?.difficulty || "",
    explanation: question?.explanation || "",
    warnings: Array.isArray(question?.warnings) ? question.warnings : [],
    providerErrors: Array.isArray(question?.errors) ? question.errors : [],
    imageMedia: [],
    audioMedia: [],
  };
}

/** Kiểm tra số lượng media đính kèm của một image-import question. */
export function validateImageImportMedia(question) {
  const errors = [];
  const images = Array.isArray(question.imageMedia) ? question.imageMedia : [];
  const audios = Array.isArray(question.audioMedia) ? question.audioMedia : [];
  if (images.length > MAX_IMAGE_FILES) errors.push("A question can attach at most 5 images");
  if (audios.length > MAX_AUDIO_FILES) errors.push("A question can attach at most 3 audio files");
  return errors;
}

/** Lấy tên media để hiển thị trong danh sách import. */
export function importMediaName(item) {
  return item?.fileName || item?.file?.name || "Attachment";
}

/** Định dạng kích thước file media thành B, KB hoặc MB. */
export function formatImportMediaSize(file) {
  const bytes = Number(file?.size || 0);
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** Kiểm tra question do image import tạo trước khi cho phép confirm. */
export function validateImageQuestion(question) {
  const errors = [...(question.providerErrors || [])];
  const text = question.questionText?.trim();
  const type = question.questionType;
  const answers = Array.isArray(question.answers) ? question.answers : [];
  if (!text) errors.push("Question text is required");
  if (!["single_choice", "multiple_choice", "true_false"].includes(type)) {
    errors.push("Question type must be single_choice, multiple_choice, or true_false");
  }
  if (answers.length < 2) errors.push("At least two answers are required");
  if ((type === "single_choice" || type === "multiple_choice") && answers.length > 6) {
    errors.push("Choice questions support 2 to 6 answers");
  }
  if (answers.some((answer) => !answer.answerText?.trim())) errors.push("Answer text is required");
  const correctCount = answers.filter((answer) => answer.correct).length;
  if ((type === "single_choice" || type === "true_false") && correctCount !== 1) {
    errors.push("Exactly one correct answer is required");
  }
  if (type === "multiple_choice" && correctCount < 2) {
    errors.push("Multiple choice requires at least two correct answers");
  }
  if (type === "true_false") {
    if (answers.length !== 2) errors.push("True/false must have exactly two answers");
    const normalized = answers.map((answer) => answer.answerText?.trim().toLowerCase());
    if (!normalized.includes("true") || !normalized.includes("false")) {
      errors.push("True/false answers must be True and False");
    }
  }
  const difficulty = question.difficulty === "" || question.difficulty == null
    ? null
    : Number(question.difficulty);
  if (difficulty != null && (Number.isNaN(difficulty) || difficulty < 1 || difficulty > 5)) {
    errors.push("Difficulty must be between 1 and 5");
  }
  return errors;
}

/** Tạo payload confirm cho một question image import và ánh xạ index media multipart. */
export function toImageConfirmPayload(question, imageFileIndexes = [], audioFileIndexes = []) {
  return {
    questionText: question.questionText.trim(),
    questionType: question.questionType,
    answers: question.answers.map((answer, index) => ({
      answerText: answer.answerText.trim(),
      correct: Boolean(answer.correct),
      displayOrder: index + 1,
    })),
    difficulty: question.difficulty === "" || question.difficulty == null
      ? null
      : Number(question.difficulty),
    explanation: question.explanation?.trim() || null,
    imageFileIndexes,
    audioFileIndexes,
  };
}

/** Ghép danh sách URL media thành chuỗi dùng trong row editor. */
function mediaUrlsToText(urls) {
  return (Array.isArray(urls) ? urls : [])
    .map((url) => String(url || "").trim())
    .filter(Boolean)
    .join("; ");
}

/** Tách chuỗi URL trong row editor trở lại thành mảng media URL. */
function textToMediaUrls(value) {
  return String(value || "")
    .split(";")
    .map((url) => url.trim())
    .filter(Boolean);
}

/** Chuyển import row thành state của form chỉnh sửa một dòng. */
export function getImportRowEditValues(row) {
  const data = row?.data || {};
  const options = Array.isArray(data.options) ? data.options : [];
  return {
    questionText: data.questionText || "",
    questionType: data.questionType || "single_choice",
    options: Array.from({ length: 6 }, (_, index) => options[index] || ""),
    correctAnswer: data.correctAnswer || "",
    explanation: data.explanation || "",
    difficulty: data.difficulty ?? "",
    bloomLevel: data.bloomLevel || "",
    moduleId: data.moduleId || "",
    imageFiles: mediaUrlsToText(data.imageFiles),
    audioFiles: mediaUrlsToText(data.audioFiles),
  };
}

/** Áp dụng state row editor trở lại data/raw để schema validator chạy lại. */
export function applyImportRowEdit(row, values) {
  const optionValues = values.options.map((option) => String(option || "").trim());
  const imageFiles = textToMediaUrls(values.imageFiles);
  const audioFiles = textToMediaUrls(values.audioFiles);
  return {
    ...row,
    data: {
      questionText: values.questionText.trim(),
      questionType: values.questionType,
      options: optionValues.filter(Boolean),
      correctAnswer: values.correctAnswer.trim(),
      explanation: values.explanation.trim() || null,
      difficulty: String(values.difficulty ?? "").trim(),
      bloomLevel: values.bloomLevel.trim() || null,
      moduleId: values.moduleId.trim() || null,
      imageFiles,
      audioFiles,
    },
    raw: {
      ...(row.raw || {}),
      question_text: values.questionText.trim(),
      question_type: values.questionType,
      option_a: optionValues[0] || "",
      option_b: optionValues[1] || "",
      option_c: optionValues[2] || "",
      option_d: optionValues[3] || "",
      option_e: optionValues[4] || "",
      option_f: optionValues[5] || "",
      correct_answer: values.correctAnswer.trim(),
      explanation: values.explanation.trim(),
      difficulty: String(values.difficulty ?? "").trim(),
      bloom_level: values.bloomLevel.trim(),
      module_id: values.moduleId.trim(),
      image_files: mediaUrlsToText(imageFiles),
      audio_files: mediaUrlsToText(audioFiles),
    },
  };
}
