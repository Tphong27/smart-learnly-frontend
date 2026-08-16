import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuestionBankFilters } from "./QuestionBankFilters";

describe("Question bank filters integration", () => {
  it("FE-IT-QUESTION-FILTER-001 - exposes type and status filters", () => {
    const handleApply = vi.fn();
    render(
      <QuestionBankFilters
        search=""
        type="all"
        status="all"
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
    expect(screen.queryByRole("combobox", { name: "Difficulty" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(handleApply).toHaveBeenCalledWith({
      type: "multiple_choice",
      status: "approved",
    });
  });
});
