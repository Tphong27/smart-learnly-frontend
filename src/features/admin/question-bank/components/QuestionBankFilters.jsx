import { AdminFilterToolbar } from "@/features/admin/components/AdminFilterToolbar";
import { SearchInput } from "@/shared/components/ui";
import { QUESTION_TYPE_OPTIONS } from "../utils/questionFormUtils";

/** Hiển thị bộ lọc tìm kiếm, loại, trạng thái và độ khó của câu hỏi. */
export function QuestionBankFilters({
    search,
    type,
    status,
    difficulty,
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

    return (
        <AdminFilterToolbar
            ariaLabel="Question search and filters"
            search={searchField}
            fields={[
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
            activeFilterCount={
                [
                    type !== "all",
                    status !== "all",
                    difficulty !== "all",
                ].filter(Boolean).length
            }
            canClear={Boolean(
                search.trim() ||
                type !== "all" ||
                status !== "all" ||
                difficulty !== "all",
            )}
            onApply={onApply}
            onClear={onClear}
        />
    );
}
