export const LANGUAGES = [
  { value: "auto", label: "Auto-detect" },
  { value: "vi", label: "Vietnamese" },
  { value: "en", label: "English" },
];
export const DEFAULT_GENERATION = {
  desiredCount: 10,
  language: "auto",
};

export const STATUS_PRIORITY = {
  draft: 0,
  approved: 1,
  rejected: 2,
};
export const SOURCE_QUESTION_PAGE_SIZE = 10;
export const STAGING_REVIEW_PAGE_SIZE = 50;
export const DOCUMENT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_MAX_FILE_SIZE_MESSAGE = "Uploaded file must not exceed 10 MB";
export const FRONT_BACK_SEPARATOR_OPTIONS = [
  { value: "tab", label: "Tab" },
  { value: "comma", label: "Comma" },
  { value: "custom", label: "Custom" },
];
export const CARD_SEPARATOR_OPTIONS = [
  { value: "newline", label: "New line" },
  { value: "semicolon", label: "Semicolon" },
  { value: "custom", label: "Custom" },
];
export const DEFAULT_PASTED_IMPORT = {
  text: "",
  frontBackSeparator: "tab",
  customFrontBackSeparator: "",
  cardSeparator: "newline",
  customCardSeparator: "",
};
export const DEFAULT_SOURCE_FILTERS = {
  keyword: "",
  moduleId: "",
};
export const TEMP_CANDIDATE_EDITOR_FORM_ID = "flashcard-temp-candidate-editor-form";
export const TEMP_CANDIDATE_PREVIEW_CARD_ID = "flashcard-temp-candidate-preview";

/** Lấy data thật từ response có hoặc không có lớp ApiResponse. */
export function normalizeResponse(payload) {
  return payload?.data ?? payload;
}

/** Giữ thứ tự selection, loại ID trùng và ID không còn hợp lệ. */
export function orderedUniqueSelectedIds(selectedIds, allowedIds) {
  const seen = new Set();
  const uniqueIds = [];
  selectedIds.forEach((id) => {
    if (!allowedIds.has(id) || seen.has(id)) return;
    seen.add(id);
    uniqueIds.push(id);
  });
  return uniqueIds;
}

/** Chuyển enum/string kỹ thuật thành nhãn dễ đọc. */
export function formatLabel(value, fallback = "Unknown") {
  if (!value) return fallback;
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Tạo nhãn hiển thị riêng cho loại nguồn staging. */
export function formatSourceTypeLabel(value, fallback = "Staging Batch") {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "COURSE_QUESTIONS") return "Course Questions";
  if (normalized === "QUESTION_BANK") return "Question Bank (Historical)";
  return formatLabel(value, fallback);
}

/** Lấy module ID từ các alias response đang được backend hỗ trợ. */
export function getModuleId(question) {
  return question?.moduleId || question?.courseModuleId || question?.module?.id;
}

/** Lấy title module và dùng fallback khi thiếu tên. */
export function getModuleTitle(module) {
  return module?.title || module?.name || module?.moduleTitle || "Untitled module";
}

/** Chuẩn hóa response curriculum thành danh sách module cho filter. */
export function normalizeModules(payload) {
  const data = normalizeResponse(payload);
  const modules = Array.isArray(data?.modules)
    ? data.modules
    : Array.isArray(data)
      ? data
      : [];
  return modules
    .map((module) => ({
      ...module,
      id: module?.id || module?.moduleId,
      title: getModuleTitle(module),
    }))
    .filter((module) => module.id);
}

/** Chuẩn hóa status về chữ thường để so sánh nhất quán. */
export function normalizeStatus(status) {
  return String(status || "draft").toLowerCase();
}

/** Lấy question ID từ response source question cũ hoặc mới. */
export function getQuestionId(question) {
  return question?.questionId || question?.id;
}

/** Kiểm tra source question đã approved và được phép import hay chưa. */
export function isApprovedSourceQuestion(question) {
  return normalizeStatus(question?.status) === "approved";
}

/** Ghép các đáp án đúng thành chuỗi dùng trong preview. */
export function correctAnswersLabel(question) {
  const answers = Array.isArray(question?.correctAnswers)
    ? question.correctAnswers
    : (question?.answers || [])
        .filter((answer) => answer.correct || answer.isCorrect)
        .map((answer) => answer.answerText);
  return answers.filter(Boolean).join(", ") || "--";
}

/** Ghép toàn bộ lựa chọn thành chuỗi tóm tắt của source question. */
export function answersLabel(question) {
  const answers = Array.isArray(question?.answers) ? question.answers : [];
  if (!answers.length) return correctAnswersLabel(question);
  return (
    answers
      .map((answer, index) => {
        const label = answer.answerText || answer.text || `Answer ${index + 1}`;
        const correct = answer.correct || answer.isCorrect;
        return correct ? `${label} (correct)` : label;
      })
      .filter(Boolean)
      .join("; ") || "--"
  );
}

/** Lấy danh sách card từ các alias payload batch hiện hành. */
export function getBatchCards(batch) {
  return Array.isArray(batch?.cards)
    ? [...batch.cards].sort(
        (left, right) =>
          (STATUS_PRIORITY[normalizeStatus(left?.status)] ?? 99) -
            (STATUS_PRIORITY[normalizeStatus(right?.status)] ?? 99) ||
          Number(left?.sortOrder ?? 0) - Number(right?.sortOrder ?? 0),
      )
    : [];
}

/** Chỉ giữ card draft đang chờ human review. */
export function getPendingBatchCards(batch) {
  return getBatchCards(batch).filter(isDraftCard);
}

/** Đếm tổng số staging card draft trong nhiều batch. */
export function draftCardCount(batches) {
  return batches.reduce(
    (count, batch) =>
      count +
      getBatchCards(batch).filter((card) => normalizeStatus(card.status) === "draft").length,
    0,
  );
}

/** Bỏ qua click selection phát sinh từ control tương tác bên trong card. */
export function shouldIgnoreSelectionClick(event) {
  return Boolean(
    event.target.closest(
      "button,a,input,textarea,select,label,[role='button']",
    ),
  );
}

/** Bỏ qua click mở card khi người dùng đang thao tác với link/button/input. */
export function shouldIgnoreStagingContentClick(event) {
  return Boolean(
    event.target.closest(
      "button,a,input,textarea,select,label,[contenteditable='true']",
    ),
  );
}

/** Xác định ký tự phân tách mặt trước và sau theo lựa chọn import. */
export function resolveFrontBackSeparator(values) {
  if (values.frontBackSeparator === "tab") return "\t";
  if (values.frontBackSeparator === "comma") return ",";
  return values.customFrontBackSeparator;
}

/** Xác định ký tự phân tách giữa các card theo lựa chọn import. */
export function resolveCardSeparator(values) {
  if (values.cardSeparator === "newline") return "\n";
  if (values.cardSeparator === "semicolon") return ";";
  return values.customCardSeparator;
}

/** Tách pasted text thành các dòng/card và bỏ phần rỗng. */
export function splitPastedCards(text, separator) {
  if (separator === "\n") {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n");
  }
  return String(text || "").split(separator);
}

/** Chuẩn hóa HTML/text trước khi tạo khóa phát hiện duplicate. */
export function normalizeTextForDuplicate(value) {
  const raw = String(value || "");
  let decoded = raw;
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = raw;
    decoded = textarea.value;

    const container = document.createElement("div");
    container.innerHTML = decoded;
    decoded = container.textContent || container.innerText || decoded;
  }

  return decoded
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Tạo signature từ hai mặt flashcard để so sánh duplicate. */
export function normalizeFlashcardSignature(frontText, backText) {
  return `${normalizeTextForDuplicate(frontText)}\n${normalizeTextForDuplicate(backText)}`;
}

/** Tạo signature trực tiếp từ một card object. */
export function getFlashcardSignature(card) {
  const signature = normalizeFlashcardSignature(
    card?.frontText,
    card?.backText,
  );
  return signature.trim() ? signature : "";
}

/** Đánh dấu card trùng current cards hoặc trùng ứng viên trong staging. */
export function buildDuplicateInfoByCardId(batches, existingCards = []) {
  const existingSignatures = new Set(
    existingCards.map(getFlashcardSignature).filter(Boolean),
  );
  const duplicateInfoByCardId = {};

  (Array.isArray(batches) ? batches : []).forEach((batch) => {
    const cards = getBatchCards(batch);
    const batchSignatureCounts = new Map();

    cards
      .filter((card) => normalizeStatus(card.status) !== "rejected")
      .forEach((card) => {
        const signature = getFlashcardSignature(card);
        if (!signature) return;
        batchSignatureCounts.set(
          signature,
          (batchSignatureCounts.get(signature) || 0) + 1,
        );
      });

    cards.filter(isDraftCard).forEach((card) => {
      const signature = getFlashcardSignature(card);
      if (!signature) return;

      const reasons = [];
      if (existingSignatures.has(signature)) {
        reasons.push("Matches Current Flashcards");
      }
      if ((batchSignatureCounts.get(signature) || 0) > 1) {
        reasons.push("Duplicate in this batch");
      }
      if (reasons.length > 0) {
        duplicateInfoByCardId[card.id] = reasons;
      }
    });
  });

  return duplicateInfoByCardId;
}

/** Lấy danh sách lý do duplicate của một card. */
export function getDuplicateReasons(duplicateInfoByCardId, cardId) {
  return duplicateInfoByCardId?.[cardId] || [];
}

/** Kiểm tra card còn ở trạng thái draft. */
export function isDraftCard(card) {
  return normalizeStatus(card?.status) === "draft";
}

/** Parse pasted text thành preview rows và báo lỗi cấu hình/dữ liệu. */
export function parsePastedFlashcards(values) {
  const sourceText = String(values.text || "");
  const frontBackSeparator = resolveFrontBackSeparator(values);
  const cardSeparator = resolveCardSeparator(values);

  if (!sourceText.trim()) {
    return { cards: [], invalidRows: [], configError: null };
  }
  if (!frontBackSeparator) {
    return {
      cards: [],
      invalidRows: [],
      configError: "Enter a custom separator between front and back.",
    };
  }
  if (!cardSeparator) {
    return {
      cards: [],
      invalidRows: [],
      configError: "Enter a custom separator between cards.",
    };
  }
  if (frontBackSeparator === cardSeparator) {
    return {
      cards: [],
      invalidRows: [],
      configError: "Use different separators for card sides and cards.",
    };
  }

  const cards = [];
  const invalidRows = [];
  splitPastedCards(sourceText, cardSeparator).forEach((chunk, index) => {
    const rawText = String(chunk || "").trim();
    if (!rawText) return;

    const separatorIndex = rawText.indexOf(frontBackSeparator);
    if (separatorIndex < 0) {
      invalidRows.push({
        rowNumber: index + 1,
        text: rawText,
        reason: "Missing front/back separator.",
      });
      return;
    }

    const frontText = rawText.slice(0, separatorIndex).trim();
    const backText = rawText
      .slice(separatorIndex + frontBackSeparator.length)
      .trim();
    if (!frontText || !backText) {
      invalidRows.push({
        rowNumber: index + 1,
        text: rawText,
        reason: !frontText ? "Front text is blank." : "Back text is blank.",
      });
      return;
    }

    cards.push({
      clientId: `${index + 1}-${frontText}-${backText}`,
      rowNumber: index + 1,
      frontText,
      backText,
    });
  });

  return { cards, invalidRows, configError: null };
}

/** Tạo payload generation giữ nguyên contract desiredCount/language. */
export function getGenerationPayload(values) {
  return {
    desiredCount: Number(values.desiredCount || DEFAULT_GENERATION.desiredCount),
    language: values.language || DEFAULT_GENERATION.language,
  };
}

/** Kiểm tra số lượng và ngôn ngữ trước khi gọi generation API. */
export function validateGenerationSettings(values) {
  const desiredCount = Number(values.desiredCount);
  if (!Number.isInteger(desiredCount) || desiredCount < 1 || desiredCount > 30) {
    return "Target cards must be between 1 and 30.";
  }
  return null;
}

/** Lấy số card đã tạo từ các alias response hiện hành. */
export function getGeneratedCount(response) {
  if (Array.isArray(response?.cards)) return response.cards.length;
  if (Number.isFinite(Number(response?.generatedCount))) {
    return Number(response.generatedCount);
  }
  if (Number.isFinite(Number(response?.count))) return Number(response.count);
  return 0;
}

/** Tạo notice khi provider sinh ít card hơn số lượng yêu cầu. */
export function getShortfallNotice(requestedCount, createdCount) {
  const requested = Number(requestedCount);
  const created = Number(createdCount);
  if (!Number.isFinite(requested) || !Number.isFinite(created)) return null;
  if (requested <= created) return null;
  return `Created ${created} of ${requested} requested cards because the document did not contain enough supported content.`;
}

/** Tạo thông báo thành công sau khi generation hoàn tất. */
export function formatGeneratedMessage(response, sourceLabel = "") {
  const generatedCount = getGeneratedCount(response);
  const suffix = sourceLabel ? ` ${sourceLabel}` : "";
  const cardLabel = generatedCount === 1 ? "card" : "cards";
  return `Prepared ${generatedCount} review ${cardLabel}${suffix}.`;
}

/** Kiểm tra một giá trị có đúng định dạng UUID backend hay không. */
export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

/** Tạo payload approve cho temporary card và chỉ gửi ID khi đó là UUID thật từ backend. */
export function toTemporaryApprovalPayload(card, index) {
  return {
    ...(isUuid(card.id) ? { id: card.id } : {}),
    sourceQuestionId: card.sourceQuestionId || undefined,
    ...toCardPayload({ ...card, orderIndex: index }),
    sourceExcerpt: String(card.sourceExcerpt || "").trim() || undefined,
  };
}
import { toCardPayload } from "./flashcard-utils";
