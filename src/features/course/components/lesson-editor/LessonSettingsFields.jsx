import { Checkbox, Input, Select } from "@/shared/components/ui";
import { LESSON_STATUS_OPTIONS } from "@/features/course/utils/lesson-status";

/** Hiển thị nhóm trạng thái, thời lượng và quyền preview dùng chung cho mọi loại lesson. */
export function LessonSettingsFields({
    idPrefix,
    status,
    durationMinutes,
    isPreview,
    showDuration = true,
    onStatusChange,
    onDurationChange,
    onPreviewChange,
}) {
    return (
        <div
            className={`sl-lesson-settings-fields${
                showDuration
                    ? ""
                    : " sl-lesson-settings-fields--without-duration"
            }`}
        >
            <Select
                id={`${idPrefix}-status`}
                label="Status"
                value={status}
                onChange={(event) => onStatusChange(event.target.value)}
            >
                {LESSON_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </Select>

            {showDuration ? (
                <Input
                    id={`${idPrefix}-duration`}
                    label="Estimated duration"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={durationMinutes}
                    suffix="minutes"
                    onChange={(event) => onDurationChange(event.target.value)}
                />
            ) : null}

            <Checkbox
                label="Preview lesson"
                checked={isPreview}
                onChange={(event) => onPreviewChange(event.target.checked)}
            />
        </div>
    );
}
