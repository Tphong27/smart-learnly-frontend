import { describe, expect, it } from "vitest";
import {
  answersLabel,
  normalizeTextForDuplicate,
  toPlainText,
} from "./flashcardStagingUtils";

describe("flashcard staging content normalization", () => {
  it("renders course-question HTML and non-breaking spaces as plain text", () => {
    expect(toPlainText("<p>Học&nbsp;viên&nbsp;bắt&nbsp;buộc</p>")).toBe(
      "Học viên bắt buộc",
    );
  });

  it("decodes content that was HTML-encoded more than once", () => {
    expect(
      toPlainText("&lt;p&gt;Theo&amp;nbsp;tài&amp;nbsp;liệu&lt;/p&gt;"),
    ).toBe("Theo tài liệu");
  });

  it("normalizes answer previews and duplicate signatures consistently", () => {
    const question = {
      answers: [
        { answerText: "<p>True</p>", correct: false },
        { answerText: "<p>False&nbsp;</p>", correct: true },
      ],
    };

    expect(answersLabel(question)).toBe("True; False (correct)");
    expect(normalizeTextForDuplicate("<p>HỌC&nbsp;VIÊN</p>")).toBe(
      "học viên",
    );
  });
});
