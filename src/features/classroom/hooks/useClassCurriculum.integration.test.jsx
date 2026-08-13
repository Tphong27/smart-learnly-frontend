import { act, renderHook, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/shared/components/ui";
import { trainerCurriculumService } from "../services/trainerCurriculumService";
import { useClassCurriculum } from "./useClassCurriculum";

vi.mock("../services/trainerCurriculumService", () => ({
  trainerCurriculumService: {
    getCurriculum: vi.fn(),
    publishDraft: vi.fn(),
    createSection: vi.fn(),
    updateSection: vi.fn(),
    deleteSection: vi.fn(),
    reorderSections: vi.fn(),
    createLesson: vi.fn(),
    deleteLesson: vi.fn(),
    reorderLessons: vi.fn(),
  },
}));

const curriculum = {
  metadata: { source: "CLASS_DRAFT", curriculumScope: "CLASS" },
  binding: { customizationState: "DRAFT" },
  curriculum: {
    sections: [
      {
        id: "section-1",
        moduleId: "module-1",
        title: "Introduction",
        sortOrder: 0,
        lessons: [{ id: "lesson-1", title: "Welcome", sortOrder: 0 }],
      },
    ],
  },
};

function Wrapper({ children }) {
  return (
    <BrowserRouter>
      <ToastProvider>{children}</ToastProvider>
    </BrowserRouter>
  );
}

function renderCurriculumHook() {
  return renderHook(
    () =>
      useClassCurriculum({
        classId: "class-1",
        courseId: "course-1",
      }),
    { wrapper: Wrapper },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/staff/classrooms/class-1/workspace?tab=curriculum");
  trainerCurriculumService.getCurriculum.mockResolvedValue(curriculum);
  trainerCurriculumService.publishDraft.mockResolvedValue(curriculum);
  trainerCurriculumService.createSection.mockResolvedValue({ id: "section-2" });
  trainerCurriculumService.updateSection.mockResolvedValue({ id: "section-1" });
  trainerCurriculumService.deleteSection.mockResolvedValue(true);
  trainerCurriculumService.reorderSections.mockResolvedValue(true);
  trainerCurriculumService.createLesson.mockResolvedValue({ id: "lesson-new" });
  trainerCurriculumService.deleteLesson.mockResolvedValue(true);
  trainerCurriculumService.reorderLessons.mockResolvedValue(true);
});

describe("Class curriculum CRUD integration", () => {
  it("FE-IT-CLASS-CURRICULUM-001 - reads and mutates modules through class-scoped services", async () => {
    const { result } = renderCurriculumHook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      expect(await result.current.createSection({ title: "Advanced" })).toBe(true);
      expect(
        await result.current.updateSection("section-1", { title: "Getting started" }),
      ).toBe(true);
      expect(await result.current.reorderSections(["section-2", "section-1"])).toBe(true);
      expect(await result.current.deleteSection("section-1")).toBe(true);
      expect(await result.current.publishDraft()).toBe(true);
    });

    expect(trainerCurriculumService.createSection).toHaveBeenCalledWith("class-1", {
      title: "Advanced",
      sortOrder: 1,
    });
    expect(trainerCurriculumService.updateSection).toHaveBeenCalledWith(
      "class-1",
      "section-1",
      { title: "Getting started" },
    );
    expect(trainerCurriculumService.reorderSections).toHaveBeenCalledWith(
      "class-1",
      ["section-2", "section-1"],
    );
    expect(trainerCurriculumService.deleteSection).toHaveBeenCalledWith(
      "class-1",
      "section-1",
    );
    expect(trainerCurriculumService.publishDraft).toHaveBeenCalledWith("class-1");
  });

  it("FE-IT-CLASS-CURRICULUM-002 - creates, deletes and reorders lessons then opens the editor", async () => {
    const { result } = renderCurriculumHook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      expect(
        await result.current.createLesson("section-1", {
          title: "Untitled lesson",
          lessonType: "rich_text",
          status: "draft",
        }),
      ).toBe(true);
    });

    expect(trainerCurriculumService.createLesson).toHaveBeenCalledWith(
      "class-1",
      "section-1",
      expect.objectContaining({
        title: "Untitled lesson",
        lessonType: "rich_text",
        status: "draft",
        sortOrder: 1,
      }),
    );
    expect(window.location.pathname).toBe(
      "/staff/classrooms/class-1/curriculum/lessons/lesson-new",
    );

    await act(async () => {
      expect(await result.current.reorderLessons("section-1", ["lesson-2", "lesson-1"])).toBe(
        true,
      );
      expect(await result.current.deleteLesson("lesson-1")).toBe(true);
    });

    expect(trainerCurriculumService.reorderLessons).toHaveBeenCalledWith(
      "class-1",
      "section-1",
      ["lesson-2", "lesson-1"],
    );
    expect(trainerCurriculumService.deleteLesson).toHaveBeenCalledWith(
      "class-1",
      "lesson-1",
    );
  });

  it("FE-IT-CLASS-CURRICULUM-003 - opens the class-scoped quiz question manager", async () => {
    const { result } = renderCurriculumHook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      expect(result.current.manageLessonQuestions({ id: "quiz-lesson-1" })).toBe(true);
    });

    expect(window.location.pathname).toBe(
      "/staff/classrooms/class-1/curriculum/lessons/quiz-lesson-1",
    );
  });
});
