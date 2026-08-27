import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  buildImportPayload,
  IMPORT_COLUMNS,
  parseImportFile,
  revalidateImportRows,
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
  it("accepts Excel rows without fake media URLs", async () => {
    const file = createTemplateImportFile([
      {
        question_text: "What is the capital of France?",
        question_type: "single_choice",
        option_a: "Paris",
        option_b: "London",
        option_c: "Berlin",
        option_d: "Madrid",
        correct_answer: "A",
        explanation: "Paris has been the capital of France for centuries.",
      },
      {
        question_text: "Which Spring stereotypes can register beans?",
        question_type: "multiple_choice",
        option_a: "@Component",
        option_b: "@Service",
        option_c: "@Repository",
        option_d: "@BeanFactory",
        correct_answer: "A,B,C",
        explanation: "@Component, @Service, and @Repository are component-scanned stereotypes.",
      },
      {
        question_text: "Java is a programming language.",
        question_type: "true_false",
        option_a: "True",
        option_b: "False",
        correct_answer: "True",
        explanation: "Java is a general-purpose programming language.",
      },
    ]);

    const result = await parseImportFile(file);

    expect(result.rows).toHaveLength(3);
    expect(result.rows.every((row) => row.data.imageFiles.length === 0)).toBe(true);
    expect(result.rows.every((row) => row.data.audioFiles.length === 0)).toBe(true);
    expect(result.rows.every((row) => row.errors.length === 0)).toBe(true);
    const payloadRows = buildImportPayload(null, result.rows).rows;
    expect(payloadRows.every((row) => !("difficulty" in row))).toBe(true);
    expect(payloadRows.every((row) => !("bloomLevel" in row))).toBe(true);
  });

  it("rejects documentation placeholder domains before backend commit", async () => {
    const file = createTemplateImportFile([{
      question_text: "Question with fake media",
      question_type: "single_choice",
      option_a: "A",
      option_b: "B",
      correct_answer: "A",
      image_files: "https://example.com/question.png",
    }]);

    const result = await parseImportFile(file);

    expect(result.rows[0].errors).toContain(
      "Image media URL must point to a real, publicly accessible media file",
    );
  });

  it("does not require a module column because scope comes from the page URL", async () => {
    const parsed = await parseImportFile(createTemplateImportFile([{
      question_text: "Course question",
      question_type: "single_choice",
      option_a: "A",
      option_b: "B",
      correct_answer: "A",
    }]));

    const rows = revalidateImportRows(parsed.rows, []);

    expect(rows[0].errors).toEqual([]);
    expect(rows[0].data.moduleId).toBeNull();
  });

  it("accepts optional module fields from imported Excel rows", async () => {
    const parsed = await parseImportFile(createTemplateImportFile([{
      question_text: "Question for the active module",
      question_type: "single_choice",
      option_a: "A",
      option_b: "B",
      correct_answer: "A",
      module_id: "11111111-1111-1111-1111-111111111111",
    }]));

    const rows = revalidateImportRows(parsed.rows, []);
    const payload = buildImportPayload(null, rows);

    expect(rows[0].data.moduleId).toBe("11111111-1111-1111-1111-111111111111");
    expect(rows[0].raw.module_id).toBe("11111111-1111-1111-1111-111111111111");
    expect(payload.rows[0].moduleId).toBe("11111111-1111-1111-1111-111111111111");
    expect(rows[0].errors).toEqual([]);
  });

  it("rejects multiple choice imports with only one correct answer", async () => {
    const parsed = await parseImportFile(createTemplateImportFile([{
      question_text: "Question with a single correct option",
      question_type: "multiple_choice",
      option_a: "A",
      option_b: "B",
      option_c: "C",
      option_d: "D",
      correct_answer: "A",
    }]));

    expect(parsed.rows[0].errors).toContain(
      "Multiple choice correct answer must include at least two letters, such as A,C",
    );
    expect(parsed.rows[0].data.questionType).toBe("multiple_choice");
  });

  it("defaults missing question type to single choice", async () => {
    const parsed = await parseImportFile(createTemplateImportFile([{
      question_text: "Question without explicit type",
      option_a: "A",
      option_b: "B",
      correct_answer: "A",
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
