import { Search } from "lucide-react";
import { AdminFilterToolbar } from "@/features/admin/components/AdminFilterToolbar";
import { FormField } from "@/shared/components/ui";
import { QUESTION_TYPE_OPTIONS } from "../utils/questionFormUtils";

/** Hiển thị bộ lọc đơn giản cho course questions hoặc đầy đủ cho question bank. */
export function QuestionBankFilters({
  courseMode,
  modules,
  search,
  moduleId,
  type,
  status,
  difficulty,
  resultCount,
  onSearchChange,
  onModuleChange,
  onApply,
  onClear,
}) {
  const searchField = (
    <FormField
      id="question-list-search"
      aria-label="Search questions"
      placeholder="Search questions..."
      value={search}
      onChange={(event) => onSearchChange(event.target.value)}
      leftIcon={<Search size={16} />}
    />
  );

  if (courseMode) {
    return (
      <div
        className="admin-toolbar admin-toolbar--filter-popover"
        role="search"
        aria-label="Question search and module filter"
      >
        <div className="admin-filter-bar question-module-filter-bar">
          <div className="admin-filter-bar__search">{searchField}</div>
          <div className="admin-filter-bar__actions question-module-filter-bar__actions">
            <label className="question-module-filter" htmlFor="question-module-filter">
              <span>Module</span>
              <select
                id="question-module-filter"
                className="admin-toolbar__select"
                value={moduleId}
                onChange={(event) => onModuleChange(event.target.value)}
              >
                <option value="all">All modules</option>
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>{module.title}</option>
                ))}
              </select>
            </label>
            <span className="admin-toolbar__meta" aria-live="polite">
              {resultCount} questions
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminFilterToolbar
      ariaLabel="Question search and filters"
      search={searchField}
      fields={[
        {
          name: "moduleId",
          label: "Module",
          type: "select",
          value: moduleId,
          defaultValue: "all",
          options: [
            { value: "all", label: "All modules" },
            ...modules.map((module) => ({ value: module.id, label: module.title })),
          ],
        },
        {
          name: "type",
          label: "Question type",
          type: "select",
          value: type,
          defaultValue: "all",
          options: [
            { value: "all", label: "All types" },
            ...QUESTION_TYPE_OPTIONS,
          ],
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          value: status,
          defaultValue: "all",
          options: [
            { value: "all", label: "All statuses" },
            { value: "draft", label: "Draft" },
            { value: "approved", label: "Approved" },
            { value: "archived", label: "Archived" },
          ],
        },
        {
          name: "difficulty",
          label: "Difficulty",
          type: "select",
          value: difficulty,
          defaultValue: "all",
          options: [
            { value: "all", label: "All difficulties" },
            ...[1, 2, 3, 4, 5].map((level) => ({
              value: String(level),
              label: String(level),
            })),
          ],
        },
      ]}
      activeFilterCount={[
        moduleId !== "all",
        type !== "all",
        status !== "all",
        difficulty !== "all",
      ].filter(Boolean).length}
      canClear={Boolean(
        search.trim() ||
        moduleId !== "all" ||
        type !== "all" ||
        status !== "all" ||
        difficulty !== "all"
      )}
      resultLabel={`${resultCount} questions`}
      onApply={onApply}
      onClear={onClear}
    />
  );
}
