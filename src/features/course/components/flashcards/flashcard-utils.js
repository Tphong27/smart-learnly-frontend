import { trimField } from "../../../flashcards-shared/utils/flashcard-utils";

export {
  blankToNull,
  FLASHCARD_IMAGE_ACCEPT,
  FLASHCARD_IMAGE_MAX_SIZE_BYTES,
  FLASHCARD_IMAGE_MAX_SIZE_LABEL,
  getErrorMessage,
  getUploadedFileUrl,
  isFlashcardImageFile,
  isGenericGeneratedExplanation,
  isImageLikeFile,
  normalizeCards,
  normalizeSet,
  trimField,
  validateFlashcardImageFile,
} from "../../../flashcards-shared/utils/flashcard-utils";

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
  return validateCurrentCardDraft(card);
}

export function validateCurrentCardDraft(card) {
  const payload = toCardPayload(card);
  const hasFront = Boolean(payload.frontText || payload.frontImageUrl);
  const hasBack = Boolean(payload.backText || payload.backImageUrl);

  if (!hasFront && !hasBack) {
    return "At least one side needs text or an image. Changes not saved.";
  }

  return null;
}

export function validateStagingCardDraft(card) {
  const payload = toCardPayload(card);
  if (!payload.frontText) {
    return "Staging flashcards require front text.";
  }
  if (!payload.backText) {
    return "Staging flashcards require back text.";
  }
  return null;
}
