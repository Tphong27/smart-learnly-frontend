import { useId, useMemo } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const QUESTION_TEXT_FORMATS = ["bold", "italic", "list", "code"];

export function QuestionTextRichEditor({ value, onChange, disabled }) {
  const toolbarId = `question-text-toolbar-${useId().replace(/:/g, "")}`;
  const modules = useMemo(
    () => ({
      toolbar: {
        container: `#${toolbarId}`,
      },
      clipboard: {
        matchVisual: false,
      },
    }),
    [toolbarId],
  );

  return (
    <div className="question-rich-text-editor">
      <div
        id={toolbarId}
        className="question-rich-text-toolbar ql-toolbar ql-snow"
        aria-label="Question text formatting toolbar"
      >
        <span className="ql-formats">
          <button type="button" className="ql-bold" title="Bold" aria-label="Bold" disabled={disabled} />
          <button type="button" className="ql-italic" title="Italic" aria-label="Italic" disabled={disabled} />
        </span>
        <span className="ql-formats">
          <button type="button" className="ql-list" value="bullet" title="Bullet list" aria-label="Bullet list" disabled={disabled} />
          <button type="button" className="ql-list" value="ordered" title="Numbered list" aria-label="Numbered list" disabled={disabled} />
        </span>
        <span className="ql-formats">
          <button type="button" className="ql-code" title="Inline code" aria-label="Inline code" disabled={disabled} />
          <button type="button" className="ql-clean" title="Clear formatting" aria-label="Clear formatting" disabled={disabled} />
        </span>
      </div>
      <ReactQuill
        theme="snow"
        value={value || ""}
        onChange={(html) => onChange?.(html)}
        modules={modules}
        formats={QUESTION_TEXT_FORMATS}
        placeholder="Write the question text..."
        readOnly={disabled}
      />
    </div>
  );
}
