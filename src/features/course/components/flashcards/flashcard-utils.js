export function blankToNull(value) {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized.length === 0 ? null : normalized;
}

export function trimField(value) {
  if (value == null) return "";
  return String(value).trim();
}

export const FLASHCARD_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
export const FLASHCARD_IMAGE_MAX_SIZE_BYTES = 20 * 1024 * 1024;
export const FLASHCARD_IMAGE_MAX_SIZE_LABEL = "20 MB";

const FLASHCARD_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const FLASHCARD_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];

function fileExtension(fileName = "") {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex < 0 || dotIndex === fileName.length - 1) return "";
  return fileName.slice(dotIndex + 1).toLowerCase();
}

export function isFlashcardImageFile(file) {
  if (!file) return false;
  const type = String(file.type || "").toLowerCase();
  if (type) return FLASHCARD_IMAGE_TYPES.includes(type);
  return FLASHCARD_IMAGE_EXTENSIONS.includes(fileExtension(file.name || ""));
}

export function isImageLikeFile(file) {
  if (!file) return false;
  const type = String(file.type || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  return FLASHCARD_IMAGE_EXTENSIONS.includes(fileExtension(file.name || ""));
}

export function validateFlashcardImageFile(file) {
  if (!file) {
    return "Image file is required.";
  }

  if (!isFlashcardImageFile(file)) {
    return "Only JPEG, PNG, WebP, or GIF images are accepted.";
  }

  if (file.size > FLASHCARD_IMAGE_MAX_SIZE_BYTES) {
    return `Flashcard image cannot exceed ${FLASHCARD_IMAGE_MAX_SIZE_LABEL}.`;
  }

  return null;
}

export function getUploadedFileUrl(uploaded) {
  if (typeof uploaded === "string") return uploaded;
  return uploaded?.url || uploaded?.data?.url || "";
}

export function normalizeCards(cards) {
  if (!Array.isArray(cards)) return [];
  return [...cards].sort(
    (a, b) => Number(a?.orderIndex ?? 0) - Number(b?.orderIndex ?? 0),
  );
}

export function normalizeSet(payload) {
  const data = payload?.data ?? payload;
  return {
    ...data,
    cards: normalizeCards(data?.cards),
  };
}

export function isGenericGeneratedExplanation(text) {
  const normalized = trimField(text)
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!normalized) return false;

  return [
    /^generated from (pasted )?text\.?$/,
    /^generated from (uploaded )?(document|pdf|file)\.?$/,
    /^generated from (lesson )?transcript( file)?\.?$/,
    /^generated from (srt|vtt)( transcript)?\.?$/,
    /^generated from source( content| material)?\.?$/,
  ].some((pattern) => pattern.test(normalized));
}

export function toCardPayload(card) {
  return {
    frontText: trimField(card.frontText),
    frontImageUrl: trimField(card.frontImageUrl),
    backText: trimField(card.backText),
    backImageUrl: trimField(card.backImageUrl),
    hint: trimField(card.hint),
    explanation: trimField(card.explanation),
    orderIndex:
      card.orderIndex == null || Number.isNaN(Number(card.orderIndex))
        ? undefined
        : Number(card.orderIndex),
  };
}

export function validateCardDraft(card) {
  const payload = toCardPayload(card);
  const hasFront = Boolean(payload.frontText || payload.frontImageUrl);
  const hasBack = Boolean(payload.backText || payload.backImageUrl);

  if (!hasFront) {
    return "Front side requires text or image.";
  }

  if (!hasBack) {
    return "Back side requires text or image.";
  }

  return null;
}

export function getErrorMessage(error, fallbackMessage) {
  const validationDetails = error?.errors
    ?.map(({ field, message }) => `${field}: ${message}`)
    .join(", ");

  return (
    validationDetails ||
    error?.message ||
    error?.response?.data?.message ||
    fallbackMessage
  );
}
