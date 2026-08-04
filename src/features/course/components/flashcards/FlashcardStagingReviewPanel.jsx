import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Edit3,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { flashcardAuthoringService as flashcardService } from "@/features/flashcard";
import { FlashcardCardEditor } from "./FlashcardCardEditor";
import {
  getErrorMessage,
  toCardPayload,
  validateStagingCardDraft,
} from "./flashcard-utils";
import {
  buildDuplicateInfoByCardId,
  draftCardCount,
  formatLabel,
  formatSourceTypeLabel,
  getBatchCards,
  getDuplicateReasons,
  getPendingBatchCards,
  normalizeResponse,
  normalizeStatus,
  orderedUniqueSelectedIds,
  shouldIgnoreStagingContentClick,
  STAGING_REVIEW_PAGE_SIZE,
} from "./flashcardStagingUtils";
import { InlineAlert } from "./FlashcardStagingImportPanels";

/** Hiển thị form chỉnh hai mặt của staging card trước khi duyệt. */
export function EditStagingCardForm({
  card,
  saving,
  onCancel,
  onSave,
  onUploadImage,
  notify,
  title = "Edit staging card",
  titleId = "flashcard-staging-edit-title",
}) {
  const [error, setError] = useState("");

  if (!card) return null;

  function handleSave(draft) {
    const validationError = validateStagingCardDraft(draft);
    if (validationError) {
      setError(validationError);
      notify?.(validationError, "error");
      return;
    }
    onSave?.(draft);
  }

  return (
    <>
      {error && (
        <div className="flashcard-staging__alert" role="alert">
          {error}
        </div>
      )}
      <FlashcardCardEditor
        value={card}
        mode="edit"
        title={title}
        titleId={titleId}
        submitLabel="Save"
        savingLabel="Saving"
        saving={saving}
        validate={validateStagingCardDraft}
        onCancel={onCancel}
        onSave={handleSave}
        onUploadImage={onUploadImage}
        onError={(message) => {
          setError(message);
          notify?.(message, "error");
        }}
      />
    </>
  );
}

/** Bọc form chỉnh staging card trong modal dùng chung. */
export function EditStagingCardModal(props) {
  const titleId = props.titleId || "flashcard-staging-edit-title";

  return (
    <div className="flashcard-modal" role="presentation">
      <div
        className="flashcard-modal__dialog flashcard-modal__dialog--card-editor flashcard-modal__dialog--staging-edit"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <EditStagingCardForm {...props} titleId={titleId} />
      </div>
    </div>
  );
}

/** Hiển thị preview một mặt text/ảnh của staging card. */
export function StagingCardSidePreview({ label, text, imageUrl }) {
  const hasText = Boolean(text);
  const hasImage = Boolean(imageUrl);

  return (
    <div>
      <span>{label}</span>
      {hasImage && (
        <img
          src={imageUrl}
          alt=""
          className="flashcard-staging-card__thumbnail"
          loading="lazy"
        />
      )}
      <p className={hasText ? "" : "is-muted"}>
        {hasText ? text : hasImage ? "Image only" : "--"}
      </p>
    </div>
  );
}

/** Hiển thị một staging card cùng trạng thái chọn, lỗi trùng và thao tác edit. */
export function StagingCardArticle({
  card,
  selected,
  selectable,
  duplicateReasons = [],
  savingEdit,
  actionLocked = false,
  onToggle,
  onEdit,
}) {
  const status = normalizeStatus(card?.status);
  const isDraft = status === "draft";
  const isDuplicate = duplicateReasons.length > 0;

  function handleContentClick(event) {
    if (!selectable || shouldIgnoreStagingContentClick(event)) return;
    onToggle?.(card.id);
  }

  function handleContentKeyDown(event) {
    if (!selectable) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onToggle?.(card.id);
  }

  return (
    <article
      className={[
        "flashcard-staging-card",
        `flashcard-staging-card--${status}`,
        selectable ? "flashcard-staging-card--selectable" : "",
        selected ? "is-selected" : "",
        isDuplicate ? "flashcard-staging-card--duplicate" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      key={card.id}
    >
      <div className="flashcard-staging-card__select">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle?.(card.id)}
          disabled={!selectable}
          aria-label={`${selected ? "Deselect" : "Select"} staging card`}
        />
      </div>
      <div
        className="flashcard-staging-card__content"
        onClick={handleContentClick}
        onKeyDown={handleContentKeyDown}
        role={selectable ? "button" : undefined}
        tabIndex={selectable ? 0 : undefined}
        aria-pressed={selectable ? selected : undefined}
        aria-label={
          selectable
            ? `${selected ? "Deselect" : "Select"} staging card`
            : undefined
        }
      >
        <div className="flashcard-staging-card__sides">
          <StagingCardSidePreview
            label="Front"
            text={card.frontText}
            imageUrl={card.frontImageUrl}
          />
          <StagingCardSidePreview
            label="Back"
            text={card.backText}
            imageUrl={card.backImageUrl}
          />
        </div>
        {(card.hint || card.explanation || card.sourceExcerpt || isDuplicate) && (
          <div className="flashcard-staging-card__meta">
            {card.hint && <p><strong>Hint:</strong> {card.hint}</p>}
            {card.explanation && (
              <p><strong>Explanation:</strong> {card.explanation}</p>
            )}
            {card.sourceExcerpt && (
              <p><strong>Source:</strong> {card.sourceExcerpt}</p>
            )}
            {isDuplicate && (
              <p className="flashcard-staging-card__duplicate">
                <strong>Duplicate:</strong> {duplicateReasons.join("; ")}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="flashcard-staging-card__actions">
        {(card.frontImageUrl || card.backImageUrl) && (
          <div
            className="flashcard-staging-card__image-badges"
            aria-label="Image attachments"
          >
            {card.frontImageUrl && (
              <span className="flashcard-staging__image-badge">
                <ImageIcon size={12} />
                Front image
              </span>
            )}
            {card.backImageUrl && (
              <span className="flashcard-staging__image-badge">
                <ImageIcon size={12} />
                Back image
              </span>
            )}
          </div>
        )}
        {isDuplicate && (
          <span className="flashcard-staging__badge flashcard-staging__badge--duplicate">
            Duplicate
          </span>
        )}
        <span className={`flashcard-staging__badge flashcard-staging__badge--${status}`}>
          {formatLabel(card.status)}
        </span>
        <button
          type="button"
          className="flashcard-btn"
          title="Edit staging card"
          onClick={(event) => {
            event.stopPropagation();
            onEdit?.(card);
          }}
          disabled={!isDraft || savingEdit || actionLocked}
        >
          <Edit3 size={15} />
          Edit
        </button>
      </div>
    </article>
  );
}

/** Gom các staging card theo batch và điều phối chọn toàn batch. */
export function StagingBatchCardGroup({
  batch,
  cards,
  selectedIds,
  draftIds,
  duplicateInfoByCardId,
  savingEdit,
  actionLocked = false,
  hideSourceSummary = false,
  onToggleCard,
  onToggleBatch,
  onEdit,
}) {
  const draftCards = cards.filter((card) => draftIds.has(card.id));
  const allDraftSelected =
    draftCards.length > 0 &&
    draftCards.every((card) => selectedIds.includes(card.id));

  return (
    <article className="flashcard-staging-batch" key={batch.id}>
      <div className="flashcard-staging-batch__header">
        <div>
          <h4>
            {hideSourceSummary
              ? "Cards"
              : `${formatSourceTypeLabel(batch.sourceType, "Staging Batch")}${
                  batch.sourceName ? ` - ${batch.sourceName}` : ""
                }`}
          </h4>
          <p>
            {hideSourceSummary
              ? formatLabel(batch.status)
              : `${formatLabel(batch.status)} - ${cards.length} card${
                  cards.length === 1 ? "" : "s"
                }`}
          </p>
        </div>
        <label className="flashcard-staging__select-all">
          <input
            type="checkbox"
            checked={allDraftSelected}
            onChange={() => onToggleBatch(batch, cards)}
            disabled={draftCards.length === 0 || actionLocked}
          />
          Select all cards
        </label>
      </div>
      <div className="flashcard-staging-card-list">
        {cards.map((card) => (
          <StagingCardArticle
            key={card.id}
            card={card}
            selected={selectedIds.includes(card.id)}
            selectable={draftIds.has(card.id) && !actionLocked}
            duplicateReasons={getDuplicateReasons(duplicateInfoByCardId, card.id)}
            savingEdit={savingEdit}
            actionLocked={actionLocked}
            onToggle={onToggleCard}
            onEdit={onEdit}
          />
        ))}
      </div>
    </article>
  );
}

/** Nạp, phân trang, approve và reject toàn bộ staging batches của một set. */
export function StagingReviewPanel({
  setId,
  existingCards = [],
  notify,
  refreshKey,
  onApproved,
  onUploadImage,
  onImport,
  onModalOpen,
  importDisabled = false,
}) {
  const [batches, setBatches] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejectingSelected, setRejectingSelected] = useState(false);
  const [rejectConfirm, setRejectConfirm] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState(null);

  const loadStaging = useCallback(async ({
    showRefreshedToast = false,
    clearSelection = false,
  } = {}) => {
    if (!setId) return;
    if (clearSelection) {
      setSelectedIds([]);
    }
    setLoading(true);
    setError(null);
    try {
      const items = await flashcardService.listStaging(setId);
      setBatches(items);
      const draftIds = new Set(
        items.flatMap((batch) =>
          getPendingBatchCards(batch)
            .map((card) => card.id),
        ),
      );
      setSelectedIds((current) =>
        clearSelection ? [] : current.filter((id) => draftIds.has(id)),
      );
      if (showRefreshedToast) {
        notify("Staging review refreshed.", "success");
      }
    } catch (loadError) {
      const message = getErrorMessage(loadError, "Failed to load staging cards.");
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [notify, setId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadStaging();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadStaging, refreshKey]);

  const draftCount = useMemo(() => draftCardCount(batches), [batches]);
  const duplicateInfoByCardId = useMemo(
    () => buildDuplicateInfoByCardId(batches, existingCards),
    [batches, existingCards],
  );
  const flatStagingCards = useMemo(
    () =>
      batches.flatMap((batch) =>
        getPendingBatchCards(batch).map((card) => ({ batch, card })),
      ),
    [batches],
  );
  const totalPages = Math.max(
    1,
    Math.ceil(flatStagingCards.length / STAGING_REVIEW_PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = useMemo(
    () =>
      flatStagingCards.slice(
        safePage * STAGING_REVIEW_PAGE_SIZE,
        safePage * STAGING_REVIEW_PAGE_SIZE + STAGING_REVIEW_PAGE_SIZE,
      ),
    [flatStagingCards, safePage],
  );
  const pageBatches = useMemo(() => {
    const grouped = new Map();
    pageRows.forEach(({ batch, card }) => {
      if (!grouped.has(batch.id)) {
        grouped.set(batch.id, { ...batch, cards: [] });
      }
      grouped.get(batch.id).cards.push(card);
    });
    return Array.from(grouped.values());
  }, [pageRows]);
  const draftIds = useMemo(
    () =>
      new Set(
        batches.flatMap((batch) =>
          getPendingBatchCards(batch)
            .map((card) => card.id),
        ),
      ),
    [batches],
  );
  const eligibleDraftIds = useMemo(
    () =>
      new Set(
        batches.flatMap((batch) =>
          getPendingBatchCards(batch)
            .filter(
              (card) =>
                getDuplicateReasons(duplicateInfoByCardId, card.id).length === 0,
            )
            .map((card) => card.id),
        ),
      ),
    [batches, duplicateInfoByCardId],
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

  function toggleCard(cardId) {
    if (bulkActionInProgress) return;
    if (!draftIds.has(cardId)) return;
    setSelectedIds((current) =>
      current.includes(cardId)
        ? current.filter((id) => id !== cardId)
        : [...current, cardId],
    );
  }

  function handleRefresh() {
    if (bulkActionInProgress) return;
    loadStaging({ showRefreshedToast: true, clearSelection: true });
  }

  function toggleBatch(batch, visibleCards = getBatchCards(batch)) {
    if (bulkActionInProgress) return;
    const draftCardIds = visibleCards
      .filter((card) => draftIds.has(card.id))
      .map((card) => card.id);
    const allSelected = draftCardIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) =>
      allSelected
        ? current.filter((id) => !draftCardIds.includes(id))
        : [...new Set([...current, ...draftCardIds])],
    );
  }

  function startStagingEdit(card) {
    if (bulkActionInProgress) return;
    onModalOpen?.();
    setEditingCard(card);
  }

  function changePage(event, updater) {
    const trigger = event.currentTarget;
    setPage(updater);
    window.requestAnimationFrame(() => {
      trigger.focus?.({ preventScroll: true });
    });
  }

  async function handleApprove() {
    if (bulkActionInProgress) return;
    if (!selectedEligibleDraftIds.length) {
      notify("Select at least one eligible staging card before approve.", "error");
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
      await loadStaging();
      onApproved?.();
    } catch (approveError) {
      notify(
        getErrorMessage(approveError, "Failed to approve staging cards."),
        "error",
      );
      await loadStaging();
    } finally {
      setApproving(false);
    }
  }

  function handleRejectSelected() {
    if (bulkActionInProgress) return;
    if (!selectedDraftIds.length) return;
    const count = selectedDraftIds.length;
    onModalOpen?.();
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
      await loadStaging();
      return;
    }
    setRejectingSelected(true);

    try {
      const response = normalizeResponse(
        await flashcardService.rejectStagingCards(setId, ids),
      );
      const count = response?.rejectedCount ?? ids.length;
      notify(`Rejected ${count} staging card${count === 1 ? "" : "s"}.`, "success");
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      setRejectConfirm(null);
      await loadStaging();
    } catch (rejectError) {
      notify(
        getErrorMessage(
          rejectError,
          "Failed to reject selected staging cards.",
        ),
        "error",
      );
      await loadStaging();
    } finally {
      setRejectingSelected(false);
    }
  }

  async function handleSaveEdit(draft) {
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
      setEditingCard(null);
      await loadStaging();
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
    <div className="flashcard-staging__review">
      <section className="flashcard-staging-review">
        <div className="flashcard-section-heading flashcard-staging-review__header">
          <div>
            <h3 className="flashcard-section-heading__title">Staging Review</h3>
            <div className="flashcard-toolbar__meta">
              {draftCount} draft card{draftCount === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flashcard-staging__header-actions">
            {onImport && (
              <button
                type="button"
                className="flashcard-btn"
                onClick={onImport}
                disabled={importDisabled}
                aria-label="Import flashcards to staging review"
              >
                <Upload size={16} />
                Import
              </button>
            )}
            <button
              type="button"
              className="flashcard-btn"
              onClick={handleRefresh}
              disabled={loading || bulkActionInProgress}
            >
              <RefreshCw size={16} className={loading ? "flashcard-spin-icon" : ""} />
              {loading ? "Refreshing" : "Refresh"}
            </button>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--danger"
              onClick={handleRejectSelected}
              disabled={loading || bulkActionInProgress || selectedDraftIds.length === 0}
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
              disabled={bulkActionInProgress || loading || selectedEligibleDraftIds.length === 0}
            >
              <Check size={16} />
              {approving
                ? "Approving"
                : `Approve selected eligible (${selectedEligibleDraftIds.length})`}
            </button>
          </div>
        </div>
        <div className="flashcard-staging__section">
          <InlineAlert>{error}</InlineAlert>
          {loading ? (
            <div className="flashcard-practice__loading">
              <span className="flashcard-spinner" />
              Loading staging cards...
            </div>
          ) : batches.length === 0 || flatStagingCards.length === 0 ? (
            <div className="flashcard-empty">
              <FileText size={28} />
              <p>{batches.length === 0 ? "No staging batches yet." : "Nothing to review."}</p>
              {onImport && (
                <div className="flashcard-empty__actions">
                  <button
                    type="button"
                    className="flashcard-btn flashcard-btn--primary"
                    onClick={onImport}
                    disabled={importDisabled}
                  >
                    <Upload size={16} />
                    Import
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flashcard-staging__batches">
                {pageBatches.map((batch) => (
                  <StagingBatchCardGroup
                    key={batch.id}
                    batch={batch}
                    cards={getPendingBatchCards(batch)}
                    selectedIds={selectedIds}
                    draftIds={draftIds}
                    duplicateInfoByCardId={duplicateInfoByCardId}
                    savingEdit={savingEdit}
                    actionLocked={bulkActionInProgress}
                    onToggleCard={toggleCard}
                    onToggleBatch={toggleBatch}
                    onEdit={startStagingEdit}
                  />
                ))}
              </div>
              {flatStagingCards.length > STAGING_REVIEW_PAGE_SIZE && (
                <div className="flashcard-staging__pagination">
                  <span>
                    Showing {safePage * STAGING_REVIEW_PAGE_SIZE + 1}-
                    {Math.min(
                      (safePage + 1) * STAGING_REVIEW_PAGE_SIZE,
                      flatStagingCards.length,
                    )} of {flatStagingCards.length}
                  </span>
                  <div className="flashcard-staging__pagination-controls">
                    <button
                      type="button"
                      className="flashcard-btn"
                      onClick={(event) =>
                        changePage(event, (current) =>
                          Math.max(0, current - 1),
                        )
                      }
                      disabled={safePage === 0}
                    >
                      Previous
                    </button>
                    <span className="flashcard-staging__page-indicator">
                      Page {safePage + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      className="flashcard-btn"
                      onClick={(event) =>
                        changePage(event, (current) =>
                          Math.min(totalPages - 1, current + 1),
                        )
                      }
                      disabled={safePage + 1 >= totalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {rejectConfirm && (
        <div className="flashcard-modal" role="presentation">
          <div
            className="flashcard-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="flashcard-reject-confirm-title"
          >
            <h3 id="flashcard-reject-confirm-title">{rejectConfirm.message}</h3>
            <p>Rejected staging cards will be removed from the draft selection.</p>
            <div className="flashcard-modal__actions">
              <button
                type="button"
                className="flashcard-btn"
                onClick={() => setRejectConfirm(null)}
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
                {rejectingSelected ? "Rejecting" : "Reject selected"}
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
          onCancel={() => setEditingCard(null)}
          onSave={handleSaveEdit}
          onUploadImage={onUploadImage}
        />
      )}
    </div>
  );
}
