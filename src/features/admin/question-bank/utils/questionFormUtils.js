import { getCurrentUser } from "@/services/api-client";
import { isEmptyQuestionHtml } from "@/shared/utils/htmlSanitizer";

export const QUESTION_TYPE_OPTIONS = [
  { value: "single_choice", label: "Single choice" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "true_false", label: "True/False" },
];

/** Tao nhan hien thi thong nhat cho cac loai cau hoi trong Question Bank. */
export function questionTypeLabel(type) {
  if (type === "single_choice") return "Single choice";
  if (type === "true_false") return "True/False";
  return "Multiple choice";
}

/** Cho biết người dùng hiện tại có quyền tạo hoặc sửa question bank hay không. */
export function canWriteQuestionBank() {
  const role = getCurrentUser()?.role;
  return role === "ADMIN" || role === "SME";
}

/** Tạo một answer rỗng với thứ tự và trạng thái đúng mặc định. */
export function blankAnswer(index = 0) {
  return {
    answerText: "",
    correct: index === 0,
    displayOrder: index + 1,
    answerMedia: { image: null, audio: null, video: null },
  };
}

/** Chuẩn hóa danh sách answer theo loại câu hỏi đang chọn. */
export function normalizeAnswers(type, answers) {
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

/** Lấy attachment ID ổn định từ response cũ hoặc mới. */
export function mediaId(item) {
  return item?.attachmentId || item?.id || null;
}

/** Chia media của question thành ba nhóm ảnh, âm thanh và video. */
export function normalizeQuestionMedia(question) {
  const attachments = Array.isArray(question?.mediaAttachments)
    ? question.mediaAttachments
    : [];
  const byType = (mediaType) =>
    attachments
      .filter((item) => item.mediaType === mediaType)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map((item) => ({
        ...item,
        localId: item.attachmentId || item.id,
        source: "remote",
      }));
  return {
    images: byType("image"),
    audios: byType("audio"),
    videos: byType("video"),
  };
}

/** Chuẩn hóa nhiều dạng response curriculum thành danh sách module dùng cho select. */
export function normalizeModules(payload) {
  const root = payload?.data ?? payload;
  const items = Array.isArray(root)
    ? root
    : (root?.items ?? root?.content ?? root?.sections ?? []);
  return items
    .map((item, index) => ({
      id: item.moduleId || item.sectionId || item.id,
      title: item.title || item.name || `Module ${index + 1}`,
    }))
    .filter((item) => item.id);
}

/** Tạo media item tạm thời cho file chưa upload. */
export function pendingMediaItem(file, mediaType, previewUrl) {
  return {
    localId: `${mediaType}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    mediaType,
    file,
    fileName: file.name,
    previewUrl,
    source: "pending",
  };
}

/** Escape text trước khi ghép vào HTML answer. */
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Lấy URL ảnh được gắn trực tiếp vào answer. */
export function answerImageUrl(answer) {
  return answer?.answerImage?.url || answer?.answerImage?.previewUrl || "";
}

/** Tách text và ảnh cũ đang được lưu chung trong HTML answer. */
export function parseAnswerContent(value) {
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

/** Ghép text và ảnh answer thành payload HTML giữ nguyên contract backend. */
export function buildAnswerContent(answer) {
  const text = answer.answerText.trim();
  const imageUrl = answerImageUrl(answer);
  if (!imageUrl) return text;
  const imageName = answer.answerImage?.fileName || "Answer image";
  const textHtml = text ? `<p>${escapeHtml(text)}</p>` : "";
  return `${textHtml}<p><img data-answer-image="true" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageName)}" /></p>`;
}

/** Kiểm tra answer có text, ảnh hoặc media đính kèm. */
export function answerHasContent(answer) {
  if (answer.answerText && answer.answerText.trim()) return true;
  if (answerImageUrl(answer)) return true;
  const media = answer.answerMedia || {};
  return Boolean(media.image || media.audio || media.video);
}

/** Chuyển answer media từ response backend thành state của form. */
export function normalizeAnswerMediaFromResponse(answer) {
  const next = { image: null, audio: null, video: null };
  if (!answer || !Array.isArray(answer.media)) return next;
  for (const item of answer.media) {
    const type = item.mediaType;
    if (type === "image" || type === "audio" || type === "video") {
      next[type] = {
        attachmentId: item.attachmentId || item.id,
        mediaUrl: item.mediaUrl,
        url: item.mediaUrl,
        objectPath: item.objectKey,
        fileName: item.fileName,
        fileSize: item.size,
        contentType: item.contentType,
        source: "remote",
      };
    }
  }
  return next;
}

/** Kiểm tra toàn bộ dữ liệu form trước khi gọi API lưu question. */
export function validateQuestionForm(values) {
  if (isEmptyQuestionHtml(values.questionText)) return "Question text is required.";
  if (!values.questionType) return "Question type is required.";
  const answers = normalizeAnswers(values.questionType, values.answers);
  if (answers.length < 2) return "At least two answers are required.";
  if (
    (values.questionType === "single_choice" ||
      values.questionType === "multiple_choice") &&
    answers.length > 6
  ) {
    return "Choice questions support 2 to 6 answers.";
  }
  if (answers.some((answer) => !answerHasContent(answer))) {
    return "Answer text or image must not be empty.";
  }
  const correctCount = answers.filter((answer) => answer.correct).length;
  if (
    (values.questionType === "single_choice" ||
      values.questionType === "true_false") &&
    correctCount !== 1
  ) {
    return "Exactly one correct answer is required.";
  }
  if (values.questionType === "multiple_choice" && correctCount < 2) {
    return "Multiple choice requires at least two correct answers.";
  }
  if (values.questionType === "true_false") {
    const labels = answers.map((answer) => answer.answerText.trim().toLowerCase());
    if (!labels.includes("true") || !labels.includes("false")) {
      return "True/False answers must be True and False.";
    }
  }
  return null;
}
