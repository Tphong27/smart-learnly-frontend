import { useCallback, useMemo, useRef, useState } from "react";
import { Check, FileText } from "lucide-react";
import { Modal } from "@/shared/components/ui";
import { flashcardAuthoringService as flashcardService } from "@/features/flashcard";
import { FlashcardCardEditorModal } from "../../../flashcards-shared";
import { FlashcardCardList } from "./FlashcardCardList";
import { FlashcardPreview } from "./FlashcardPreview";
import {
  getErrorMessage,
  toCardPayload,
  validateCurrentCardDraft,
} from "./flashcard-utils";
import {
  buildDuplicateInfoByCardId,
  getDuplicateReasons,
  getGeneratedCount,
  getShortfallNotice,
  normalizeResponse,
  TEMP_CANDIDATE_EDITOR_FORM_ID,
  TEMP_CANDIDATE_PREVIEW_CARD_ID,
  toTemporaryApprovalPayload,
} from "./flashcardStagingUtils";
import {
  CourseQuestionsImportPanel,
  DocumentGenerationPanel,
  InlineNotice,
  ModalNotice,
  PastedTextImportPanel,
} from "./FlashcardStagingImportPanels";

/** Tạo ID tạm thời ổn định cho ứng viên chưa được backend lưu. */
function newClientId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Lấy ID có sẵn hoặc tạo ID client cho temporary card. */
function getTemporaryCardId(card, index) {
  return String(card?.id || card?.clientId || `candidate-${index}-${newClientId()}`);
}

/** Chuẩn hóa response temporary batch thành state review phía client. */
function normalizeTemporaryBatch(payload) {
  const batch = normalizeResponse(payload);
  const cards = Array.isArray(batch?.cards) ? batch.cards : [];
  return {
    ...batch,
    id: batch?.id || newClientId(),
    cards: cards.map((card, index) => ({
      ...card,
      id: getTemporaryCardId(card, index),
      status: "draft",
      orderIndex: Number(card?.sortOrder ?? card?.orderIndex ?? index),
      selected: Boolean(card?.selected),
      issues: Array.isArray(card?.issues) ? card.issues : [],
    })),
  };
}

/** Khởi tạo selection rỗng để người dùng chủ động chọn card cần duyệt. */
function selectedCandidateIds() {
  return [];
}

/** Chuẩn hóa issue text thành khóa dùng để loại trùng. */
function cardIssueKey(issue) {
  return String(issue || "").trim().toLowerCase();
}

/** Gộp nhiều nhóm issue và loại nội dung trùng nhau. */
function uniqueIssues(...issueGroups) {
  const seen = new Set();
  const issues = [];
  issueGroups.flat().forEach((issue) => {
    const normalized = cardIssueKey(issue);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    issues.push(issue);
  });
  return issues;
}

/** Hiển thị source excerpt và các issue của temporary candidate. */
function TemporaryCandidateMeta({ card }) {
  const issues = Array.isArray(card.issues) ? card.issues : [];
  if (!card.sourceExcerpt && issues.length === 0) return null;

  return (
    <div className="flashcard-list-item__meta flashcard-temp-review__meta">
      {card.sourceExcerpt && (
        <p>
          <strong>Source:</strong> {card.sourceExcerpt}
        </p>
      )}
      {issues.length > 0 && (
        <p className="flashcard-temp-review__issues">
          <strong>Review:</strong> {issues.join("; ")}
        </p>
      )}
    </div>
  );
}

/** Lấy các trường nghiệp vụ cần so sánh khi phát hiện edit chưa lưu. */
function comparableCandidateDraft(card) {
  const payload = toCardPayload(card || {});
  return {
    frontText: payload.frontText || "",
    frontImageUrl: payload.frontImageUrl || "",
    backText: payload.backText || "",
    backImageUrl: payload.backImageUrl || "",
    hint: payload.hint || "",
    explanation: payload.explanation || "",
    sourceExcerpt: String(card?.sourceExcerpt || "").trim(),
  };
}

/** So sánh hai candidate draft sau khi chuẩn hóa các trường nghiệp vụ. */
function candidateDraftsMatch(left, right) {
  return (
    JSON.stringify(comparableCandidateDraft(left)) ===
    JSON.stringify(comparableCandidateDraft(right))
  );
}

/** Cho phép chỉnh temporary candidate và preview trước khi quay lại review. */
function TemporaryCandidateEditorModal({
  card,
  saving,
  onCancel,
  onSave,
  onUploadImage,
  notify,
}) {
  const initialDraft = useMemo(
    () => ({
      ...card,
      sourceExcerpt: card?.sourceExcerpt || "",
    }),
    [card],
  );
  const [draft, setDraft] = useState(initialDraft);
  const [sourceExcerpt, setSourceExcerpt] = useState(initialDraft.sourceExcerpt);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewTriggerRef = useRef(null);

  const dirty = useMemo(
    () =>
      !candidateDraftsMatch(
        { ...draft, sourceExcerpt },
        initialDraft,
      ),
    [draft, initialDraft, sourceExcerpt],
  );

  const previewCard = useMemo(
    () => ({
      ...card,
      ...toCardPayload(draft),
      id: card?.id || TEMP_CANDIDATE_PREVIEW_CARD_ID,
      sourceExcerpt: String(sourceExcerpt || "").trim(),
    }),
    [card, draft, sourceExcerpt],
  );

  function handleDraftChange(nextDraft) {
    setDraft((current) => ({
      ...current,
      ...nextDraft,
    }));
    setError("");
  }

  function handleSave(nextDraft) {
    const validationError = validateCurrentCardDraft(nextDraft);
    if (validationError) {
      setError(validationError);
      notify?.(validationError, "error");
      return;
    }
    onSave?.({
      ...card,
      ...toCardPayload(nextDraft),
      sourceExcerpt: String(sourceExcerpt || "").trim(),
    });
  }

  if (!card) return null;

  return (
    <FlashcardCardEditorModal
      open
      title="Edit flashcard"
      description="Update the card content, images, hint, and explanation."
      closeDisabled={saving || uploading || previewOpen}
      onClose={onCancel}
      onCancel={onCancel}
      formId={TEMP_CANDIDATE_EDITOR_FORM_ID}
      saving={saving}
      uploading={uploading}
      submitDisabled={!dirty}
      submitLabel="Save changes"
      savingLabel="Saving..."
      statusText={
        uploading
          ? "Uploading image..."
          : saving
            ? "Saving..."
            : dirty
              ? "Unsaved changes"
              : "No changes"
      }
      statusTone={
        uploading
          ? "uploading"
          : saving
            ? "saving"
            : dirty
              ? "dirty"
              : "clean"
      }
      onPreview={() => setPreviewOpen(true)}
      previewDisabled={saving || uploading}
      previewTriggerRef={previewTriggerRef}
      errorContent={
        error ? (
          <div className="flashcard-staging__alert" role="alert">
            {error}
          </div>
        ) : null
      }
      editorProps={{
        value: initialDraft,
        mode: "edit",
        titleId: "flashcard-temp-review-edit-title",
        onDraftChange: handleDraftChange,
        onUploadingChange: setUploading,
        onSave: handleSave,
        onUploadImage,
        onError: (message) => {
          setError(message);
          notify?.(message, "error");
        },
      }}
      afterEditor={
        <>
          <label className="flashcard-field flashcard-temp-review__source-field">
            <span>Source excerpt</span>
            <textarea
              value={sourceExcerpt}
              onChange={(event) => {
                setSourceExcerpt(event.target.value);
                setError("");
              }}
              disabled={saving}
              rows={3}
            />
          </label>
          {previewOpen && (
            <Modal
              open
              title="Preview"
              description="Preview the current draft with the flashcard set."
              size="lg"
              onClose={() => {
                setPreviewOpen(false);
                window.requestAnimationFrame(() => {
                  previewTriggerRef.current?.focus({ preventScroll: true });
                });
              }}
            >
              <div className="flashcard-current-editor__preview">
                <FlashcardPreview
                  cards={[previewCard]}
                  activeCardId={previewCard.id}
                  emptyMessage="Add content to preview this flashcard."
                  contentLayout="management"
                  showNavigation={false}
                />
              </div>
            </Modal>
          )}
        </>
      }
    />
  );
}

/** Xác nhận loại một temporary candidate khỏi batch phía client. */
function TemporaryCandidateDeleteModal({
  open,
  disabled,
  onCancel,
  onRemove,
}) {
  return (
    <Modal
      open={open}
      title="Remove draft card?"
      size="sm"
      closeDisabled={disabled}
      onClose={onCancel}
      footer={
        <div className="flashcard-actions">
          <button
            type="button"
            className="flashcard-btn"
            onClick={onCancel}
            disabled={disabled}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flashcard-btn flashcard-btn--danger"
            onClick={onRemove}
            disabled={disabled}
          >
            Remove
          </button>
        </div>
      }
    >
      <p className="flashcard-temp-review__delete-copy">
        This card has not been saved to Current Flashcards.
      </p>
    </Modal>
  );
}

/** Phân tích duplicate/invalid và chỉ approve các temporary candidate được chọn. */
function TemporaryFlashcardReviewPanel({
  setId,
  initialBatch,
  existingCards = [],
  notify,
  reviewNotice,
  onApproved,
  onUploadImage,
}) {
  const normalizedInitialBatch = useMemo(
    () => normalizeTemporaryBatch(initialBatch),
    [initialBatch],
  );
  const [cards, setCards] = useState(normalizedInitialBatch.cards);
  const [selectedIds, setSelectedIds] = useState(() => selectedCandidateIds());
  const [editingCard, setEditingCard] = useState(null);
  const [pendingDeleteCard, setPendingDeleteCard] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [approving, setApproving] = useState(false);

  const duplicateInfoByCardId = useMemo(
    () =>
      buildDuplicateInfoByCardId(
        [{ ...normalizedInitialBatch, cards }],
        existingCards,
      ),
    [cards, existingCards, normalizedInitialBatch],
  );

  const analyzedCards = useMemo(
    () =>
      cards.map((card, index) => {
        const duplicateReasons = getDuplicateReasons(duplicateInfoByCardId, card.id);
        const validationError = validateCurrentCardDraft(card);
        const issues = uniqueIssues(
          duplicateReasons,
          validationError ? [validationError] : [],
        );
        return {
          ...card,
          orderIndex: index,
          duplicateReasons,
          invalid: Boolean(validationError),
          duplicate: duplicateReasons.length > 0,
          issues,
        };
      }),
    [cards, duplicateInfoByCardId],
  );

  const selectedCards = useMemo(
    () =>
      analyzedCards.filter(
        (card) =>
          selectedIds.includes(card.id) && !card.duplicate && !card.invalid,
      ),
    [analyzedCards, selectedIds],
  );
  const selectableAnalyzedCards = useMemo(
    () => analyzedCards.filter((card) => !card.duplicate && !card.invalid),
    [analyzedCards],
  );
  const duplicateSelectedCount = selectedCards.filter((card) => card.duplicate).length;
  const invalidSelectedCount = selectedCards.filter((card) => card.invalid).length;
  const selectedCardIds = selectedCards.map((card) => card.id);
  const actionLocked = approving || savingEdit;

  function getSelectableIdSet(nextCards) {
    const duplicateInfo = buildDuplicateInfoByCardId(
      [{ ...normalizedInitialBatch, cards: nextCards }],
      existingCards,
    );
    return new Set(
      nextCards
        .filter(
          (card) =>
            !validateCurrentCardDraft(card) &&
            getDuplicateReasons(duplicateInfo, card.id).length === 0,
        )
        .map((card) => card.id),
    );
  }

  function toggleCandidate(card) {
    if (!card?.id || actionLocked) return;
    const analyzedCard =
      analyzedCards.find((candidate) => candidate.id === card.id) || card;
    if (analyzedCard.duplicate || analyzedCard.invalid) {
      notify(
        "Edit this candidate into a valid non-duplicate card before selecting it.",
        "error",
      );
      return;
    }
    setPendingDeleteCard(null);
    setSelectedIds((current) =>
      current.includes(card.id)
        ? current.filter((id) => id !== card.id)
        : [...current, card.id],
    );
  }

  function deleteCandidate(card) {
    if (!card?.id || actionLocked) return;
    setPendingDeleteCard(card);
  }

  function cancelDeleteCandidate() {
    setPendingDeleteCard(null);
  }

  function confirmDeleteCandidate() {
    if (!pendingDeleteCard?.id || actionLocked) return;
    setCards((current) =>
      current.filter((item) => item.id !== pendingDeleteCard.id),
    );
    setSelectedIds((current) =>
      current.filter((id) => id !== pendingDeleteCard.id),
    );
    setPendingDeleteCard(null);
  }

  function moveCandidate({ cardId, toVisibleIndex }) {
    if (actionLocked) return;
    setPendingDeleteCard(null);
    setCards((current) => {
      const fromIndex = current.findIndex((card) => card.id === cardId);
      if (fromIndex < 0 || toVisibleIndex < 0 || toVisibleIndex >= current.length) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toVisibleIndex, 0, moved);
      return next.map((card, index) => ({ ...card, orderIndex: index, sortOrder: index }));
    });
  }

  function selectAll() {
    if (actionLocked) return;
    setPendingDeleteCard(null);
    setSelectedIds(
      selectableAnalyzedCards.map((card) => card.id),
    );
  }

  function clearSelection() {
    if (actionLocked) return;
    setPendingDeleteCard(null);
    setSelectedIds([]);
  }

  function startEdit(card) {
    if (!card || actionLocked) return;
    setPendingDeleteCard(null);
    setEditingCard(card);
  }

  function cancelEdit() {
    setEditingCard(null);
  }

  async function saveEdit(nextCard) {
    if (!nextCard?.id) return;
    setSavingEdit(true);
    try {
      const nextCards = cards.map((card) =>
        card.id === nextCard.id
          ? { ...card, ...nextCard }
          : card,
      );
      const selectableIds = getSelectableIdSet(nextCards);
      setCards(nextCards);
      setSelectedIds((current) =>
        current.filter((id) => selectableIds.has(id)),
      );
      cancelEdit();
    } finally {
      setSavingEdit(false);
    }
  }

  async function approveSelected() {
    if (actionLocked) return;
    if (!selectedCards.length) {
      notify("Select at least one candidate.", "error");
      return;
    }

    setApproving(true);
    try {
      const response = normalizeResponse(
        await flashcardService.approveTemporaryCards(
          setId,
          selectedCards.map(toTemporaryApprovalPayload),
        ),
      );
      const createdCards = Array.isArray(response?.createdCards)
        ? response.createdCards
        : [];
      const created = Number(response?.created ?? createdCards.length);
      const duplicateSkipped = Number(response?.duplicateSkipped ?? 0);
      const invalidSkipped = Number(response?.invalidSkipped ?? 0);
      const skipped = duplicateSkipped + invalidSkipped;
      const suffix = skipped
        ? ` ${skipped} skipped (${duplicateSkipped} duplicate, ${invalidSkipped} invalid).`
        : "";
      if (created === 0) {
        notify(`No cards were approved.${suffix}`, "error");
        return;
      }
      notify(
        `Approved ${created} card${created === 1 ? "" : "s"}.${suffix}`,
        "success",
      );
      await onApproved?.(createdCards.map((card) => card.id).filter(Boolean));
    } catch (approveError) {
      notify(
        getErrorMessage(approveError, "Failed to approve selected candidates."),
        "error",
      );
    } finally {
      setApproving(false);
    }
  }

  return (
    <section className="flashcard-temp-review" aria-label="Temporary flashcard review">
      <div className="flashcard-section-heading flashcard-temp-review__header">
        <div>
          <h3 className="flashcard-section-heading__title">
            Review candidates
          </h3>
          <div className="flashcard-toolbar__meta">
            {analyzedCards.length} candidate{analyzedCards.length === 1 ? "" : "s"} -{" "}
            {selectedCards.length} selected
          </div>
        </div>
        <div className="flashcard-staging__header-actions">
          <button
            type="button"
            className="flashcard-btn"
            onClick={selectAll}
            disabled={
              actionLocked ||
              selectedCardIds.length === selectableAnalyzedCards.length
            }
          >
            Select all
          </button>
          <button
            type="button"
            className="flashcard-btn"
            onClick={clearSelection}
            disabled={actionLocked || selectedCardIds.length === 0}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flashcard-staging__section">
        <InlineNotice>{reviewNotice}</InlineNotice>
        {(duplicateSelectedCount > 0 || invalidSelectedCount > 0) && (
          <InlineNotice>
            Selected duplicate or invalid candidates will be skipped during approval.
          </InlineNotice>
        )}
        {analyzedCards.length === 0 ? (
          <div className="flashcard-empty">
            <FileText size={28} />
            <p>No candidates left to review.</p>
          </div>
        ) : (
          <FlashcardCardList
            cards={analyzedCards}
            selectionMode
            selectedCardIds={selectedCardIds}
            disabled={actionLocked}
            dragDisabled={actionLocked}
            onToggleSelect={toggleCandidate}
            onSelect={toggleCandidate}
            onEdit={startEdit}
            onDelete={deleteCandidate}
            onMove={moveCandidate}
            isCardSelectable={(card) => !card.duplicate && !card.invalid}
            getSelectionDisabledReason={() =>
              "Edit this candidate into a valid non-duplicate card before selecting it."
            }
            renderCardMeta={(card) => <TemporaryCandidateMeta card={card} />}
          />
        )}
      </div>

      {editingCard && (
        <TemporaryCandidateEditorModal
          key={editingCard.id}
          card={editingCard}
          saving={savingEdit}
          notify={notify}
          onCancel={cancelEdit}
          onSave={saveEdit}
          onUploadImage={onUploadImage}
        />
      )}

      <TemporaryCandidateDeleteModal
        open={Boolean(pendingDeleteCard)}
        disabled={actionLocked}
        onCancel={cancelDeleteCandidate}
        onRemove={confirmDeleteCandidate}
      />

      <div className="flashcard-temp-review__footer">
        <div className="flashcard-temp-review__footer-status">
          {selectedCards.length} selected
          {duplicateSelectedCount || invalidSelectedCount
            ? ` - ${duplicateSelectedCount} duplicate, ${invalidSelectedCount} invalid`
            : ""}
        </div>
        <button
          type="button"
          className="flashcard-btn flashcard-btn--primary"
          onClick={approveSelected}
          disabled={actionLocked || selectedCards.length === 0}
        >
          <Check size={16} />
          {approving ? "Approving" : "Approve selected"}
        </button>
      </div>

    </section>
  );
}

/** Điều phối ba nguồn import và giữ bắt buộc human review trước publication. */
export function ImportFlashcardsModal({
  courseId,
  defaultModuleId,
  setId,
  existingCards = [],
  notify,
  onClose,
  onCardsImported,
  onApproved,
  onUploadImage,
}) {
  const [activeImportTab, setActiveImportTab] = useState("pasted");
  const [reviewBatch, setReviewBatch] = useState(null);
  const [reviewNotice, setReviewNotice] = useState(null);
  const [modalNotice, setModalNotice] = useState(null);

  const notifyInModal = useCallback((message, type = "info") => {
    if (!message) {
      setModalNotice(null);
      return;
    }
    setModalNotice({ message, type });
  }, []);

  function selectImportTab(tab) {
    setActiveImportTab(tab);
    setModalNotice(null);
  }

  function handleTemporaryCandidates(batch, meta = {}) {
    if (batch?.id) {
      setReviewBatch(batch);
      setReviewNotice(
        getShortfallNotice(
          meta.requestedCount,
          meta.createdCount ?? getGeneratedCount(batch),
        ),
      );
    } else {
      notifyInModal(
        "Candidates were created, but the response did not include a review id.",
        "error",
      );
    }
  }

  function handleBackToImport() {
    setReviewBatch(null);
    setReviewNotice(null);
    setModalNotice(null);
  }

  return (
    <div className="flashcard-modal" role="presentation">
      <div
        className="flashcard-modal__dialog flashcard-modal__dialog--wide flashcard-import-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flashcard-import-modal-title"
      >
        <div className="flashcard-import-modal__header">
          <div>
            <h3 id="flashcard-import-modal-title">
              {reviewBatch ? "Review imported flashcards" : "Import flashcards"}
            </h3>
            <p>
              {reviewBatch
                ? "Review candidates before adding selected cards to Current Flashcards."
                : "Choose a source and review the result before importing."}
            </p>
          </div>
          <div className="flashcard-import-modal__header-actions">
            {reviewBatch && (
              <button
                type="button"
                className="flashcard-btn"
                onClick={handleBackToImport}
              >
                Back to import
              </button>
            )}
            <button type="button" className="flashcard-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <ModalNotice notice={modalNotice} />

        {!reviewBatch && (
          <div
            className="flashcard-tabs flashcard-import-modal__tabs"
            role="tablist"
            aria-label="Flashcard import sources"
          >
            <button
              id="flashcard-import-tab-pasted"
              type="button"
              role="tab"
              aria-selected={activeImportTab === "pasted"}
              aria-controls="flashcard-import-panel-pasted"
              tabIndex={activeImportTab === "pasted" ? 0 : -1}
              className={
                activeImportTab === "pasted"
                  ? "flashcard-tabs__tab is-active"
                  : "flashcard-tabs__tab"
              }
              onClick={() => selectImportTab("pasted")}
            >
              Pasted Text
            </button>
            <button
              id="flashcard-import-tab-document"
              type="button"
              role="tab"
              aria-selected={activeImportTab === "document"}
              aria-controls="flashcard-import-panel-document"
              tabIndex={activeImportTab === "document" ? 0 : -1}
              className={
                activeImportTab === "document"
                  ? "flashcard-tabs__tab is-active"
                  : "flashcard-tabs__tab"
              }
              onClick={() => selectImportTab("document")}
            >
              Document
            </button>
            <button
              id="flashcard-import-tab-course-questions"
              type="button"
              role="tab"
              aria-selected={activeImportTab === "course-questions"}
              aria-controls="flashcard-import-panel-course-questions"
              tabIndex={activeImportTab === "course-questions" ? 0 : -1}
              className={
                activeImportTab === "course-questions"
                  ? "flashcard-tabs__tab is-active"
                  : "flashcard-tabs__tab"
              }
              onClick={() => selectImportTab("course-questions")}
            >
              Course Questions
            </button>
          </div>
        )}

        <div className="flashcard-import-modal__content">
          {reviewBatch ? (
            <TemporaryFlashcardReviewPanel
              key={reviewBatch.id}
              setId={setId}
              initialBatch={reviewBatch}
              existingCards={existingCards}
              notify={notifyInModal}
              reviewNotice={reviewNotice}
              onApproved={async (flashcardIds = []) => {
                await onApproved?.(flashcardIds);
                onClose?.();
              }}
              onUploadImage={onUploadImage}
            />
          ) : (
            <>
              {activeImportTab === "pasted" && (
                <section
                  id="flashcard-import-panel-pasted"
                  className="flashcard-panel"
                  role="tabpanel"
                  aria-labelledby="flashcard-import-tab-pasted"
                >
                  <div className="flashcard-panel__header">
                    <h3 className="flashcard-panel__title">Pasted Text</h3>
                  </div>
                  <PastedTextImportPanel
                    setId={setId}
                    existingCards={existingCards}
                    notify={notify}
                    onClose={onClose}
                    onCardsImported={onCardsImported}
                  />
                </section>
              )}
              {activeImportTab === "document" && (
                <div
                  id="flashcard-import-panel-document"
                  role="tabpanel"
                  aria-labelledby="flashcard-import-tab-document"
                >
                  <DocumentGenerationPanel
                    setId={setId}
                    notify={notifyInModal}
                    onTemporaryCandidates={handleTemporaryCandidates}
                  />
                </div>
              )}
              {activeImportTab === "course-questions" && (
                <div
                  id="flashcard-import-panel-course-questions"
                  role="tabpanel"
                  aria-labelledby="flashcard-import-tab-course-questions"
                >
                  <CourseQuestionsImportPanel
                    courseId={courseId}
                    defaultModuleId={defaultModuleId}
                    setId={setId}
                    notify={notifyInModal}
                    onTemporaryCandidates={handleTemporaryCandidates}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
