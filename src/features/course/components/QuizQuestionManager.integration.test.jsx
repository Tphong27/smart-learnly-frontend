import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/shared/components/ui";
import { QuizImportContext } from "./lesson-editor/quiz-import-context";
import { QuizQuestionsPanel } from "./QuizQuestionManager";

const attachedQuestion = {
  questionId: "question-1",
  questionText: "Question loaded from the class quiz API",
  questionType: "single_choice",
  orderIndex: 0,
  marks: 1,
  answers: [
    { answerText: "Correct", correct: true },
    { answerText: "Wrong", correct: false },
  ],
};

describe("Quiz question manager integration", () => {
  it("FE-IT-CLASS-QUESTIONS-002 - reads class quiz questions from the attached-question API", async () => {
    const service = {
      getLessonDetail: vi.fn().mockResolvedValue({
        id: "lesson-1",
        moduleId: "module-1",
        content: JSON.stringify({
          questions: [{ title: "Stale lesson content question" }],
        }),
      }),
      updateLesson: vi.fn(),
      getQuestions: vi.fn().mockResolvedValue([attachedQuestion]),
      attachQuestion: vi.fn(),
      detachQuestion: vi.fn(),
    };

    render(
      <ToastProvider>
        <QuizImportContext.Provider
          value={{
            bridge: { existingQuestions: [], import: null, moduleId: null },
            setBridge: vi.fn(),
            openQuestionList: vi.fn(),
          }}
        >
          <QuizQuestionsPanel lessonId="lesson-1" service={service} />
        </QuizImportContext.Provider>
      </ToastProvider>,
    );

    expect(
      await screen.findByText("Question loaded from the class quiz API"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Stale lesson content question")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Edit question 1")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(service.getQuestions).toHaveBeenCalledWith("lesson-1"),
    );
  });
});
