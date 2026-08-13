import { sanitizeQuestionHtml } from "@/shared/utils/htmlSanitizer";
import { StatusBadge } from "@/shared/components/status";
import { aiDraftDisplayStatus } from "../utils/aiQuestionDrafts";
import { questionTypeLabel } from "../utils/questionFormUtils";

/** Hiển thị cấu trúc hàng bảng dùng chung cho draft ở bước tạo và review. */
export function AiQuestionDraftTableRow({
    draft,
    selected,
    selectable,
    mutating,
    onToggle,
    details,
    actions,
}) {
    const displayStatus = aiDraftDisplayStatus(draft);

    return (
        <tr
            className={`ai-generated-table__row ai-generated-table__row--${draft.validationStatus}`}
        >
            <td className="ai-generated-table__select">
                <input
                    type="checkbox"
                    checked={selected}
                    disabled={!selectable || mutating}
                    onChange={onToggle}
                    aria-label={`Select draft ${draft.rowNumber}`}
                />
            </td>
            <td className="ai-generated-table__content">
                <div
                    className="ai-draft-row__question question-rich-text-viewer"
                    dangerouslySetInnerHTML={{
                        __html: sanitizeQuestionHtml(draft.questionText),
                    }}
                />
                {details}
            </td>
            <td>{questionTypeLabel(draft.questionType)}</td>
            <td className="ai-generated-table__status">
                <StatusBadge
                    status={draft.status}
                    label={displayStatus.label}
                    tone={
                        displayStatus.tone === "ready" || displayStatus.tone === "accepted"
                            ? "success"
                            : displayStatus.tone === "warning"
                              ? "warning"
                              : "danger"
                    }
                />
            </td>
            <td>{actions}</td>
        </tr>
    );
}
