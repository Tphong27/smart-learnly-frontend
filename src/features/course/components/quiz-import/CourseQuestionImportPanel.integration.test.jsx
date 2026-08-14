import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseQuestionImportPanel } from "./CourseQuestionImportPanel";

const questionBankMocks = vi.hoisted(() => ({
  listCourseQuestions: vi.fn(),
  listModuleQuestions: vi.fn(),
  getCourseQuestion: vi.fn(),
  getModuleQuestion: vi.fn(),
}));

vi.mock("@/features/admin/question-bank", () => ({
  questionBankService: questionBankMocks,
}));

describe("Course question import panel integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    questionBankMocks.listModuleQuestions.mockResolvedValue({
      items: [
        {
          questionId: "approved-question",
          questionText: "Approved question",
          questionType: "single_choice",
          status: "approved",
          answers: [],
        },
        {
          questionId: "draft-question",
          questionText: "Draft question",
          questionType: "single_choice",
          status: "draft",
          answers: [],
        },
      ],
      page: 0,
      totalPages: 1,
      totalItems: 1,
    });
  });

  it("FE-IT-COURSE-QUESTION-001 - requests and displays approved questions only", async () => {
    render(
      <CourseQuestionImportPanel
        courseId="course-1"
        moduleId="module-1"
        onImport={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(questionBankMocks.listModuleQuestions).toHaveBeenCalledWith(
        "course-1",
        "module-1",
        expect.objectContaining({
          includeArchived: false,
          status: "approved",
        }),
      ),
    );

    expect(await screen.findByText("Approved question")).toBeInTheDocument();
    expect(screen.queryByText("Draft question")).not.toBeInTheDocument();
  });

  it("FE-IT-COURSE-QUESTION-002 - falls back to the course pool for a class-only module", async () => {
    questionBankMocks.listCourseQuestions.mockResolvedValue({
      items: [],
      page: 0,
      totalPages: 1,
      totalItems: 0,
    });

    render(
      <CourseQuestionImportPanel
        courseId="course-1"
        moduleId={null}
        onImport={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(questionBankMocks.listCourseQuestions).toHaveBeenCalledWith(
        "course-1",
        expect.objectContaining({ status: "approved" }),
      ),
    );
    expect(questionBankMocks.listModuleQuestions).not.toHaveBeenCalled();
  });

  it("FE-IT-COURSE-QUESTION-003 - hides attached questions and shows them again after detach", async () => {
    const props = {
      courseId: "course-1",
      moduleId: "module-1",
      onImport: vi.fn(),
      onClose: vi.fn(),
    };
    const { rerender } = render(
      <CourseQuestionImportPanel
        {...props}
        existingQuestions={[
          {
            questionId: "approved-question",
            questionText: "Approved question",
            questionType: "single_choice",
            answers: [],
          },
        ]}
      />,
    );

    expect(
      await screen.findByText("No approved questions are available for this quiz."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Approved question")).not.toBeInTheDocument();

    rerender(
      <CourseQuestionImportPanel {...props} existingQuestions={[]} />,
    );

    expect(await screen.findByText("Approved question")).toBeInTheDocument();
  });
});
