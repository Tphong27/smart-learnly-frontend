import { describe, expect, it } from "vitest";
import { normalizeEditorLessonType } from "./lesson-type";

describe("normalizeEditorLessonType", () => {
  it("keeps video lessons as video", () => {
    expect(normalizeEditorLessonType("video")).toBe("VIDEO");
  });

  it("does not turn rich-text lessons into video lessons", () => {
    expect(normalizeEditorLessonType("rich_text")).toBe("RICH_TEXT");
    expect(normalizeEditorLessonType("text")).toBe("RICH_TEXT");
  });

  it("uses the safe rich-text fallback for absent or unknown values", () => {
    expect(normalizeEditorLessonType()).toBe("RICH_TEXT");
    expect(normalizeEditorLessonType("unknown")).toBe("RICH_TEXT");
  });
});
