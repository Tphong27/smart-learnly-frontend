import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckSquare,
  Eye,
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
import { Modal } from "@/shared/components/ui";
import { FlashcardCardEditor } from "./FlashcardCardEditor";
import { FlashcardCardList } from "./FlashcardCardList";
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

const STAGING_ROLES = [ROLES.ADMIN, ROLES.SME, ROLES.TRAINER];
const CURRENT_FLASHCARD_PAGE_SIZE = 40;
const CARD_EDITOR_FIELDS = [
  "frontText",
  "frontImageUrl",
  "backText",
  "backImageUrl",
  "hint",
  "explanation",
];
const CARD_EDITOR_FORM_ID = "flashcard-current-card-editor-form";
const DRAFT_PREVIEW_CARD_ID = "__flashcard-current-draft-preview__";

function toEditorDraft(card = {}) {
  return {
    frontText: card.frontText || "",
    frontImageUrl: card.frontImageUrl || "",
    backText: card.backText || "",
    backImageUrl: card.backImageUrl || "",
    hint: card.hint || "",
    explanation: card.explanation || "",
    orderIndex: card.orderIndex,
  };
}

function normalizeDraftValue(value) {
  return String(value || "").trim();
}

function isEditorDraftChanged(initialDraft, draft) {
  return CARD_EDITOR_FIELDS.some(
    (field) =>
      normalizeDraftValue(initialDraft?.[field]) !==
      normalizeDraftValue(draft?.[field]),
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
  const [cardEditorSession, setCardEditorSession] = useState(null);
  const [cardEditorSaving, setCardEditorSaving] = useState(false);
  const [cardEditorUploading, setCardEditorUploading] = useState(false);
  const [cardEditorError, setCardEditorError] = useState("");
  const [cardEditorPreviewOpen, setCardEditorPreviewOpen] = useState(false);
  const [cardEditorPreviewCardId, setCardEditorPreviewCardId] = useState(null);
  const [currentPreviewOpen, setCurrentPreviewOpen] = useState(false);
  const [cardEditorDiscardPending, setCardEditorDiscardPending] =
    useState(false);
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
  const cardEditorFrontRef = useRef(null);
  const cardEditorPreviewTriggerRef = useRef(null);
  const currentPreviewTriggerRef = useRef(null);

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

  const activeCurrentCard = useMemo(
    () => orderedCards.find((card) => card.id === activeCardId) || null,
    [activeCardId, orderedCards],
  );

  const cardEditorDirty = useMemo(
    () =>
      Boolean(cardEditorSession) &&
      isEditorDraftChanged(
        cardEditorSession.initialDraft,
        cardEditorSession.draft,
      ),
    [cardEditorSession],
  );

  const cardEditorPreviewCard = useMemo(() => {
    if (!cardEditorSession) return null;

    return {
      ...cardEditorSession.sourceCard,
      ...cardEditorSession.draft,
      id:
        cardEditorSession.mode === "edit"
          ? cardEditorSession.cardId
          : DRAFT_PREVIEW_CARD_ID,
      orderIndex:
        cardEditorSession.mode === "edit"
          ? cardEditorSession.draft.orderIndex
          : orderedCards.length,
    };
  }, [cardEditorSession, orderedCards]);

  const cardEditorFocusKey = cardEditorSession
    ? `${cardEditorSession.mode}:${cardEditorSession.cardId || "new"}`
    : "";

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
  const showCurrentPreviewBar =
    activeSection === "current" &&
    !cardEditorSession &&
    !cardEditorPreviewOpen &&
    !currentPreviewOpen &&
    !importModalOpen &&
    !cardPendingDelete &&
    !bulkDeletePending &&
    !cardEditorDiscardPending;

  useEffect(() => {
    if (!cardEditorFocusKey) return undefined;

    let secondFrame;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        cardEditorFrontRef.current?.focus({ preventScroll: true });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) {
        window.cancelAnimationFrame(secondFrame);
      }
    };
  }, [cardEditorFocusKey]);

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

  const openCardEditor = useCallback((card = null) => {
    const mode = card?.id ? "edit" : "create";
    const initialDraft = toEditorDraft(
      card || { orderIndex: orderedCards.length },
    );
    clearFlashcardToasts();
    setCardEditorError("");
    setCardEditorSaving(false);
    setCardEditorUploading(false);
    setCardEditorDiscardPending(false);
    setCardEditorPreviewOpen(false);
    setCardEditorPreviewCardId(
      mode === "edit" ? card.id : DRAFT_PREVIEW_CARD_ID,
    );
    setCardEditorSession({
      mode,
      cardId: card?.id || null,
      sourceCard: card || null,
      initialDraft,
      draft: initialDraft,
    });
  }, [clearFlashcardToasts, orderedCards.length]);

  const handleAddCard = () => {
    clearFlashcardToasts();
    openCardEditor();
  };

  const handleEditCard = (card) => {
    if (!card?.id || cardEditorSession) return;
    openCardEditor(card);
  };

  const finishCloseCardEditor = useCallback(() => {
    setCardEditorSession(null);
    setCardEditorError("");
    setCardEditorSaving(false);
    setCardEditorUploading(false);
    setCardEditorPreviewOpen(false);
    setCardEditorDiscardPending(false);
    setCardEditorPreviewCardId(null);
  }, []);

  const requestCloseCardEditor = useCallback(() => {
    if (
      cardEditorSaving ||
      cardEditorUploading ||
      cardEditorPreviewOpen ||
      cardEditorDiscardPending
    ) {
      return;
    }
    if (cardEditorDirty) {
      setCardEditorDiscardPending(true);
      return;
    }
    finishCloseCardEditor();
  }, [
    cardEditorDirty,
    cardEditorDiscardPending,
    cardEditorPreviewOpen,
    cardEditorSaving,
    cardEditorUploading,
    finishCloseCardEditor,
  ]);

  const handleCardEditorDraftChange = useCallback((draft) => {
    setCardEditorSession((current) =>
      current ? { ...current, draft } : current,
    );
  }, []);

  const handleCardEditorUploadingChange = useCallback((uploading) => {
    setCardEditorUploading(uploading);
  }, []);

  const closeCardPreview = useCallback(() => {
    setCardEditorPreviewOpen(false);
    window.requestAnimationFrame(() => {
      cardEditorPreviewTriggerRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const closeCurrentPreview = useCallback(() => {
    setCurrentPreviewOpen(false);
    window.requestAnimationFrame(() => {
      currentPreviewTriggerRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const saveCardEditor = useCallback(
    async (draft) => {
      if (!flashcardSet?.id || !cardEditorSession || cardEditorSaving) return;

      const validationError = validateCurrentCardDraft(draft);
      if (validationError) {
        setCardEditorError(validationError);
        notify(validationError, "error");
        return;
      }

      setCardEditorSaving(true);
      setCardEditorError("");
      try {
        const payload = toCardPayload({
          ...draft,
          orderIndex:
            cardEditorSession.mode === "edit"
              ? draft.orderIndex
              : orderedCards.length,
        });
        const savedCard =
          cardEditorSession.mode === "edit"
            ? await flashcardService.updateCard(cardEditorSession.cardId, payload)
            : await flashcardService.addCard(flashcardSet.id, payload);

        handleCardPersisted(savedCard);
        if (savedCard?.id && cardEditorSession.mode === "edit") {
          setActivePreviewCardId(savedCard.id);
        }
        notify(
          cardEditorSession.mode === "edit"
            ? "Flashcard updated."
            : "Flashcard added.",
          "success",
        );
        finishCloseCardEditor();
      } catch (saveError) {
        const message = getErrorMessage(
          saveError,
          cardEditorSession.mode === "edit"
            ? "Failed to update flashcard."
            : "Failed to add flashcard.",
        );
        setCardEditorError(message);
        notify(message, "error");
      } finally {
        setCardEditorSaving(false);
      }
    },
    [
      cardEditorSaving,
      cardEditorSession,
      finishCloseCardEditor,
      flashcardService,
      flashcardSet,
      handleCardPersisted,
      notify,
      orderedCards,
    ],
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
      <div className="flashcard-practice__loading" role="status" aria-live="polite">
        <span className="flashcard-spinner" />
        Loading flashcards...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flashcard-shell">
        <div className="flashcard-practice__error" role="alert">{error}</div>
        <button
          type="button"
          className="flashcard-btn"
          onClick={loadSet}
          aria-label="Retry loading flashcards"
        >
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

          <form className="flashcard-set-details" onSubmit={handleSaveSet}>
            <div className="flashcard-section-heading">
              <h3 className="flashcard-section-heading__title">Set Details</h3>
              <button
                type="submit"
                className="flashcard-btn flashcard-btn--primary"
                disabled={savingSet}
              >
                <Save size={16} />
                {savingSet ? "Saving" : "Save Set"}
              </button>
            </div>
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
          </form>
        </>
      )}

      {activeSection === "current" && (
        <div
          id="flashcard-current-panel"
          className={[
            "flashcard-current-workspace",
            showCurrentPreviewBar
              ? "flashcard-current-workspace--with-fixed-preview-bar"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          role="tabpanel"
          aria-labelledby="flashcard-current-tab"
        >
          <div className="flashcard-current-workspace__inner">
            <section
              className="flashcard-current-list"
              aria-labelledby="flashcard-current-workspace-title"
              aria-busy={reordering || bulkDeleting}
            >
                  <div className="flashcard-section-heading flashcard-section-heading--toolbar-only">
                    <h3
                      id="flashcard-current-workspace-title"
                      className="flashcard-sr-only"
                    >
                      Current Flashcards
                    </h3>
                      {selectionMode && (
                        <div className="flashcard-toolbar__meta">
                          {selectedVisibleCardIds.length} selected
                          {visibleCards.length > 0
                            ? ` (${selectedVisibleRenderedCardIds.length} visible)`
                            : ""}
                        </div>
                      )}
                    <div className="flashcard-actions flashcard-current-selection-actions">
                      {!selectionMode && (
                        <button
                          type="button"
                          className="flashcard-btn flashcard-btn--primary"
                          onClick={handleAddCard}
                          disabled={reordering || bulkDeleting || Boolean(cardEditorSession)}
                        >
                          <Plus size={16} />
                          Add card
                        </button>
                      )}
                      {!selectionMode && canUseStaging && (
                        <button
                          type="button"
                          className="flashcard-btn"
                          onClick={openImportModal}
                          disabled={reordering || bulkDeleting || Boolean(cardEditorSession)}
                          aria-label="Import flashcards"
                        >
                          <Upload size={16} />
                          Import
                        </button>
                      )}
                      {selectionMode ? (
                        <>
                          <button
                            type="button"
                            className="flashcard-btn flashcard-btn--compact"
                            onClick={selectCurrentPage}
                            disabled={
                              reordering ||
                              bulkDeleting ||
                              visibleCards.length === 0 ||
                              selectedVisibleRenderedCardIds.length === visibleCardIds.length
                            }
                            aria-label="Select all visible flashcards"
                            title="Select all visible flashcards"
                          >
                            All
                          </button>
                          <button
                            type="button"
                            className="flashcard-btn flashcard-btn--compact"
                            onClick={clearCurrentPageSelection}
                            disabled={
                              reordering ||
                              bulkDeleting ||
                              selectedVisibleRenderedCardIds.length === 0
                            }
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            className="flashcard-btn flashcard-btn--danger flashcard-btn--compact"
                            onClick={openBulkDeleteConfirm}
                            disabled={
                              reordering ||
                              bulkDeleting ||
                              selectedVisibleCardIds.length === 0
                            }
                            aria-label={`Delete ${selectedVisibleCardIds.length} selected flashcards`}
                          >
                            <Trash2 size={16} />
                            ({selectedVisibleCardIds.length})
                          </button>
                          <button
                            type="button"
                            className="flashcard-btn flashcard-btn--compact"
                            onClick={toggleSelectionMode}
                            disabled={reordering || bulkDeleting || Boolean(cardEditorSession)}
                            aria-pressed={selectionMode}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="flashcard-btn"
                          onClick={toggleSelectionMode}
                          disabled={reordering || bulkDeleting || Boolean(cardEditorSession)}
                          aria-pressed={selectionMode}
                        >
                          <CheckSquare size={16} />
                          Select
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flashcard-current-list__body">
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
                        Boolean(cardEditorSession) ||
                        selectionMode
                      }
                      selectionMode={selectionMode}
                      selectedCardIds={selectedCardIds}
                      onToggleSelect={toggleSelectedCard}
                      onSelect={(card) => setActivePreviewCardId(card?.id || null)}
                      onEdit={handleEditCard}
                      onDelete={handleDeleteCard}
                      onMove={handleMoveCard}
                      emptyAction={
                        <>
                          <button
                            type="button"
                            className="flashcard-btn flashcard-btn--primary"
                            onClick={handleAddCard}
                            disabled={reordering || bulkDeleting}
                          >
                            <Plus size={16} />
                            Add card
                          </button>
                          {canUseStaging && (
                            <button
                              type="button"
                              className="flashcard-btn"
                              onClick={openImportModal}
                              disabled={reordering || bulkDeleting}
                            >
                              <Upload size={16} />
                              Import
                            </button>
                          )}
                        </>
                      }
                    />
                    {remainingCount > 0 && (
                      <div className="flashcard-current-pagination">
                        <span className="flashcard-current-pagination__status">
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
                        <span
                          className="flashcard-current-pagination__spacer"
                          aria-hidden="true"
                        />
                      </div>
                    )}
                  </div>
            </section>
          </div>
        </div>
      )}
      {showCurrentPreviewBar && (
        <div
          className="flashcard-current-preview-bar"
          aria-label="Current flashcard preview action"
        >
          <div
            className="flashcard-current-preview-bar__status"
            aria-live="polite"
          >
            {activeCurrentCard ? (
              <>
                <span>Active card</span>
                <strong>
                  {Math.max(
                    1,
                    orderedCards.findIndex(
                      (card) => card.id === activeCurrentCard.id,
                    ) + 1,
                  )}{" "}
                  of {orderedCards.length}
                </strong>
              </>
            ) : (
              <span>No active card selected</span>
            )}
          </div>
          <button
            type="button"
            className="flashcard-btn"
            ref={currentPreviewTriggerRef}
            onClick={() => setCurrentPreviewOpen(true)}
            disabled={!activeCurrentCard}
          >
            <Eye size={16} />
            Preview
          </button>
        </div>
      )}
      {activeSection === "review" && canUseStaging && (
        <div
          id="flashcard-review-panel"
          role="tabpanel"
          aria-labelledby="flashcard-review-tab"
        >
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
        </div>
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
      {currentPreviewOpen && activeCurrentCard && (
        <Modal
          open
          title="Preview"
          description="Preview the active flashcard."
          size="lg"
          onClose={closeCurrentPreview}
        >
          <div className="flashcard-current-editor__preview">
            <FlashcardPreview
              cards={[activeCurrentCard]}
              activeCardId={activeCurrentCard.id}
              emptyMessage="Select a card to preview it."
              contentLayout="management"
              showNavigation={false}
            />
          </div>
        </Modal>
      )}
      {cardEditorSession && (
        <Modal
          open
          title={
            cardEditorSession.mode === "edit" ? "Edit flashcard" : "Add card"
          }
          description="Update the card content, images, hint, and explanation."
          size="xl"
          closeDisabled={
            cardEditorSaving ||
            cardEditorUploading ||
            cardEditorPreviewOpen ||
            cardEditorDiscardPending
          }
          onClose={requestCloseCardEditor}
          footer={
            <div className="flashcard-current-editor__footer">
              <button
                type="button"
                className="flashcard-btn flashcard-btn--icon"
                ref={cardEditorPreviewTriggerRef}
                title="Preview flashcards"
                aria-label="Preview flashcards"
                onClick={() => {
                  setCardEditorPreviewCardId((current) =>
                    current ||
                    (cardEditorSession.mode === "edit"
                      ? cardEditorSession.cardId
                      : DRAFT_PREVIEW_CARD_ID),
                  );
                  setCardEditorPreviewOpen(true);
                }}
                disabled={cardEditorSaving || cardEditorUploading}
              >
                <Eye size={16} />
              </button>
              <span
                className={[
                  "flashcard-current-editor__save-state",
                  cardEditorUploading
                    ? "flashcard-current-editor__save-state--uploading"
                    : cardEditorSaving
                      ? "flashcard-current-editor__save-state--saving"
                      : cardEditorDirty
                        ? "flashcard-current-editor__save-state--dirty"
                        : "flashcard-current-editor__save-state--clean",
                ].join(" ")}
              >
                {cardEditorUploading
                  ? "Uploading image..."
                  : cardEditorSaving
                    ? "Saving..."
                    : cardEditorDirty
                      ? "Unsaved changes"
                      : "No changes"}
              </span>
              <button
                type="button"
                className="flashcard-btn"
                onClick={requestCloseCardEditor}
                disabled={cardEditorSaving || cardEditorUploading}
              >
                <X size={16} />
                Cancel
              </button>
              <button
                type="submit"
                form={CARD_EDITOR_FORM_ID}
                className="flashcard-btn flashcard-btn--primary"
                disabled={
                  cardEditorSaving || cardEditorUploading || !cardEditorDirty
                }
              >
                <Save size={16} />
                {cardEditorSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          }
        >
          {cardEditorError && (
            <div className="flashcard-staging__alert" role="alert">
              {cardEditorError}
            </div>
          )}
          <FlashcardCardEditor
            key={`${cardEditorSession.mode}-${cardEditorSession.cardId || "new"}`}
            value={cardEditorSession.initialDraft}
            mode={cardEditorSession.mode}
            formId={CARD_EDITOR_FORM_ID}
            titleId="flashcard-current-card-editor"
            saving={cardEditorSaving}
            hideTitle
            hideDefaultActions
            frontTextRef={cardEditorFrontRef}
            onDraftChange={handleCardEditorDraftChange}
            onUploadingChange={handleCardEditorUploadingChange}
            onCancel={requestCloseCardEditor}
            onSave={saveCardEditor}
            onUploadImage={handleUploadImage}
            onError={(message) => {
              setCardEditorError(message);
              notify(message, "error");
            }}
          />

          {cardEditorPreviewOpen && (
            <Modal
              open
              title="Preview"
              description="Preview the current draft with the flashcard set."
              size="lg"
              onClose={closeCardPreview}
            >
              <div className="flashcard-current-editor__preview">
                <FlashcardPreview
                  cards={cardEditorPreviewCard ? [cardEditorPreviewCard] : []}
                  activeCardId={cardEditorPreviewCard?.id || cardEditorPreviewCardId}
                  onActiveCardChange={(cardId) =>
                    setCardEditorPreviewCardId(cardId)
                  }
                  emptyMessage="Add content to preview this flashcard."
                  contentLayout="management"
                  showNavigation={false}
                />
              </div>
            </Modal>
          )}

          {cardEditorDiscardPending && (
            <Modal
              open
              title="Discard changes?"
              description="Your unsaved flashcard draft will be lost."
              size="sm"
              onClose={() => setCardEditorDiscardPending(false)}
              footer={
                <div className="flashcard-actions">
                  <button
                    type="button"
                    className="flashcard-btn"
                    onClick={() => setCardEditorDiscardPending(false)}
                  >
                    Keep editing
                  </button>
                  <button
                    type="button"
                    className="flashcard-btn flashcard-btn--danger"
                    onClick={finishCloseCardEditor}
                  >
                    Discard
                  </button>
                </div>
              }
            />
          )}
        </Modal>
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
