export const PERSONAL_IMPORT_DEFAULT_OPTIONS = {
  desiredCount: 10,
  language: "auto",
};

export const PERSONAL_DOCUMENT_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

/** Kiểm tra document ngay tại trình duyệt trước khi gửi request AI tốn thời gian. */
export function validatePersonalDocumentFile(file) {
  if (!file) return "Choose a PDF or DOCX file.";
  const extension = String(file.name || "").toLowerCase();
  if (!extension.endsWith(".pdf") && !extension.endsWith(".docx")) {
    return "Choose a PDF or DOCX file.";
  }
  if (file.size > PERSONAL_DOCUMENT_MAX_FILE_SIZE_BYTES) {
    return "Document size must not exceed 20 MB.";
  }
  return null;
}

export const PERSONAL_IMPORT_LANGUAGES = [
  { value: "auto", label: "Auto-detect" },
  { value: "vi", label: "Vietnamese" },
  { value: "en", label: "English" },
];

export const PERSONAL_PASTED_FRONT_BACK_SEPARATOR_OPTIONS = [
  { value: "tab", label: "Tab" },
  { value: "comma", label: "Comma" },
  { value: "custom", label: "Custom" },
];

export const PERSONAL_PASTED_CARD_SEPARATOR_OPTIONS = [
  { value: "newline", label: "New line" },
  { value: "semicolon", label: "Semicolon" },
  { value: "custom", label: "Custom" },
];

export const PERSONAL_PASTED_DEFAULT_VALUES = {
  text: "",
  frontBackSeparator: "tab",
  customFrontBackSeparator: "",
  cardSeparator: "newline",
  customCardSeparator: "",
};

export function toDraftCards(candidates = []) {
  return candidates.map((candidate, index) => ({
    id: `generated-${Date.now()}-${index}`,
    frontText: candidate?.frontText || "",
    frontImageUrl: candidate?.frontImageUrl || "",
    backText: candidate?.backText || "",
    backImageUrl: candidate?.backImageUrl || "",
    hint: candidate?.hint || "",
    explanation: candidate?.explanation || "",
    sourceExcerpt: candidate?.sourceExcerpt || "",
    orderIndex: index,
  }));
}

export function toBulkCreateCards(drafts = []) {
  return drafts.map((draft) => ({
    frontText: draft.frontText || null,
    frontImageUrl: draft.frontImageUrl || null,
    backText: draft.backText || null,
    backImageUrl: draft.backImageUrl || null,
    hint: draft.hint || null,
    explanation: draft.explanation || null,
  }));
}

export function validatePersonalImportOptions(options = {}) {
  const desiredCount = Number(options.desiredCount);
  if (!Number.isInteger(desiredCount) || desiredCount < 1 || desiredCount > 30) {
    return "Target cards must be between 1 and 30.";
  }
  if (!["auto", "vi", "en"].includes(options.language || "auto")) {
    return "Choose a supported language.";
  }
  return null;
}

export function normalizeFlashcardSignature(frontText, backText) {
  return `${String(frontText || "").trim().replace(/\s+/g, " ").toLowerCase()}\n${String(backText || "").trim().replace(/\s+/g, " ").toLowerCase()}`;
}

export function getFlashcardSignature(card) {
  const signature = normalizeFlashcardSignature(card?.frontText, card?.backText);
  return signature.trim() ? signature : "";
}

function resolveFrontBackSeparator(values = {}) {
  if (values.frontBackSeparator === "tab") return "\t";
  if (values.frontBackSeparator === "comma") return ",";
  return values.customFrontBackSeparator;
}

function resolveCardSeparator(values = {}) {
  if (values.cardSeparator === "newline") return "\n";
  if (values.cardSeparator === "semicolon") return ";";
  return values.customCardSeparator;
}

function splitPastedCards(text, separator) {
  if (separator === "\n") {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n");
  }
  return String(text || "").split(separator);
}

export function parsePersonalPastedFlashcards(values = {}, existingCards = []) {
  const sourceText = String(values.text || "");
  const frontBackSeparator = resolveFrontBackSeparator(values);
  const cardSeparator = resolveCardSeparator(values);

  if (!sourceText.trim()) {
    return {
      cards: [],
      invalidRows: [],
      duplicateRows: [],
      importableCards: [],
      configError: null,
    };
  }
  if (!frontBackSeparator) {
    return {
      cards: [],
      invalidRows: [],
      duplicateRows: [],
      importableCards: [],
      configError: "Enter a custom separator between front and back.",
    };
  }
  if (!cardSeparator) {
    return {
      cards: [],
      invalidRows: [],
      duplicateRows: [],
      importableCards: [],
      configError: "Enter a custom separator between cards.",
    };
  }
  if (frontBackSeparator === cardSeparator) {
    return {
      cards: [],
      invalidRows: [],
      duplicateRows: [],
      importableCards: [],
      configError: "Use different separators for card sides and cards.",
    };
  }

  const existingSignatures = new Set(
    existingCards.map(getFlashcardSignature).filter(Boolean),
  );
  const seenSignatures = new Set();
  const cards = [];
  const invalidRows = [];
  const duplicateRows = [];
  const importableCards = [];

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

    const signature = normalizeFlashcardSignature(frontText, backText);
    const duplicateReason = existingSignatures.has(signature)
      ? "Already exists in this Personal set."
      : seenSignatures.has(signature)
        ? "Duplicate in pasted text."
        : "";
    const card = {
      clientId: `${index + 1}-${frontText}-${backText}`,
      rowNumber: index + 1,
      frontText,
      backText,
      duplicateReason,
      importable: !duplicateReason,
    };
    cards.push(card);
    if (duplicateReason) {
      duplicateRows.push(card);
      return;
    }
    seenSignatures.add(signature);
    importableCards.push(card);
  });

  return {
    cards,
    invalidRows,
    duplicateRows,
    importableCards,
    configError: null,
  };
}
