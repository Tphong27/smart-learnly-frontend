import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/shared/components/ui";
import { setAuthSession } from "@/services/api-client";
import { questionBankService } from "@/features/admin/question-bank";
import { AdminQuestionForm } from "./AdminQuestionFormPage";

vi.mock("@/features/course", () => ({
  courseAdminService: { get: vi.fn() },
}));

const MEDIA_CASES = [
  { mediaType: "image", contentType: "image/jpeg", fileName: "answer.jpg" },
  { mediaType: "audio", contentType: "audio/mpeg", fileName: "answer.mp3" },
  { mediaType: "video", contentType: "video/mp4", fileName: "answer.mp4" },
];

const initialValues = {
  questionText: "Which answer is correct?",
  questionType: "single_choice",
  status: "draft",
  explanation: "",
  answers: [
    { answerText: "Correct answer", correct: true, displayOrder: 1 },
    { answerText: "Wrong answer", correct: false, displayOrder: 2 },
  ],
};

const originalCreateObjectUrl = URL.createObjectURL;
const originalRevokeObjectUrl = URL.revokeObjectURL;

/** Render form tạo question trong đầy đủ router và toast context. */
function renderQuestionForm(onSaved, values = initialValues, props = {}) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AdminQuestionForm
          bankId="bank-1"
          initialValues={values}
          framed={false}
          onSaved={onSaved}
          {...props}
        />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("Admin question answer media integration", () => {
  beforeEach(() => {
    setAuthSession({ accessToken: "sme-token", user: { role: "SME" } });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:answer-media-preview"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(questionBankService, "getBank").mockResolvedValue({
      bankId: "bank-1",
      name: "Default bank",
      status: "active",
    });
    vi.spyOn(questionBankService, "createQuestion").mockResolvedValue({
      questionId: "question-1",
      answers: [
        { answerId: "answer-1" },
        { answerId: "answer-2" },
      ],
    });
    vi.spyOn(questionBankService, "uploadAnswerMedia").mockResolvedValue({
      attachmentId: "attachment-1",
    });
  });

  afterEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectUrl,
    });
    vi.restoreAllMocks();
  });

  it.each(MEDIA_CASES)(
    "FE-IT-QUESTION-ANSWER-MEDIA-001 - uploads $mediaType after creating answer IDs",
    async ({ mediaType, contentType, fileName }) => {
      const onSaved = vi.fn();
      const file = new File(["answer media"], fileName, { type: contentType });
      const { container } = renderQuestionForm(onSaved);

      await screen.findByRole("button", { name: "Save" });
      const input = container.querySelector(
        `.question-authoring-answer input[type="file"][accept*="${contentType}"]`,
      );
      expect(input).not.toBeNull();

      fireEvent.change(input, { target: { files: [file] } });

      expect(screen.getByText(new RegExp(`${mediaType} / Ready to upload`, "i"))).toBeInTheDocument();
      expect(screen.queryByText(/Uploading\.\.\./i)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => {
        expect(questionBankService.uploadAnswerMedia).toHaveBeenCalledWith(
          "question-1",
          "answer-1",
          mediaType,
          file,
        );
      });
      expect(onSaved).toHaveBeenCalled();
      expect(questionBankService.createQuestion.mock.invocationCallOrder[0]).toBeLessThan(
        questionBankService.uploadAnswerMedia.mock.invocationCallOrder[0],
      );
    },
  );

  it("FE-IT-QUESTION-ANSWER-MEDIA-002 - does not submit an invalid question", async () => {
    const onSaved = vi.fn();
    renderQuestionForm(onSaved, { ...initialValues, questionText: "" });

    fireEvent.click(await screen.findByRole("button", { name: "Save" }));

    expect(await screen.findByText("Question text is required.")).toBeInTheDocument();
    expect(questionBankService.createQuestion).not.toHaveBeenCalled();
    expect(questionBankService.uploadAnswerMedia).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("FE-IT-QUESTION-TYPE-001 - saves single choice with two filled answers and ignores blank choice rows", async () => {
    const onSaved = vi.fn();
    renderQuestionForm(onSaved, {
      ...initialValues,
      questionType: "single_choice",
      answers: [
        { answerText: "Correct answer", correct: true, displayOrder: 1 },
        { answerText: "Wrong answer", correct: false, displayOrder: 2 },
        { answerText: "", correct: false, displayOrder: 3 },
        { answerText: "", correct: false, displayOrder: 4 },
      ],
    });

    fireEvent.click(await screen.findByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(questionBankService.createQuestion).toHaveBeenCalled();
    });
    const payload = questionBankService.createQuestion.mock.calls.at(-1)[0];
    expect(payload.questionType).toBe("single_choice");
    expect(payload.answers).toEqual([
      expect.objectContaining({ answerText: "Correct answer", correct: true }),
      expect.objectContaining({ answerText: "Wrong answer", correct: false }),
    ]);
  });

  it("FE-IT-QUESTION-TYPE-002 - saves multiple choice when at least two filled answers are correct", async () => {
    const onSaved = vi.fn();
    renderQuestionForm(onSaved, {
      ...initialValues,
      questionType: "multiple_choice",
      answers: [
        { answerText: "Correct answer 1", correct: true, displayOrder: 1 },
        { answerText: "Correct answer 2", correct: true, displayOrder: 2 },
        { answerText: "", correct: false, displayOrder: 3 },
        { answerText: "", correct: false, displayOrder: 4 },
      ],
    });

    fireEvent.click(await screen.findByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(questionBankService.createQuestion).toHaveBeenCalled();
    });
    const payload = questionBankService.createQuestion.mock.calls.at(-1)[0];
    expect(payload.questionType).toBe("multiple_choice");
    expect(payload.answers).toHaveLength(2);
    expect(payload.answers.filter((answer) => answer.correct)).toHaveLength(2);
  });

  it("FE-IT-QUESTION-TYPE-003 - blocks multiple choice with only one correct answer", async () => {
    const onSaved = vi.fn();
    renderQuestionForm(onSaved, {
      ...initialValues,
      questionType: "multiple_choice",
      answers: [
        { answerText: "Correct answer", correct: true, displayOrder: 1 },
        { answerText: "Wrong answer", correct: false, displayOrder: 2 },
      ],
    });

    fireEvent.click(await screen.findByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("Multiple choice requires at least two correct answers."),
    ).toBeInTheDocument();
    expect(questionBankService.createQuestion).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("FE-IT-QUESTION-TYPE-004 - saves true false with exactly True and False answers", async () => {
    const onSaved = vi.fn();
    renderQuestionForm(onSaved, {
      ...initialValues,
      questionType: "true_false",
      answers: [
        { answerText: "True", correct: false, displayOrder: 1 },
        { answerText: "False", correct: true, displayOrder: 2 },
        { answerText: "Extra answer", correct: false, displayOrder: 3 },
      ],
    });

    fireEvent.click(await screen.findByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(questionBankService.createQuestion).toHaveBeenCalled();
    });
    const payload = questionBankService.createQuestion.mock.calls.at(-1)[0];
    expect(payload.questionType).toBe("true_false");
    expect(payload.answers).toEqual([
      expect.objectContaining({ answerText: "True", correct: false }),
      expect.objectContaining({ answerText: "False", correct: true }),
    ]);
  });

  it("FE-IT-QUESTION-METADATA-002 - marks only truly required create fields", async () => {
    const onSaved = vi.fn();
    const { container } = renderQuestionForm(onSaved);

    await screen.findByRole("button", { name: "Save" });

    expect(screen.getByRole("combobox", { name: /Question type/ })).toHaveAttribute(
      "aria-required",
      "true",
    );
    expect(screen.getByRole("combobox", { name: "Status" })).not.toHaveAttribute(
      "aria-required",
    );
    const requiredHeadings = [...container.querySelectorAll("h2")]
      .filter((heading) => heading.querySelector(".input-field__required"))
      .map((heading) => heading.textContent.trim());
    expect(requiredHeadings).toEqual(["Question text*", "Answers*"]);
  });

  it("FE-IT-QUESTION-METADATA-001 - hides legacy difficulty and omits it on save", async () => {
    const onSaved = vi.fn();
    renderQuestionForm(onSaved, { ...initialValues, difficulty: "5" });

    const saveButton = await screen.findByRole("button", { name: "Save" });

    expect(screen.queryByRole("combobox", { name: "Difficulty" })).not.toBeInTheDocument();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(questionBankService.createQuestion).toHaveBeenCalled();
    });
    expect(questionBankService.createQuestion.mock.calls[0][0]).not.toHaveProperty("difficulty");
  });

  it("FE-IT-QUESTION-ANSWER-MEDIA-003 - reports an answer media upload failure", async () => {
    const onSaved = vi.fn();
    const file = new File(["answer image"], "answer.jpg", { type: "image/jpeg" });
    questionBankService.uploadAnswerMedia.mockRejectedValueOnce(new Error("R2 unavailable"));
    const { container } = renderQuestionForm(onSaved);

    await screen.findByRole("button", { name: "Save" });
    const input = container.querySelector(
      '.question-authoring-answer input[type="file"][accept*="image/jpeg"]',
    );
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(
        "Question created, but answer media upload failed. Open the question and retry.",
      ),
    ).toBeInTheDocument();
    expect(questionBankService.uploadAnswerMedia).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  it("FE-IT-QUESTION-ANSWER-ID-001 - preserves answer IDs when editing true false", async () => {
    const onSaved = vi.fn();
    vi.spyOn(questionBankService, "getQuestion").mockResolvedValue({
      questionId: "question-1",
      bankId: "bank-1",
      questionText: "Existing statement",
      questionType: "true_false",
      status: "approved",
      answers: [
        { answerId: "answer-true", answerText: "True", correct: true, displayOrder: 1 },
        { answerId: "answer-false", answerText: "False", correct: false, displayOrder: 2 },
      ],
      mediaAttachments: [],
    });
    vi.spyOn(questionBankService, "updateQuestion").mockResolvedValue({
      questionId: "question-1",
      answers: [
        { answerId: "answer-true" },
        { answerId: "answer-false" },
      ],
    });

    renderQuestionForm(onSaved, undefined, { questionId: "question-1" });

    fireEvent.click(await screen.findByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(questionBankService.updateQuestion).toHaveBeenCalledWith(
        "question-1",
        expect.objectContaining({
          answers: [
            expect.objectContaining({ answerId: "answer-true", answerText: "True" }),
            expect.objectContaining({ answerId: "answer-false", answerText: "False" }),
          ],
        }),
      );
    });
  });
});
