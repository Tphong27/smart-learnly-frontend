import { useCallback, useMemo, useState } from "react";
import { Check, FileText, RefreshCw, Trash2 } from "lucide-react";
import { flashcardAuthoringService as flashcardService } from "@/features/flashcard";
import {
    getErrorMessage,
    toCardPayload,
    validateStagingCardDraft,
} from "./flashcard-utils";
import {
    buildDuplicateInfoByCardId,
    formatSourceTypeLabel,
    getDuplicateReasons,
    getPendingBatchCards,
    normalizeResponse,
    orderedUniqueSelectedIds,
} from "./flashcardStagingUtils";
import { InlineAlert, InlineNotice } from "./FlashcardStagingImportPanels";
import {
    EditStagingCardModal,
    StagingBatchCardGroup,
} from "./FlashcardStagingReviewPanel";

/** Review một batch vừa import, cho phép sửa, reject hoặc approve card hợp lệ. */
export function ImportedBatchReviewPanel({
    setId,
    initialBatch,
    existingCards = [],
    notify,
    reviewNotice,
    onStagingChanged,
    onApproved,
    onUploadImage,
    onEditStateChange,
}) {
    const [batch, setBatch] = useState(initialBatch);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [approving, setApproving] = useState(false);
    const [rejectingSelected, setRejectingSelected] = useState(false);
    const [rejectConfirm, setRejectConfirm] = useState(null);
    const [rejectConfirmError, setRejectConfirmError] = useState(null);
    const [editingCard, setEditingCard] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [error, setError] = useState(null);

    const batchId = initialBatch?.id;
    const cards = useMemo(() => getPendingBatchCards(batch), [batch]);
    const duplicateInfoByCardId = useMemo(
        () => buildDuplicateInfoByCardId(batch ? [batch] : [], existingCards),
        [batch, existingCards],
    );
    const draftIds = useMemo(
        () => new Set(cards.map((card) => card.id)),
        [cards],
    );
    const eligibleDraftIds = useMemo(
        () =>
            new Set(
                cards
                    .filter(
                        (card) =>
                            getDuplicateReasons(duplicateInfoByCardId, card.id)
                                .length === 0,
                    )
                    .map((card) => card.id),
            ),
        [cards, duplicateInfoByCardId],
    );
    const selectedDraftIds = useMemo(
        () => orderedUniqueSelectedIds(selectedIds, draftIds),
        [draftIds, selectedIds],
    );
    const selectedEligibleDraftIds = useMemo(
        () => orderedUniqueSelectedIds(selectedIds, eligibleDraftIds),
        [eligibleDraftIds, selectedIds],
    );
    const bulkActionInProgress = approving || rejectingSelected;

    const loadImportedBatch = useCallback(
        async ({ showRefreshedToast = false, clearSelection = false } = {}) => {
            if (!setId || !batchId) return;
            if (showRefreshedToast) {
                notify(null);
            }
            if (clearSelection) {
                setSelectedIds([]);
            }
            setLoading(true);
            setError(null);
            try {
                const items = await flashcardService.listStaging(setId);
                const freshBatch = items.find((item) => item.id === batchId);
                if (!freshBatch) {
                    const message =
                        "Imported staging batch is no longer available.";
                    setBatch(null);
                    setSelectedIds([]);
                    if (showRefreshedToast) {
                        notify(message, "error");
                    } else {
                        setError(message);
                    }
                    return;
                }
                setBatch(freshBatch);
                const freshDraftIds = new Set(
                    getPendingBatchCards(freshBatch).map((card) => card.id),
                );
                setSelectedIds((current) =>
                    clearSelection
                        ? []
                        : current.filter((id) => freshDraftIds.has(id)),
                );
                if (showRefreshedToast) {
                    notify("Imported batch refreshed.", "success");
                }
            } catch (loadError) {
                const message = getErrorMessage(
                    loadError,
                    "Failed to refresh imported batch.",
                );
                if (showRefreshedToast) {
                    notify(message, "error");
                } else {
                    setError(message);
                }
            } finally {
                setLoading(false);
            }
        },
        [batchId, notify, setId],
    );

    function toggleCard(cardId) {
        if (bulkActionInProgress) return;
        if (!draftIds.has(cardId)) return;
        setSelectedIds((current) =>
            current.includes(cardId)
                ? current.filter((id) => id !== cardId)
                : [...current, cardId],
        );
    }

    function toggleBatch(
        currentBatch,
        visibleCards = getPendingBatchCards(currentBatch),
    ) {
        if (bulkActionInProgress) return;
        const draftCardIds = visibleCards
            .filter((card) => draftIds.has(card.id))
            .map((card) => card.id);
        const allSelected = draftCardIds.every((id) =>
            selectedIds.includes(id),
        );
        setSelectedIds((current) =>
            allSelected
                ? current.filter((id) => !draftCardIds.includes(id))
                : [...new Set([...current, ...draftCardIds])],
        );
    }

    function startEdit(card) {
        if (bulkActionInProgress) return;
        notify(null);
        setEditingCard(card);
        onEditStateChange?.(true);
    }

    function cancelEdit(options = {}) {
        if (options?.clearNotice !== false) {
            notify(null);
        }
        setEditingCard(null);
        onEditStateChange?.(false);
    }

    async function handleApprove() {
        if (bulkActionInProgress) return;
        notify(null);
        if (!selectedEligibleDraftIds.length) {
            notify(
                "Select at least one eligible staging card before approve.",
                "error",
            );
            return;
        }
        const ids = selectedEligibleDraftIds;
        setApproving(true);
        try {
            const response = normalizeResponse(
                await flashcardService.approveStagingCards(setId, ids),
            );
            const count = response?.approvedCount ?? ids.length;
            notify(
                `Approved ${count} staging card${count === 1 ? "" : "s"}.`,
                "success",
            );
            setSelectedIds([]);
            onStagingChanged?.();
            await onApproved?.(response?.flashcardIds || []);
        } catch (approveError) {
            notify(
                getErrorMessage(
                    approveError,
                    "Failed to approve staging cards.",
                ),
                "error",
            );
            await loadImportedBatch();
        } finally {
            setApproving(false);
        }
    }

    function handleRejectSelected() {
        if (bulkActionInProgress) return;
        if (!selectedDraftIds.length) return;
        const count = selectedDraftIds.length;
        notify(null);
        setRejectConfirmError(null);
        setRejectConfirm({
            mode: "selected",
            ids: selectedDraftIds,
            message: `Reject ${count} selected staging card${count === 1 ? "" : "s"}?`,
        });
    }

    async function confirmReject() {
        if (!rejectConfirm?.ids?.length) return;

        const ids = orderedUniqueSelectedIds(rejectConfirm.ids, draftIds);
        if (!ids.length) {
            setRejectConfirm(null);
            setRejectConfirmError(null);
            await loadImportedBatch();
            return;
        }
        setRejectingSelected(true);
        setRejectConfirmError(null);
        notify(null);

        try {
            const response = normalizeResponse(
                await flashcardService.rejectStagingCards(setId, ids),
            );
            const count = response?.rejectedCount ?? ids.length;
            setSelectedIds((current) =>
                current.filter((id) => !ids.includes(id)),
            );
            setRejectConfirm(null);
            notify(
                `Rejected ${count} staging card${count === 1 ? "" : "s"}.`,
                "success",
            );
            await loadImportedBatch();
            onStagingChanged?.();
        } catch (rejectError) {
            setRejectConfirmError(
                getErrorMessage(
                    rejectError,
                    "Failed to reject selected staging cards.",
                ),
            );
            await loadImportedBatch();
        } finally {
            setRejectingSelected(false);
        }
    }

    async function handleSaveEdit(draft) {
        notify(null);
        const validationError = validateStagingCardDraft(draft);
        if (validationError) {
            notify(validationError, "error");
            return;
        }
        setSavingEdit(true);
        try {
            await flashcardService.updateStagingCard(
                editingCard.id,
                toCardPayload(draft),
            );
            notify("Staging card updated.", "success");
            cancelEdit({ clearNotice: false });
            await loadImportedBatch();
            onStagingChanged?.();
        } catch (editError) {
            notify(
                getErrorMessage(editError, "Failed to update staging card."),
                "error",
            );
        } finally {
            setSavingEdit(false);
        }
    }

    return (
        <>
            <section
                className="flashcard-imported-review"
                aria-label="Imported flashcard review"
            >
                <div className="flashcard-section-heading flashcard-imported-review__header">
                    <div>
                        <p className="flashcard-imported-review__summary">
                            {formatSourceTypeLabel(
                                batch?.sourceType,
                                "Imported Batch",
                            )}
                            {batch?.sourceName ? ` - ${batch.sourceName}` : ""}{" "}
                            - {cards.length} card
                            {cards.length === 1 ? "" : "s"}
                        </p>
                    </div>
                    <div className="flashcard-staging__header-actions flashcard-imported-review__actions">
                        <button
                            type="button"
                            className="flashcard-btn"
                            onClick={() =>
                                loadImportedBatch({
                                    showRefreshedToast: true,
                                    clearSelection: true,
                                })
                            }
                            disabled={loading || bulkActionInProgress}
                        >
                            <RefreshCw
                                size={16}
                                className={loading ? "flashcard-spin-icon" : ""}
                            />
                            {loading ? "Refreshing" : "Refresh"}
                        </button>
                        <button
                            type="button"
                            className="flashcard-btn flashcard-btn--danger"
                            onClick={handleRejectSelected}
                            disabled={
                                loading ||
                                bulkActionInProgress ||
                                selectedDraftIds.length === 0
                            }
                        >
                            <Trash2 size={16} />
                            {rejectingSelected
                                ? "Rejecting"
                                : `Reject selected (${selectedDraftIds.length})`}
                        </button>
                        <button
                            type="button"
                            className="flashcard-btn flashcard-btn--primary"
                            onClick={handleApprove}
                            disabled={
                                bulkActionInProgress ||
                                loading ||
                                selectedEligibleDraftIds.length === 0
                            }
                        >
                            <Check size={16} />
                            {approving
                                ? "Approving"
                                : `Approve selected eligible (${selectedEligibleDraftIds.length})`}
                        </button>
                    </div>
                </div>

                <div className="flashcard-staging__section">
                    <InlineNotice>{reviewNotice}</InlineNotice>
                    <InlineAlert>{error}</InlineAlert>
                    {loading ? (
                        <div className="flashcard-practice__loading">
                            <span className="flashcard-spinner" />
                            Loading imported batch...
                        </div>
                    ) : !batch || cards.length === 0 ? (
                        <div className="flashcard-empty">
                            <FileText size={28} />
                            <p>Nothing to review.</p>
                        </div>
                    ) : (
                        <div className="flashcard-staging__batches">
                            <StagingBatchCardGroup
                                batch={batch}
                                cards={cards}
                                selectedIds={selectedIds}
                                draftIds={draftIds}
                                duplicateInfoByCardId={duplicateInfoByCardId}
                                savingEdit={savingEdit}
                                actionLocked={bulkActionInProgress}
                                hideSourceSummary
                                onToggleCard={toggleCard}
                                onToggleBatch={toggleBatch}
                                onEdit={startEdit}
                            />
                        </div>
                    )}
                </div>
            </section>

            {rejectConfirm && (
                <div className="flashcard-modal" role="presentation">
                    <div
                        className="flashcard-modal__dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="flashcard-imported-reject-confirm-title"
                    >
                        <h3 id="flashcard-imported-reject-confirm-title">
                            {rejectConfirm.message}
                        </h3>
                        <p>
                            Rejected staging cards will be removed from the
                            draft selection.
                        </p>
                        <InlineAlert>{rejectConfirmError}</InlineAlert>
                        <div className="flashcard-modal__actions">
                            <button
                                type="button"
                                className="flashcard-btn"
                                onClick={() => {
                                    setRejectConfirm(null);
                                    setRejectConfirmError(null);
                                }}
                                disabled={rejectingSelected}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="flashcard-btn flashcard-btn--danger"
                                onClick={confirmReject}
                                disabled={rejectingSelected}
                            >
                                {rejectingSelected
                                    ? "Rejecting"
                                    : "Reject selected"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {editingCard && (
                <EditStagingCardModal
                    card={editingCard}
                    saving={savingEdit}
                    notify={notify}
                    title="Card details"
                    titleId="flashcard-imported-staging-edit-title"
                    onCancel={cancelEdit}
                    onSave={handleSaveEdit}
                    onUploadImage={onUploadImage}
                />
            )}
        </>
    );
}
