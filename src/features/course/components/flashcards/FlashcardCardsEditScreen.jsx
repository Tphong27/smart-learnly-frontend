import { useEffect, useMemo, useRef, useState } from "react";
import {
  GripVertical,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { flashcardService } from "@/services/flashcard.service";
import { FlashcardImageInput } from "./FlashcardImageInput";
import {
  getErrorMessage,
  normalizeCards,
  toCardPayload,
  validateCurrentCardDraft,
} from "./flashcard-utils";

function newClientId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toRow(card = {}, index = 0) {
  return {
    clientId: card.id ? String(card.id) : `new-${newClientId()}`,
    id: card.id || null,
    frontText: card.frontText || "",
    frontImageUrl: card.frontImageUrl || "",
    backText: card.backText || "",
    backImageUrl: card.backImageUrl || "",
    hint: card.hint || "",
    explanation: card.explanation || "",
    orderIndex: card.orderIndex ?? index,
    touched: Boolean(card.id),
    deleted: false,
    frontImageOpen: Boolean(card.frontImageUrl),
    backImageOpen: Boolean(card.backImageUrl),
    hintOpen: Boolean(card.hint),
    explanationOpen: Boolean(card.explanation),
  };
}

function isMeaningful(row) {
  return Boolean(
    String(row.frontText || "").trim() ||
      String(row.frontImageUrl || "").trim() ||
      String(row.backText || "").trim() ||
      String(row.backImageUrl || "").trim() ||
      String(row.hint || "").trim() ||
      String(row.explanation || "").trim(),
  );
}

function payloadChanged(original, row) {
  const before = toCardPayload(original);
  const after = toCardPayload(row);
  return [
    "frontText",
    "frontImageUrl",
    "backText",
    "backImageUrl",
    "hint",
    "explanation",
  ].some((field) => before[field] !== after[field]);
}

function sameOrder(cards, rows) {
  const currentIds = normalizeCards(cards).map((card) => String(card.id));
  const nextIds = rows.filter((row) => row.id).map((row) => String(row.id));
  return (
    currentIds.length === nextIds.length &&
    currentIds.every((id, index) => id === nextIds[index])
  );
}

function hasTrimmedValue(value) {
  return String(value || "").trim().length > 0;
}

const OPTIONAL_OPEN_FIELDS = {
  frontImageOpen: "frontImageUrl",
  backImageOpen: "backImageUrl",
  hintOpen: "hint",
  explanationOpen: "explanation",
};

function shouldKeepOptionalOpen(row, openField, imageActivityByRow, activeSection) {
  if (
    activeSection?.clientId === row.clientId &&
    activeSection?.openField === openField
  ) {
    return true;
  }

  const valueField = OPTIONAL_OPEN_FIELDS[openField];
  if (!valueField) return Boolean(row[openField]);

  if (valueField === "frontImageUrl" || valueField === "backImageUrl") {
    const imageState = imageActivityByRow?.[row.clientId]?.[valueField];
    return Boolean(
      hasTrimmedValue(row[valueField]) ||
        imageState?.uploading ||
        imageState?.error,
    );
  }

  return hasTrimmedValue(row[valueField]);
}

function collapsedRowOptions(row, imageActivityByRow = {}, activeSection = null) {
  const nextState = {
    frontImageOpen: shouldKeepOptionalOpen(
      row,
      "frontImageOpen",
      imageActivityByRow,
      activeSection,
    ),
    backImageOpen: shouldKeepOptionalOpen(
      row,
      "backImageOpen",
      imageActivityByRow,
      activeSection,
    ),
    hintOpen: shouldKeepOptionalOpen(
      row,
      "hintOpen",
      imageActivityByRow,
      activeSection,
    ),
    explanationOpen: shouldKeepOptionalOpen(
      row,
      "explanationOpen",
      imageActivityByRow,
      activeSection,
    ),
  };

  const unchanged = Object.entries(nextState).every(
    ([field, value]) => row[field] === value,
  );

  return unchanged ? row : { ...row, ...nextState };
}

function isInteractiveTarget(target) {
  return Boolean(
    target?.closest?.(
      [
        "input",
        "textarea",
        "button",
        "a",
        "img",
        "[contenteditable='true']",
        ".flashcard-image-input",
      ].join(","),
    ),
  );
}

function EditRow({
  row,
  index,
  error,
  saving,
  actionLocked,
  onChange,
  onOpenOptional,
  onRemove,
  onUploadImage,
  onImageUploadStateChange,
  dragHandleProps,
}) {
  function update(field, value) {
    onChange(row.clientId, field, value);
  }

  const showFrontImage = row.frontImageUrl || row.frontImageOpen;
  const showBackImage = row.backImageUrl || row.backImageOpen;
  const showHint = row.hint || row.hintOpen;
  const showExplanation = row.explanation || row.explanationOpen;

  const errorId = error ? `flashcard-edit-row-error-${row.clientId}` : undefined;
  const frontTextId = `flashcard-edit-front-text-${row.clientId}`;
  const backTextId = `flashcard-edit-back-text-${row.clientId}`;

  return (
    <article
      className="flashcard-edit-screen__row"
      data-flashcard-edit-row-id={row.clientId}
    >
      <div
        className="flashcard-edit-screen__drag"
        title="Drag to reorder"
        aria-label="Drag to reorder"
        {...dragHandleProps}
      >
        <GripVertical size={16} />
      </div>
      <div className="flashcard-edit-screen__body">
        <div className="flashcard-edit-screen__sides">
          <section className="flashcard-edit-screen__side">
            <label className="flashcard-field flashcard-edit-screen__main-field">
              <span className="flashcard-sr-only">
                Front text
              </span>
              <textarea
                id={frontTextId}
                data-flashcard-edit-front-input
                value={row.frontText}
                onChange={(event) => update("frontText", event.target.value)}
                disabled={saving}
                rows={2}
                aria-invalid={Boolean(error)}
                aria-describedby={errorId}
              />
            </label>
            <div className="flashcard-edit-screen__accessory-row">
              <div className="flashcard-edit-screen__media-slot">
                {!showFrontImage && (
                  <button
                    type="button"
                    className="flashcard-edit-screen__optional-trigger flashcard-edit-screen__optional-trigger--media"
                    data-flashcard-edit-optional-trigger
                    onClick={() => onOpenOptional(row.clientId, "frontImageOpen")}
                    disabled={saving}
                    aria-label={`Add front image to row ${index + 1}`}
                  >
                    <ImagePlus size={14} />
                    + Image
                  </button>
                )}
                {showFrontImage && (
                  <div
                    className="flashcard-edit-screen__optional-field flashcard-edit-screen__optional-field--image"
                    data-flashcard-edit-section
                    data-flashcard-edit-open-field="frontImageOpen"
                  >
                    <FlashcardImageInput
                      id={`flashcard-edit-front-image-${row.clientId}`}
                      label="Front image"
                      value={row.frontImageUrl}
                      disabled={saving}
                      onChange={(value) => update("frontImageUrl", value)}
                      onUploadImage={onUploadImage}
                      onUploadStateChange={(state) =>
                        onImageUploadStateChange(row.clientId, "frontImageUrl", state)
                      }
                    />
                  </div>
                )}
              </div>
              <div className="flashcard-edit-screen__detail-slot">
                {!showHint && (
                  <button
                    type="button"
                    className="flashcard-edit-screen__optional-trigger"
                    data-flashcard-edit-optional-trigger
                    onClick={() => onOpenOptional(row.clientId, "hintOpen")}
                    disabled={saving}
                    aria-label={`Add hint to row ${index + 1}`}
                  >
                    + Hint
                  </button>
                )}
                {showHint && (
                  <label
                    className="flashcard-field flashcard-edit-screen__optional-field"
                    data-flashcard-edit-section
                    data-flashcard-edit-open-field="hintOpen"
                  >
                    <span>Hint</span>
                    <textarea
                      value={row.hint}
                      onChange={(event) => update("hint", event.target.value)}
                      disabled={saving}
                      rows={2}
                      aria-invalid={Boolean(error)}
                      aria-describedby={errorId}
                    />
                  </label>
                )}
              </div>
            </div>
          </section>
          <section className="flashcard-edit-screen__side">
            <label className="flashcard-field flashcard-edit-screen__main-field">
              <span className="flashcard-sr-only">
                Back text
              </span>
              <textarea
                id={backTextId}
                value={row.backText}
                onChange={(event) => update("backText", event.target.value)}
                disabled={saving}
                rows={2}
                aria-invalid={Boolean(error)}
                aria-describedby={errorId}
              />
            </label>
            <div className="flashcard-edit-screen__accessory-row">
              <div className="flashcard-edit-screen__media-slot">
                {!showBackImage && (
                  <button
                    type="button"
                    className="flashcard-edit-screen__optional-trigger flashcard-edit-screen__optional-trigger--media"
                    data-flashcard-edit-optional-trigger
                    onClick={() => onOpenOptional(row.clientId, "backImageOpen")}
                    disabled={saving}
                    aria-label={`Add back image to row ${index + 1}`}
                  >
                    <ImagePlus size={14} />
                    + Image
                  </button>
                )}
                {showBackImage && (
                  <div
                    className="flashcard-edit-screen__optional-field flashcard-edit-screen__optional-field--image"
                    data-flashcard-edit-section
                    data-flashcard-edit-open-field="backImageOpen"
                  >
                    <FlashcardImageInput
                      id={`flashcard-edit-back-image-${row.clientId}`}
                      label="Back image"
                      value={row.backImageUrl}
                      disabled={saving}
                      onChange={(value) => update("backImageUrl", value)}
                      onUploadImage={onUploadImage}
                      onUploadStateChange={(state) =>
                        onImageUploadStateChange(row.clientId, "backImageUrl", state)
                      }
                    />
                  </div>
                )}
              </div>
              <div className="flashcard-edit-screen__detail-slot">
                {!showExplanation && (
                  <button
                    type="button"
                    className="flashcard-edit-screen__optional-trigger"
                    data-flashcard-edit-optional-trigger
                    onClick={() => onOpenOptional(row.clientId, "explanationOpen")}
                    disabled={saving}
                    aria-label={`Add explanation to row ${index + 1}`}
                  >
                    + Explanation
                  </button>
                )}
                {showExplanation && (
                  <label
                    className="flashcard-field flashcard-edit-screen__optional-field"
                    data-flashcard-edit-section
                    data-flashcard-edit-open-field="explanationOpen"
                  >
                    <span>Explanation</span>
                    <textarea
                      value={row.explanation}
                      onChange={(event) => update("explanation", event.target.value)}
                      disabled={saving}
                      rows={2}
                      aria-invalid={Boolean(error)}
                      aria-describedby={errorId}
                    />
                  </label>
                )}
              </div>
            </div>
          </section>
        </div>
        {error && (
          <div id={errorId} className="flashcard-edit-screen__error" role="alert">
            {error}
          </div>
        )}
      </div>
      <div className="flashcard-edit-screen__row-actions">
        <button
          type="button"
          className="flashcard-btn flashcard-btn--icon flashcard-btn--danger"
          onClick={() => onRemove(row.clientId)}
          disabled={actionLocked}
          title={row.id ? "Delete card" : "Remove new row"}
          aria-label={`${row.id ? "Delete card" : "Remove new card row"} ${index + 1}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}

export function FlashcardCardsEditScreen({
  setId,
  cards,
  startWithNewRow = false,
  onUploadImage,
  onSaved,
  onBack,
  notify,
}) {
  const incomingCards = useMemo(() => normalizeCards(cards), [cards]);
  const [baselineCards, setBaselineCards] = useState(() => incomingCards);
  const baselineById = useMemo(
    () => new Map(baselineCards.map((card) => [String(card.id), card])),
    [baselineCards],
  );
  const [rows, setRows] = useState(() => {
    const initialRows = incomingCards.map(toRow);
    return startWithNewRow
      ? [...initialRows, toRow({}, initialRows.length)]
      : initialRows;
  });
  const [errors, setErrors] = useState({});
  const [editorError, setEditorError] = useState("");
  const [lastSaveSucceeded, setLastSaveSucceeded] = useState(false);
  const [imageActivityByRow, setImageActivityByRow] = useState({});
  const [saving, setSaving] = useState(false);
  const [discardPending, setDiscardPending] = useState(false);
  const [deleteAllPending, setDeleteAllPending] = useState(false);
  const editScreenRef = useRef(null);
  const imageActivityRef = useRef(imageActivityByRow);
  const pendingFocusRowIdRef = useRef(null);

  const visibleRows = rows.filter((row) => !row.deleted);
  const unsavedChangeCount = useMemo(() => {
    let count = 0;
    const nonDeletedRows = rows.filter((row) => !row.deleted);
    if (!sameOrder(baselineCards, nonDeletedRows.filter((row) => row.id))) {
      count += 1;
    }
    rows.forEach((row) => {
      if (row.deleted) {
        if (row.id) count += 1;
        return;
      }
      if (!row.id) {
        if (isMeaningful(row)) count += 1;
        return;
      }
      const original = baselineById.get(String(row.id));
      if (!original || payloadChanged(original, row)) count += 1;
    });
    return count;
  }, [baselineById, baselineCards, rows]);
  const dirty = useMemo(() => {
    return unsavedChangeCount > 0;
  }, [unsavedChangeCount]);
  const imageUploading = useMemo(
    () =>
      Object.values(imageActivityByRow).some((rowActivity) =>
        Object.values(rowActivity || {}).some((activity) => activity?.uploading),
      ),
    [imageActivityByRow],
  );
  const editorActionLocked = saving || imageUploading;
  const statusText = imageUploading
    ? "Uploading image..."
    : saving
      ? "Saving..."
      : dirty
        ? `${unsavedChangeCount} unsaved change${unsavedChangeCount === 1 ? "" : "s"}`
        : lastSaveSucceeded
          ? "All changes saved"
          : "";

  useEffect(() => {
    imageActivityRef.current = imageActivityByRow;
  }, [imageActivityByRow]);

  function getActiveOptionalSection(target) {
    const section = target?.closest?.("[data-flashcard-edit-section]");
    if (!section || !editScreenRef.current?.contains(section)) return null;
    const row = section.closest("[data-flashcard-edit-row-id]");
    const clientId = row?.getAttribute("data-flashcard-edit-row-id");
    const openField = section.getAttribute("data-flashcard-edit-open-field");
    if (!clientId || !openField) return null;
    return { clientId, openField };
  }

  function collapseEmptyOptions(activeSection = null) {
    setRows((current) =>
      current.map((row) =>
        row.deleted
          ? row
          : collapsedRowOptions(row, imageActivityRef.current, activeSection),
      ),
    );
  }

  useEffect(() => {
    function handleBoundaryMove(event) {
      if (!editScreenRef.current?.contains(event.target)) return;
      if (event.target?.closest?.("[data-flashcard-edit-optional-trigger]")) {
        return;
      }
      collapseEmptyOptions(getActiveOptionalSection(event.target));
    }

    document.addEventListener("pointerdown", handleBoundaryMove, true);
    document.addEventListener("focusin", handleBoundaryMove, true);
    return () => {
      document.removeEventListener("pointerdown", handleBoundaryMove, true);
      document.removeEventListener("focusin", handleBoundaryMove, true);
    };
  }, []);

  function focusRowById(clientId) {
    if (!clientId || !editScreenRef.current) return;
    const rowElement = Array.from(
      editScreenRef.current.querySelectorAll("[data-flashcard-edit-row-id]"),
    ).find(
      (node) => node.getAttribute("data-flashcard-edit-row-id") === clientId,
    );
    if (!rowElement) return;
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    )?.matches;
    rowElement.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
    rowElement
      .querySelector("[data-flashcard-edit-front-input]")
      ?.focus({ preventScroll: true });
  }

  function scheduleFocusRow(clientId) {
    pendingFocusRowIdRef.current = clientId;
    window.setTimeout(() => {
      const pendingClientId = pendingFocusRowIdRef.current;
      pendingFocusRowIdRef.current = null;
      focusRowById(pendingClientId);
    }, 0);
  }

  useEffect(() => {
    if (!pendingFocusRowIdRef.current) return;
    const pendingClientId = pendingFocusRowIdRef.current;
    pendingFocusRowIdRef.current = null;
    focusRowById(pendingClientId);
  }, [rows]);

  function handleImageUploadState(clientId, field, state) {
    setImageActivityByRow((current) => ({
      ...current,
      [clientId]: {
        ...(current[clientId] || {}),
        [field]: state,
      },
    }));
  }

  function markEditingChanged() {
    setEditorError("");
    setLastSaveSucceeded(false);
  }

  function updateRowFields(clientId, patch) {
    markEditingChanged();
    setRows((current) =>
      current.map((row) =>
        row.clientId === clientId
          ? { ...row, ...patch, touched: true }
          : row,
      ),
    );
    setErrors((current) => ({ ...current, [clientId]: "" }));
  }

  function updateRow(clientId, field, value) {
    updateRowFields(clientId, { [field]: value });
  }

  function openOptionalSection(clientId, openField) {
    markEditingChanged();
    setRows((current) =>
      current.map((row) => {
        if (row.deleted) return row;
        if (row.clientId !== clientId) {
          return collapsedRowOptions(row, imageActivityRef.current);
        }
        return collapsedRowOptions(
          { ...row, [openField]: true, touched: true },
          imageActivityRef.current,
          { clientId, openField },
        );
      }),
    );
    setErrors((current) => ({ ...current, [clientId]: "" }));
  }

  function addRow() {
    if (editorActionLocked) return;
    const existingBlankRow = visibleRows.find(
      (row) => !row.id && !isMeaningful(row),
    );
    if (existingBlankRow) {
      scheduleFocusRow(existingBlankRow.clientId);
      return;
    }
    const nextRow = toRow({}, rows.length);
    setRows((current) => [...current, nextRow]);
    scheduleFocusRow(nextRow.clientId);
  }

  function removeRow(clientId) {
    if (editorActionLocked) return;
    markEditingChanged();
    setRows((current) =>
      current
        .map((row) =>
          row.clientId === clientId
            ? row.id
              ? { ...row, deleted: true, touched: true }
              : null
            : row,
        )
        .filter(Boolean),
    );
    setErrors((current) => {
      const next = { ...current };
      delete next[clientId];
      return next;
    });
    setImageActivityByRow((current) => {
      const next = { ...current };
      delete next[clientId];
      return next;
    });
  }

  function requestDeleteAll() {
    if (editorActionLocked) return;
    if (visibleRows.length === 0) return;
    setDeleteAllPending(true);
  }

  function confirmDeleteAllRows() {
    if (editorActionLocked) return;
    markEditingChanged();
    setRows((current) =>
      current
        .map((row) =>
          row.id ? { ...row, deleted: true, touched: true } : null,
        )
        .filter(Boolean),
    );
    setErrors({});
    setDeleteAllPending(false);
    notify?.("Marked all cards for deletion. Save changes or Done to apply.", "info");
  }

  function handleDragEnd(result) {
    if (!result.destination || editorActionLocked) return;
    markEditingChanged();
    setRows((current) => {
      const next = current.filter((row) => !row.deleted);
      const deleted = current.filter((row) => row.deleted);
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination.index, 0, moved);
      return [...next, ...deleted];
    });
  }

  function validateRows() {
    const nextErrors = {};
    let firstInvalidClientId = null;
    rows
      .filter((row) => !row.deleted)
      .forEach((row) => {
        if (!row.id && !isMeaningful(row)) return;
        const error = validateCurrentCardDraft(row);
        if (error) {
          nextErrors[row.clientId] = error;
          if (!firstInvalidClientId) firstInvalidClientId = row.clientId;
        }
      });
    setErrors(nextErrors);
    return {
      valid: Object.keys(nextErrors).length === 0,
      firstInvalidClientId,
    };
  }

  async function saveChanges() {
    if (editorActionLocked) return null;
    setEditorError("");
    setLastSaveSucceeded(false);
    const validation = validateRows();
    if (!validation.valid) {
      const message = "Fix invalid cards before saving.";
      setEditorError(message);
      scheduleFocusRow(validation.firstInvalidClientId);
      notify?.(message, "error");
      return null;
    }

    setSaving(true);
    const processedClientIds = new Set();
    const processedRowsByClientId = new Map();
    const savedCardsById = new Map(
      baselineCards.map((card) => [String(card.id), card]),
    );
    let failedClientId = null;

    function reconcilePartialRows() {
      setRows((current) =>
        current
          .map((row) => {
            if (!processedClientIds.has(row.clientId)) return row;
            if (row.deleted) return null;
            return processedRowsByClientId.get(row.clientId) || row;
          })
          .filter(Boolean),
      );
      setBaselineCards(normalizeCards([...savedCardsById.values()]));
    }

    try {
      const nextRows = [];

      for (const row of rows.filter((current) => current.deleted && current.id)) {
        failedClientId = row.clientId;
        await flashcardService.deleteCard(row.id);
        processedClientIds.add(row.clientId);
        savedCardsById.delete(String(row.id));
      }

      for (const row of rows.filter((current) => !current.deleted)) {
        if (!row.id && !isMeaningful(row)) continue;

        if (!row.id) {
          failedClientId = row.clientId;
          const saved = await flashcardService.addCard(setId, toCardPayload(row));
          const savedRow = toRow(saved, nextRows.length);
          nextRows.push(savedRow);
          processedClientIds.add(row.clientId);
          processedRowsByClientId.set(row.clientId, savedRow);
          savedCardsById.set(String(saved.id), saved);
          continue;
        }

        const original = baselineById.get(String(row.id));
        if (payloadChanged(original, row)) {
          failedClientId = row.clientId;
          const saved = await flashcardService.updateCard(row.id, toCardPayload(row));
          const savedRow = toRow(saved, nextRows.length);
          nextRows.push(savedRow);
          processedClientIds.add(row.clientId);
          processedRowsByClientId.set(row.clientId, savedRow);
          savedCardsById.set(String(saved.id), saved);
        } else {
          const cleanRow = toRow(original || row, nextRows.length);
          nextRows.push(cleanRow);
          processedRowsByClientId.set(row.clientId, cleanRow);
        }
      }

      const nextIds = nextRows.map((row) => row.id).filter(Boolean);
      let savedCards = nextRows.map((row) => savedCardsById.get(String(row.id)) || row);
      if (nextIds.length > 0 && !sameOrder(baselineCards, nextRows)) {
        failedClientId = nextRows[0]?.clientId || null;
        const savedSet = await flashcardService.reorderCards(setId, nextIds);
        savedCards = normalizeCards(savedSet?.cards || savedSet?.data?.cards || savedCards);
      }

      setRows(savedCards.map(toRow));
      setBaselineCards(savedCards);
      setErrors({});
      setImageActivityByRow({});
      setEditorError("");
      setLastSaveSucceeded(true);
      onSaved?.(savedCards);
      notify?.("Flashcards saved.", "success");
      return savedCards;
    } catch (error) {
      const message = getErrorMessage(error, "Failed to save flashcards.");
      reconcilePartialRows();
      setEditorError(message);
      if (failedClientId) {
        setErrors((current) => ({ ...current, [failedClientId]: message }));
        scheduleFocusRow(failedClientId);
      }
      notify?.(message, "error");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleDone() {
    if (editorActionLocked) return;
    const savedCards = dirty ? await saveChanges() : visibleRows;
    if (savedCards) onBack?.();
  }

  function handleBack() {
    if (editorActionLocked) return;
    if (dirty) {
      setDiscardPending(true);
      return;
    }
    onBack?.();
  }

  return (
    <div className="flashcard-edit-screen" ref={editScreenRef}>
      <div className="flashcard-panel" aria-busy={editorActionLocked}>
        <div className="flashcard-panel__header flashcard-edit-screen__header">
          <div>
            <h3 className="flashcard-panel__title">Add/Edit Cards</h3>
            <div className="flashcard-toolbar__meta">
              {visibleRows.length} row{visibleRows.length === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flashcard-actions">
            <button
              type="button"
              className="flashcard-btn"
              onClick={addRow}
              disabled={editorActionLocked}
            >
              <Plus size={16} />
              Add row
            </button>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--danger"
              onClick={requestDeleteAll}
              disabled={editorActionLocked || visibleRows.length === 0}
            >
              <Trash2 size={16} />
              Delete all
            </button>
          </div>
        </div>
        <div className="flashcard-panel__body">
          {editorError && (
            <div className="flashcard-edit-screen__summary" role="alert">
              {editorError}
            </div>
          )}
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="flashcard-edit-screen-list">
              {(dropProvided) => (
                <div
                  className="flashcard-edit-screen__list"
                  ref={dropProvided.innerRef}
                  {...dropProvided.droppableProps}
                >
                  {visibleRows.map((row, index) => (
                    <Draggable
                      key={row.clientId}
                      draggableId={row.clientId}
                      index={index}
                      isDragDisabled={editorActionLocked}
                    >
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          onMouseDown={(event) => {
                            if (isInteractiveTarget(event.target)) {
                              event.stopPropagation();
                            }
                          }}
                        >
                          <EditRow
                            row={row}
                            index={index}
                            error={errors[row.clientId]}
                            saving={saving}
                            actionLocked={editorActionLocked}
                            onChange={updateRow}
                            onOpenOptional={openOptionalSection}
                            onRemove={removeRow}
                            onUploadImage={onUploadImage}
                            onImageUploadStateChange={handleImageUploadState}
                            dragHandleProps={dragProvided.dragHandleProps}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {dropProvided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
          {visibleRows.length === 0 && (
            <div className="flashcard-empty">
              <p>No card rows yet.</p>
            </div>
          )}
        </div>
        <div className="flashcard-edit-screen__action-bar">
          <div className="flashcard-edit-screen__status" role="status" aria-live="polite">
            {statusText && (
              <>
                {dirty && !editorActionLocked && (
                  <span className="flashcard-edit-screen__dirty-dot" aria-hidden="true" />
                )}
                <span>{statusText}</span>
              </>
            )}
          </div>
          <div className="flashcard-actions">
            <button
              type="button"
              className="flashcard-btn"
              onClick={handleBack}
              disabled={editorActionLocked}
            >
              <X size={16} />
              Cancel
            </button>
            <button
              type="button"
              className="flashcard-btn"
              onClick={saveChanges}
              disabled={editorActionLocked || !dirty}
            >
              <Save size={16} />
              Save changes
            </button>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--primary"
              onClick={handleDone}
              disabled={editorActionLocked}
            >
              Done
            </button>
          </div>
        </div>
      </div>
      {discardPending && (
        <div className="flashcard-modal" role="presentation">
          <div
            className="flashcard-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="flashcard-edit-discard-title"
          >
            <h3 id="flashcard-edit-discard-title">Discard unsaved edits?</h3>
            <p>
              Changes in Add/Edit Cards will be lost. You can cancel to keep
              editing.
            </p>
            <div className="flashcard-modal__actions">
              <button
                type="button"
                className="flashcard-btn"
                onClick={() => setDiscardPending(false)}
                disabled={editorActionLocked}
              >
                Continue editing
              </button>
              <button
                type="button"
                className="flashcard-btn flashcard-btn--danger"
                onClick={() => {
                  setDiscardPending(false);
                  onBack?.();
                }}
                disabled={editorActionLocked}
              >
                Discard changes
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteAllPending && (
        <div className="flashcard-modal" role="presentation">
          <div
            className="flashcard-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="flashcard-edit-delete-all-title"
          >
            <h3 id="flashcard-edit-delete-all-title">
              Delete all {visibleRows.length} cards?
            </h3>
            <p>
              Cards will be removed from this edit screen and deleted when you
              save changes or press Done.
            </p>
            <div className="flashcard-modal__actions">
              <button
                type="button"
                className="flashcard-btn"
                onClick={() => setDeleteAllPending(false)}
                disabled={editorActionLocked}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flashcard-btn flashcard-btn--danger"
                onClick={confirmDeleteAllRows}
                disabled={editorActionLocked || visibleRows.length === 0}
              >
                <Trash2 size={16} />
                Delete all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
