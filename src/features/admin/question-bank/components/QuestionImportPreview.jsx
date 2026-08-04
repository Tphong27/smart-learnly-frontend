import { Button } from "@/shared/components/ui";

/** Hiển thị trạng thái validation của một import row. */
export function QuestionImportStatusBadge({ row }) {
  if (!row.errors?.length) {
    return <span className="admin-status admin-status--approved">Valid</span>;
  }
  return (
    <span className="admin-status admin-status--archived">
      Invalid ({row.errors.length})
    </span>
  );
}

/** Tóm tắt tổng số row hợp lệ và lỗi trong preview batch. */
export function QuestionImportSummary({ parsedRows }) {
  const total = parsedRows.length;
  const valid = parsedRows.filter((row) => !row.errors?.length).length;
  const invalid = total - valid;
  if (!total) return null;
  return (
    <div className="question-import__summary">
      <span><strong>Total rows:</strong> {total}</span>
      <span><strong>Valid:</strong> {valid}</span>
      <span><strong>Errors:</strong> {invalid}</span>
    </div>
  );
}

/** Form chỉnh một import row và trả thay đổi về modal để re-validation toàn batch. */
export function QuestionImportRowEditor({
  draft,
  row,
  rowNumber,
  disabled,
  onFieldChange,
  onOptionChange,
  onCancel,
  onSave,
}) {
  if (!draft) return null;
  const optionIndexes = draft.questionType === "true_false"
    ? [0, 1]
    : [0, 1, 2, 3, 4, 5];
  return (
    <form className="question-import__edit-card" onSubmit={onSave} noValidate>
      <div className="question-import__edit-head">
        <div>
          <strong>Editing row {rowNumber}</strong>
          <span>Save to re-validate this preview batch before importing.</span>
        </div>
        <QuestionImportStatusBadge row={row || { errors: [] }} />
      </div>
      <label className="question-import__field-label">
        Question text
        <textarea
          className="question-import__textarea question-import__textarea--compact"
          value={draft.questionText}
          onChange={(event) => onFieldChange("questionText", event.target.value)}
        />
      </label>
      <div className="question-import__grid">
        <label className="question-import__field-label">
          Type
          <select
            className="question-import__select"
            value={draft.questionType}
            onChange={(event) => onFieldChange("questionType", event.target.value)}
          >
            <option value="multiple_choice">Multiple choice</option>
            <option value="true_false">True/False</option>
          </select>
        </label>
        <label className="question-import__field-label">
          Correct answer
          <select
            className="question-import__select"
            value={draft.correctAnswer}
            onChange={(event) => onFieldChange("correctAnswer", event.target.value)}
          >
            {draft.questionType === "true_false" ? (
              <>
                <option value="True">True</option>
                <option value="False">False</option>
              </>
            ) : (
              <>
                <option value="">Choose answer</option>
                {["A", "B", "C", "D", "E", "F"].map((letter) => (
                  <option key={letter} value={letter}>{letter}</option>
                ))}
              </>
            )}
          </select>
        </label>
        <label className="question-import__field-label">
          Difficulty
          <input
            className="question-import__input"
            value={draft.difficulty}
            onChange={(event) => onFieldChange("difficulty", event.target.value)}
            placeholder="1-5, easy, medium, hard"
          />
        </label>
        <label className="question-import__field-label">
          Bloom level
          <input
            className="question-import__input"
            value={draft.bloomLevel}
            onChange={(event) => onFieldChange("bloomLevel", event.target.value)}
            placeholder="remember, understand, apply..."
          />
        </label>
      </div>
      <div className="question-import__options-grid">
        {optionIndexes.map((optionIndex) => (
          <label className="question-import__field-label" key={optionIndex}>
            Option {String.fromCharCode(65 + optionIndex)}
            <input
              className="question-import__input"
              value={draft.options[optionIndex]}
              onChange={(event) => onOptionChange(optionIndex, event.target.value)}
            />
          </label>
        ))}
      </div>
      <label className="question-import__field-label">
        Explanation
        <textarea
          className="question-import__textarea question-import__textarea--compact"
          value={draft.explanation}
          onChange={(event) => onFieldChange("explanation", event.target.value)}
        />
      </label>
      <div className="question-import__grid">
        <label className="question-import__field-label">
          Module ID
          <input
            className="question-import__input"
            value={draft.moduleId}
            onChange={(event) => onFieldChange("moduleId", event.target.value)}
            placeholder="UUID"
          />
        </label>
        <label className="question-import__field-label">
          Image URLs
          <input
            className="question-import__input"
            value={draft.imageFiles}
            onChange={(event) => onFieldChange("imageFiles", event.target.value)}
            placeholder="Separate URLs with semicolons"
          />
        </label>
        <label className="question-import__field-label">
          Audio URLs
          <input
            className="question-import__input"
            value={draft.audioFiles}
            onChange={(event) => onFieldChange("audioFiles", event.target.value)}
            placeholder="Separate URLs with semicolons"
          />
        </label>
      </div>
      <div className="question-import__edit-actions">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={disabled}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={disabled}>
          Save row
        </Button>
      </div>
    </form>
  );
}
