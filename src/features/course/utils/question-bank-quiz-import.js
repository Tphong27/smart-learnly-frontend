import { questionBankService } from "@/services/question-bank.service";
import {
  QUESTION_TYPES,
  getOptionMedia,
  getOptionText,
  normalizeMedia,
  validateQuizQuestions,
} from "./quiz-question-schema";

function stripHtml(value) {
  const raw = String(value ?? "");
  if (!raw) return "";
  if (typeof DOMParser !== "undefined" && /<[a-z][\s\S]*>/i.test(raw)) {
    const document = new DOMParser().parseFromString(raw, "text/html");
    return String(document.body.textContent || "").replace(/\s+/g, " ").trim();
  }
  return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return stripHtml(value).toLowerCase();
}

function questionId(question) {
  return question?.questionId || question?.id || "";
}

function firstMediaCandidate(...candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (Array.isArray(candidate)) {
      const found = firstMediaCandidate(...candidate);
      if (found) return found;
      continue;
    }
    if (typeof candidate === "string") {
      return normalizeMedia({ type: "image", url: candidate });
    }
    const url =
      candidate.url ||
      candidate.mediaUrl ||
      candidate.fileUrl ||
      candidate.objectPath ||
      candidate.src ||
      null;
    const objectPath = candidate.objectPath || candidate.objectKey || null;
    const mediaType = String(
      candidate.mediaType || candidate.type || candidate.kind || "",
    ).toLowerCase();
    const normalizedType = ["image", "audio", "video"].includes(mediaType)
      ? mediaType
      : "image";
    if (!url && !objectPath) continue;
    return normalizeMedia({
      type: normalizedType,
      url,
      objectPath,
      fileName: candidate.fileName || candidate.name || null,
      contentType: candidate.contentType || candidate.mimeType || null,
      size: candidate.fileSize ?? candidate.size ?? null,
    });
  }
  return null;
}

function extractQuestionMedia(question) {
  return firstMediaCandidate(
    question?.media,
    question?.questionMedia,
    question?.questionMediaAttachments,
    Array.isArray(question?.mediaAttachments) ? question.mediaAttachments : null,
    question?.questionImage,
    question?.image,
    question?.questionAudio,
    question?.audio,
    question?.questionVideo,
    question?.video,
  );
}

function extractAnswerMedia(answer) {
  const media = answer?.answerMedia || answer?.media || null;
  if (Array.isArray(answer?.mediaAttachments) && answer.mediaAttachments.length) {
    return firstMediaCandidate(answer.mediaAttachments);
  }
  if (media && typeof media === "object") {
    return firstMediaCandidate(
      media.image,
      media.audio,
      media.video,
      media.media,
      media.file,
    );
  }
  return firstMediaCandidate(
    answer?.answerImage,
    answer?.answerAudio,
    answer?.answerVideo,
    media,
  );
}

function extractQuestionAnswers(question) {
  return Array.isArray(question?.answers)
    ? question.answers
    : Array.isArray(question?.options)
      ? question.options
      : [];
}

function extractQuestionText(question) {
  return String(
    question?.questionText || question?.title || question?.content || "",
  ).trim();
}

function extractQuestionType(question) {
  return String(question?.questionType || question?.type || "").toLowerCase();
}

function normalizeAnswerText(answer) {
  return String(answer?.answerText || answer?.content || answer?.text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeQuizOption(option) {
  const text = getOptionText(option) || normalizeAnswerText(option);
  const media = getOptionMedia(option) || extractAnswerMedia(option);
  return media ? { text, media } : text;
}

function normalizeCorrectAnswersFromBank(question, answers) {
  const correctIndexes = answers
    .map((answer, index) => ((answer?.correct || answer?.isCorrect) ? index + 1 : null))
    .filter(Boolean);

  if (correctIndexes.length > 0) return correctIndexes;

  const firstCorrect = Array.isArray(question?.correctAnswers)
    ? question.correctAnswers
    : Array.isArray(question?.correct_answers)
      ? question.correct_answers
      : [];
  if (firstCorrect.length > 0) return firstCorrect;

  return answers.length > 0 ? [1] : [];
}

function normalizeFalseTrueAnswerIndex(answers) {
  const correctAnswer = answers.find((answer) => (answer?.correct || answer?.isCorrect));
  const correctText = normalizeAnswerText(correctAnswer).toLowerCase();
  if (correctText === "false") return 2;
  if (correctText === "true") return 1;

  const correctIndex = answers.findIndex((answer) => (answer?.correct || answer?.isCorrect));
  return correctIndex >= 0 ? correctIndex + 1 : 1;
}

export function mapBankQuestionToQuizQuestion(question) {
  const rawType = extractQuestionType(question);
  const title = extractQuestionText(question);
  const media = extractQuestionMedia(question);
  const explain_question = String(
    question?.explanation || question?.explain_question || "",
  ).trim();
  const answers = extractQuestionAnswers(question);

  if (rawType === "fill_in_the_blank") {
    return {
      title,
      media,
      explain_question,
      type: QUESTION_TYPES.FILL,
      correct_answers: answers
        .map((answer) => normalizeAnswerText(answer))
        .filter(Boolean),
    };
  }

  if (rawType === "true_false") {
    const correctAnswerIndex = normalizeFalseTrueAnswerIndex(answers);
    return {
      title,
      media,
      explain_question,
      type: QUESTION_TYPES.SINGLE,
      options: ["True", "False"],
      number_of_options: 2,
      correct_answers: [correctAnswerIndex],
    };
  }

  const mappedOptions = answers.map(normalizeQuizOption).filter(Boolean);
  const correctAnswers = normalizeCorrectAnswersFromBank(question, answers);
  const mappedType =
    rawType === "multiple_choice" && correctAnswers.length > 1
      ? QUESTION_TYPES.MULTIPLE
      : QUESTION_TYPES.SINGLE;

  return {
    title,
    media,
    explain_question,
    type: mappedType,
    options: mappedOptions,
    number_of_options: mappedOptions.length,
    correct_answers: correctAnswers,
  };
}

export function buildQuestionSignature(question) {
  const type = normalizeText(question?.type || question?.questionType || "");
  const title = normalizeText(question?.title || question?.questionText || question?.content || "");
  const media = extractQuestionMedia(question);
  const mediaSignature = media
    ? [media.type, media.url || media.objectPath || "", media.fileName || ""].join("|")
    : "";

  const options = Array.isArray(question?.options)
    ? question.options
    : Array.isArray(question?.answers)
      ? question.answers
      : [];

  const optionSignature = options
    .map((option, index) => {
      const text = normalizeText(getOptionText(option) || normalizeAnswerText(option));
      const optionMedia = getOptionMedia(option) || extractAnswerMedia(option);
      const optionMediaSignature = optionMedia
        ? [
            optionMedia.type,
            optionMedia.url || optionMedia.objectPath || "",
            optionMedia.fileName || "",
          ].join("|")
        : "";
      return `${index}:${text}:${optionMediaSignature}`;
    })
    .join("|");

  const correctAnswers = Array.isArray(question?.correct_answers)
    ? question.correct_answers
    : Array.isArray(question?.answers)
      ? question.answers
          .map((answer, index) => ((answer?.correct || answer?.isCorrect) ? index + 1 : null))
          .filter(Boolean)
      : [];

  const correctSignature = correctAnswers
    .map((value) => normalizeText(value))
    .join(",");

  return [title, type, mediaSignature, optionSignature, correctSignature].join("::");
}

export function findDuplicateQuizQuestions(existingQuestions = [], incomingQuestions = []) {
  const existingSignatures = new Map();
  existingQuestions.forEach((question, index) => {
    const signature = buildQuestionSignature(question);
    if (signature && !existingSignatures.has(signature)) {
      existingSignatures.set(signature, index);
    }
  });

  const duplicates = [];
  const seenIncoming = new Set();

  incomingQuestions.forEach((question, index) => {
    const signature = buildQuestionSignature(question);
    if (!signature) return;

    const reasons = [];
    if (existingSignatures.has(signature)) reasons.push("Already exists in this quiz");
    if (seenIncoming.has(signature)) reasons.push("Duplicate in selection");
    seenIncoming.add(signature);

    if (reasons.length > 0) {
      duplicates.push({
        index,
        question,
        questionId: questionId(question),
        reasons,
      });
    }
  });

  return duplicates;
}

export function prepareQuizBankImport(existingQuestions, bankQuestions) {
  const mappedQuestions = (Array.isArray(bankQuestions) ? bankQuestions : []).map(
    mapBankQuestionToQuizQuestion,
  );
  const { valid, errors } = validateQuizQuestions(mappedQuestions);
  const duplicates = findDuplicateQuizQuestions(existingQuestions, mappedQuestions);
  return {
    mappedQuestions,
    valid,
    errors,
    duplicates,
  };
}

export async function fetchAllFilteredBankQuestions({
  bankId,
  filters = {},
  pageSize = 100,
}) {
  if (!bankId) return [];

  const allItems = [];
  let page = 0;
  let totalPages;

  do {
    const response = await questionBankService.listQuestions({
      bankId,
      page,
      size: pageSize,
      ...filters,
    });
    const items = Array.isArray(response?.items) ? response.items : [];
    allItems.push(...items);
    totalPages = Number(response?.totalPages || 1);
    page += 1;
  } while (page < totalPages);

  return allItems;
}

export function pickRandomQuestions(pool, count) {
  const nextPool = [...(Array.isArray(pool) ? pool : [])];
  for (let index = nextPool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextPool[index], nextPool[swapIndex]] = [nextPool[swapIndex], nextPool[index]];
  }
  return nextPool.slice(0, Math.max(0, Number(count || 0)));
}
