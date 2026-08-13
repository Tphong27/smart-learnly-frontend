import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { CourseProgressCard } from "./CourseProgressCard";

function progressMetric(completed = 0, total = 0, percent = 0) {
  return { completed, total, percent };
}

function course(overrides = {}) {
  return {
    courseId: "course-1",
    title: "Course One",
    categoryName: "Category",
    courseStatus: "IN_PROGRESS",
    overallPercent: 30,
    accessAllowed: true,
    learningType: "COURSE",
    lesson: progressMetric(1, 3, 33),
    quiz: progressMetric(0, 1, 0),
    flashcard: progressMetric(1, 2, 50),
    assignment: progressMetric(0, 0, 0),
    ...overrides,
  };
}

async function openDetails() {
  await userEvent.click(screen.getByRole("button", { name: /view details/i }));
}

describe("CourseProgressCard flashcard navigation", () => {
  it("routes online course flashcard metrics to the learning workspace", async () => {
    render(
      <MemoryRouter>
        <CourseProgressCard course={course()} />
      </MemoryRouter>,
    );

    await openDetails();

    const flashcardLink = screen.getByRole("link", { name: /flashcards/i });
    expect(flashcardLink).toHaveAttribute("href", "/learning/courses/course-1");
    expect(flashcardLink).not.toHaveAttribute("href", expect.stringContaining("/flashcards"));
  });

  it("preserves classId when routing class course flashcard metrics", async () => {
    render(
      <MemoryRouter>
        <CourseProgressCard
          course={course({
            courseId: "course-2",
            classId: "class-2",
            className: "Class Two",
            learningType: "CLASS",
          })}
        />
      </MemoryRouter>,
    );

    await openDetails();

    const flashcardLink = screen.getByRole("link", { name: /flashcards/i });
    expect(flashcardLink).toHaveAttribute(
      "href",
      "/learning/courses/course-2?classId=class-2",
    );
    expect(flashcardLink).not.toHaveAttribute("href", expect.stringContaining("/flashcards"));
  });
});
