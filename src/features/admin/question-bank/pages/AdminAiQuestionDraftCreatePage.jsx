import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit2, FileText, Sparkles, Upload, X } from "lucide-react";
import {
    Alert,
    Button,
    Checkbox,
    EmptyState,
    IconButton,
    Input,
    LoadingState,
    Table,
    Textarea,
    useToast,
} from "@/shared/components/ui";
import { questionBankService } from "@/features/admin/question-bank";
import { courseAdminService } from "@/features/course";
import {
    canDraftBeSelected,
    normalizeAiBatch,
} from "../utils/aiQuestionDrafts";
import {
    buildDraftPayload,
    formatBytes,
    getDraftValidationError,
} from "../utils/aiQuestionDraftReview";
import {
    canWriteQuestionBank,
    QUESTION_TYPE_OPTIONS,
} from "../utils/questionFormUtils";
import { AiQuestionDraftEditModal } from "../components/AiQuestionDraftEditModal";
import { AiQuestionDraftTableRow } from "../components/AiQuestionDraftTableRow";
import "../../admin-shared.css";
import "./question-bank.css";

const MAX_REQUESTED_COUNT = 20;
const DEFAULT_CAPABILITIES = {
    minTextCharacters: 100,
    maxPastedTextCharacters: 50000,
    maxDocumentBytes: 25 * 1024 * 1024,
    maxTranscriptCharacters: 200000,
    maxSourcesPerBatch: 3,
    maxNormalizedCharactersPerBatch: 300000,
    acceptedDocumentMimeTypes: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
    ],
    acceptedDocumentExtensions: ["pdf", "docx", "txt"],
};

/** Tao idempotency key de tranh tao trung batch khi nguoi dung submit lai. */
function createIdempotencyKey() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `ai-draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
/** Lay phan mo rong file de validate dinh dang tai lieu. */
function fileExtension(fileName = "") {
    const index = fileName.lastIndexOf(".");
    return index >= 0 ? fileName.slice(index + 1).toLowerCase() : "";
}
/** Tao khoa on dinh cho selection cua draft nam trong mot batch cu the. */
function draftSelectionKey(batchId, draftId) {
    return `${batchId}:${draftId}`;
}

/** Gop batch moi vao danh sach hien co va tranh trung batch theo id. */
function mergeDraftBatches(batches) {
    const seen = new Set();
    return batches.filter((batch) => {
        if (!batch?.id || seen.has(batch.id)) return false;
        seen.add(batch.id);
        return true;
    });
}

/** Trang tạo AI question draft và chỉ hiển thị draft được generate trong phiên hiện tại. */
export function AdminAiQuestionDraftCreatePage() {
    const { bankId, courseId, moduleId: routeModuleId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const writable = canWriteQuestionBank();
    const isCourseQuestionsMode = Boolean(courseId);
    const fileInputRef = useRef(null);
    const [bank, setBank] = useState(null);
    const [capabilities, setCapabilities] = useState(DEFAULT_CAPABILITIES);
    const [draftBatches, setDraftBatches] = useState([]);
    const [selectedDraftKeys, setSelectedDraftKeys] = useState([]);
    const [files, setFiles] = useState([]);
    const [fileErrors, setFileErrors] = useState([]);
    const [questionTypes, setQuestionTypes] = useState([
        "single_choice",
        "multiple_choice",
        "true_false",
    ]);
    const [requestedCount, setRequestedCount] = useState(10);
    const moduleId = routeModuleId || "";
    const [language, setLanguage] = useState("en");
    const [generationInstruction, setGenerationInstruction] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [mutatingDrafts, setMutatingDrafts] = useState(false);
    const [error, setError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [editDraftRow, setEditDraftRow] = useState(null);
    const [editError, setEditError] = useState(null);
    const [idempotencyKey, setIdempotencyKey] = useState(() =>
        createIdempotencyKey(),
    );

    useEffect(() => {
        let cancelled = false;

        /** Nạp setup AI draft và bắt đầu với danh sách generated questions trống. */
        async function loadSetup() {
            setLoading(true);
            setError(null);
            setDraftBatches([]);
            setSelectedDraftKeys([]);
            try {
                const bankData = isCourseQuestionsMode
                    ? await courseAdminService.get(courseId)
                    : await questionBankService.getBank(bankId);
                if (cancelled) return;
                const normalizedBank = isCourseQuestionsMode
                    ? {
                          id: null,
                          courseId,
                          name: `${bankData?.title || "Course"} Questions`,
                          status: bankData?.status,
                          updatedAt: bankData?.updatedAt,
                      }
                    : bankData;
                const capabilityData = await (isCourseQuestionsMode
                    ? questionBankService
                          .getCourseAiDraftSourceCapabilities(courseId)
                          .catch(() => DEFAULT_CAPABILITIES)
                    : questionBankService
                          .getAiDraftSourceCapabilities(bankId)
                          .catch(() => DEFAULT_CAPABILITIES));
                if (cancelled) return;
                setBank(normalizedBank);
                setLanguage("en");
                setCapabilities({
                    ...DEFAULT_CAPABILITIES,
                    ...(capabilityData || {}),
                });
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err?.message || "Could not load AI generation setup.",
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadSetup();
        return () => {
            cancelled = true;
        };
    }, [bankId, courseId, isCourseQuestionsMode]);

    const draftRows = useMemo(
        () =>
            draftBatches.flatMap((batch) =>
                (batch.drafts || []).map((draft) => ({
                    batch,
                    draft,
                    key: draftSelectionKey(batch.id, draft.id),
                })),
            ),
        [draftBatches],
    );

    const selectableDraftRows = useMemo(
        () => draftRows.filter(({ draft }) => canDraftBeSelected(draft)),
        [draftRows],
    );

    const selectedDraftRows = useMemo(
        () => draftRows.filter((row) => selectedDraftKeys.includes(row.key)),
        [draftRows, selectedDraftKeys],
    );

    const selectedSourcesCount = files.length;
    const trimmedInstruction = generationInstruction.trim();
    const instructionTooLong = trimmedInstruction.length > 2000;
    const sourceCountExceeded =
        selectedSourcesCount > capabilities.maxSourcesPerBatch;
    const canSubmit =
        writable &&
        !loading &&
        !submitting &&
        !sourceCountExceeded &&
        fileErrors.length === 0 &&
        questionTypes.length > 0 &&
        Boolean(moduleId) &&
        Number.isInteger(requestedCount) &&
        requestedCount >= 1 &&
        requestedCount <= MAX_REQUESTED_COUNT &&
        ["vi", "en"].includes(language) &&
        !instructionTooLong &&
        bank?.status !== "archived";

    /** Tải lại các batch đang hiển thị mà không nạp lịch sử cũ. */
    async function refreshDraftBatches(
        visibleBatchIds = draftBatches.map((batch) => batch.id),
    ) {
        const batchData = isCourseQuestionsMode
            ? await questionBankService.listCourseAiDraftBatches(courseId)
            : await questionBankService.listAiDraftBatches(bankId);
        const visibleIds = new Set(visibleBatchIds);
        const normalizedBatches = batchData
            .map(normalizeAiBatch)
            .filter((batch) => batch.id && visibleIds.has(batch.id));
        setDraftBatches(normalizedBatches);
        setSelectedDraftKeys((current) =>
            current.filter((key) =>
                normalizedBatches.some((batch) =>
                    batch.drafts.some(
                        (draft) =>
                            key === draftSelectionKey(batch.id, draft.id),
                    ),
                ),
            ),
        );
    }

    /** Bat tat mot loai cau hoi ma backend se chia deu so luong generate. */
    function toggleQuestionType(type) {
        setQuestionTypes((current) =>
            current.includes(type)
                ? current.filter((item) => item !== type)
                : [...current, type],
        );
    }

    /** Them file tai lieu va validate extension, kich thuoc truoc khi submit. */
    function addFiles(nextFiles) {
        const incoming = Array.from(nextFiles || []);
        const accepted = [];
        const errors = [];
        const remainingSlots = Math.max(
            0,
            capabilities.maxSourcesPerBatch - files.length,
        );
        incoming.forEach((file) => {
            const extension = fileExtension(file.name);
            if (!capabilities.acceptedDocumentExtensions.includes(extension)) {
                errors.push(`${file.name}: PDF, DOCX, or TXT only.`);
            } else if (file.size > capabilities.maxDocumentBytes) {
                errors.push(
                    `${file.name}: maximum ${formatBytes(capabilities.maxDocumentBytes)}.`,
                );
            } else if (accepted.length >= remainingSlots) {
                errors.push(
                    `${file.name}: use at most ${capabilities.maxSourcesPerBatch} source files.`,
                );
            } else {
                accepted.push(file);
            }
        });
        setFileErrors(errors);
        setFiles((current) => [...current, ...accepted]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    /** Xoa mot file tai lieu khoi request generate hien tai. */
    function removeFile(index) {
        setFiles((current) =>
            current.filter((_, itemIndex) => itemIndex !== index),
        );
        setFileErrors([]);
    }

    /** Bat tat selection cua mot AI draft da du dieu kien add vao list chinh. */
    function toggleDraftSelection(key) {
        setSelectedDraftKeys((current) =>
            current.includes(key)
                ? current.filter((item) => item !== key)
                : [...current, key],
        );
    }

    /** Chon nhanh hoac bo chon tat ca draft hop le dang hien thi. */
    function toggleAllSelectableDrafts() {
        const selectableKeys = selectableDraftRows.map((row) => row.key);
        const allSelected =
            selectableKeys.length > 0 &&
            selectableKeys.every((key) => selectedDraftKeys.includes(key));
        setSelectedDraftKeys(allSelected ? [] : selectableKeys);
    }

    /** Tao batch AI moi va giu nguoi dung o lai man hinh danh sach draft. */
    async function handleSubmit(event) {
        event.preventDefault();
        if (!canSubmit) {
            setError(
                "Complete the generation setup before creating draft questions.",
            );
            return;
        }

        setSubmitting(true);
        setError(null);
        setActionError(null);
        try {
            const payload = {
                files,
                questionTypes,
                requestedCount,
                moduleId,
                language,
                generationInstruction: trimmedInstruction || null,
                idempotencyKey,
            };
            const batch = isCourseQuestionsMode
                ? await questionBankService.createCourseAiDraftBatch(
                      courseId,
                      payload,
                  )
                : await questionBankService.createAiDraftBatch(bankId, payload);
            const normalizedBatch = normalizeAiBatch(batch);
            toast.success("AI draft batch created");
            setIdempotencyKey(createIdempotencyKey());
            setFiles([]);
            if (fileInputRef.current) fileInputRef.current.value = "";
            setDraftBatches((current) =>
                mergeDraftBatches([normalizedBatch, ...current]),
            );
            await refreshDraftBatches([
                normalizedBatch.id,
                ...draftBatches.map((item) => item.id),
            ]).catch(() => undefined);
        } catch (err) {
            setError(err?.message || "Could not create AI draft batch.");
            toast.error(err?.message || "Could not create AI draft batch.");
        } finally {
            setSubmitting(false);
        }
    }

    /** Add cac draft da chon vao question list chinh, neu chua chon thi quay ve list. */
    async function handleSelectAndReturn() {
        if (selectedDraftRows.length === 0) {
            navigate(backPath);
            return;
        }

        setMutatingDrafts(true);
        setActionError(null);
        try {
            const rowsByBatch = new Map();
            selectedDraftRows.forEach((row) => {
                const rows = rowsByBatch.get(row.batch.id) || [];
                rows.push(row.draft);
                rowsByBatch.set(row.batch.id, rows);
            });

            await Promise.all(
                Array.from(rowsByBatch.entries()).map(([batchId, drafts]) =>
                    isCourseQuestionsMode
                        ? questionBankService.addSelectedCourseAiDrafts(
                              courseId,
                              batchId,
                              drafts,
                          )
                        : questionBankService.addSelectedAiDrafts(
                              bankId,
                              batchId,
                              drafts,
                          ),
                ),
            );
            toast.success("Selected drafts processed");
            setDraftBatches([]);
            setSelectedDraftKeys([]);
            navigate(backPath);
        } catch (err) {
            setActionError(err?.message || "Could not add selected drafts.");
            toast.error(err?.message || "Could not add selected drafts.");
            await refreshDraftBatches().catch(() => undefined);
        } finally {
            setMutatingDrafts(false);
        }
    }

    /** Luu noi dung draft duoc sua truc tiep tu modal trong man AI Generating. */
    async function handleEditSave(values) {
        const validationError = getDraftValidationError(values);
        if (validationError) {
            setEditError(validationError);
            return;
        }
        if (!editDraftRow?.batch?.id) return;

        setMutatingDrafts(true);
        setEditError(null);
        setActionError(null);
        try {
            if (isCourseQuestionsMode) {
                await questionBankService.updateCourseAiDraft(
                    courseId,
                    editDraftRow.batch.id,
                    values.id,
                    buildDraftPayload(values),
                );
            } else {
                await questionBankService.updateAiDraft(
                    bankId,
                    editDraftRow.batch.id,
                    values.id,
                    buildDraftPayload(values),
                );
            }
            toast.success("Draft updated");
            setEditDraftRow(null);
            await refreshDraftBatches();
        } catch (err) {
            const message =
                err?.message ||
                "Draft may have been updated by someone else. Please reload and try again.";
            setEditError(message);
            toast.error(err?.message || "Could not update draft.");
            await refreshDraftBatches().catch(() => undefined);
        } finally {
            setMutatingDrafts(false);
        }
    }

    if (!writable) {
        return (
            <div className="admin-page">
                <section className="admin-card">
                    <h1 className="admin-page__title">Unauthorized</h1>
                    <p className="ai-drafts-muted">
                        Only Admin and SME users can generate AI question
                        drafts.
                    </p>
                    <Button
                        to={
                            isCourseQuestionsMode
                                ? `/admin/courses/${courseId}/modules/${routeModuleId}/questions`
                                : "/admin/question-banks"
                        }
                        variant="secondary"
                    >
                        Back to questions
                    </Button>
                </section>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="admin-page">
                <LoadingState label="Loading AI generation setup..." />
            </div>
        );
    }

    const bankArchived = !isCourseQuestionsMode && bank?.status === "archived";
    const backPath = isCourseQuestionsMode
        ? `/admin/courses/${courseId}/modules/${routeModuleId}/questions`
        : `/admin/question-banks/${bankId}`;
    const allSelectableSelected =
        selectableDraftRows.length > 0 &&
        selectableDraftRows.every((row) => selectedDraftKeys.includes(row.key));

    return (
        <div className="admin-page ai-drafts-page">
            <header className="admin-page__header">
                <div>
                    <Button
                        to={backPath}
                        variant="ghost"
                        size="sm"
                        leftIcon={<ArrowLeft size={16} />}
                    >
                        Back
                    </Button>
                    <h1 className="admin-page__title ai-drafts-page-title">
                        Generate AI questions
                    </h1>
                    <p className="ai-drafts-muted">
                        {bank?.name || "Course questions"}
                    </p>
                </div>
            </header>

            {error && <Alert tone="danger">{error}</Alert>}

            {actionError && <Alert tone="danger">{actionError}</Alert>}

            {bankArchived && (
                <Alert tone="warning" title="Question bank archived">
                    This question bank is archived. Restore it before generating
                    AI drafts.
                </Alert>
            )}

            <form className="ai-generating-form" onSubmit={handleSubmit}>
                <div className="ai-generating-field">
                    <Textarea
                        id="ai-draft-instruction"
                        label="Extra AI Guides"
                        textareaClassName="ai-generating-guides"
                        rows={3}
                        value={generationInstruction}
                        maxLength={2200}
                        onChange={(event) =>
                            setGenerationInstruction(event.target.value)
                        }
                        disabled={submitting}
                        placeholder="Optional focus notes: topics, learning goals, terminology, misconceptions, or emphasis."
                        error={
                            instructionTooLong
                                ? "Keep the instruction within 2,000 characters."
                                : undefined
                        }
                    />
                    <div className="ai-drafts-counter">
                        <span>
                            Guides shape focus only. Count, type, language, and
                            source rules use the selected settings.
                        </span>
                        <strong
                            className={instructionTooLong ? "is-danger" : ""}
                        >
                            {trimmedInstruction.length}/2000
                        </strong>
                    </div>
                </div>

                <details className="admin-card ai-source-collapsible">
                    <summary>
                        <span>Source material</span>
                        <strong>
                            Optional - {selectedSourcesCount}/
                            {capabilities.maxSourcesPerBatch} selected
                        </strong>
                    </summary>
                    <div className="ai-source-collapsible__body">
                        <div className="ai-drafts-fieldset">
                            <span className="input-field__label">
                                Question type
                            </span>
                            <div className="ai-drafts-check-grid ai-drafts-check-grid--inline">
                                {QUESTION_TYPE_OPTIONS.map((option) => (
                                    <Checkbox
                                        key={option.value}
                                        label={option.label}
                                        checked={questionTypes.includes(
                                            option.value,
                                        )}
                                        onChange={() =>
                                            toggleQuestionType(option.value)
                                        }
                                        disabled={submitting}
                                    />
                                ))}
                            </div>
                        </div>

                        <div
                            className="ai-file-dropzone"
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                                event.preventDefault();
                                addFiles(event.dataTransfer.files);
                            }}
                        >
                            <input
                                ref={fileInputRef}
                                id="ai-source-files"
                                type="file"
                                multiple
                                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                                onChange={(event) =>
                                    addFiles(event.target.files)
                                }
                                disabled={
                                    submitting ||
                                    selectedSourcesCount >=
                                        capabilities.maxSourcesPerBatch
                                }
                            />
                            <Upload size={18} />
                            <label htmlFor="ai-source-files">
                                Choose files
                            </label>
                            <span>
                                or drop up to{" "}
                                {capabilities.maxSourcesPerBatch} PDF, DOCX, or
                                TXT files up to{" "}
                                {formatBytes(capabilities.maxDocumentBytes)}
                            </span>
                        </div>
                        {fileErrors.length > 0 && (
                            <ul className="ai-draft-row__notes" role="alert">
                                {fileErrors.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        )}
                        {files.length > 0 && (
                            <div className="ai-source-list">
                                {files.map((file, index) => (
                                    <div
                                        className="ai-file-row"
                                        key={`${file.name}-${file.size}-${index}`}
                                    >
                                        <FileText size={17} />
                                        <span>{file.name}</span>
                                        <strong>
                                            {formatBytes(file.size)}
                                        </strong>
                                        <IconButton
                                            icon={<X size={15} />}
                                            label={`Remove ${file.name}`}
                                            variant="secondary"
                                            onClick={() => removeFile(index)}
                                            disabled={submitting}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        <Alert tone="info">
                            Source material is optional. Uploaded document
                            originals are stored for audit and can be downloaded
                            after review authorization.
                        </Alert>
                    </div>
                </details>

                {sourceCountExceeded && (
                    <Alert tone="danger">
                        Use at most {capabilities.maxSourcesPerBatch} sources.
                    </Alert>
                )}

                <div className="ai-generating-controls">
                    <div className="ai-generating-control">
                        <Input
                            id="ai-draft-count"
                            label="Number of Questions (max 20)"
                            type="number"
                            min="1"
                            max={MAX_REQUESTED_COUNT}
                            value={requestedCount}
                            onChange={(event) =>
                                setRequestedCount(Number(event.target.value))
                            }
                            disabled={submitting}
                        />
                    </div>

                    <input type="hidden" value={language} readOnly />

                    <div className="ai-generating-actions">
                        <Button
                            type="submit"
                            leftIcon={<Sparkles size={16} />}
                            loading={submitting}
                            disabled={!canSubmit}
                            loadingLabel="Creating..."
                        >
                            AI Generate
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleSelectAndReturn}
                            loading={mutatingDrafts}
                            disabled={submitting || mutatingDrafts}
                            loadingLabel="Adding..."
                        >
                            Select & Return
                        </Button>
                    </div>
                </div>

                <div className="admin-card admin-card--flush ai-generating-table-card">
                    <div className="ai-drafts-toolbar">
                        <div>
                            <strong>Generated questions</strong>
                            <span>
                                {selectedDraftRows.length} selected -{" "}
                                {selectableDraftRows.length} can be added
                            </span>
                        </div>
                        <div className="ai-drafts-toolbar__actions">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={toggleAllSelectableDrafts}
                                disabled={
                                    selectableDraftRows.length === 0 ||
                                    mutatingDrafts
                                }
                            >
                                {allSelectableSelected
                                    ? "Clear selection"
                                    : "Select all"}
                            </Button>
                        </div>
                    </div>
                    <Table
                        ariaLabel="Generated AI questions"
                        tableClassName="admin-table ai-generated-table"
                    >
                        <thead>
                            <tr>
                                <th>Select</th>
                                <th>Question content</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {draftRows.length === 0 ? (
                                <tr>
                                    <td colSpan="5">
                                        <EmptyState
                                            title="No generated questions yet"
                                            description="Generated draft questions will appear here for this session after AI Generate finishes."
                                            className="ai-drafts-empty"
                                        />
                                    </td>
                                </tr>
                            ) : (
                                draftRows.map((row) => (
                                    <AiQuestionDraftTableRow
                                        key={row.key}
                                        draft={row.draft}
                                        selected={selectedDraftKeys.includes(
                                            row.key,
                                        )}
                                        selectable={canDraftBeSelected(
                                            row.draft,
                                        )}
                                        mutating={mutatingDrafts}
                                        onToggle={() =>
                                            toggleDraftSelection(row.key)
                                        }
                                        actions={
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                leftIcon={<Edit2 size={15} />}
                                                onClick={() => {
                                                    setEditError(null);
                                                    setEditDraftRow(row);
                                                }}
                                                disabled={
                                                    row.draft.status !==
                                                        "generated_draft" ||
                                                    mutatingDrafts
                                                }
                                            >
                                                Edit
                                            </Button>
                                        }
                                    />
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>
            </form>

            {editDraftRow && (
                <AiQuestionDraftEditModal
                    key={`${editDraftRow.draft.id}-${editDraftRow.draft.version}`}
                    draft={editDraftRow.draft}
                    mutating={mutatingDrafts}
                    error={editError}
                    onClose={() => {
                        setEditDraftRow(null);
                        setEditError(null);
                    }}
                    onSave={handleEditSave}
                />
            )}
        </div>
    );
}
