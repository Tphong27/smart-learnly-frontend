import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CurriculumStructureEditor } from "./CurriculumStructureEditor";

const section = {
  id: "section-1",
  moduleId: "module-1",
  title: "Introduction",
  sortOrder: 0,
  lessons: [],
};

function renderEditor(overrides = {}) {
  const props = {
    sections: [section],
    getLessons: (item) => item.lessons,
    isSectionLessonsLoading: () => false,
    stats: { totalSections: 1, totalLessons: 0 },
    onCreateLesson: vi.fn().mockResolvedValue(true),
    ...overrides,
  };

  render(<CurriculumStructureEditor {...props} />);
  return props;
}

describe("Curriculum structure editor integration", () => {
  it("FE-IT-CURRICULUM-001 - creates a draft directly without opening the lesson modal", async () => {
    const props = renderEditor({ openLessonEditorOnCreate: true });

    fireEvent.click(screen.getByRole("button", { name: "Add lesson" }));

    await waitFor(() => {
      expect(props.onCreateLesson).toHaveBeenCalledWith("section-1", {
        title: "Untitled lesson",
        lessonType: "rich_text",
        isPreview: false,
        status: "draft",
        durationSeconds: 0,
      });
    });
    expect(screen.queryByText("Add new lesson")).not.toBeInTheDocument();
  });

  it("FE-IT-CURRICULUM-002 - forwards Manage questions with the source module", () => {
    const onManageModuleQuestions = vi.fn();
    renderEditor({ onManageModuleQuestions });

    fireEvent.click(screen.getByRole("button", { name: "Manage questions" }));

    expect(onManageModuleQuestions).toHaveBeenCalledWith(section);
  });

  it("FE-IT-CURRICULUM-003 - hides Manage questions when no action is available", () => {
    renderEditor();

    expect(
      screen.queryByRole("button", { name: "Manage questions" }),
    ).not.toBeInTheDocument();
  });
});
