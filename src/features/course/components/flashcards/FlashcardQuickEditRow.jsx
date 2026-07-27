import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";

const QUICK_EDIT_FIELDS = ["frontText", "backText"];

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
          <span className="flashcard-sr-only">Front text</span>
          <textarea
            value={draft.frontText}
            onChange={(event) => update("frontText", event.target.value)}
            disabled={saving}
            rows={2}
          />
        </label>
        <label className="flashcard-field">
          <span className="flashcard-sr-only">Back text</span>
          <textarea
            value={draft.backText}
            onChange={(event) => update("backText", event.target.value)}
            disabled={saving}
            rows={2}
          />
        </label>
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
