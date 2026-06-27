import DOMPurify from "dompurify";

// ─── Question types ───────────────────────────────────────────────────────────

export const QUESTION_TYPES = {
  SINGLE: "single_choice",
  MULTIPLE: "multiple_choice",
  FILL: "fill_in_the_blank",
};

export const QUESTION_TYPE_VALUES = Object.values(QUESTION_TYPES);

export const QUESTION_TYPE_LABELS = {
  [QUESTION_TYPES.SINGLE]: "Single choice",
  [QUESTION_TYPES.MULTIPLE]: "Multiple choice",
  [QUESTION_TYPES.FILL]: "Fill in the blank",
};

// JSON mẫu hiển thị trong textarea (placeholder import).
export const SAMPLE_QUIZ_JSON = JSON.stringify(
  [
    {
      title: "What is the capital of <b>France</b>?",
      explain_question: "This tests your <i>geography</i> knowledge",
      type: "single_choice",
      number_of_options: 4,
      options: ["<b>Paris</b>", "London", "Berlin", "Madrid"],
      correct_answers: [1],
    },
    {
      title: "Select all <u>programming languages</u>",
      explain_question: "",
      type: "multiple_choice",
      number_of_options: 4,
      options: ["Python", "HTML", "<b>Java</b>", "CSS"],
      correct_answers: [1, 3],
    },
    {
      title: "PHP stands for _____ Hypertext Preprocessor",
      explain_question: "",
      type: "fill_in_the_blank",
      correct_answers: ["PHP", "Personal Home Page"],
    },
  ],
  null,
  2,
);

// ─── HTML sanitization (chỉ cho phép <b> <i> <u>, không attribute) ─────────────

export function sanitizeQuizHtml(html) {
  if (!html || typeof html !== "string") return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "u"],
    ALLOWED_ATTR: [],
  });
}

// ─── Validation ────────────────────────────────────────────────────────────────

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validate một mảng câu hỏi theo định dạng quiz mới.
 * @returns {{ valid: boolean, errors: Array<{ index: number, field: string, message: string }> }}
 */
export function validateQuizQuestions(questions) {
  const errors = [];

  if (!Array.isArray(questions)) {
    return {
      valid: false,
      errors: [{ index: -1, field: "root", message: "JSON must be an array of questions." }],
    };
  }

  questions.forEach((question, idx) => {
    const qNum = idx + 1;
    const push = (field, message) =>
      errors.push({ index: idx, field, message: `Question ${qNum}: ${message}` });

    if (!question || typeof question !== "object" || Array.isArray(question)) {
      push("root", "must be an object.");
      return;
    }

    if (!isNonEmptyString(question.title)) {
      push("title", "title is required.");
    }

    const type = question.type;
    if (!QUESTION_TYPE_VALUES.includes(type)) {
      push(
        "type",
        `type must be one of ${QUESTION_TYPE_VALUES.join(", ")}.`,
      );
      return; // không validate tiếp khi type sai
    }

    if (!Array.isArray(question.correct_answers)) {
      push("correct_answers", "correct_answers is required and must be an array.");
      return;
    }

    if (type === QUESTION_TYPES.SINGLE || type === QUESTION_TYPES.MULTIPLE) {
      validateChoiceQuestion(question, type, push);
    } else if (type === QUESTION_TYPES.FILL) {
      validateFillQuestion(question, push);
    }
  });

  return { valid: errors.length === 0, errors };
}

function validateChoiceQuestion(question, type, push) {
  const { options, number_of_options, correct_answers } = question;

  if (!Array.isArray(options) || options.length === 0) {
    push("options", "options is required.");
    return;
  }

  if (
    number_of_options != null &&
    Number(number_of_options) !== options.length
  ) {
    push(
      "number_of_options",
      `number_of_options (${number_of_options}) must equal options.length (${options.length}).`,
    );
  }

  if (type === QUESTION_TYPES.SINGLE && correct_answers.length !== 1) {
    push("correct_answers", "single_choice must have exactly one correct answer.");
  }

  if (type === QUESTION_TYPES.MULTIPLE && correct_answers.length < 1) {
    push("correct_answers", "multiple_choice must have at least one correct answer.");
  }

  correct_answers.forEach((value) => {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      push("correct_answers", `correct_answers must contain integers, got "${value}".`);
    } else if (value < 1 || value > options.length) {
      push(
        "correct_answers",
        `correct_answers contains invalid option index ${value}.`,
      );
    }
  });
}

function validateFillQuestion(question, push) {
  const { correct_answers } = question;
  if (correct_answers.length < 1) {
    push("correct_answers", "fill_in_the_blank must have at least one accepted answer.");
  }
  correct_answers.forEach((value) => {
    if (!isNonEmptyString(value)) {
      push("correct_answers", "fill_in_the_blank correct_answers must be non-empty strings.");
    }
  });
}

// ─── Normalization ───────────────────────────────────────────────────────────

/**
 * Chuẩn hoá câu hỏi sau khi import: set number_of_options cho choice, trim chuỗi.
 */
export function normalizeImportedQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.map((question) => {
    const type = question.type;
    const base = {
      title: typeof question.title === "string" ? question.title.trim() : "",
      explain_question:
        typeof question.explain_question === "string"
          ? question.explain_question.trim()
          : "",
      type,
      correct_answers: Array.isArray(question.correct_answers)
        ? [...question.correct_answers]
        : [],
    };

    if (type === QUESTION_TYPES.SINGLE || type === QUESTION_TYPES.MULTIPLE) {
      const options = Array.isArray(question.options)
        ? question.options.map((opt) => (typeof opt === "string" ? opt : String(opt ?? "")))
        : [];
      base.options = options;
      base.number_of_options = options.length;
    }

    return base;
  });
}

// ─── Legacy compatibility ──────────────────────────────────────────────────────

/**
 * Dữ liệu cũ: { question, options, correctIndex, explanation } (single-choice).
 */
export function migrateLegacyQuestion(question) {
  const options = Array.isArray(question.options) ? question.options : [];
  return {
    title: question.question || "",
    explain_question: question.explanation || "",
    type: QUESTION_TYPES.SINGLE,
    number_of_options: options.length,
    options,
    correct_answers: [Number(question.correctIndex ?? 0) + 1],
  };
}

function isLegacyQuestion(question) {
  return (
    question &&
    typeof question === "object" &&
    (Object.prototype.hasOwnProperty.call(question, "question") ||
      Object.prototype.hasOwnProperty.call(question, "correctIndex")) &&
    !Object.prototype.hasOwnProperty.call(question, "type")
  );
}

/**
 * Parse content JSON của lesson quiz an toàn. Hỗ trợ cả format cũ lẫn mới.
 * @returns {{ title: string, questions: Array }}
 */
export function parseQuizContent(content) {
  const empty = { title: "", questions: [] };
  if (!content || typeof content !== "string") return empty;

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return empty;
  }

  if (!parsed || typeof parsed !== "object") return empty;

  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
  const questions = rawQuestions.map((q) =>
    isLegacyQuestion(q) ? migrateLegacyQuestion(q) : q,
  );

  return {
    title: typeof parsed.title === "string" ? parsed.title : "",
    questions,
  };
}

/**
 * Serialize quiz data thành JSON string lưu vào lesson.content.
 */
export function serializeQuizContent(title, questions) {
  return JSON.stringify({
    title: typeof title === "string" ? title : "",
    questions: Array.isArray(questions) ? questions : [],
  });
}
