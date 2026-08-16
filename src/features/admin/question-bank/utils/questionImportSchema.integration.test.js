import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  buildImportPayload,
  IMPORT_COLUMNS,
  parseImportFile,
  parseImportJson,
  revalidateImportRows,
  SAMPLE_QUESTION_BANK_JSON,
} from "./questionImportSchema";

/** Tao file Excel giong template de test luong parse file that trong import question. */
function createTemplateImportFile(rows) {
  const matrix = [
    IMPORT_COLUMNS.map((column) => column.label),
    ...rows.map((row) => IMPORT_COLUMNS.map((column) => row[column.key] ?? "")),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(matrix);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");
  const content = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new File([content], "questions.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("question import schema", () => {
  it("keeps bundled sample rows free from fake media URLs", () => {
    const result = parseImportJson(SAMPLE_QUESTION_BANK_JSON);

    expect(result.rows).toHaveLength(3);
    expect(result.rows.every((row) => row.data.imageFiles.length === 0)).toBe(true);
    expect(result.rows.every((row) => row.data.audioFiles.length === 0)).toBe(true);
    expect(result.rows.every((row) => row.errors.length === 0)).toBe(true);
    const payloadRows = buildImportPayload(null, result.rows).rows;
    expect(payloadRows.every((row) => !("difficulty" in row))).toBe(true);
    expect(payloadRows.every((row) => !("bloomLevel" in row))).toBe(true);
  });

  it("rejects documentation placeholder domains before backend commit", () => {
    const result = parseImportJson(JSON.stringify([{
      questionText: "Question with fake media",
      questionType: "single_choice",
      options: ["A", "B"],
      correctAnswer: "A",
      media: { images: ["https://example.com/question.png"] },
    }]));

    expect(result.rows[0].errors).toContain(
      "Image media URL must point to a real, publicly accessible media file",
    );
  });

  it("does not require a module column because scope comes from the page URL", () => {
    const parsed = parseImportJson(JSON.stringify([{
      questionText: "Course question",
      questionType: "single_choice",
      options: ["A", "B"],
      correctAnswer: "A",
    }]));

    const rows = revalidateImportRows(parsed.rows, []);

    expect(rows[0].errors).toEqual([]);
    expect(rows[0].data.moduleId).toBeNull();
  });

  it("accepts optional module fields from imported JSON", () => {
    const parsed = parseImportJson(JSON.stringify([{
      questionText: "Question for the active module",
      questionType: "single_choice",
      options: ["A", "B"],
      correctAnswer: "A",
      moduleId: "11111111-1111-1111-1111-111111111111",
    }]));

    const rows = revalidateImportRows(parsed.rows, []);
    const payload = buildImportPayload(null, rows);

    expect(rows[0].data.moduleId).toBe("11111111-1111-1111-1111-111111111111");
    expect(rows[0].raw.module_id).toBe("11111111-1111-1111-1111-111111111111");
    expect(payload.rows[0].moduleId).toBe("11111111-1111-1111-1111-111111111111");
    expect(rows[0].errors).toEqual([]);
  });

  it("rejects multiple choice imports with only one correct answer", () => {
    const parsed = parseImportJson(JSON.stringify([{
      questionText: "Question with a single correct option",
      questionType: "multiple_choice",
      options: ["A", "B", "C", "D"],
      correctAnswer: "A",
    }]));

    expect(parsed.rows[0].errors).toContain(
      "Multiple choice correct answer must include at least two letters, such as A,C",
    );
    expect(parsed.rows[0].data.questionType).toBe("multiple_choice");
  });

  it("defaults missing question type to single choice", () => {
    const parsed = parseImportJson(JSON.stringify([{
      questionText: "Question without explicit type",
      options: ["A", "B"],
      correctAnswer: "A",
    }]));

    expect(parsed.rows[0].errors).toEqual([]);
    expect(parsed.rows[0].data.questionType).toBe("single_choice");
  });

  it("accepts a template-style Excel file containing all supported question types", async () => {
    const file = createTemplateImportFile([
      {
        question_text: "Single choice question",
        question_type: "single_choice",
        option_a: "Correct",
        option_b: "Wrong",
        correct_answer: "A",
        explanation: "One correct answer.",
      },
      {
        question_text: "Multiple choice question",
        question_type: "multiple_choice",
        option_a: "Correct one",
        option_b: "Wrong",
        option_c: "Correct two",
        correct_answer: "A,C",
        explanation: "Two correct answers.",
      },
      {
        question_text: "True false question",
        question_type: "true_false",
        option_a: "True",
        option_b: "False",
        correct_answer: "True",
        explanation: "True/false uses True or False as correct answer.",
      },
    ]);

    const parsed = await parseImportFile(file);
    const payload = buildImportPayload(null, parsed.rows);

    expect(parsed.rows.map((row) => row.data.questionType)).toEqual([
      "single_choice",
      "multiple_choice",
      "true_false",
    ]);
    expect(parsed.rows.every((row) => row.errors.length === 0)).toBe(true);
    expect(payload.rows).toHaveLength(3);
  });
});
