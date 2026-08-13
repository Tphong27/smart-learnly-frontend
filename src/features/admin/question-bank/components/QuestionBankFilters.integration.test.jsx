import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuestionBankFilters } from "./QuestionBankFilters";

describe("Question bank filters integration", () => {
  it("FE-IT-QUESTION-FILTER-001 - exposes type, status and difficulty filters", () => {
    const handleApply = vi.fn();
    render(
      <QuestionBankFilters
        search=""
        type="all"
        status="all"
        difficulty="all"
        onSearchChange={vi.fn()}
        onApply={handleApply}
        onClear={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    fireEvent.change(screen.getByRole("combobox", { name: "Question type" }), {
      target: { value: "multiple_choice" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Status" }), {
      target: { value: "approved" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Difficulty" }), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(handleApply).toHaveBeenCalledWith({
      type: "multiple_choice",
      status: "approved",
      difficulty: "3",
    });
  });
});
