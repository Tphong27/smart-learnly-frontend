import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    CheckCircle2,
    Download,
    Edit2,
    Eye,
    RefreshCw,
    Sparkles,
    Trash2,
} from "lucide-react";
import {
    Alert,
    Button,
    EmptyState,
    ErrorState,
    IconButton,
    LoadingState,
    Modal,
    Select,
    Table,
    Textarea,
    useToast,
} from "@/shared/components/ui";
import { StatusBadge } from "@/shared/components/status";
import { questionBankService } from "@/features/admin/question-bank";
import { courseAdminService } from "@/features/course";
import { sanitizeAnswerHtml } from "@/shared/utils/htmlSanitizer";
import {
    AI_DRAFT_BATCH_PROCESSING_STATUSES,
    AI_DRAFT_READY_STATUSES,
    AI_DRAFT_REJECT_REASONS,
    canDraftBeSelected,
    evidenceIsUnsuitable,
    evidenceNeedsReview,
    normalizeAiBatch,
} from "../utils/aiQuestionDrafts";
import {
    buildDraftPayload,
    formatBytes,
    getDraftValidationError,
    sortedDraftAnswers,
    sourceKindLabel,
} from "../utils/aiQuestionDraftReview";
import { canWriteQuestionBank } from "../utils/questionFormUtils";
import { AiQuestionDraftEditModal } from "../components/AiQuestionDraftEditModal";
import { AiQuestionDraftTableRow } from "../components/AiQuestionDraftTableRow";
import "../../admin-shared.css";
import "./question-bank.css";

/** Hiển thị batch AI draft để reviewer kiểm tra evidence, chỉnh sửa và xuất bản. */
export function AdminAiQuestionDraftReviewPage() {
    const { bankId, courseId, moduleId, batchId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const writable = canWriteQuestionBank();
    const isCourseQuestionsMode = Boolean(courseId);
    const [bank, setBank] = useState(null);
    const [batch, setBatch] = useState(null);
    const [selectedDraftIds, setSelectedDraftIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [editDraft, setEditDraft] = useState(null);
    const [rejectDraft, setRejectDraft] = useState(null);
    const [detailDraft, setDetailDraft] = useState(null);
    const [mutating, setMutating] = useState(false);
    const [downloadingSourceId, setDownloadingSourceId] = useState(null);
    const resolvedModuleId =
        moduleId || batch?.drafts?.find((draft) => draft.moduleId)?.moduleId;
    const backPath = isCourseQuestionsMode
        ? resolvedModuleId
            ? `/admin/courses/${courseId}/modules/${resolvedModuleId}/questions`
            : `/admin/courses/${courseId}/content`
        : `/admin/question-banks/${bankId}`;

    /** Nạp batch, question bank và module liên quan; hỗ trợ refresh nền khi polling. */
    async function loadBatch({ silent = false } = {}) {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);
        try {
            const [bankData, batchData] = await Promise.all([
                isCourseQuestionsMode
                    ? courseAdminService.get(courseId)
                    : questionBankService.getBank(bankId),
                isCourseQuestionsMode
                    ? questionBankService.getCourseAiDraftBatch(
                          courseId,
                          batchId,
                      )
                    : questionBankService.getAiDraftBatch(bankId, batchId),
            ]);
            const normalizedBatch = normalizeAiBatch(batchData);
            const normalizedBank = isCourseQuestionsMode
                ? {
                      id: null,
                      courseId,
                      name: `${bankData?.title || "Course"} Questions`,
                      status: bankData?.status,
                  }
                : bankData;
            setBank(normalizedBank);
            setBatch(normalizedBatch);
            setSelectedDraftIds((current) =>
                current.filter((draftId) =>
                    normalizedBatch.drafts.some(
                        (draft) =>
                            draft.id === draftId && canDraftBeSelected(draft),
                    ),
                ),
            );
        } catch (err) {
            setError(err?.message || "Could not load AI draft batch.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => {
        const frameId = window.requestAnimationFrame(() => {
            loadBatch();
        });
        return () => window.cancelAnimationFrame(frameId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bankId, batchId, courseId, isCourseQuestionsMode]);

    useEffect(() => {
        if (!courseId || moduleId || !resolvedModuleId) return;
        navigate(
            `/admin/courses/${courseId}/modules/${resolvedModuleId}/questions/ai-drafts/${batchId}`,
            { replace: true },
        );
    }, [batchId, courseId, moduleId, navigate, resolvedModuleId]);

    useEffect(() => {
        if (!batch || !AI_DRAFT_BATCH_PROCESSING_STATUSES.has(batch.status))
            return undefined;
        const timerId = window.setInterval(() => {
            loadBatch({ silent: true });
        }, 5000);
        return () => window.clearInterval(timerId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batch?.status, bankId, batchId, courseId, isCourseQuestionsMode]);

    const selectableDrafts = useMemo(
        () => (batch?.drafts || []).filter(canDraftBeSelected),
        [batch],
    );

    /** Bật hoặc tắt lựa chọn của một draft hợp lệ. */
    function toggleDraft(draftId) {
        setSelectedDraftIds((current) =>
            current.includes(draftId)
                ? current.filter((id) => id !== draftId)
                : [...current, draftId],
        );
    }

    /** Chọn nhanh hoặc bỏ chọn toàn bộ draft có thể xuất bản. */
    function toggleAllSelectable() {
        if (selectedDraftIds.length === selectableDrafts.length) {
            setSelectedDraftIds([]);
        } else {
            setSelectedDraftIds(selectableDrafts.map((draft) => draft.id));
        }
    }

    /** Yêu cầu backend chạy lại batch đã thất bại. */
    async function handleRetry() {
        setMutating(true);
        setActionError(null);
        try {
            const nextBatch = isCourseQuestionsMode
                ? await questionBankService.retryCourseAiDraftBatch(
                      courseId,
                      batchId,
                  )
                : await questionBankService.retryAiDraftBatch(bankId, batchId);
            setBatch(normalizeAiBatch(nextBatch));
            toast.success("Retry started");
        } catch (err) {
            setActionError(err?.message || "Could not retry this batch.");
            toast.error(err?.message || "Could not retry this batch.");
        } finally {
            setMutating(false);
        }
    }

    /** Thêm các draft đã chọn vào danh sách câu hỏi chính. */
    async function handleAddSelected() {
        if (!selectedDraftIds.length) return;
        setMutating(true);
        setActionError(null);
        try {
            const drafts = selectedDraftIds
                .map((draftId) =>
                    batch?.drafts?.find((draft) => draft.id === draftId),
                )
                .filter(Boolean);
            if (isCourseQuestionsMode) {
                await questionBankService.addSelectedCourseAiDrafts(
                    courseId,
                    batchId,
                    drafts,
                );
            } else {
                await questionBankService.addSelectedAiDrafts(
                    bankId,
                    batchId,
                    drafts,
                );
            }
            toast.success("Selected drafts processed");
            setSelectedDraftIds([]);
            navigate(backPath);
        } catch (err) {
            setActionError(err?.message || "Could not add selected drafts.");
            toast.error(err?.message || "Could not add selected drafts.");
        } finally {
            setMutating(false);
        }
    }

    /** Tạo URL tạm thời và mở file nguồn trong tab mới. */
    async function handleSourceDownload(source) {
        const sourceId =
            source.sourceId || source.generationSourceId || source.id;
        if (!sourceId) return;
        setDownloadingSourceId(sourceId);
        setActionError(null);
        try {
            const response = isCourseQuestionsMode
                ? await questionBankService.createCourseAiDraftSourceDownloadUrl(
                      courseId,
                      batchId,
                      sourceId,
                  )
                : await questionBankService.createAiDraftSourceDownloadUrl(
                      bankId,
                      batchId,
                      sourceId,
                  );
            if (response?.url) {
                window.open(response.url, "_blank", "noopener,noreferrer");
            }
        } catch (err) {
            setActionError(
                err?.message || "Could not create source download URL.",
            );
            toast.error(
                err?.message || "Could not create source download URL.",
            );
        } finally {
            setDownloadingSourceId(null);
        }
    }

    /** Xác nhận evidence còn phù hợp hoặc đánh dấu evidence không phù hợp. */
    async function handleEvidenceConfirmation(draft, suitable) {
        setMutating(true);
        setActionError(null);
        try {
            const requestPayload = {
                version: draft.version,
                evidenceStillFits: suitable,
            };
            if (isCourseQuestionsMode) {
                await questionBankService.confirmCourseAiDraftEvidence(
                    courseId,
                    batchId,
                    draft.id,
                    requestPayload,
                );
            } else {
                await questionBankService.confirmAiDraftEvidence(
                    bankId,
                    batchId,
                    draft.id,
                    requestPayload,
                );
            }
            toast.success(
                suitable ? "Evidence confirmed" : "Evidence marked unsuitable",
            );
            await loadBatch({ silent: true });
        } catch (err) {
            setActionError(err?.message || "Could not confirm evidence.");
            toast.error(err?.message || "Could not confirm evidence.");
        } finally {
            setMutating(false);
        }
    }

    /** Kiểm tra và lưu nội dung draft được chỉnh trong modal dùng chung. */
    async function handleEditSave(values) {
        const validationError = getDraftValidationError(values);
        if (validationError) {
            setActionError(validationError);
            return;
        }
        setMutating(true);
        setActionError(null);
        try {
            if (isCourseQuestionsMode) {
                await questionBankService.updateCourseAiDraft(
                    courseId,
                    batchId,
                    values.id,
                    buildDraftPayload(values),
                );
            } else {
                await questionBankService.updateAiDraft(
                    bankId,
                    batchId,
                    values.id,
                    buildDraftPayload(values),
                );
            }
            toast.success("Draft updated");
            setEditDraft(null);
            await loadBatch({ silent: true });
        } catch (err) {
            setActionError(
                err?.message ||
                    "Draft may have been updated by someone else. Please reload and try again.",
            );
            toast.error(err?.message || "Could not update draft.");
        } finally {
            setMutating(false);
        }
    }

    /** Lưu lý do từ chối draft đang được reviewer chọn. */
    async function handleRejectSave(payload) {
        if (!rejectDraft) return;
        setMutating(true);
        setActionError(null);
        try {
            const requestPayload = {
                version: rejectDraft.version,
                reasonCode: payload.reason || null,
                note: payload.note?.trim() || null,
            };
            if (isCourseQuestionsMode) {
                await questionBankService.rejectCourseAiDraft(
                    courseId,
                    batchId,
                    rejectDraft.id,
                    requestPayload,
                );
            } else {
                await questionBankService.rejectAiDraft(
                    bankId,
                    batchId,
                    rejectDraft.id,
                    requestPayload,
                );
            }
            toast.success("Draft rejected");
            setRejectDraft(null);
            await loadBatch({ silent: true });
        } catch (err) {
            setActionError(err?.message || "Could not reject draft.");
            toast.error(err?.message || "Could not reject draft.");
        } finally {
            setMutating(false);
        }
    }

    if (!writable) {
        return (
            <div className="admin-page">
                <section className="admin-card">
                    <h1 className="admin-page__title">Unauthorized</h1>
                    <p className="ai-drafts-muted">
                        Only Admin and SME users can review AI question drafts.
                    </p>
                    <Button to={backPath} variant="secondary">
                        Back to questions
                    </Button>
                </section>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="admin-page">
                <LoadingState label="Loading AI draft batch..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-page">
                <ErrorState
                    title="AI draft batch unavailable"
                    description={error}
                    action={<Button to={backPath} variant="secondary">Back to questions</Button>}
                />
            </div>
        );
    }

    const processing = AI_DRAFT_BATCH_PROCESSING_STATUSES.has(batch?.status);
    const ready = AI_DRAFT_READY_STATUSES.has(batch?.status);
    const failed = batch?.status === "failed";
    const sourceChanged = Boolean(
        batch?.sourceChanged || batch?.sourceSnapshotChanged,
    );

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
                        Review AI questions
                    </h1>
                    <p className="ai-drafts-muted">
                        {bank?.name || "Course questions"}
                    </p>
                </div>
                <div className="ai-drafts-header-actions">
                    <StatusBadge
                        status={batch?.status}
                        tone={failed ? "danger" : processing ? "info" : "success"}
                    />
                    {failed && (
                        <Button
                            variant="secondary"
                            leftIcon={<RefreshCw size={16} />}
                            onClick={handleRetry}
                            loading={mutating}
                            loadingLabel="Retrying..."
                        >
                            Retry
                        </Button>
                    )}
                </div>
            </header>

            {processing && (
                <Alert tone="info">
                    Generation is still processing. You can leave this page; the
                    batch will keep running.
                    {refreshing ? " Refreshing status..." : ""}
                </Alert>
            )}

            {sourceChanged && (
                <Alert tone="warning" title="Source material changed">
                    Source material has been updated after this batch was
                    created. Evidence still uses the original snapshot for
                    audit.
                </Alert>
            )}

            {batch?.sources?.length > 0 && (
                <details className="admin-card ai-source-collapsible">
                    <summary>
                        <span>Source material</span>
                        <strong>{batch.sources.length} snapshot sources</strong>
                    </summary>
                    <div className="ai-source-list ai-source-collapsible__body">
                        {batch.sources.map((source) => {
                            const sourceId =
                                source.sourceId ||
                                source.generationSourceId ||
                                source.id;
                            return (
                                <div className="ai-file-row" key={sourceId}>
                                    <span>
                                        {sourceKindLabel(
                                            source.kind || source.sourceKind,
                                        )}
                                    </span>
                                    <span>
                                        {source.title || source.sourceName}
                                    </span>
                                    <strong>
                                        {source.normalizedCharCount
                                            ? `${source.normalizedCharCount.toLocaleString()} chars`
                                            : source.fileSizeBytes
                                              ? formatBytes(
                                                    source.fileSizeBytes,
                                                )
                                              : source.version || "--"}
                                    </strong>
                                    {source.downloadable && (
                                        <IconButton
                                            icon={<Download size={15} />}
                                            label={`Download ${source.title || source.sourceName}`}
                                            variant="secondary"
                                            onClick={() =>
                                                handleSourceDownload(source)
                                            }
                                            disabled={
                                                downloadingSourceId === sourceId
                                            }
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </details>
            )}

            {actionError && <Alert tone="danger">{actionError}</Alert>}

            {failed ? (
                <section className="admin-card">
                    <h2 className="ai-drafts-card-title">Generation failed</h2>
                    <p className="ai-drafts-muted">
                        {batch?.safeErrorMessage ||
                            "The provider or system could not finish this batch."}
                    </p>
                    <p className="ai-drafts-muted">
                        Retry is available only for failed batches and should
                        use the original source snapshot.
                    </p>
                </section>
            ) : (
                <section className="admin-card admin-card--flush">
                    <div className="ai-drafts-toolbar">
                        <div>
                            <strong>Generated questions</strong>
                            <span>
                                {selectedDraftIds.length} selected ·{" "}
                                {selectableDrafts.length} can be added
                            </span>
                        </div>
                        <div className="ai-drafts-toolbar__actions">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={toggleAllSelectable}
                                disabled={
                                    !ready ||
                                    selectableDrafts.length === 0 ||
                                    mutating
                                }
                            >
                                {selectedDraftIds.length ===
                                selectableDrafts.length
                                    ? "Clear selection"
                                    : "Select valid drafts"}
                            </Button>
                            <Button
                                type="button"
                                leftIcon={<Sparkles size={16} />}
                                size="sm"
                                onClick={handleAddSelected}
                                loading={mutating}
                                loadingLabel="Adding..."
                                disabled={
                                    !ready || selectedDraftIds.length === 0
                                }
                            >
                                Select & Return
                            </Button>
                        </div>
                    </div>

                    {batch?.drafts?.length === 0 ? (
                        <EmptyState
                            title={processing ? "Generating questions" : "No draft questions generated"}
                            description={
                                processing
                                    ? "Drafts will appear here when generation is ready."
                                    : "This batch did not return any draft questions."
                            }
                        />
                    ) : (
                        <Table
                            ariaLabel="Generated AI draft questions"
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
                                    {batch.drafts.map((draft) => (
                                        <DraftReviewRow
                                            key={draft.id}
                                            draft={draft}
                                            selected={selectedDraftIds.includes(
                                                draft.id,
                                            )}
                                            selectable={
                                                ready &&
                                                canDraftBeSelected(draft)
                                            }
                                            mutating={mutating}
                                            onToggle={() =>
                                                toggleDraft(draft.id)
                                            }
                                            onEdit={() => setEditDraft(draft)}
                                            onReject={() =>
                                                setRejectDraft(draft)
                                            }
                                            onDetail={() =>
                                                setDetailDraft(draft)
                                            }
                                            onConfirmEvidence={(suitable) =>
                                                handleEvidenceConfirmation(
                                                    draft,
                                                    suitable,
                                                )
                                            }
                                        />
                                    ))}
                                </tbody>
                        </Table>
                    )}
                </section>
            )}

            {editDraft && (
                <AiQuestionDraftEditModal
                    key={`${editDraft.id}-${editDraft.version}`}
                    draft={editDraft}
                    mutating={mutating}
                    onClose={() => setEditDraft(null)}
                    onSave={handleEditSave}
                />
            )}
            {rejectDraft && (
                <RejectDraftModal
                    key={`${rejectDraft.id}-${rejectDraft.version}`}
                    draft={rejectDraft}
                    mutating={mutating}
                    onClose={() => setRejectDraft(null)}
                    onReject={handleRejectSave}
                />
            )}
            {detailDraft && (
                <DraftDetailModal
                    draft={detailDraft}
                    onClose={() => setDetailDraft(null)}
                />
            )}
        </div>
    );
}

/** Bổ sung answer, evidence và action review vào hàng bảng AI draft dùng chung. */
function DraftReviewRow({
    draft,
    selected,
    selectable,
    mutating,
    onToggle,
    onEdit,
    onReject,
    onDetail,
    onConfirmEvidence,
}) {
    const answers = sortedDraftAnswers(draft);
    const accepted = draft.status === "accepted";
    const rejected = draft.status === "rejected";

    return (
        <AiQuestionDraftTableRow
            draft={draft}
            selected={selected}
            selectable={selectable}
            mutating={mutating}
            onToggle={onToggle}
            details={
                <>
                <div className="ai-draft-row__answers">
                    {answers.map((answer, index) => (
                        <span
                            className={answer.correct ? "is-correct" : ""}
                            key={answer.answerId || answer.id || index}
                            dangerouslySetInnerHTML={{
                                __html: sanitizeAnswerHtml(answer.answerText),
                            }}
                        />
                    ))}
                </div>
                {draft.warnings.length > 0 && (
                    <ul className="ai-draft-row__notes">
                        {draft.warnings.map((warning, index) => (
                            <li key={`${warning}-${index}`}>
                                {String(warning)}
                            </li>
                        ))}
                    </ul>
                )}
                {draft.duplicateCandidates.length > 0 && (
                    <p className="ai-draft-row__duplicate">
                        Similar or archived duplicate warning. Reviewer may
                        override unless backend marks it exact-active duplicate.
                    </p>
                )}
                {(evidenceNeedsReview(draft) ||
                    evidenceIsUnsuitable(draft)) && (
                    <div className="ai-evidence-review-box">
                        <strong>Evidence cần được xác nhận lại</strong>
                        <p>
                            Nội dung câu hỏi hoặc đáp án đúng đã thay đổi. Hãy
                            kiểm tra đoạn nguồn bên dưới.
                        </p>
                        {evidenceNeedsReview(draft) ? (
                            <div className="ai-evidence-review-box__actions">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    leftIcon={<CheckCircle2 size={15} />}
                                    onClick={() => onConfirmEvidence(true)}
                                    disabled={mutating}
                                >
                                    Evidence vẫn phù hợp
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="danger"
                                    onClick={() => onConfirmEvidence(false)}
                                    disabled={mutating}
                                >
                                    Không phù hợp
                                </Button>
                            </div>
                        ) : (
                            <p className="ai-drafts-danger-text">
                                Evidence is marked unsuitable. Reject this draft
                                or restore a suitable revision before adding it.
                            </p>
                        )}
                    </div>
                )}
                </>
            }
            actions={
                <div className="ai-draft-row__actions">
                    <IconButton
                        icon={<Eye size={15} />}
                        label="View evidence"
                        onClick={onDetail}
                    />
                    <IconButton
                        icon={<Edit2 size={15} />}
                        label="Edit draft"
                        onClick={onEdit}
                        disabled={accepted || rejected || mutating}
                    />
                    <IconButton
                        icon={<Trash2 size={15} />}
                        label="Reject draft"
                        variant="danger"
                        onClick={onReject}
                        disabled={accepted || rejected || mutating}
                    />
                </div>
            }
        />
    );
}

/** Thu thập lý do và ghi chú khi reviewer từ chối một draft. */
function RejectDraftModal({ mutating, onClose, onReject }) {
    const [reason, setReason] = useState("");
    const [note, setNote] = useState("");

    return (
        <Modal open title="Reject AI draft" size="md" onClose={onClose}>
            <div className="ai-drafts-fieldset">
                <Select
                    id="ai-reject-reason"
                    label="Reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    disabled={mutating}
                >
                    {AI_DRAFT_REJECT_REASONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </Select>
            </div>
            <div className="ai-drafts-fieldset">
                <Textarea
                    id="ai-reject-note"
                    label="Note"
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    disabled={mutating}
                />
            </div>
            <div className="ai-drafts-actions">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    disabled={mutating}
                >
                    Cancel
                </Button>
                <Button
                    type="button"
                    variant="danger"
                    loading={mutating}
                    loadingLabel="Rejecting..."
                    onClick={() => onReject({ reason, note })}
                >
                    Reject draft
                </Button>
            </div>
        </Modal>
    );
}

/** Hiển thị toàn bộ evidence đã gắn với một AI draft. */
function DraftDetailModal({ draft, onClose }) {
    if (!draft) return null;

    return (
        <Modal
            open={Boolean(draft)}
            title="Draft evidence"
            size="lg"
            onClose={onClose}
        >
            <div className="ai-evidence-list">
                {draft.evidences.length === 0 ? (
                    <EmptyState
                        title="No evidence returned"
                        description="This draft should not be added until backend marks it valid."
                        className="ai-drafts-empty"
                    />
                ) : (
                    draft.evidences.map((evidence, index) => (
                        <section
                            className="ai-evidence-card"
                            key={evidence.id || evidence.evidenceId || index}
                        >
                            <blockquote>
                                {evidence.excerpt ||
                                    evidence.sourceExcerpt ||
                                    "--"}
                            </blockquote>
                        </section>
                    ))
                )}
            </div>
        </Modal>
    );
}
