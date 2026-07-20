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
import {
  flashcardService as defaultFlashcardService,
} from "@/services/flashcard.service";
import { isRoleAllowed, ROLES } from "@/shared/constants/roles";
import { FlashcardCardsEditScreen } from "./FlashcardCardsEditScreen";
import { FlashcardCardList } from "./FlashcardCardList";
import { FlashcardQuickEditRow } from "./FlashcardQuickEditRow";
import { FlashcardPreview } from "./FlashcardPreview";
import {
  FlashcardStagingWorkspace,
  ImportFlashcardsModal,
} from "./FlashcardStagingWorkspace";
import { useProgressiveVisibleItems } from "./useProgressiveVisibleItems";
import {
  getErrorMessage,
  normalizeSet,
  toCardPayload,
  validateCurrentCardDraft,
} from "./flashcard-utils";
import { useToast } from "@/shared/components/ui/Toast/useToast";
import "./Flashcards.css";

function flashcardCacheKey(lessonId) {
  return `flashcard-set:${lessonId}`;
}

const STAGING_ROLES = [ROLES.ADMIN, ROLES.TMO, ROLES.SME, ROLES.TRAINER];
const CURRENT_FLASHCARD_PAGE_SIZE = 40;
const QUICK_EDIT_FIELDS = ["frontText", "backText", "hint", "explanation"];

function getQuickEditPatch(card, draft) {
  return {
    frontText: draft.frontText || "",
    frontImageUrl: card?.frontImageUrl || "",
    backText: draft.backText || "",
    backImageUrl: card?.backImageUrl || "",
    hint: draft.hint || "",
    explanation: draft.explanation || "",
    orderIndex: card?.orderIndex,
  };
}

function isQuickEditChanged(card, draft) {
  return QUICK_EDIT_FIELDS.some(
    (field) => String(card?.[field] || "") !== String(draft?.[field] || ""),
  );
}

export function FlashcardLessonEditor({
  lessonId,
  initialSetId,
  defaultTitle = "",
  activeSection = "details",
  onTitleSaved,
  onNavigateToCurrent,
  showToast,
  flashcardService = defaultFlashcardService,
  stagingEnabled = true,
}) {
  const { removeToast } = useToast();
  const [flashcardSet, setFlashcardSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [activePreviewCardId, setActivePreviewCardId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingSet, setSavingSet] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [currentView, setCurrentView] = useState("list");
  const [editingCurrentCardId, setEditingCurrentCardId] = useState(null);
  const [quickEditSavingId, setQuickEditSavingId] = useState(null);
  const [quickEditError, setQuickEditError] = useState("");
  const [cardPendingDelete, setCardPendingDelete] = useState(null);
  const [deletingCardId, setDeletingCardId] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState([]);
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
            return hydrateSet(setById);
          }
        } catch {
          sessionStorage.removeItem(flashcardCacheKey(lessonId));
        }
      }

      return hydrateSet(
  await flashcardService.getAdminSetByLesson(lessonId),
);
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
    return activePreviewCardId ? null : orderedCards[0].id;
  }, [activePreviewCardId, orderedCards]);

  const selectedVisibleCardIds = useMemo(() => {
    const visibleIds = new Set(orderedCards.map((card) => card.id));
    return selectedCardIds.filter((cardId) => visibleIds.has(cardId));
  }, [orderedCards, selectedCardIds]);

  const {
    visibleItems: visibleCards,
    remainingCount,
    showMore,
    revealIndex,
  } = useProgressiveVisibleItems(
    orderedCards,
    flashcardSet?.id || lessonId || "flashcards",
    CURRENT_FLASHCARD_PAGE_SIZE,
  );
  const visibleCardIds = useMemo(
    () => visibleCards.map((card) => card.id).filter(Boolean),
    [visibleCards],
  );
  const selectedVisibleRenderedCardIds = useMemo(() => {
    const visibleIdSet = new Set(visibleCardIds);
    return selectedVisibleCardIds.filter((cardId) => visibleIdSet.has(cardId));
  }, [selectedVisibleCardIds, visibleCardIds]);

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

 const handleCardPersisted = useCallback((savedCard) => {
  if (!savedCard?.id) return;

  setCards((currentCards) => {
    const existingIndex = currentCards.findIndex(
      (card) => card.id === savedCard.id,
    );

    if (existingIndex < 0) {
      return [...currentCards, savedCard];
    }

    return currentCards.map((card) =>
      card.id === savedCard.id ? savedCard : card,
    );
  });
}, []);

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
        const deletedIndex = orderedCards.findIndex(
          (card) => card.id === cardPendingDelete.id,
        );
        const nextCards = currentCards.filter(
          (currentCard) => currentCard.id !== cardPendingDelete.id,
        );
        if (activePreviewCardId === cardPendingDelete.id) {
          const nextOrderedCards = orderedCards.filter(
            (card) => card.id !== cardPendingDelete.id,
          );
          const nextSelectedCard =
            nextOrderedCards[Math.min(deletedIndex, nextOrderedCards.length - 1)] ||
            null;
          setActivePreviewCardId(nextSelectedCard?.id || null);
        }
        return nextCards;
      });
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

  const handleMoveCard = async ({ cardId, toVisibleIndex }) => {
    const fromIndex = orderedCards.findIndex((card) => card.id === cardId);
    const toIndex = toVisibleIndex;

    if (
      !flashcardSet?.id ||
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      toIndex >= orderedCards.length
    ) {
      return;
    }

    const previousCards = orderedCards.map((card) => ({ ...card }));
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
      setFlashcardSet((currentSet) => ({
        ...(savedSet || currentSet),
        cards: savedSet?.cards?.length ? savedSet.cards : optimisticCards,
      }));
      setCards(savedSet?.cards?.length ? savedSet.cards : optimisticCards);
        } catch (reorderError) {
      setCards(previousCards);
      notify(
        getErrorMessage(reorderError, "Failed to reorder cards."),
        "error",
      );
    } finally {
      setReordering(false);
    }
  };

  const handleUploadImage = async (file) => {
    if (!flashcardSet?.id) {
      throw new Error("Flashcard set is not ready for image uploads.");
    }
    const uploaded = await flashcardService.uploadImage(flashcardSet.id, file);
    return uploaded?.url || uploaded?.data?.url || uploaded;
  };

  const refreshCurrentFlashcards = useCallback(async () => {
  return loadSet();
}, [loadSet]);

  const refreshStagingReview = useCallback(() => {
    setStagingRefreshKey((current) => current + 1);
  }, []);

  const handleCardsImported = async (cardIds = []) => {
    onNavigateToCurrent?.();
    const refreshedSet = await refreshCurrentFlashcards();
    const refreshedCards = normalizeSet(refreshedSet || flashcardSet)?.cards || orderedCards;
    if (cardIds.length) {
      const highestIndex = Math.max(
        ...cardIds.map((cardId) => refreshedCards.findIndex((card) => card.id === cardId)),
      );
      if (highestIndex >= 0) {
        revealIndex(highestIndex);
        setActivePreviewCardId(cardIds[0]);
      }
    }
  };

  const handleStagingImportCreated = useCallback(() => {
    refreshStagingReview();
  }, [refreshStagingReview]);

  const handleEditCard = (card) => {
    clearFlashcardToasts();
    setQuickEditError("");
    setEditingCurrentCardId(card?.id || null);
  };

  const handleAddCard = () => {
    clearFlashcardToasts();
    setEditingCurrentCardId(null);
    setQuickEditError("");
    setCurrentView("edit");
  };

  const handleQuickEditCancel = useCallback(() => {
    setQuickEditError("");
    setEditingCurrentCardId(null);
  }, []);

  const handleQuickEditCommit = useCallback(
    async (card, draft) => {
      if (!card?.id || quickEditSavingId) return;
      if (!isQuickEditChanged(card, draft)) {
        handleQuickEditCancel();
        return;
      }

      const patch = getQuickEditPatch(card, draft);
      const validationError = validateCurrentCardDraft(patch);
      if (validationError) {
        setQuickEditError(validationError);
        return;
      }

      setQuickEditSavingId(card.id);
      setQuickEditError("");
      try {
        const savedCard = await flashcardService.updateCard(
          card.id,
          toCardPayload(patch),
        );
        handleCardPersisted(savedCard);
        setEditingCurrentCardId(null);
      } catch (saveError) {
        setQuickEditError(
          getErrorMessage(saveError, "Failed to update flashcard."),
        );
      } finally {
        setQuickEditSavingId(null);
      }
    },
    [flashcardService, handleCardPersisted, handleQuickEditCancel, quickEditSavingId],
  );

  const handleCardsEdited = useCallback(
    (savedCards = []) => {
      if (!Array.isArray(savedCards)) return;
      setCards(savedCards);
      const activeIndex = savedCards.findIndex(
        (card) => card.id === activePreviewCardId,
      );
      if (activeIndex >= 0) {
        revealIndex(activeIndex);
      }
    },
    [activePreviewCardId, revealIndex],
  );

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
    if (!visibleCardIds.length) return;
    setSelectedCardIds((current) => [...new Set([...current, ...visibleCardIds])]);
  };

  const clearCurrentPageSelection = () => {
    if (!visibleCardIds.length) return;
    const pageIdSet = new Set(visibleCardIds);
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
          {currentView === "edit" ? (
            <FlashcardCardsEditScreen
              setId={flashcardSet?.id}
              cards={orderedCards}
              startWithNewRow
              onUploadImage={handleUploadImage}
              onSaved={handleCardsEdited}
              onBack={() => setCurrentView("list")}
              notify={notify}
            />
          ) : (
            <div className="flashcard-current-workspace__inner">
              <div className="flashcard-current-workspace__main">
                <div className="flashcard-panel flashcard-current-list-panel">
                  <div className="flashcard-panel__header">
                    <div>
                      <h3 className="flashcard-panel__title">Current Flashcards</h3>
                      {selectionMode && (
                        <div className="flashcard-toolbar__meta">
                          {selectedVisibleCardIds.length} selected
                          {visibleCards.length > 0
                            ? ` (${selectedVisibleRenderedCardIds.length} visible)`
                            : ""}
                        </div>
                      )}
                    </div>
                    <div className="flashcard-actions">

      
                      <button
                        type="button"
                        className="flashcard-btn flashcard-btn--primary"
                        onClick={handleAddCard}
                        disabled={reordering || bulkDeleting || Boolean(editingCurrentCardId)}
                      >
                        <Plus size={16} />
                        Add card
                      </button>
                      {canUseStaging && (
                        <button
                          type="button"
                          className="flashcard-btn flashcard-btn--primary"
                          onClick={openImportModal}
                          disabled={reordering || bulkDeleting || Boolean(editingCurrentCardId)}
                        >
                          <Upload size={16} />
                          Import
                        </button>
                      )}
                      {selectionMode && visibleCards.length > 0 && (
                        <>
                          <button
                            type="button"
                            className="flashcard-btn"
                            onClick={selectCurrentPage}
                            disabled={
                              reordering ||
                              bulkDeleting ||
                              selectedVisibleRenderedCardIds.length === visibleCardIds.length
                            }
                          >
                            Select all
                          </button>
                          <button
                            type="button"
                            className="flashcard-btn"
                            onClick={clearCurrentPageSelection}
                            disabled={
                              reordering ||
                              bulkDeleting ||
                              selectedVisibleRenderedCardIds.length === 0
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
                          disabled={reordering || bulkDeleting}
                        >
                          <Trash2 size={16} />
                          Delete ({selectedVisibleCardIds.length})
                        </button>
                      )}
                      <button
                        type="button"
                        className="flashcard-btn"
                        onClick={toggleSelectionMode}
                        disabled={reordering || bulkDeleting || Boolean(editingCurrentCardId)}
                      >
                        {selectionMode ? <X size={16} /> : <CheckSquare size={16} />}
                        {selectionMode ? "Cancel" : "Select"}
                      </button>
                    </div>
                  </div>
                  <div className="flashcard-panel__body">
                    <FlashcardCardList
                      cards={visibleCards}
                      pageStartIndex={0}
                      activeCardId={activeCardId}
                      disabled={
                        reordering ||
                        bulkDeleting ||
                        Boolean(deletingCardId)
                      }
                      dragDisabled={
                        reordering ||
                        bulkDeleting ||
                        Boolean(deletingCardId) ||
                        Boolean(editingCurrentCardId)
                      }
                      selectionMode={selectionMode}
                      selectedCardIds={selectedCardIds}
                      onToggleSelect={toggleSelectedCard}
                      onSelect={(card) => setActivePreviewCardId(card?.id || null)}
                      onEdit={handleEditCard}
                      onDelete={handleDeleteCard}
                      onMove={handleMoveCard}
                      renderCardBody={(card) =>
                        editingCurrentCardId === card.id ? (
                          <FlashcardQuickEditRow
                            key={card.id}
                            card={card}
                            saving={quickEditSavingId === card.id}
                            error={quickEditError}
                            onCommit={(draft) => handleQuickEditCommit(card, draft)}
                            onCancel={handleQuickEditCancel}
                          />
                        ) : null
                      }
                    />
                    {remainingCount > 0 && (
                      <div className="flashcard-current-pagination">
                        <span>
                          Showing {visibleCards.length} of {orderedCards.length}
                        </span>
                        <div className="flashcard-current-pagination__controls">
                          <button
                            type="button"
                            className="flashcard-btn"
                            onClick={showMore}
                          >
                            Show more ({Math.min(remainingCount, CURRENT_FLASHCARD_PAGE_SIZE)} of {remainingCount})
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
          )}
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
          importDisabled={reordering || bulkDeleting}
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
          onApproved={handleCardsImported}
          onUploadImage={handleUploadImage}
        />
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
