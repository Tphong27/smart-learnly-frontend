import { AdminFilterToolbar } from "@/features/admin/components/AdminFilterToolbar";
import { SearchInput } from "@/shared/components/ui";
import { QUESTION_TYPE_OPTIONS } from "../utils/questionFormUtils";

/** Hiển thị bộ lọc tìm kiếm, loại, trạng thái và (tuỳ chọn) module của câu hỏi. */
export function QuestionBankFilters({
    search,
    type,
    status,
    moduleFilter = "all",
    modules = [],
    showModuleFilter = false,
    onSearchChange,
    onApply,
    onClear,
}) {
    const searchField = (
        <SearchInput
            id="question-list-search"
            ariaLabel="Search questions"
            placeholder="Search questions..."
            value={search}
            onChange={onSearchChange}
        />
    );

    const fields = [
        ...(showModuleFilter
            ? [
                  {
                      name: "moduleFilter",
                      label: "Module",
                      type: "select",
                      value: moduleFilter,
                      defaultValue: "all",
                      options: [
                          { value: "all", label: "All modules" },
                          ...modules.map((module) => ({
                              value: String(module.id),
                              label: module.title,
                          })),
                      ],
                  },
              ]
            : []),
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
    ];

    return (
        <AdminFilterToolbar
            ariaLabel="Question search and filters"
            search={searchField}
            fields={fields}
            activeFilterCount={
                [
                    showModuleFilter && moduleFilter !== "all",
                    type !== "all",
                    status !== "all",
                ].filter(Boolean).length
            }
            canClear={Boolean(
                search.trim() ||
                    (showModuleFilter && moduleFilter !== "all") ||
                    type !== "all" ||
                    status !== "all",
            )}
            onApply={onApply}
            onClear={onClear}
        />
    );
}
