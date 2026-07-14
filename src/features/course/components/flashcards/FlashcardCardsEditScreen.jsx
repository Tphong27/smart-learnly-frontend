import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  GripVertical,
  ImagePlus,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { flashcardService } from "@/services/flashcard.service";
import { FlashcardImageInput } from "./FlashcardImageInput";
import {
  getErrorMessage,
  getUploadedFileUrl,
  isImageLikeFile,
  normalizeCards,
  toCardPayload,
  validateCurrentCardDraft,
  validateFlashcardImageFile,
} from "./flashcard-utils";

function newClientId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function fileListToArray(fileList) {
  return Array.from(fileList || []).filter(Boolean);
}

function imageSelection(files) {
  const normalizedFiles = fileListToArray(files);
  const imageFiles = normalizedFiles.filter(isImageLikeFile);
  return {
    file: imageFiles[0] || null,
    imageCount: imageFiles.length,
    fileCount: normalizedFiles.length,
  };
}

function clipboardFiles(event) {
  const dataTransferFiles = fileListToArray(event.clipboardData?.files);
  if (dataTransferFiles.length > 0) return dataTransferFiles;

  return Array.from(event.clipboardData?.items || [])
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter(Boolean);
}

function hasDraggedFiles(event) {
  return Array.from(event.dataTransfer?.types || []).includes("Files");
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

function collapsedRowOptions(row) {
  return {
    ...row,
    frontImageOpen: Boolean(row.frontImageUrl),
    backImageOpen: Boolean(row.backImageUrl),
    hintOpen: Boolean(row.hint),
    explanationOpen: Boolean(row.explanation),
  };
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
  onChange,
  onChangeFields,
  onCollapseOptions,
  onRemove,
  onUploadImage,
  onCollapsedImageUpload,
  dragHandleProps,
}) {
  function update(field, value) {
    onChange(row.clientId, field, value);
  }

  function updateFields(patch) {
    onChangeFields(row.clientId, patch);
  }

  function expand(field) {
    onChange(row.clientId, field, true);
  }

  function expandImage(event, openField) {
    event.stopPropagation();
    updateFields({ [openField]: true });
  }

  const showFrontImage = row.frontImageUrl || row.frontImageOpen;
  const showBackImage = row.backImageUrl || row.backImageOpen;
  const showHint = row.hint || row.hintOpen;
  const showExplanation = row.explanation || row.explanationOpen;

  function handleBlur(event) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    onCollapseOptions(row.clientId);
  }

  function handleCollapsedImageDragOver(event) {
    if (!hasDraggedFiles(event) || saving) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleCollapsedImageDrop(event, imageField, openField) {
    if (!hasDraggedFiles(event) || saving) return;
    event.preventDefault();
    event.stopPropagation();
    onCollapsedImageUpload(
      row.clientId,
      imageField,
      openField,
      event.dataTransfer?.files,
      "Drop a JPEG, PNG, or WebP image file.",
      "Only the first dropped image was uploaded.",
    );
  }

  function handleCollapsedImagePaste(event, imageField, openField) {
    if (saving) return;
    const files = clipboardFiles(event);
    if (files.length === 0) return;
    event.preventDefault();
    onCollapsedImageUpload(
      row.clientId,
      imageField,
      openField,
      files,
      "Paste a JPEG, PNG, or WebP image file.",
      "Only the first pasted image was uploaded.",
    );
  }

  return (
    <article
      className="flashcard-edit-screen__row"
      data-flashcard-edit-row-id={row.clientId}
      onBlur={handleBlur}
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
          <section
            className="flashcard-edit-screen__side"
            onDragOver={!showFrontImage ? handleCollapsedImageDragOver : undefined}
            onDrop={
              !showFrontImage
                ? (event) =>
                    handleCollapsedImageDrop(
                      event,
                      "frontImageUrl",
                      "frontImageOpen",
                    )
                : undefined
            }
            onPaste={
              !showFrontImage
                ? (event) =>
                    handleCollapsedImagePaste(
                      event,
                      "frontImageUrl",
                      "frontImageOpen",
                    )
                : undefined
            }
          >
            <label className="flashcard-field flashcard-edit-screen__main-field">
              <span>Front</span>
              <textarea
                value={row.frontText}
                onChange={(event) => update("frontText", event.target.value)}
                disabled={saving}
                rows={2}
              />
            </label>
            {(!showFrontImage || !showHint) && (
              <div className="flashcard-edit-screen__optional-actions">
                {!showFrontImage && (
                  <button
                    type="button"
                    className="flashcard-edit-screen__optional-trigger"
                    onClick={(event) => expandImage(event, "frontImageOpen")}
                    disabled={saving}
                  >
                    <ImagePlus size={14} />
                    + Image
                  </button>
                )}
                {!showHint && (
                  <button
                    type="button"
                    className="flashcard-edit-screen__optional-trigger"
                    onClick={() => expand("hintOpen")}
                    disabled={saving}
                  >
                    + Hint
                  </button>
                )}
              </div>
            )}
            {showFrontImage && (
              <div className="flashcard-edit-screen__optional-field">
                <FlashcardImageInput
                  id={`flashcard-edit-front-image-${row.clientId}`}
                  label="Front image"
                  value={row.frontImageUrl}
                  disabled={saving}
                  onChange={(value) => update("frontImageUrl", value)}
                  onUploadImage={onUploadImage}
                />
              </div>
            )}
            {showHint && (
              <label className="flashcard-field flashcard-edit-screen__optional-field">
                <span>Hint</span>
                <textarea
                  value={row.hint}
                  onChange={(event) => update("hint", event.target.value)}
                  disabled={saving}
                  rows={2}
                />
              </label>
            )}
          </section>
          <section
            className="flashcard-edit-screen__side"
            onDragOver={!showBackImage ? handleCollapsedImageDragOver : undefined}
            onDrop={
              !showBackImage
                ? (event) =>
                    handleCollapsedImageDrop(
                      event,
                      "backImageUrl",
                      "backImageOpen",
                    )
                : undefined
            }
            onPaste={
              !showBackImage
                ? (event) =>
                    handleCollapsedImagePaste(
                      event,
                      "backImageUrl",
                      "backImageOpen",
                    )
                : undefined
            }
          >
            <label className="flashcard-field flashcard-edit-screen__main-field">
              <span>Back</span>
              <textarea
                value={row.backText}
                onChange={(event) => update("backText", event.target.value)}
                disabled={saving}
                rows={2}
              />
            </label>
            {(!showBackImage || !showExplanation) && (
              <div className="flashcard-edit-screen__optional-actions">
                {!showBackImage && (
                  <button
                    type="button"
                    className="flashcard-edit-screen__optional-trigger"
                    onClick={(event) => expandImage(event, "backImageOpen")}
                    disabled={saving}
                  >
                    <ImagePlus size={14} />
                    + Image
                  </button>
                )}
                {!showExplanation && (
                  <button
                    type="button"
                    className="flashcard-edit-screen__optional-trigger"
                    onClick={() => expand("explanationOpen")}
                    disabled={saving}
                  >
                    + Explanation
                  </button>
                )}
              </div>
            )}
            {showBackImage && (
              <div className="flashcard-edit-screen__optional-field">
                <FlashcardImageInput
                  id={`flashcard-edit-back-image-${row.clientId}`}
                  label="Back image"
                  value={row.backImageUrl}
                  disabled={saving}
                  onChange={(value) => update("backImageUrl", value)}
                  onUploadImage={onUploadImage}
                />
              </div>
            )}
            {showExplanation && (
              <label className="flashcard-field flashcard-edit-screen__optional-field">
                <span>Explanation</span>
                <textarea
                  value={row.explanation}
                  onChange={(event) => update("explanation", event.target.value)}
                  disabled={saving}
                  rows={2}
                />
              </label>
            )}
          </section>
        </div>
        {error && (
          <div className="flashcard-edit-screen__error" role="alert">
            {error}
          </div>
        )}
      </div>
      <div className="flashcard-edit-screen__row-actions">
        <button
          type="button"
          className="flashcard-btn flashcard-btn--icon flashcard-btn--danger"
          onClick={() => onRemove(row.clientId)}
          disabled={saving}
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
  const originalCards = useMemo(() => normalizeCards(cards), [cards]);
  const originalById = useMemo(
    () => new Map(originalCards.map((card) => [String(card.id), card])),
    [originalCards],
  );
  const [rows, setRows] = useState(() => {
    const initialRows = originalCards.map(toRow);
    return startWithNewRow
      ? [...initialRows, toRow({}, initialRows.length)]
      : initialRows;
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [discardPending, setDiscardPending] = useState(false);
  const [deleteAllPending, setDeleteAllPending] = useState(false);

  const visibleRows = rows.filter((row) => !row.deleted);
  const dirty = useMemo(() => {
    const nonDeletedRows = rows.filter((row) => !row.deleted);
    if (!sameOrder(originalCards, nonDeletedRows.filter((row) => row.id))) {
      return true;
    }
    return nonDeletedRows.some((row) => {
      if (!row.id) return isMeaningful(row);
      const original = originalById.get(String(row.id));
      return !original || payloadChanged(original, row);
    });
  }, [originalById, originalCards, rows]);

  useEffect(() => {
    function handlePointerDown(event) {
      const activeRow = event.target?.closest?.("[data-flashcard-edit-row-id]");
      const activeClientId =
        activeRow?.getAttribute("data-flashcard-edit-row-id") || null;
      setRows((current) =>
        current.map((row) =>
          row.deleted || row.clientId === activeClientId
            ? row
            : collapsedRowOptions(row),
        ),
      );
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, []);

  function updateRowFields(clientId, patch) {
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

  function collapseRowOptions(clientId) {
    setRows((current) =>
      current.map((row) =>
        row.clientId === clientId ? collapsedRowOptions(row) : row,
      ),
    );
  }

  function addRow() {
    setRows((current) => [...current, toRow({}, current.length)]);
  }

  function removeRow(clientId) {
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
  }

  function requestDeleteAll() {
    if (visibleRows.length === 0) return;
    setDeleteAllPending(true);
  }

  function confirmDeleteAllRows() {
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

  async function uploadCollapsedImage(
    clientId,
    imageField,
    openField,
    files,
    emptyMessage,
    multipleMessage,
  ) {
    if (saving) return;
    updateRowFields(clientId, { [openField]: true });

    if (!onUploadImage) {
      notify?.("Image upload is not available.", "error");
      return;
    }

    const selected = imageSelection(files);
    if (!selected.file) {
      notify?.(emptyMessage, "error");
      return;
    }

    const validationError = validateFlashcardImageFile(selected.file);
    if (validationError) {
      notify?.(validationError, "error");
      return;
    }

    try {
      const uploaded = await onUploadImage(selected.file);
      const uploadedUrl = getUploadedFileUrl(uploaded);
      if (!uploadedUrl) {
        throw new Error("Upload response did not include a URL.");
      }
      updateRowFields(clientId, {
        [imageField]: uploadedUrl,
        [openField]: true,
      });
      if (selected.fileCount > 1 || selected.imageCount > 1) {
        notify?.(multipleMessage, "info");
      }
    } catch (error) {
      notify?.(error?.message || "Image upload failed.", "error");
    }
  }

  function handleDragEnd(result) {
    if (!result.destination || saving) return;
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
    rows
      .filter((row) => !row.deleted)
      .forEach((row) => {
        if (!row.id && !isMeaningful(row)) return;
        const error = validateCurrentCardDraft(row);
        if (error) nextErrors[row.clientId] = error;
      });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function saveChanges() {
    if (saving) return null;
    if (!validateRows()) {
      notify?.("Fix invalid cards before saving.", "error");
      return null;
    }

    setSaving(true);
    try {
      const nextRows = [];
      const savedCardsById = new Map(originalCards.map((card) => [String(card.id), card]));

      for (const row of rows.filter((current) => current.deleted && current.id)) {
        await flashcardService.deleteCard(row.id);
        savedCardsById.delete(String(row.id));
      }

      for (const row of rows.filter((current) => !current.deleted)) {
        if (!row.id && !isMeaningful(row)) continue;

        if (!row.id) {
          const saved = await flashcardService.addCard(setId, toCardPayload(row));
          nextRows.push(toRow(saved, nextRows.length));
          savedCardsById.set(String(saved.id), saved);
          continue;
        }

        const original = originalById.get(String(row.id));
        if (payloadChanged(original, row)) {
          const saved = await flashcardService.updateCard(row.id, toCardPayload(row));
          nextRows.push(toRow(saved, nextRows.length));
          savedCardsById.set(String(saved.id), saved);
        } else {
          nextRows.push(toRow(original || row, nextRows.length));
        }
      }

      const nextIds = nextRows.map((row) => row.id).filter(Boolean);
      let savedCards = nextRows.map((row) => savedCardsById.get(String(row.id)) || row);
      if (nextIds.length > 0 && !sameOrder(originalCards, nextRows)) {
        const savedSet = await flashcardService.reorderCards(setId, nextIds);
        savedCards = normalizeCards(savedSet?.cards || savedSet?.data?.cards || savedCards);
      }

      setRows(savedCards.map(toRow));
      setErrors({});
      onSaved?.(savedCards);
      notify?.("Flashcards saved.", "success");
      return savedCards;
    } catch (error) {
      notify?.(getErrorMessage(error, "Failed to save flashcards."), "error");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleDone() {
    const savedCards = dirty ? await saveChanges() : visibleRows;
    if (savedCards) onBack?.();
  }

  function handleBack() {
    if (dirty) {
      setDiscardPending(true);
      return;
    }
    onBack?.();
  }

  return (
    <div className="flashcard-edit-screen">
      <div className="flashcard-panel">
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
              onClick={handleBack}
              disabled={saving}
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              type="button"
              className="flashcard-btn"
              onClick={addRow}
              disabled={saving}
            >
              <Plus size={16} />
              Add row
            </button>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--danger"
              onClick={requestDeleteAll}
              disabled={saving || visibleRows.length === 0}
            >
              <Trash2 size={16} />
              Delete all
            </button>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--primary"
              onClick={saveChanges}
              disabled={saving || !dirty}
            >
              <Save size={16} />
              {saving ? "Saving" : "Save changes"}
            </button>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--primary"
              onClick={handleDone}
              disabled={saving}
            >
              Done
            </button>
          </div>
        </div>
        <div className="flashcard-panel__body">
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
                      isDragDisabled={saving}
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
                            onChange={updateRow}
                            onChangeFields={updateRowFields}
                            onCollapseOptions={collapseRowOptions}
                            onRemove={removeRow}
                            onUploadImage={onUploadImage}
                            onCollapsedImageUpload={uploadCollapsedImage}
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
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flashcard-btn flashcard-btn--danger"
                onClick={() => {
                  setDiscardPending(false);
                  onBack?.();
                }}
                disabled={saving}
              >
                Discard
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
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flashcard-btn flashcard-btn--danger"
                onClick={confirmDeleteAllRows}
                disabled={saving || visibleRows.length === 0}
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
