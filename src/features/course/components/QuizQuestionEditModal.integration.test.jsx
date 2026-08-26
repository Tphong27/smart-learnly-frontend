import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/shared/components/ui";
import { setAuthSession } from "@/services/api-client";
import { QuizQuestionEditModal } from "./QuizQuestionEditModal";

vi.mock("@/features/course", () => ({
  courseAdminService: { get: vi.fn() },
}));

describe("Quiz question shared edit modal", () => {
  beforeEach(() => {
    setAuthSession({ accessToken: "sme-token", user: { role: "SME" } });
  });

  /** Render modal trong đầy đủ router và toast context của form dùng chung. */
  function renderModal(question, onSubmit = vi.fn().mockResolvedValue(true)) {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <ToastProvider>
          <QuizQuestionEditModal
            open
            question={question}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        </ToastProvider>
      </MemoryRouter>,
    );
    return { onClose, onSubmit };
  }

  it("uses the standard question authoring UI and preserves choice quiz schema", async () => {
    const { onClose, onSubmit } = renderModal({
      title: "<p>Which answer is correct?</p>",
      type: "single_choice",
      explain_question: "<p>Because it is correct.</p>",
      options: ["Correct", "Wrong"],
      correct_answers: [1],
    });

    expect(await screen.findByRole("heading", { name: "Question text" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Bold" })).toHaveLength(2);
    expect(screen.queryByText("Question title")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save question" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.stringContaining("Which"),
      type: "single_choice",
      options: ["Correct", "Wrong"],
      correct_answers: [1],
    })));
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps fill-in-the-blank answers when using the shared UI", async () => {
    const { onSubmit } = renderModal({
      title: "Complete the sentence",
      type: "fill_in_the_blank",
      explain_question: "",
      correct_answers: ["first", "second"],
    });

    expect(await screen.findByRole("option", { name: "Fill in the blank" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save question" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      type: "fill_in_the_blank",
      correct_answers: ["first", "second"],
    })));
  });
});
