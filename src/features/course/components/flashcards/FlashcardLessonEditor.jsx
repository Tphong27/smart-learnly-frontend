import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { getCurrentUser } from "@/services";
import { courseService } from "@/services/course.service";
import { flashcardService } from "@/services/flashcard.service";
import { isRoleAllowed, ROLES } from "@/shared/constants/roles";
import { FlashcardCardEditor } from "./FlashcardCardEditor";
import { FlashcardCardList } from "./FlashcardCardList";
import { FlashcardPreview } from "./FlashcardPreview";
import { FlashcardStagingWorkspace } from "./FlashcardStagingWorkspace";
import {
  getErrorMessage,
  normalizeSet,
  toCardPayload,
  validateCardDraft,
} from "./flashcard-utils";
import "./Flashcards.css";

function flashcardCacheKey(lessonId) {
  return `flashcard-set:${lessonId}`;
}

const STAGING_ROLES = [ROLES.ADMIN, ROLES.SME, ROLES.TRAINER];

export function FlashcardLessonEditor({
  lessonId,
  initialSetId,
  defaultTitle = "",
  onTitleSaved,
  showToast,
}) {
  const [flashcardSet, setFlashcardSet] = useState(null);
  const [cards, setCards] = useState([]);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [editingCard, setEditingCard] = useState(null);
  const [editorVersion, setEditorVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingSet, setSavingSet] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [cardPendingDelete, setCardPendingDelete] = useState(null);
  const [deletingCardId, setDeletingCardId] = useState(null);
  const [activeEditorTab, setActiveEditorTab] = useState("current");
  const [error, setError] = useState(null);

  const activeCardId = editingCard?.id || null;
  const canUseStaging = isRoleAllowed(getCurrentUser()?.role, STAGING_ROLES);

  const notify = useCallback(
    (message, type = "info") => {
      showToast?.(message, type);
    },
    [showToast],
  );

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
  }, [hydrateSet, initialSetId, lessonId]);

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
      notify(getErrorMessage(saveError, "Failed to save flashcard set."), "error");
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
        notify("Card updated.", "success");
      } else {
        const savedCard = await flashcardService.addCard(
          flashcardSet.id,
          payload,
        );
        setCards((currentCards) => [...currentCards, savedCard]);
        notify("Card added.", "success");
      }

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
    setCardPendingDelete(card);
  };

  const confirmDeleteCard = async () => {
    if (!cardPendingDelete?.id) return;

    setDeletingCardId(cardPendingDelete.id);
    try {
      await flashcardService.deleteCard(cardPendingDelete.id);
      setCards((currentCards) =>
        currentCards.filter(
          (currentCard) => currentCard.id !== cardPendingDelete.id,
        ),
      );
      if (editingCard?.id === cardPendingDelete.id) {
        setEditingCard(null);
        setEditorVersion((version) => version + 1);
      }
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
      notify(getErrorMessage(reorderError, "Failed to reorder cards."), "error");
      loadSet();
    } finally {
      setReordering(false);
    }
  };

  const handleUploadImage = async (file) => {
    const uploaded = await courseService.uploadLessonResource(file);
    return uploaded?.url || uploaded?.data?.url || uploaded;
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
      <div className="flashcard-toolbar">
        <div>
          <h2 className="flashcard-toolbar__title">{title || "Flashcards"}</h2>
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

      {canUseStaging && (
        <div
          className="flashcard-tabs"
          role="tablist"
          aria-label="Flashcard editor sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeEditorTab === "current"}
            className={
              activeEditorTab === "current"
                ? "flashcard-tabs__tab is-active"
                : "flashcard-tabs__tab"
            }
            onClick={() => setActiveEditorTab("current")}
          >
            Current Flashcards
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeEditorTab === "import"}
            className={
              activeEditorTab === "import"
                ? "flashcard-tabs__tab is-active"
                : "flashcard-tabs__tab"
            }
            onClick={() => setActiveEditorTab("import")}
          >
            Import / Generate
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeEditorTab === "review"}
            className={
              activeEditorTab === "review"
                ? "flashcard-tabs__tab is-active"
                : "flashcard-tabs__tab"
            }
            onClick={() => setActiveEditorTab("review")}
          >
            Staging Review
          </button>
        </div>
      )}

      {!canUseStaging || activeEditorTab === "current" ? (
        <div className="flashcard-editor-layout">
          <div className="flashcard-shell">
            <FlashcardCardEditor
              key={`${editingCard?.id || "new"}-${editorVersion}`}
              value={editingCard}
              mode={editingCard ? "edit" : "create"}
              saving={savingCard}
              onSave={handleSaveCard}
              onCancel={
                editingCard
                  ? () => {
                      setEditingCard(null);
                      setEditorVersion((version) => version + 1);
                    }
                  : null
              }
              onUploadImage={handleUploadImage}
              onError={(message) => notify(message, "error")}
            />

            <div className="flashcard-panel">
              <div className="flashcard-panel__header">
                <h3 className="flashcard-panel__title">Cards</h3>
              </div>
              <div className="flashcard-panel__body">
                <FlashcardCardList
                  cards={orderedCards}
                  activeCardId={activeCardId}
                  disabled={savingCard || reordering || Boolean(deletingCardId)}
                  onEdit={setEditingCard}
                  onDelete={handleDeleteCard}
                  onMove={handleMoveCard}
                />
              </div>
            </div>
          </div>

          <div className="flashcard-panel">
            <div className="flashcard-panel__header">
              <h3 className="flashcard-panel__title">Preview</h3>
            </div>
            <div className="flashcard-panel__body">
              <FlashcardPreview
                cards={orderedCards}
                emptyMessage="Add a card to preview this flashcard set."
              />
            </div>
          </div>
        </div>
      ) : (
        <FlashcardStagingWorkspace
          setId={flashcardSet?.id}
          activeTab={activeEditorTab}
          notify={notify}
          onStagingChanged={() => setActiveEditorTab("review")}
          onApproved={loadSet}
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
            <h3 id="flashcard-delete-card-title">Delete this flashcard card?</h3>
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
    </div>
  );
}
