import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TrainerLessonDetailPage from "./TrainerLessonDetailPage";

const mocks = vi.hoisted(() => ({
  getTrainer: vi.fn(),
  lessonDetailTabs: vi.fn(),
}));

vi.mock("../services/classroomService", () => ({
  classroomService: {
    getTrainer: mocks.getTrainer,
    getAdmin: vi.fn(),
  },
}));

vi.mock("../services/trainerLessonService", () => ({
  createTrainerLessonService: () => ({}),
}));

vi.mock("../services/trainerQuizService", () => ({
  createTrainerQuizService: () => ({}),
}));

vi.mock("../services/trainerFlashcardService", () => ({
  createTrainerFlashcardService: () => ({}),
}));

vi.mock("@/shared/utils/auth", () => ({
  getCurrentRole: () => "trainer",
}));

vi.mock("@/features/course/components/lesson-editor/LessonDetailTabs", () => ({
  LessonDetailTabs: ({ context }) => {
    mocks.lessonDetailTabs(context);
    return <div>Lesson detail ready</div>;
  },
}));

describe("TrainerLessonDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTrainer.mockResolvedValue({ courseId: "course-1" });
  });

  it("enables flashcard import for a trainer class lesson", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/staff/classrooms/class-1/curriculum/lessons/lesson-1",
        ]}
      >
        <Routes>
          <Route
            path="/staff/classrooms/:classId/curriculum/lessons/:lessonId"
            element={<TrainerLessonDetailPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Lesson detail ready")).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.lessonDetailTabs).toHaveBeenCalledWith(
        expect.objectContaining({
          features: expect.objectContaining({
            flashcard: true,
            flashcardStaging: true,
          }),
        }),
      );
    });
  });
});
