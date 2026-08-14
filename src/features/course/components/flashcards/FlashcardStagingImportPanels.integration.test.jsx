import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseQuestionsImportPanel } from "./FlashcardStagingImportPanels";

const flashcardMocks = vi.hoisted(() => ({
  listSourceQuestions: vi.fn(),
  importCourseQuestionsToTemporaryReview: vi.fn(),
}));
const courseContentMocks = vi.hoisted(() => ({
  getCourseContent: vi.fn(),
}));

vi.mock("@/features/flashcard", () => ({
  flashcardAuthoringService: flashcardMocks,
}));

vi.mock("../../services/courseContentService", () => ({
  courseContentService: courseContentMocks,
}));

const sourceQuestions = [
  {
    questionId: "available-question",
    questionText: "Available question",
    status: "approved",
    sourceName: "Course questions",
    answers: [],
    imported: false,
    eligibilityStatus: "AVAILABLE",
  },
  {
    questionId: "imported-question",
    questionText: "Imported question",
    status: "approved",
    sourceName: "Course questions",
    answers: [],
    imported: true,
    eligibilityStatus: "ALREADY_IMPORTED",
    eligibilityReason: "Already imported",
  },
  {
    questionId: "duplicate-question",
    questionText: "Duplicate question",
    status: "approved",
    sourceName: "Course questions",
    answers: [],
    imported: false,
    eligibilityStatus: "MATCHES_CURRENT_FLASHCARDS",
    eligibilityReason: "Matches Current Flashcards",
  },
];

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe("Course Flashcard question import availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    courseContentMocks.getCourseContent.mockResolvedValue([]);
    flashcardMocks.listSourceQuestions.mockResolvedValue(sourceQuestions);
    flashcardMocks.importCourseQuestionsToTemporaryReview.mockResolvedValue({
      cards: [],
    });
  });

  it("shows only available questions by default and excludes unavailable questions from Select all", async () => {
    render(
      <CourseQuestionsImportPanel
        setId="set-1"
        courseId="course-1"
        notify={vi.fn()}
        onTemporaryCandidates={vi.fn()}
      />,
    );

    expect(await screen.findByText("Available question")).toBeInTheDocument();
    expect(screen.queryByText("Imported question")).not.toBeInTheDocument();
    expect(screen.queryByText("Duplicate question")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Select all visible source questions"));
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /all/i }));
    const importedRow = screen.getByText("Imported question").closest("tr");
    const duplicateRow = screen.getByText("Duplicate question").closest("tr");
    expect(importedRow).not.toBeNull();
    expect(duplicateRow).not.toBeNull();
    expect(within(importedRow).getByText("Already imported")).toBeInTheDocument();
    expect(
      within(importedRow).getByLabelText("Already imported source question"),
    ).toBeDisabled();
    expect(within(duplicateRow).getByText("Matches Current Flashcards")).toBeInTheDocument();
    expect(
      within(duplicateRow).getByLabelText("Matches Current Flashcards source question"),
    ).toBeDisabled();
    expect(screen.getByText("1 selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /review selected/i }));
    await waitFor(() =>
      expect(flashcardMocks.importCourseQuestionsToTemporaryReview).toHaveBeenCalledWith(
        "set-1",
        ["available-question"],
      ),
    );

    fireEvent.click(screen.getByRole("tab", { name: /unavailable/i }));
    expect(screen.getByText("Imported question")).toBeInTheDocument();
    expect(screen.getByText("Duplicate question")).toBeInTheDocument();
    expect(screen.queryByText("Available question")).not.toBeInTheDocument();

    await waitFor(() =>
      expect(flashcardMocks.listSourceQuestions).toHaveBeenCalledWith(
        "set-1",
        expect.any(Object),
      ),
    );
  });

  it("reserves count badges and stable result space during initial load", async () => {
    const load = deferred();
    flashcardMocks.listSourceQuestions.mockReturnValueOnce(load.promise);

    const { container } = render(
      <CourseQuestionsImportPanel
        setId="set-1"
        courseId="course-1"
        notify={vi.fn()}
        onTemporaryCandidates={vi.fn()}
      />,
    );

    expect(await screen.findByText("Loading source questions...")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading source questions")).toBeInTheDocument();
    expect(
      container.querySelectorAll(".flashcard-course-question-loading__row"),
    ).toHaveLength(3);
    const countBadgesBeforeLoad = container.querySelectorAll(
      ".flashcard-course-question-availability .tabs__count",
    );
    expect(countBadgesBeforeLoad).toHaveLength(3);
    expect(
      container.querySelectorAll(".flashcard-course-question-count-placeholder"),
    ).toHaveLength(3);
    expect(
      within(screen.getByRole("tab", { name: "Available" })).queryByText("0"),
    ).not.toBeInTheDocument();

    load.resolve(sourceQuestions);
    expect(await screen.findByText("Available question")).toBeInTheDocument();
    const countBadgesAfterLoad = container.querySelectorAll(
      ".flashcard-course-question-availability .tabs__count",
    );
    expect(countBadgesAfterLoad).toHaveLength(3);
    expect(
      container.querySelectorAll(".flashcard-course-question-count-placeholder"),
    ).toHaveLength(0);
    expect(within(screen.getByRole("tab", { name: /^Available/i })).getByText("1")).toBeInTheDocument();
    expect(within(screen.getByRole("tab", { name: /^Unavailable/i })).getByText("2")).toBeInTheDocument();
    expect(within(screen.getByRole("tab", { name: /all/i })).getByText("3")).toBeInTheDocument();
  });

  it("preserves existing rows during refresh and drops selections that become unavailable", async () => {
    const { container } = render(
      <CourseQuestionsImportPanel
        setId="set-1"
        courseId="course-1"
        notify={vi.fn()}
        onTemporaryCandidates={vi.fn()}
      />,
    );

    expect(await screen.findByText("Available question")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Select all visible source questions"));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /all/i }));
    expect(screen.getByText("Imported question")).toBeInTheDocument();

    const refresh = deferred();
    flashcardMocks.listSourceQuestions.mockReturnValueOnce(refresh.promise);
    fireEvent.click(screen.getByLabelText("Refresh course questions"));

    expect(screen.getByText("Available question")).toBeInTheDocument();
    expect(screen.getByText("Imported question")).toBeInTheDocument();
    expect(screen.queryByText("Loading source questions...")).not.toBeInTheDocument();
    expect(
      container.querySelectorAll(".flashcard-course-question-loading__row"),
    ).toHaveLength(0);
    expect(screen.getByLabelText("Refresh course questions")).toHaveClass("is-refreshing");
    expect(within(screen.getByRole("tab", { name: /^Available/i })).getByText("1")).toBeInTheDocument();
    expect(within(screen.getByRole("tab", { name: /^Unavailable/i })).getByText("2")).toBeInTheDocument();
    expect(within(screen.getByRole("tab", { name: /all/i })).getByText("3")).toBeInTheDocument();
    refresh.resolve([
      {
        ...sourceQuestions[0],
        eligibilityStatus: "MATCHES_CURRENT_FLASHCARDS",
        eligibilityReason: "Matches Current Flashcards",
      },
    ]);

    await waitFor(() =>
      expect(screen.queryByText("Imported question")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("tab", { name: /all/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Available question")).toBeInTheDocument();
    expect(screen.getByText("Matches Current Flashcards")).toBeInTheDocument();
    expect(within(screen.getByRole("tab", { name: /^Available/i })).getByText("0")).toBeInTheDocument();
    expect(within(screen.getByRole("tab", { name: /^Unavailable/i })).getByText("1")).toBeInTheDocument();
    expect(within(screen.getByRole("tab", { name: /all/i })).getByText("1")).toBeInTheDocument();
    expect(screen.getByText("0 selected")).toBeInTheDocument();
  });

  it("preserves existing rows after a failed refresh", async () => {
    render(
      <CourseQuestionsImportPanel
        setId="set-1"
        courseId="course-1"
        notify={vi.fn()}
        onTemporaryCandidates={vi.fn()}
      />,
    );

    expect(await screen.findByText("Available question")).toBeInTheDocument();
    const refresh = deferred();
    flashcardMocks.listSourceQuestions.mockReturnValueOnce(refresh.promise);
    fireEvent.click(screen.getByLabelText("Refresh course questions"));
    expect(screen.getByText("Available question")).toBeInTheDocument();

    refresh.reject(new Error("Network failed"));
    await waitFor(() =>
      expect(screen.getByText("Network failed")).toBeInTheDocument(),
    );
    expect(screen.getByText("Available question")).toBeInTheDocument();
  });
});
