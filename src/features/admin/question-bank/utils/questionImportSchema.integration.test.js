import { describe, expect, it } from "vitest";
import {
  parseImportJson,
  revalidateImportRows,
  SAMPLE_QUESTION_BANK_JSON,
} from "./questionImportSchema";

describe("question import schema", () => {
  it("keeps bundled sample rows free from fake media URLs", () => {
    const result = parseImportJson(SAMPLE_QUESTION_BANK_JSON);

    expect(result.rows).toHaveLength(3);
    expect(result.rows.every((row) => row.data.imageFiles.length === 0)).toBe(true);
    expect(result.rows.every((row) => row.data.audioFiles.length === 0)).toBe(true);
    expect(result.rows.every((row) => row.errors.length === 0)).toBe(true);
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
    expect(rows[0].data).not.toHaveProperty("moduleId");
  });

  it("ignores legacy module fields from imported JSON", () => {
    const parsed = parseImportJson(JSON.stringify([{
      questionText: "Question for the active module",
      questionType: "single_choice",
      options: ["A", "B"],
      correctAnswer: "A",
      moduleId: "module-from-file",
    }]));

    const rows = revalidateImportRows(parsed.rows, []);

    expect(rows[0].data).not.toHaveProperty("moduleId");
    expect(rows[0].raw).not.toHaveProperty("module_id");
    expect(rows[0].errors).toEqual([]);
  });
});
