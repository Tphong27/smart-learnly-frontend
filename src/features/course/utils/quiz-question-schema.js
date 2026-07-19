import DOMPurify from "dompurify";
import * as XLSX from "xlsx";

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

export const MEDIA_TYPES = {
  IMAGE: "image",
  VIDEO: "video",
  AUDIO: "audio",
};

export const MEDIA_TYPE_VALUES = Object.values(MEDIA_TYPES);

// Excel/CSV template chỉ chứa text. Media thêm bằng cách chỉnh từng câu
// trong QuizQuestionEditModal hoặc dùng JSON import (JSON hỗ trợ đầy đủ media).
export const QUIZ_IMPORT_COLUMNS = [
  "type",
  "title",
  "option_a_text",
  "option_b_text",
  "option_c_text",
  "option_d_text",
  "correct_answers",
  "explain_question",
];

// JSON mẫu hiển thị trong textarea (placeholder import).
export const SAMPLE_QUIZ_JSON = JSON.stringify(
  [
    {
      title: "What is the capital of <b>France</b>?",
      media: {
        type: "audio",
        url: "https://example.com/listening-sample.mp3",
        objectPath: "2026/07/listening-sample.mp3",
        fileName: "listening-sample.mp3",
        contentType: "audio/mpeg",
        size: 123456,
      },
      explain_question: "This tests your <i>geography</i> knowledge",
      type: "single_choice",
      number_of_options: 4,
      options: ["<b>Paris</b>", "London", "Berlin", "Madrid"],
      correct_answers: [1],
    },
    {
      title: "Select all <u>programming languages</u>",
      media: {
        type: "image",
        url: "https://example.com/question-image.png",
        objectPath: "2026/07/question-image.png",
        fileName: "question-image.png",
        contentType: "image/png",
        size: 123456,
      },
      explain_question: "",
      type: "multiple_choice",
      number_of_options: 3,
      options: [
        "Python",
        { text: "Java", media: null },
        {
          text: "",
          media: {
            type: "image",
            url: "https://example.com/answer-image.png",
            objectPath: "2026/07/answer-image.png",
          },
        },
      ],
      correct_answers: [1, 2],
    },
    {
      title: "PHP stands for _____ Hypertext Preprocessor",
      media: null,
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

// ─── Media helpers ────────────────────────────────────────────────────────────

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeMedia(media) {
  if (!media || typeof media !== "object" || Array.isArray(media)) return null;

  const type = typeof media.type === "string" ? media.type.trim().toLowerCase() : "";
  const url = typeof media.url === "string" ? media.url.trim() : "";
  const objectPath =
    typeof media.objectPath === "string"
      ? media.objectPath.trim()
      : typeof media.object_path === "string"
        ? media.object_path.trim()
        : "";
  const fileName =
    typeof media.fileName === "string"
      ? media.fileName.trim()
      : typeof media.file_name === "string"
        ? media.file_name.trim()
        : "";
  const contentType =
    typeof media.contentType === "string"
      ? media.contentType.trim()
      : typeof media.content_type === "string"
        ? media.content_type.trim()
        : "";
  const localFileName =
    typeof media.localFileName === "string"
      ? media.localFileName.trim()
      : typeof media.local_file_name === "string"
        ? media.local_file_name.trim()
        : "";
  const sizeValue = media.size ?? media.fileSize ?? media.file_size ?? null;
  const size = Number.isFinite(Number(sizeValue)) ? Number(sizeValue) : null;

  if (!type && !url && !objectPath && !fileName && !contentType && !localFileName && size == null) {
    return null;
  }

  return {
    type,
    url,
    objectPath,
    fileName,
    localFileName,
    contentType,
    size,
  };
}

export function hasValidMedia(media, { allowLocalMedia = false } = {}) {
  const normalized = normalizeMedia(media);
  return Boolean(
    normalized &&
      MEDIA_TYPE_VALUES.includes(normalized.type) &&
      (normalized.url || (allowLocalMedia && normalized.localFileName)),
  );
}

function validateMedia(media, push, fieldPrefix, { allowLocalMedia = false } = {}) {
  const normalized = normalizeMedia(media);
  if (!normalized) return;

  if (!MEDIA_TYPE_VALUES.includes(normalized.type)) {
    push(fieldPrefix, "media type must be image, video, or audio.");
  }
  if (!normalized.url && !(allowLocalMedia && normalized.localFileName)) {
    push(fieldPrefix, "media url is required when media is provided.");
  }
}

export function getOptionText(option) {
  if (typeof option === "string") return option;
  if (option && typeof option === "object" && typeof option.text === "string") {
    return option.text;
  }
  return "";
}

export function getOptionMedia(option) {
  if (option && typeof option === "object" && !Array.isArray(option)) {
    return normalizeMedia(option.media);
  }
  return null;
}

function optionHasContent(option, validationOptions = {}) {
  return isNonEmptyString(getOptionText(option)) || hasValidMedia(getOptionMedia(option), validationOptions);
}

function stripTemporaryMediaFields(media) {
  const normalized = normalizeMedia(media);
  if (!normalized) return null;
  const persistableMedia = { ...normalized };
  delete persistableMedia.localFileName;
  return persistableMedia;
}

function normalizeOption(option, { persistable = false } = {}) {
  if (typeof option === "string") return option.trim();
  if (!option || typeof option !== "object" || Array.isArray(option)) return "";

  const text = typeof option.text === "string" ? option.text.trim() : "";
  const media = persistable ? stripTemporaryMediaFields(option.media) : normalizeMedia(option.media);
  if (!media) return text;
  return { text, media };
}

// ─── Validation ────────────────────────────────────────────────────────────────

/**
 * Validate một mảng câu hỏi theo định dạng quiz mới.
 * @returns {{ valid: boolean, errors: Array<{ index: number, field: string, message: string }> }}
 */
export function validateQuizQuestions(questions, validationOptions = {}) {
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

    validateMedia(question.media, push, "media", validationOptions);
    if (!isNonEmptyString(question.title) && !hasValidMedia(question.media, validationOptions)) {
      push("title", "title or media is required.");
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
      validateChoiceQuestion(question, type, push, validationOptions);
    } else if (type === QUESTION_TYPES.FILL) {
      validateFillQuestion(question, push);
    }
  });

  return { valid: errors.length === 0, errors };
}

function validateChoiceQuestion(question, type, push, validationOptions = {}) {
  const { options, number_of_options, correct_answers } = question;

  if (!Array.isArray(options) || options.length < 2) {
    push("options", "at least two options are required.");
    return;
  }

  options.forEach((option, index) => {
    if (!optionHasContent(option, validationOptions)) {
      push("options", `option ${index + 1} must have text or media.`);
    }
    validateMedia(getOptionMedia(option), push, `options[${index}].media`, validationOptions);
  });

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

  const seenAnswers = new Set();
  correct_answers.forEach((value) => {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      push("correct_answers", `correct_answers must contain integers, got "${value}".`);
    } else if (value < 1 || value > options.length) {
      push(
        "correct_answers",
        `correct_answers contains invalid option index ${value}.`,
      );
    } else if (seenAnswers.has(value)) {
      push("correct_answers", `correct_answers contains duplicate option index ${value}.`);
    } else {
      seenAnswers.add(value);
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
export function normalizeImportedQuestions(questions, { persistable = false } = {}) {
  if (!Array.isArray(questions)) return [];
  return questions.map((question) => {
    const type = question.type;
    const media = persistable ? stripTemporaryMediaFields(question.media) : normalizeMedia(question.media);
    const base = {
      title: typeof question.title === "string" ? question.title.trim() : "",
      media,
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
        ? question.options.map((option) => normalizeOption(option, { persistable }))
        : [];
      base.options = options;
      base.number_of_options = options.length;
    }

    return base;
  });
}

// ─── Excel/CSV import ─────────────────────────────────────────────────────────

function readSheetRows(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.SheetNames[0];
        if (!firstSheet) {
          resolve({ headers: [], rows: [] });
          return;
        }
        const sheet = workbook.Sheets[firstSheet];
        const matrix = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
          raw: false,
          blankrows: false,
        });
        if (!matrix.length) {
          resolve({ headers: [], rows: [] });
          return;
        }
        const headers = matrix[0].map((cell) => String(cell ?? "").trim());
        resolve({ headers, rows: matrix.slice(1) });
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

function normalizeHeader(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

const HEADER_ALIASES = {
  type: ["type", "question_type", "question type"],
  title: ["title", "question", "question_text", "question text", "prompt"],
  correct_answers: ["correct_answers", "correct answers", "correct_answer", "correct answer", "correct"],
  explain_question: ["explain_question", "explanation", "explain", "rationale"],
};

for (const letter of ["a", "b", "c", "d", "e", "f"]) {
  HEADER_ALIASES[`option_${letter}_text`] = [
    `option_${letter}_text`,
    `option ${letter} text`,
    `option_${letter}`,
    `option ${letter}`,
    letter,
  ];
}

function buildColumnMap(headers) {
  const normalized = headers.map((header) => normalizeHeader(header));
  const map = {};
  for (const [target, aliases] of Object.entries(HEADER_ALIASES)) {
    const matchIndex = normalized.findIndex((header) => aliases.includes(header));
    if (matchIndex !== -1) map[target] = matchIndex;
  }
  return map;
}

function mapRow(rawRow, columnMap) {
  const row = {};
  for (const [key, index] of Object.entries(columnMap)) {
    row[key] = String(rawRow[index] ?? "").trim();
  }
  return row;
}

// Regex phát hiện cột media trong file Excel cũ để hiển thị warning.
// Chấp nhận các biến thể: question_media_*, option_a_media_*, "media_url", "media type"…
const LEGACY_MEDIA_HEADER_PATTERN = /(^|[_\s])media([_\s]|$)/i;

export function detectLegacyMediaColumns(headers) {
  if (!Array.isArray(headers)) return [];
  return headers
    .map((header) => String(header ?? "").trim())
    .filter((header) => header && LEGACY_MEDIA_HEADER_PATTERN.test(header));
}

function parseCorrectAnswers(rawValue, type) {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return [];

  if (type === QUESTION_TYPES.FILL) {
    return raw
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return raw
    .split(/[;,]/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .map((item) => {
      if (/^\d+$/.test(item)) return Number(item);
      return item.charCodeAt(0) - 64;
    });
}

function buildQuestionFromImportRow(row) {
  const type = String(row.type || "").trim().toLowerCase();
  const question = {
    title: row.title || "",
    media: null,
    explain_question: row.explain_question || "",
    type,
    correct_answers: parseCorrectAnswers(row.correct_answers, type),
  };

  if (type === QUESTION_TYPES.SINGLE || type === QUESTION_TYPES.MULTIPLE) {
    const options = [];
    for (const letter of ["a", "b", "c", "d", "e", "f"]) {
      const text = row[`option_${letter}_text`] || "";
      if (text) {
        options.push(text);
      }
    }
    question.options = options;
    question.number_of_options = options.length;
  }

  return question;
}

export async function parseQuizImportFile(file) {
  if (!file) throw new Error("No file provided.");
  const { headers, rows } = await readSheetRows(file);
  if (!headers.length) throw new Error("The file appears to be empty.");

  const columnMap = buildColumnMap(headers);
  if (columnMap.type == null) throw new Error("Missing required column: type");
  if (columnMap.correct_answers == null) throw new Error("Missing required column: correct_answers");

  const legacyMediaColumns = detectLegacyMediaColumns(headers);

  const parsedRows = [];
  rows.forEach((rawRow, index) => {
    if (Array.isArray(rawRow) && rawRow.every((cell) => cell === "" || cell == null)) return;
    const row = mapRow(rawRow, columnMap);
    const question = buildQuestionFromImportRow(row);
    const { errors } = validateQuizQuestions([question]);
    parsedRows.push({
      rowNumber: index + 2,
      question,
      errors: errors.map((error) => error.message.replace(/^Question 1: /, "")),
    });
  });

  return {
    headers,
    rows: parsedRows,
    questions: normalizeImportedQuestions(parsedRows.filter((row) => row.errors.length === 0).map((row) => row.question)),
    legacyMediaColumns,
    hasLegacyMediaColumns: legacyMediaColumns.length > 0,
  };
}

function escapeExcelXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function templateColumnWidth(column, rows, index) {
  const maxLength = rows.reduce((max, row) => Math.max(max, String(row[index] ?? "").length), column.length);
  const isLongTextColumn = [
    "title",
    "option_a_text",
    "option_b_text",
    "option_c_text",
    "option_d_text",
    "explain_question",
  ].includes(column);
  const minWidth = isLongTextColumn ? 140 : 90;
  const maxWidth = isLongTextColumn ? 320 : 180;
  return Math.min(Math.max(maxLength * 7, minWidth), maxWidth);
}

function styledCell(value, styleId) {
  return `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeExcelXml(value)}</Data></Cell>`;
}

function buildStyledTemplateWorkbook(dataMatrix) {
  const centeredColumns = new Set(["type", "correct_answers"]);
  const wrapColumns = new Set([
    "title",
    "option_a_text",
    "option_b_text",
    "option_c_text",
    "option_d_text",
    "explain_question",
  ]);
  const columnXml = QUIZ_IMPORT_COLUMNS.map((column, index) => (
    `<Column ss:AutoFitWidth="0" ss:Width="${templateColumnWidth(column, dataMatrix, index)}"/>`
  )).join("");
  const rowXml = dataMatrix.map((row, rowIndex) => {
    const isHeader = rowIndex === 0;
    const cells = row.map((value, columnIndex) => {
      if (isHeader) return styledCell(value, "Header");
      const column = QUIZ_IMPORT_COLUMNS[columnIndex];
      const isAlt = rowIndex % 2 === 0;
      if (centeredColumns.has(column)) return styledCell(value, isAlt ? "DataCenterAlt" : "DataCenter");
      if (wrapColumns.has(column)) return styledCell(value, isAlt ? "DataWrapAlt" : "DataWrap");
      return styledCell(value, isAlt ? "DataAlt" : "Data");
    }).join("");
    return `<Row ss:Height="${isHeader ? 28 : 36}">${cells}</Row>`;
  }).join("");
  const filterRange = `R1C1:R${dataMatrix.length}C${QUIZ_IMPORT_COLUMNS.length}`;

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#1F4E78" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/>
        <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/>
        <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/>
        <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2F3"/>
      </Borders>
    </Style>
    <Style ss:ID="Data"><Alignment ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/></Borders></Style>
    <Style ss:ID="DataAlt"><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/></Borders></Style>
    <Style ss:ID="DataWrap"><Alignment ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/></Borders></Style>
    <Style ss:ID="DataWrapAlt"><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Alignment ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/></Borders></Style>
    <Style ss:ID="DataCenter"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/></Borders></Style>
    <Style ss:ID="DataCenterAlt"><Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/></Borders></Style>
  </Styles>
  <Worksheet ss:Name="Lesson Quiz">
    <Table>${columnXml}${rowXml}</Table>
    <AutoFilter x:Range="${filterRange}" xmlns="urn:schemas-microsoft-com:office:excel"/>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <FreezePanes/>
      <FrozenNoSplit/>
      <SplitHorizontal>1</SplitHorizontal>
      <TopRowBottomPane>1</TopRowBottomPane>
      <ActivePane>2</ActivePane>
    </WorksheetOptions>
  </Worksheet>
</Workbook>`;
}

function downloadWorkbookXml(xml, fileName) {
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadQuizImportTemplate() {
  const sampleRows = [
    {
      type: QUESTION_TYPES.SINGLE,
      title: "What is Java?",
      option_a_text: "Programming language",
      option_b_text: "Database",
      option_c_text: "Operating system",
      option_d_text: "Browser",
      correct_answers: "A",
      explain_question: "Java is a programming language.",
    },
    {
      type: QUESTION_TYPES.MULTIPLE,
      title: "Select all programming languages",
      option_a_text: "Python",
      option_b_text: "Java",
      option_c_text: "HTML",
      option_d_text: "CSS",
      correct_answers: "A,B",
      explain_question: "HTML and CSS are markup/style languages, not programming languages.",
    },
    {
      type: QUESTION_TYPES.FILL,
      title: "PHP stands for _____ Hypertext Preprocessor",
      option_a_text: "",
      option_b_text: "",
      option_c_text: "",
      option_d_text: "",
      correct_answers: "PHP;Personal Home Page",
      explain_question: "Use ';' to separate multiple accepted answers for fill_in_the_blank.",
    },
  ];

  const dataMatrix = [QUIZ_IMPORT_COLUMNS, ...sampleRows.map((row) => QUIZ_IMPORT_COLUMNS.map((column) => row[column] ?? ""))];
  const workbookXml = buildStyledTemplateWorkbook(dataMatrix);
  downloadWorkbookXml(workbookXml, "lesson-quiz-template.xls");
}

// ─── Legacy compatibility ──────────────────────────────────────────────────────

/**
 * Dữ liệu cũ: { question, options, correctIndex, explanation } (single-choice).
 */
export function migrateLegacyQuestion(question) {
  const options = Array.isArray(question.options) ? question.options : [];
  return {
    title: question.question || "",
    media: null,
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
    questions: Array.isArray(questions) ? normalizeImportedQuestions(questions, { persistable: true }) : [],
  });
}
