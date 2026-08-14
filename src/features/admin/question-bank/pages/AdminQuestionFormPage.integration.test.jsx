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
  difficulty: "",
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
    setAuthSession({ accessToken: "admin-token", user: { role: "ADMIN" } });
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
