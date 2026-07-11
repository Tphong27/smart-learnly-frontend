import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckSquare,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { getCurrentUser } from "@/services";
import { courseService } from "@/services/course.service";
import { flashcardService as defaultFlashcardService } from "@/services/flashcard.service";
import { isRoleAllowed, ROLES } from "@/shared/constants/roles";
import { FlashcardCardEditor } from "./FlashcardCardEditor";
import { FlashcardCardList } from "./FlashcardCardList";
import { FlashcardPreview } from "./FlashcardPreview";
import {
  FlashcardStagingWorkspace,
  ImportFlashcardsModal,
} from "./FlashcardStagingWorkspace";
import {
  getErrorMessage,
  normalizeSet,
  toCardPayload,
  validateCardDraft,
} from "./flashcard-utils";
import { useToast } from "@/shared/components/ui/Toast/useToast";
import "./Flashcards.css";

function flashcardCacheKey(lessonId) {
  return `flashcard-set:${lessonId}`;
}

const STAGING_ROLES = [ROLES.ADMIN, ROLES.SME, ROLES.TRAINER];
const CURRENT_FLASHCARD_PAGE_SIZE = 50;

export function FlashcardLessonEditor({
  lessonId,
  initialSetId,
  defaultTitle = "",
  activeSection = "details",
  onTitleSaved,
  showToast,
  flashcardService = defaultFlashcardService,
  stagingEnabled = true,
}) {
  const { removeToast } = useToast();
  const [flashcardSet, setFlashcardSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [editingCard, setEditingCard] = useState(null);
  const [cardEditorOpen, setCardEditorOpen] = useState(false);
  const [activePreviewCardId, setActivePreviewCardId] = useState(null);
  const [editorVersion, setEditorVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingSet, setSavingSet] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [cardPendingDelete, setCardPendingDelete] = useState(null);
  const [deletingCardId, setDeletingCardId] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState([]);
  const [cardPage, setCardPage] = useState(0);
  const [bulkDeletePending, setBulkDeletePending] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [stagingRefreshKey, setStagingRefreshKey] = useState(0);
  const [error, setError] = useState(null);

  const canUseStaging =
    stagingEnabled && isRoleAllowed(getCurrentUser()?.role, STAGING_ROLES);

  const toastIdsRef = useRef(new Set());

  const clearFlashcardToasts = useCallback(() => {
    toastIdsRef.current.forEach((toastId) => {
      removeToast(toastId);
    });
    toastIdsRef.current.clear();
  }, [removeToast]);

  const notify = useCallback(
    (message, type = "info") => {
      if (!message) {
        return null;
      }
      const toastId = showToast?.(message, type);
      if (toastId) {
        toastIdsRef.current.add(toastId);
        window.setTimeout(() => {
          toastIdsRef.current.delete(toastId);
        }, 3500);
      }
      return toastId;
    },[showToast]);

  useEffect(() => () => clearFlashcardToasts(), [clearFlashcardToasts]);

  const hydrateSet = useCallback(
    (payload) => {
      const normalized = normalizeSet(payload);
      setFlashcardSet(normalized);
      setCards(normalized.cards);
      setTitle(normalized.title || defaultTitle || "");
      setDescription(normalized.description || "");
      if (lessonId && normalized.id) {
        sessionStorage.setItem(flashcardCacheKey(lessonId), normalized.id);
      }
      return normalized;
    },
    [defaultTitle, lessonId],
  );

  const loadSet = useCallback(async () => {
    if (!lessonId) return;

    setLoading(true);
    setError(null);

    try {
      const cachedSetId =
        initialSetId || sessionStorage.getItem(flashcardCacheKey(lessonId));

      if (cachedSetId) {
        try {
          const setById = normalizeSet(
            await flashcardService.getAdminSet(cachedSetId),
          );
          if (setById.lessonId === lessonId) {
            hydrateSet(setById);
            return;
          }
        } catch {
          sessionStorage.removeItem(flashcardCacheKey(lessonId));
        }
      }

      hydrateSet(await flashcardService.getAdminSetByLesson(lessonId));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load flashcard set."));
    } finally {
      setLoading(false);
    }
  }, [hydrateSet, initialSetId, lessonId, flashcardService]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadSet();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadSet]);

  const orderedCards = useMemo(
    () =>
      [...cards].sort(
        (a, b) => Number(a.orderIndex ?? 0) - Number(b.orderIndex ?? 0),
      ),
    [cards],
  );

  const activeCardId = useMemo(() => {
    if (!orderedCards.length) return null;
    if (orderedCards.some((card) => card.id === activePreviewCardId)) {
      return activePreviewCardId;
    }
    return orderedCards[0].id;
  }, [activePreviewCardId, orderedCards]);

  const selectedVisibleCardIds = useMemo(() => {
    const visibleIds = new Set(orderedCards.map((card) => card.id));
    return selectedCardIds.filter((cardId) => visibleIds.has(cardId));
  }, [orderedCards, selectedCardIds]);

  const totalCardPages = Math.max(
    1,
    Math.ceil(orderedCards.length / CURRENT_FLASHCARD_PAGE_SIZE),
  );
  const safeCardPage = Math.min(cardPage, totalCardPages - 1);
  const cardPageStartIndex = safeCardPage * CURRENT_FLASHCARD_PAGE_SIZE;
  const pageCards = useMemo(
    () =>
      orderedCards.slice(
        cardPageStartIndex,
        cardPageStartIndex + CURRENT_FLASHCARD_PAGE_SIZE,
      ),
    [cardPageStartIndex, orderedCards],
  );
  const pageCardIds = useMemo(
    () => pageCards.map((card) => card.id).filter(Boolean),
    [pageCards],
  );
  const selectedPageCardIds = useMemo(() => {
    const pageIdSet = new Set(pageCardIds);
    return selectedVisibleCardIds.filter((cardId) => pageIdSet.has(cardId));
  }, [pageCardIds, selectedVisibleCardIds]);

  const handleSaveSet = async (event) => {
    event.preventDefault();
    if (!flashcardSet?.id) return;

    if (!title.trim()) {
      notify("Flashcard title is required.", "error");
      return;
    }

    setSavingSet(true);
    try {
      const savedSet = hydrateSet(
        await flashcardService.updateSet(flashcardSet.id, {
          title: title.trim(),
          description: description.trim(),
        }),
      );
      onTitleSaved?.(savedSet.title);
      notify("Flashcard set saved.", "success");
    } catch (saveError) {
      notify(
        getErrorMessage(saveError, "Failed to save flashcard set."),
        "error",
      );
    } finally {
      setSavingSet(false);
    }
  };

  const handleSaveCard = async (draft) => {
    if (!flashcardSet?.id) return;

    const validationError = validateCardDraft(draft);
    if (validationError) {
      notify(validationError, "error");
      return;
    }

    setSavingCard(true);
    try {
      const payload = toCardPayload({
        ...draft,
        orderIndex: editingCard?.orderIndex ?? orderedCards.length,
      });

      if (editingCard?.id) {
        const savedCard = await flashcardService.updateCard(
          editingCard.id,
          payload,
        );
        setCards((currentCards) =>
          currentCards.map((card) =>
            card.id === savedCard.id ? savedCard : card,
          ),
        );
        setActivePreviewCardId(savedCard.id);
        notify("Card updated.", "success");
      } else {
        const savedCard = await flashcardService.addCard(
          flashcardSet.id,
          payload,
        );
        setCards((currentCards) => [...currentCards, savedCard]);
        setCardPage(
          Math.floor(orderedCards.length / CURRENT_FLASHCARD_PAGE_SIZE),
        );
        setActivePreviewCardId(savedCard.id);
        notify("Card added.", "success");
      }

      setCardEditorOpen(false);
      setEditingCard(null);
      setEditorVersion((version) => version + 1);
    } catch (saveError) {
      notify(getErrorMessage(saveError, "Failed to save card."), "error");
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteCard = (card) => {
    if (!card?.id) return;
    clearFlashcardToasts();
    setCardPendingDelete(card);
  };

  const openBulkDeleteConfirm = () => {
    clearFlashcardToasts();
    setBulkDeletePending(true);
  };

  const confirmDeleteCard = async () => {
    if (!cardPendingDelete?.id) return;

    setDeletingCardId(cardPendingDelete.id);
    try {
      await flashcardService.deleteCard(cardPendingDelete.id);
      setCards((currentCards) => {
        const nextCards = currentCards.filter(
          (currentCard) => currentCard.id !== cardPendingDelete.id,
        );
        if (activePreviewCardId === cardPendingDelete.id) {
          setActivePreviewCardId(nextCards[0]?.id || null);
        }
        return nextCards;
      });
      if (editingCard?.id === cardPendingDelete.id) {
        setCardEditorOpen(false);
        setEditingCard(null);
        setEditorVersion((version) => version + 1);
      }
      setSelectedCardIds((current) =>
        current.filter((cardId) => cardId !== cardPendingDelete.id),
      );
      setCardPendingDelete(null);
      notify("Card deleted.", "success");
    } catch (deleteError) {
      notify(getErrorMessage(deleteError, "Failed to delete card."), "error");
    } finally {
      setDeletingCardId(null);
    }
  };

  const handleMoveCard = async (fromIndex, toIndex) => {
    if (
      !flashcardSet?.id ||
      fromIndex === toIndex ||
      toIndex < 0 ||
      toIndex >= orderedCards.length
    ) {
      return;
    }

    const nextCards = [...orderedCards];
    const [movedCard] = nextCards.splice(fromIndex, 1);
    nextCards.splice(toIndex, 0, movedCard);
    const optimisticCards = nextCards.map((card, index) => ({
      ...card,
      orderIndex: index,
    }));
    setCards(optimisticCards);
    setReordering(true);

    try {
      const savedSet = normalizeSet(
        await flashcardService.reorderCards(
          flashcardSet.id,
          optimisticCards.map((card) => card.id),
        ),
      );
      setFlashcardSet(savedSet);
      setCards(savedSet.cards);
    } catch (reorderError) {
      notify(
        getErrorMessage(reorderError, "Failed to reorder cards."),
        "error",
      );
      loadSet();
    } finally {
      setReordering(false);
    }
  };

  const handleUploadImage = async (file) => {
    const uploaded = await courseService.uploadLessonResource(file);
    return uploaded?.url || uploaded?.data?.url || uploaded;
  };

  const refreshCurrentFlashcards = useCallback(async () => {
    await loadSet();
  }, [loadSet]);

  const refreshStagingReview = useCallback(() => {
    setStagingRefreshKey((current) => current + 1);
  }, []);

  const handleCardsImported = async () => {
    await refreshCurrentFlashcards();
  };

  const handleStagingImportCreated = useCallback(() => {
    refreshStagingReview();
  }, [refreshStagingReview]);

  const handleEditCard = (card) => {
    clearFlashcardToasts();
    setActivePreviewCardId(card?.id || null);
    setEditingCard(card);
    setCardEditorOpen(true);
  };

  const handleAddCard = () => {
    clearFlashcardToasts();
    setEditingCard(null);
    setEditorVersion((version) => version + 1);
    setCardEditorOpen(true);
  };

  const closeCardEditor = () => {
    clearFlashcardToasts();
    setCardEditorOpen(false);
    setEditingCard(null);
    setEditorVersion((version) => version + 1);
  };

  const openImportModal = useCallback(() => {
    clearFlashcardToasts();
    setImportModalOpen(true);
  }, [clearFlashcardToasts]);

  const closeImportModal = useCallback(() => {
    clearFlashcardToasts();
    setImportModalOpen(false);
  }, [clearFlashcardToasts]);

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedCardIds([]);
    }
    setSelectionMode((current) => !current);
  };

  const toggleSelectedCard = (card) => {
    if (!card?.id) return;
    setSelectedCardIds((current) =>
      current.includes(card.id)
        ? current.filter((cardId) => cardId !== card.id)
        : [...current, card.id],
    );
  };

  const selectCurrentPage = () => {
    if (!pageCardIds.length) return;
    setSelectedCardIds((current) => [...new Set([...current, ...pageCardIds])]);
  };

  const clearCurrentPageSelection = () => {
    if (!pageCardIds.length) return;
    const pageIdSet = new Set(pageCardIds);
    setSelectedCardIds((current) =>
      current.filter((cardId) => !pageIdSet.has(cardId)),
    );
  };

  const confirmBulkDeleteCards = async () => {
    if (!selectedVisibleCardIds.length) return;

    const idsToDelete = selectedVisibleCardIds;
    const deletedIdSet = new Set(idsToDelete);
    setBulkDeleting(true);
    try {
      for (const cardId of idsToDelete) {
        await flashcardService.deleteCard(cardId);
      }

      const remainingCards = orderedCards.filter(
        (card) => !deletedIdSet.has(card.id),
      );
      setCards((currentCards) =>
        currentCards.filter((card) => !deletedIdSet.has(card.id)),
      );
      if (deletedIdSet.has(activePreviewCardId)) {
        setActivePreviewCardId(remainingCards[0]?.id || null);
      }
      if (editingCard?.id && deletedIdSet.has(editingCard.id)) {
        setCardEditorOpen(false);
        setEditingCard(null);
        setEditorVersion((version) => version + 1);
      }
      setSelectedCardIds([]);
      setSelectionMode(remainingCards.length > 0);
      setBulkDeletePending(false);
      notify(
        `Deleted ${idsToDelete.length} flashcard${
          idsToDelete.length === 1 ? "" : "s"
        }.`,
        "success",
      );
      await loadSet();
    } catch (deleteError) {
      notify(
        getErrorMessage(deleteError, "Failed to delete selected flashcards."),
        "error",
      );
    } finally {
      setBulkDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flashcard-practice__loading">
        <span className="flashcard-spinner" />
        Loading flashcards...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flashcard-shell">
        <div className="flashcard-practice__error">{error}</div>
        <button type="button" className="flashcard-btn" onClick={loadSet}>
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flashcard-shell">
      {activeSection === "details" && (
        <>
          <div className="flashcard-toolbar">
            <div>
              <h2 className="flashcard-toolbar__title">
                {title || "Flashcards"}
              </h2>
              <div className="flashcard-toolbar__meta">
                {orderedCards.length} card{orderedCards.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          <form className="flashcard-panel" onSubmit={handleSaveSet}>
            <div className="flashcard-panel__header">
              <h3 className="flashcard-panel__title">Set Details</h3>
              <button
                type="submit"
                className="flashcard-btn flashcard-btn--primary"
                disabled={savingSet}
              >
                <Save size={16} />
                {savingSet ? "Saving" : "Save Set"}
              </button>
            </div>
            <div className="flashcard-panel__body">
              <div className="flashcard-form__row">
                <div className="flashcard-field">
                  <label htmlFor="flashcard-set-title">Title</label>
                  <input
                    id="flashcard-set-title"
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                  />
                </div>
                <div className="flashcard-field">
                  <label htmlFor="flashcard-set-description">Description</label>
                  <input
                    id="flashcard-set-description"
                    type="text"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          </form>
        </>
      )}

      {activeSection === "current" && (
        <div className="flashcard-current-workspace">
          <div className="flashcard-current-workspace__inner">
            <div className="flashcard-current-workspace__main">
              <div className="flashcard-panel flashcard-current-list-panel">
                <div className="flashcard-panel__header">
                  <div>
                    <h3 className="flashcard-panel__title">
                      Current Flashcards
                    </h3>
                    {selectionMode && (
                      <div className="flashcard-toolbar__meta">
                        {selectedVisibleCardIds.length} selected
                        {pageCards.length > 0
                          ? ` (${selectedPageCardIds.length} on this page)`
                          : ""}
                      </div>
                    )}
                  </div>
                  <div className="flashcard-actions">
                    <button
                      type="button"
                      className="flashcard-btn flashcard-btn--primary"
                      onClick={handleAddCard}
                      disabled={savingCard || reordering || bulkDeleting}
                    >
                      <Plus size={16} />
                      Add card
                    </button>
                    {canUseStaging && (
                      <button
                        type="button"
                        className="flashcard-btn flashcard-btn--primary"
                        onClick={openImportModal}
                        disabled={savingCard || reordering || bulkDeleting}
                      >
                        <Upload size={16} />
                        Import
                      </button>
                    )}
                    {selectionMode && pageCards.length > 0 && (
                      <>
                        <button
                          type="button"
                          className="flashcard-btn"
                          onClick={selectCurrentPage}
                          disabled={
                            savingCard ||
                            reordering ||
                            bulkDeleting ||
                            selectedPageCardIds.length === pageCardIds.length
                          }
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          className="flashcard-btn"
                          onClick={clearCurrentPageSelection}
                          disabled={
                            savingCard ||
                            reordering ||
                            bulkDeleting ||
                            selectedPageCardIds.length === 0
                          }
                        >
                          Clear
                        </button>
                      </>
                    )}
                    {selectionMode && selectedVisibleCardIds.length > 0 && (
                      <button
                        type="button"
                        className="flashcard-btn flashcard-btn--danger"
                        onClick={openBulkDeleteConfirm}
                        disabled={savingCard || reordering || bulkDeleting}
                      >
                        <Trash2 size={16} />
                        Delete ({selectedVisibleCardIds.length})
                      </button>
                    )}
                    <button
                      type="button"
                      className="flashcard-btn"
                      onClick={toggleSelectionMode}
                      disabled={savingCard || reordering || bulkDeleting}
                    >
                      {selectionMode ? (
                        <X size={16} />
                      ) : (
                        <CheckSquare size={16} />
                      )}
                      {selectionMode ? "Cancel" : "Select"}
                    </button>
                  </div>
                </div>
                <div className="flashcard-panel__body">
                  <FlashcardCardList
                    cards={pageCards}
                    pageStartIndex={cardPageStartIndex}
                    totalCards={orderedCards.length}
                    activeCardId={activeCardId}
                    disabled={
                      savingCard ||
                      reordering ||
                      bulkDeleting ||
                      Boolean(deletingCardId)
                    }
                    selectionMode={selectionMode}
                    selectedCardIds={selectedCardIds}
                    onToggleSelect={toggleSelectedCard}
                    onSelect={(card) =>
                      setActivePreviewCardId(card?.id || null)
                    }
                    onEdit={handleEditCard}
                    onDelete={handleDeleteCard}
                    onMove={handleMoveCard}
                  />
                  {orderedCards.length > CURRENT_FLASHCARD_PAGE_SIZE && (
                    <div className="flashcard-current-pagination">
                      <span>
                        Showing {cardPageStartIndex + 1}-
                        {Math.min(
                          cardPageStartIndex + CURRENT_FLASHCARD_PAGE_SIZE,
                          orderedCards.length,
                        )}{" "}
                        of {orderedCards.length}
                      </span>
                      <div className="flashcard-current-pagination__controls">
                        <button
                          type="button"
                          className="flashcard-btn"
                          onClick={() =>
                            setCardPage((current) => Math.max(0, current - 1))
                          }
                          disabled={safeCardPage === 0}
                        >
                          Previous
                        </button>
                        <span className="flashcard-staging__page-indicator">
                          Page {safeCardPage + 1} / {totalCardPages}
                        </span>
                        <button
                          type="button"
                          className="flashcard-btn"
                          onClick={() =>
                            setCardPage((current) =>
                              Math.min(totalCardPages - 1, current + 1),
                            )
                          }
                          disabled={safeCardPage + 1 >= totalCardPages}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <aside className="flashcard-panel flashcard-current-preview-panel">
              <div className="flashcard-panel__header">
                <h3 className="flashcard-panel__title">Preview</h3>
              </div>
              <div className="flashcard-panel__body">
                <FlashcardPreview
                  cards={orderedCards}
                  activeCardId={activeCardId}
                  onActiveCardChange={(cardId) =>
                    setActivePreviewCardId(cardId)
                  }
                  emptyMessage="Add a card to preview this flashcard set."
                />
              </div>
            </aside>
          </div>
        </div>
      )}
      {activeSection === "review" && canUseStaging && (
        <FlashcardStagingWorkspace
          setId={flashcardSet?.id}
          existingCards={orderedCards}
          notify={notify}
          onUploadImage={handleUploadImage}
          onApproved={refreshCurrentFlashcards}
          refreshKey={stagingRefreshKey}
          onImport={openImportModal}
          onModalOpen={clearFlashcardToasts}
          importDisabled={savingCard || reordering || bulkDeleting}
        />
      )}
      {importModalOpen && flashcardSet?.id && (
        <ImportFlashcardsModal
          setId={flashcardSet.id}
          existingCards={orderedCards}
          notify={notify}
          onClose={closeImportModal}
          onStagingChanged={handleStagingImportCreated}
          onCardsImported={handleCardsImported}
          onApproved={refreshCurrentFlashcards}
          onUploadImage={handleUploadImage}
        />
      )}
      {cardEditorOpen && (
        <div className="flashcard-modal" role="presentation">
          <div
            className="flashcard-modal__dialog flashcard-modal__dialog--card-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="flashcard-card-editor-title"
          >
            <FlashcardCardEditor
              key={`${editingCard?.id || "new"}-${editorVersion}`}
              value={editingCard}
              mode={editingCard ? "edit" : "create"}
              saving={savingCard}
              titleId="flashcard-card-editor-title"
              onSave={handleSaveCard}
              onCancel={closeCardEditor}
              onUploadImage={handleUploadImage}
              onError={(message) => notify(message, "error")}
            />
          </div>
        </div>
      )}
      {cardPendingDelete && (
        <div className="flashcard-modal" role="presentation">
          <div
            className="flashcard-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="flashcard-delete-card-title"
          >
            <h3 id="flashcard-delete-card-title">
              Delete this flashcard card?
            </h3>
            <p>
              This card will be removed from the set. You can cancel to keep it.
            </p>
            <div className="flashcard-modal__actions">
              <button
                type="button"
                className="flashcard-btn"
                onClick={() => setCardPendingDelete(null)}
                disabled={Boolean(deletingCardId)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flashcard-btn flashcard-btn--danger"
                onClick={confirmDeleteCard}
                disabled={Boolean(deletingCardId)}
              >
                {deletingCardId ? "Deleting" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
      {bulkDeletePending && (
        <div className="flashcard-modal" role="presentation">
          <div
            className="flashcard-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="flashcard-bulk-delete-title"
          >
            <h3 id="flashcard-bulk-delete-title">
              Delete {selectedVisibleCardIds.length} flashcards?
            </h3>
            <p>
              Selected flashcards will be removed from this set. You can cancel
              to keep them.
            </p>
            <div className="flashcard-modal__actions">
              <button
                type="button"
                className="flashcard-btn"
                onClick={() => setBulkDeletePending(false)}
                disabled={bulkDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flashcard-btn flashcard-btn--danger"
                onClick={confirmBulkDeleteCards}
                disabled={bulkDeleting || selectedVisibleCardIds.length === 0}
              >
                <Trash2 size={16} />
                {bulkDeleting ? "Deleting" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
