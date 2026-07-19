import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";

const QUICK_EDIT_FIELDS = ["frontText", "backText", "hint", "explanation"];

function toQuickDraft(card) {
  return QUICK_EDIT_FIELDS.reduce(
    (draft, field) => ({
      ...draft,
      [field]: card?.[field] || "",
    }),
    {},
  );
}

export function FlashcardQuickEditRow({
  card,
  saving = false,
  error = "",
  onCommit,
  onCancel,
}) {
  const formRef = useRef(null);
  const committedRef = useRef(false);
  const [draft, setDraft] = useState(() => toQuickDraft(card));
  const latestDraftRef = useRef(draft);
  const [expanded, setExpanded] = useState(() => ({
    hint: Boolean(card?.hint),
    explanation: Boolean(card?.explanation),
  }));

  useEffect(() => {
    const firstField = formRef.current?.querySelector("textarea");
    if (!firstField) return;
    firstField.focus({ preventScroll: true });
    const caretPosition = firstField.value.length;
    firstField.setSelectionRange?.(caretPosition, caretPosition);
  }, []);

  useEffect(() => {
    function handlePointerDown(event) {
      if (formRef.current?.contains(event.target)) return;
      if (committedRef.current || saving) return;
      committedRef.current = true;
      onCommit?.(latestDraftRef.current);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [onCommit, saving]);

  useEffect(() => {
    if (error) committedRef.current = false;
  }, [error]);

  useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  const changed = useMemo(
    () =>
      QUICK_EDIT_FIELDS.some(
        (field) => String(card?.[field] || "") !== String(draft?.[field] || ""),
      ),
    [card, draft],
  );

  function update(field, value) {
    setDraft((current) => {
      const nextDraft = { ...current, [field]: value };
      latestDraftRef.current = nextDraft;
      committedRef.current = false;
      return nextDraft;
    });
  }

  function expand(field) {
    setExpanded((current) => ({ ...current, [field]: true }));
  }

  function handleBlur(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit?.(latestDraftRef.current);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel?.();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (committedRef.current) return;
    committedRef.current = true;
    onCommit?.(latestDraftRef.current);
  }

  const showHint = Boolean(draft.hint || expanded.hint);
  const showExplanation = Boolean(draft.explanation || expanded.explanation);

  return (
    <form
      ref={formRef}
      className="flashcard-quick-edit"
      onSubmit={handleSubmit}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      noValidate
    >
      <div className="flashcard-quick-edit__grid">
        <label className="flashcard-field">
          <span>Front</span>
          <textarea
            value={draft.frontText}
            onChange={(event) => update("frontText", event.target.value)}
            disabled={saving}
            rows={2}
          />
        </label>
        <label className="flashcard-field">
          <span>Back</span>
          <textarea
            value={draft.backText}
            onChange={(event) => update("backText", event.target.value)}
            disabled={saving}
            rows={2}
          />
        </label>
        {showHint ? (
          <label className="flashcard-field flashcard-quick-edit__optional">
            <span>Hint</span>
            <textarea
              value={draft.hint}
              onChange={(event) => update("hint", event.target.value)}
              disabled={saving}
              rows={2}
            />
          </label>
        ) : (
          <button
            type="button"
            className="flashcard-quick-edit__optional-trigger"
            onClick={() => expand("hint")}
            disabled={saving}
          >
            + Hint
          </button>
        )}
        {showExplanation ? (
          <label className="flashcard-field flashcard-quick-edit__optional">
            <span>Explanation</span>
            <textarea
              value={draft.explanation}
              onChange={(event) => update("explanation", event.target.value)}
              disabled={saving}
              rows={2}
            />
          </label>
        ) : (
          <button
            type="button"
            className="flashcard-quick-edit__optional-trigger"
            onClick={() => expand("explanation")}
            disabled={saving}
          >
            + Explanation
          </button>
        )}
      </div>
      {error && (
        <div className="flashcard-quick-edit__error" role="alert">
          {error}
        </div>
      )}
      <div className="flashcard-quick-edit__actions">
        <button
          type="submit"
          className="flashcard-btn flashcard-btn--primary"
          disabled={saving || !changed}
        >
          <Check size={16} />
          Save
        </button>
        <button
          type="button"
          className="flashcard-btn"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onCancel}
          disabled={saving}
        >
          <X size={16} />
          Cancel
        </button>
      </div>
    </form>
  );
}
