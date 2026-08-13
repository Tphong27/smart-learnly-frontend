import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  Alert,
  ConfirmDialog,
  DataTable,
  IconButton,
  Input,
  PasswordField,
  RadioGroup,
  SearchInput,
  Tabs,
} from "@/shared/components/ui";

function SearchHarness() {
  const [value, setValue] = useState("course");
  return <SearchInput value={value} onChange={setValue} ariaLabel="Search courses" />;
}

/** Mô phỏng tab dọc có state điều khiển để kiểm tra keyboard navigation. */
function TabsHarness() {
  const [value, setValue] = useState("info");
  return (
    <Tabs
      items={[
        { value: "info", label: "Personal information" },
        { value: "password", label: "Change password" },
      ]}
      value={value}
      onChange={setValue}
      orientation="vertical"
      variant="navigation"
    />
  );
}

describe("Shared UI component integration", () => {
  it("FE-IT-UI-001 - danger alert is announced as an alert", () => {
    render(<Alert tone="danger" title="Could not save">Try again.</Alert>);

    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
    expect(screen.getByRole("alert")).toHaveTextContent("Try again.");
  });

  it("FE-IT-UI-002 - search input exposes a clear action", () => {
    render(<SearchHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("searchbox", { name: "Search courses" })).toHaveValue("");
  });

  it("FE-IT-UI-003 - icon button keeps an accessible name", () => {
    render(<IconButton icon={<span>×</span>} label="Remove item" />);

    expect(screen.getByRole("button", { name: "Remove item" })).toBeEnabled();
  });

  it("FE-IT-UI-004 - data table renders configured headers and mobile labels", () => {
    render(
      <DataTable
        columns={[{ key: "name", header: "Course" }]}
        rows={[{ id: "course-1", name: "React Basics" }]}
        ariaLabel="Course data"
      />,
    );

    expect(screen.getByRole("region", { name: "Course data" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Course" })).toBeInTheDocument();
    expect(screen.getByText("React Basics").closest("td")).toHaveAttribute("data-label", "Course");
  });

  it("FE-IT-UI-005 - confirm dialog invokes its primary action", () => {
    const handleConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Delete course?"
        confirmLabel="Delete course"
        onClose={() => undefined}
        onConfirm={handleConfirm}
      >
        This cannot be undone.
      </ConfirmDialog>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete course" }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it("FE-IT-UI-006 - input error is announced and linked to the control", () => {
    render(<Input id="lesson-title" label="Title" error="Title is required" />);

    expect(screen.getByRole("textbox", { name: "Title" })).toHaveAttribute(
      "aria-describedby",
      "lesson-title-error",
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Title is required");
  });

  it("FE-IT-UI-007 - radio group reports the selected semantic option", () => {
    const handleChange = vi.fn();
    render(
      <RadioGroup
        legend="Status"
        name="lesson-status"
        value="draft"
        options={[
          { value: "draft", label: "Draft" },
          { value: "published", label: "Published" },
        ]}
        onChange={handleChange}
      />,
    );

    expect(screen.getByRole("radio", { name: "Draft" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Published" }));
    expect(handleChange).toHaveBeenCalledWith("published", expect.anything());
  });

  it("FE-IT-UI-008 - vertical tabs move selection and focus with arrow keys", () => {
    render(<TabsHarness />);

    const infoTab = screen.getByRole("tab", { name: "Personal information" });
    const passwordTab = screen.getByRole("tab", { name: "Change password" });
    infoTab.focus();
    fireEvent.keyDown(infoTab, { key: "ArrowDown" });

    expect(passwordTab).toHaveAttribute("aria-selected", "true");
    expect(passwordTab).toHaveFocus();
    expect(infoTab).toHaveAttribute("tabindex", "-1");
  });

  it("FE-IT-UI-009 - password field toggles visibility with an accessible action", () => {
    render(<PasswordField label="Password" />);

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
