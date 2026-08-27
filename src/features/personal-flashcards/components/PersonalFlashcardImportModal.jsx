import { useMemo, useRef, useState } from "react";
import { CheckCircle2, FileText, Sparkles, Upload, X } from "lucide-react";
import { Button, Modal, useToast } from "@/shared/components/ui";
import {
    FlashcardCardList,
    FlashcardSelectionToolbar,
} from "@/features/flashcards-shared";
import { PersonalFlashcardCardFormModal } from "./PersonalFlashcardCardFormModal";
import {
    getErrorMessage,
    moveItem,
    normalizeCards,
    withSequentialOrderIndices,
} from "../utils/personal-flashcard-utils";
import {
    PERSONAL_IMPORT_DEFAULT_OPTIONS,
    PERSONAL_IMPORT_LANGUAGES,
    PERSONAL_PASTED_CARD_SEPARATOR_OPTIONS,
    PERSONAL_PASTED_DEFAULT_VALUES,
    PERSONAL_PASTED_FRONT_BACK_SEPARATOR_OPTIONS,
    parsePersonalPastedFlashcards,
    toBulkCreateCards,
    toDraftCards,
    validatePersonalImportOptions,
} from "../utils/personal-flashcard-import-utils";

function draftIds(cards) {
    return cards.map((card) => card.id);
}

/** Hiển thị các tùy chọn chung còn lại khi nhập flashcard từ tài liệu. */
function ImportSettings({ options, onChange, disabled }) {
    return (
        <div className="personal-flashcard-import__settings">
            <label>
                <span>Target cards</span>
                <input
                    type="number"
                    min="1"
                    max="30"
                    value={options.desiredCount}
                    disabled={disabled}
                    onChange={(event) =>
                        onChange({
                            ...options,
                            desiredCount: event.target.value,
                        })
                    }
                />
            </label>
            <label>
                <span>Language</span>
                <select
                    value={options.language}
                    disabled={disabled}
                    onChange={(event) =>
                        onChange({ ...options, language: event.target.value })
                    }
                >
                    {PERSONAL_IMPORT_LANGUAGES.map((language) => (
                        <option key={language.value} value={language.value}>
                            {language.label}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    );
}

function PastedTextPanel({ values, parsed, busy, saving, onChange, onImport }) {
    function updateValue(field, value) {
        onChange({ ...values, [field]: value });
    }

    function handleTextKeyDown(event) {
        if (event.key !== "Tab" || event.shiftKey) return;

        event.preventDefault();
        const textarea = event.currentTarget;
        const selectionStart = textarea.selectionStart;
        const selectionEnd = textarea.selectionEnd;
        const nextText = `${textarea.value.slice(0, selectionStart)}\t${textarea.value.slice(selectionEnd)}`;
        const nextCursorPosition = selectionStart + 1;

        updateValue("text", nextText);
        window.requestAnimationFrame(() => {
            textarea.selectionStart = nextCursorPosition;
            textarea.selectionEnd = nextCursorPosition;
        });
    }

    return (
        <form
            className="personal-flashcard-pasted-import personal-flashcard-import__panel-body"
            onSubmit={onImport}
            noValidate
        >
            <div className="personal-flashcard-import__field personal-flashcard-import__source">
                <label htmlFor="personal-flashcard-import-pasted-text">
                    Flashcard content
                    <span className="input-field__required">*</span>
                </label>
                <textarea
                    id="personal-flashcard-import-pasted-text"
                    value={values.text}
                    rows={12}
                    disabled={busy}
                    onChange={(event) =>
                        updateValue("text", event.target.value)
                    }
                    onKeyDown={handleTextKeyDown}
                    placeholder={
                        "Term\tDefinition\nAnother term\tAnother definition"
                    }
                />
            </div>

            <div className="personal-flashcard-pasted-import__settings">
                <label className="personal-flashcard-import__field">
                    Between front and back
                    <select
                        value={values.frontBackSeparator}
                        disabled={busy}
                        onChange={(event) =>
                            updateValue(
                                "frontBackSeparator",
                                event.target.value,
                            )
                        }
                    >
                        {PERSONAL_PASTED_FRONT_BACK_SEPARATOR_OPTIONS.map(
                            (option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ),
                        )}
                    </select>
                </label>
                {values.frontBackSeparator === "custom" ? (
                    <label className="personal-flashcard-import__field">
                        Custom side separator
                        <input
                            type="text"
                            value={values.customFrontBackSeparator}
                            disabled={busy}
                            onChange={(event) =>
                                updateValue(
                                    "customFrontBackSeparator",
                                    event.target.value,
                                )
                            }
                            placeholder="e.g. ::"
                        />
                    </label>
                ) : null}
                <label className="personal-flashcard-import__field">
                    Between cards
                    <select
                        value={values.cardSeparator}
                        disabled={busy}
                        onChange={(event) =>
                            updateValue("cardSeparator", event.target.value)
                        }
                    >
                        {PERSONAL_PASTED_CARD_SEPARATOR_OPTIONS.map(
                            (option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ),
                        )}
                    </select>
                </label>
                {values.cardSeparator === "custom" ? (
                    <label className="personal-flashcard-import__field">
                        Custom card separator
                        <input
                            type="text"
                            value={values.customCardSeparator}
                            disabled={busy}
                            onChange={(event) =>
                                updateValue(
                                    "customCardSeparator",
                                    event.target.value,
                                )
                            }
                            placeholder="e.g. ---"
                        />
                    </label>
                ) : null}
            </div>

            {parsed.configError ? (
                <div className="personal-flashcard-form-error" role="alert">
                    {parsed.configError}
                </div>
            ) : null}

            <div className="personal-flashcard-pasted-import__summary">
                <span>{parsed.importableCards.length} ready</span>
                <span>
                    {parsed.duplicateRows.length} duplicate{" "}
                    {parsed.duplicateRows.length === 1 ? "row" : "rows"}
                </span>
                <span>
                    {parsed.invalidRows.length} invalid{" "}
                    {parsed.invalidRows.length === 1 ? "row" : "rows"}
                </span>
            </div>

            {parsed.invalidRows.length > 0 ? (
                <div className="personal-flashcard-pasted-import__feedback">
                    <strong>Rows needing attention</strong>
                    <ul>
                        {parsed.invalidRows.map((row) => (
                            <li
                                key={`${row.rowNumber}-${row.reason}-${row.text}`}
                            >
                                <span>
                                    Row {row.rowNumber}: {row.reason}
                                </span>
                                <code>{row.text}</code>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {parsed.duplicateRows.length > 0 ? (
                <div className="personal-flashcard-pasted-import__feedback personal-flashcard-pasted-import__feedback--duplicate">
                    <strong>Duplicate rows skipped</strong>
                    <ul>
                        {parsed.duplicateRows.map((row) => (
                            <li
                                key={`${row.rowNumber}-${row.duplicateReason}-${row.clientId}`}
                            >
                                <span>
                                    Row {row.rowNumber}: {row.duplicateReason}
                                </span>
                                <code>
                                    {row.frontText} / {row.backText}
                                </code>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            <div className="personal-flashcard-pasted-import__preview">
                <h4>Preview</h4>
                {parsed.cards.length === 0 ? (
                    <p>No valid front/back pairs to preview yet.</p>
                ) : (
                    <div className="personal-flashcard-pasted-import__list">
                        {parsed.cards.map((card) => (
                            <article
                                key={card.clientId}
                                className={[
                                    "personal-flashcard-pasted-import__row",
                                    card.importable ? "" : "is-duplicate",
                                ]
                                    .filter(Boolean)
                                    .join(" ")}
                            >
                                <span className="personal-flashcard-pasted-import__index">
                                    {card.rowNumber}
                                </span>
                                <div className="personal-flashcard-pasted-import__side">
                                    <strong>Front</strong>
                                    <p>{card.frontText}</p>
                                </div>
                                <div className="personal-flashcard-pasted-import__side">
                                    <strong>Back</strong>
                                    <p>{card.backText}</p>
                                </div>
                                <div className="personal-flashcard-pasted-import__row-status">
                                    <span
                                        className={
                                            card.importable
                                                ? "personal-flashcard-pasted-import__status"
                                                : "personal-flashcard-pasted-import__status personal-flashcard-pasted-import__status--skip"
                                        }
                                    >
                                        {card.importable
                                            ? "Ready"
                                            : "Duplicate"}
                                    </span>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>

            <div className="personal-flashcard-import__actions">
                <span>
                    {parsed.invalidRows.length > 0
                        ? "Only valid non-duplicate rows are imported."
                        : "Ready cards import directly into this Personal set."}
                </span>
                <Button
                    type="submit"
                    variant="primary"
                    loading={saving}
                    disabled={
                        busy ||
                        Boolean(parsed.configError) ||
                        parsed.importableCards.length === 0
                    }
                    leftIcon={<Upload size={16} aria-hidden="true" />}
                >
                    Import ready cards
                </Button>
            </div>
        </form>
    );
}

export function PersonalFlashcardImportModal({
    open,
    existingCards = [],
    onClose,
    onGenerateFromFile,
    onConfirmSave,
    onUpload,
}) {
    const toast = useToast();
    const documentInputRef = useRef(null);
    const [sourceMode, setSourceMode] = useState("text");
    const [pastedValues, setPastedValues] = useState(
        PERSONAL_PASTED_DEFAULT_VALUES,
    );
    const [file, setFile] = useState(null);
    const [options, setOptions] = useState(PERSONAL_IMPORT_DEFAULT_OPTIONS);
    const [documentDrafts, setDocumentDrafts] = useState([]);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const [editingDraft, setEditingDraft] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const parsedPastedCards = useMemo(
        () => parsePersonalPastedFlashcards(pastedValues, existingCards),
        [existingCards, pastedValues],
    );
    const normalizedDrafts = useMemo(
        () => normalizeCards(documentDrafts),
        [documentDrafts],
    );
    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const busy = generating || saving;
    const canClose = !busy && !editingDraft;
    const hasDocumentDrafts =
        sourceMode === "file" && documentDrafts.length > 0;

    function clearDocumentReview() {
        setDocumentDrafts([]);
        setSelectedIds(new Set());
        setSelectionMode(false);
        setEditingDraft(null);
    }

    function switchSourceMode(nextMode) {
        if (nextMode === sourceMode || busy || editingDraft) return;
        clearDocumentReview();
        setError("");
        setSourceMode(nextMode);
    }

    async function importPastedCards(event) {
        event.preventDefault();
        if (parsedPastedCards.configError) {
            setError(parsedPastedCards.configError);
            return;
        }
        if (!parsedPastedCards.importableCards.length) {
            setError(
                "Paste at least one non-duplicate front/back flashcard row.",
            );
            return;
        }

        setSaving(true);
        setError("");
        try {
            const detail = await onConfirmSave(
                toBulkCreateCards(parsedPastedCards.importableCards),
            );
            toast.success(
                `Imported ${parsedPastedCards.importableCards.length} ready ${parsedPastedCards.importableCards.length === 1 ? "card" : "cards"}.`,
            );
            onClose(detail);
        } catch (saveError) {
            setError(
                getErrorMessage(
                    saveError,
                    "Unable to import ready flashcards.",
                ),
            );
        } finally {
            setSaving(false);
        }
    }

    async function generateDocumentDrafts() {
        const optionError = validatePersonalImportOptions(options);
        const sourceError = !file ? "Choose a PDF or DOCX file." : null;
        if (optionError || sourceError) {
            setError(optionError || sourceError);
            return;
        }

        setGenerating(true);
        setError("");
        try {
            const response = await onGenerateFromFile({ ...options, file });
            const nextDrafts = toDraftCards(response?.cards).map((card) => ({
                ...card,
                importMode: "file",
            }));
            setDocumentDrafts(withSequentialOrderIndices(nextDrafts));
            setSelectedIds(new Set());
            setSelectionMode(false);
            toast.success(
                `Generated ${nextDrafts.length} draft ${nextDrafts.length === 1 ? "card" : "cards"}.`,
            );
        } catch (generateError) {
            setError(
                getErrorMessage(
                    generateError,
                    "Unable to generate flashcards from this document.",
                ),
            );
        } finally {
            setGenerating(false);
        }
    }

    function toggleDraft(card) {
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(card.id)) next.delete(card.id);
            else next.add(card.id);
            return next;
        });
    }

    function deleteDraft(card) {
        setDocumentDrafts((current) =>
            current.filter((draft) => draft.id !== card.id),
        );
        setSelectedIds((current) => {
            const next = new Set(current);
            next.delete(card.id);
            return next;
        });
    }

    function deleteSelectedDrafts() {
        const ids = new Set(selectedIds);
        setDocumentDrafts((current) =>
            current.filter((draft) => !ids.has(draft.id)),
        );
        setSelectedIds(new Set());
        setSelectionMode(false);
    }

    function removeFile() {
        setFile(null);
        if (documentInputRef.current) {
            documentInputRef.current.value = "";
        }
    }

    function moveDraft({ fromVisibleIndex, toVisibleIndex }) {
        setDocumentDrafts((current) =>
            withSequentialOrderIndices(
                moveItem(current, fromVisibleIndex, toVisibleIndex),
            ),
        );
    }

    async function saveDraftEdit(values) {
        setDocumentDrafts((current) =>
            current.map((draft) =>
                draft.id === editingDraft.id ? { ...draft, ...values } : draft,
            ),
        );
        setEditingDraft(null);
    }

    async function confirmDocumentSave() {
        if (!documentDrafts.length) return;
        setSaving(true);
        setError("");
        try {
            const detail = await onConfirmSave(
                toBulkCreateCards(documentDrafts),
            );
            toast.success(
                `Saved ${documentDrafts.length} ${documentDrafts.length === 1 ? "card" : "cards"}.`,
            );
            onClose(detail);
        } catch (saveError) {
            setError(
                getErrorMessage(
                    saveError,
                    "Unable to save generated flashcards.",
                ),
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <Modal
            open={open}
            title="Import flashcards"
            description="Choose a source and review the result before importing."
            size="xl"
            className="personal-flashcard-import-modal"
            closeDisabled={!canClose}
            onClose={() => {
                if (canClose) onClose();
            }}
            footer={
                <div className="personal-flashcard-modal-actions">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onClose()}
                        disabled={!canClose}
                    >
                        Cancel
                    </Button>
                    {hasDocumentDrafts ? (
                        <Button
                            type="button"
                            variant="primary"
                            onClick={confirmDocumentSave}
                            loading={saving}
                            disabled={busy || documentDrafts.length === 0}
                        >
                            Confirm save
                        </Button>
                    ) : null}
                </div>
            }
        >
            <div className="personal-flashcard-import">
                <div
                    className="personal-flashcard-import__tabs"
                    role="tablist"
                    aria-label="Import source"
                >
                    <button
                        type="button"
                        className={sourceMode === "text" ? "is-active" : ""}
                        onClick={() => switchSourceMode("text")}
                        disabled={busy || Boolean(editingDraft)}
                        role="tab"
                        id="personal-flashcard-import-tab-text"
                        aria-controls="personal-flashcard-import-panel-text"
                        aria-selected={sourceMode === "text"}
                    >
                        Pasted Text
                    </button>
                    <button
                        type="button"
                        className={sourceMode === "file" ? "is-active" : ""}
                        onClick={() => switchSourceMode("file")}
                        disabled={busy || Boolean(editingDraft)}
                        role="tab"
                        id="personal-flashcard-import-tab-document"
                        aria-controls="personal-flashcard-import-panel-document"
                        aria-selected={sourceMode === "file"}
                    >
                        Document
                    </button>
                </div>

                {sourceMode === "text" ? (
                    <section
                        id="personal-flashcard-import-panel-text"
                        className="personal-flashcard-import__panel"
                        role="tabpanel"
                        aria-labelledby="personal-flashcard-import-tab-text"
                    >
                        <PastedTextPanel
                            values={pastedValues}
                            parsed={parsedPastedCards}
                            busy={busy}
                            saving={saving}
                            onChange={(nextValues) => {
                                setPastedValues(nextValues);
                                setError("");
                            }}
                            onImport={importPastedCards}
                        />
                    </section>
                ) : (
                    <section
                        id="personal-flashcard-import-panel-document"
                        className="personal-flashcard-import__panel"
                        role="tabpanel"
                        aria-labelledby="personal-flashcard-import-tab-document"
                    >
                        <div className="personal-flashcard-import__panel-body">
                            <div className="personal-flashcard-import__source">
                                <input
                                    ref={documentInputRef}
                                    id="personal-flashcard-import-document"
                                    type="file"
                                    className="personal-flashcard-import__file-input"
                                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                    disabled={busy}
                                    onChange={(event) => {
                                        setFile(
                                            event.target.files?.[0] || null,
                                        );
                                        setError("");
                                    }}
                                />
                                <div
                                    className={`personal-flashcard-import__file-panel${file ? " has-file" : ""}`}
                                >
                                    <label
                                        className="personal-flashcard-import__file-picker"
                                        htmlFor="personal-flashcard-import-document"
                                    >
                                        <FileText
                                            size={22}
                                            aria-hidden="true"
                                        />
                                        <span>
                                            <strong>
                                                {file
                                                    ? "Document selected"
                                                    : "Upload DOCX or PDF"}
                                                <span className="input-field__required">
                                                    *
                                                </span>
                                            </strong>
                                            <small>
                                                {file
                                                    ? file.name
                                                    : "Generated cards stay temporary until you confirm save."}
                                            </small>
                                        </span>
                                    </label>
                                    {file ? (
                                        <div className="personal-flashcard-import__selected-file">
                                            <CheckCircle2
                                                size={16}
                                                aria-hidden="true"
                                            />
                                            <span title={file.name}>
                                                {file.name}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={removeFile}
                                                disabled={busy}
                                                leftIcon={
                                                    <X
                                                        size={14}
                                                        aria-hidden="true"
                                                    />
                                                }
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <ImportSettings
                                options={options}
                                onChange={(nextOptions) => {
                                    setOptions(nextOptions);
                                    setError("");
                                }}
                                disabled={busy}
                            />

                            <p className="personal-flashcard-import__helper">
                                The system reads the document and creates
                                editable draft flashcards for this Personal set.
                            </p>

                            <div className="personal-flashcard-import__actions">
                                <span>
                                    {documentDrafts.length
                                        ? "Regenerating replaces the current temporary document drafts."
                                        : file
                                          ? "Ready to create cards"
                                          : "No file selected"}
                                </span>
                                <Button
                                    type="button"
                                    variant="primary"
                                    onClick={generateDocumentDrafts}
                                    loading={generating}
                                    disabled={busy}
                                    leftIcon={
                                        <Sparkles
                                            size={16}
                                            aria-hidden="true"
                                        />
                                    }
                                >
                                    {documentDrafts.length
                                        ? "Regenerate drafts"
                                        : "Generate drafts"}
                                </Button>
                            </div>
                        </div>

                        {documentDrafts.length > 0 && (
                            <section
                                className="personal-flashcard-import__review"
                                aria-label="Generated flashcard review"
                            >
                                <FlashcardSelectionToolbar
                                    selectionMode={selectionMode}
                                    selectedCount={selectedIds.size}
                                    totalSelectableCount={documentDrafts.length}
                                    bulkDeleteCount={selectedIds.size}
                                    disabled={busy}
                                    onEnterSelection={() =>
                                        setSelectionMode(true)
                                    }
                                    onExitSelection={() => {
                                        setSelectionMode(false);
                                        setSelectedIds(new Set());
                                    }}
                                    onSelectAll={() =>
                                        setSelectedIds(
                                            new Set(draftIds(documentDrafts)),
                                        )
                                    }
                                    onClearSelection={() =>
                                        setSelectedIds(new Set())
                                    }
                                    onBulkDelete={deleteSelectedDrafts}
                                    bulkDeleteDisabled={selectedIds.size === 0}
                                />
                                <FlashcardCardList
                                    cards={normalizedDrafts}
                                    disabled={busy}
                                    selectionMode={selectionMode}
                                    selectedCardIds={[...selectedSet]}
                                    onToggleSelect={toggleDraft}
                                    onSelect={() => {}}
                                    onEdit={setEditingDraft}
                                    onDelete={deleteDraft}
                                    onMove={moveDraft}
                                    renderCardMeta={(card) =>
                                        card.sourceExcerpt ? (
                                            <div className="flashcard-list-item__meta personal-flashcard-import__source-excerpt">
                                                <p>
                                                    <strong>Source:</strong>{" "}
                                                    {card.sourceExcerpt}
                                                </p>
                                            </div>
                                        ) : null
                                    }
                                />
                            </section>
                        )}
                    </section>
                )}

                {error && (
                    <div className="personal-flashcard-form-error" role="alert">
                        {error}
                    </div>
                )}
            </div>

            {editingDraft && (
                <PersonalFlashcardCardFormModal
                    open
                    card={editingDraft}
                    onClose={() => setEditingDraft(null)}
                    onSave={saveDraftEdit}
                    onUpload={onUpload}
                />
            )}
        </Modal>
    );
}
