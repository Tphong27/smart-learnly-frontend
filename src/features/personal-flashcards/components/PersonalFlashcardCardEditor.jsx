import { useMemo, useRef, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { Button, Modal, useToast } from "@/shared/components/ui";
import {
  FlashcardCardList,
  FlashcardPreview,
  FlashcardPreviewBar,
  FlashcardSelectionToolbar,
} from "@/features/flashcards-shared";
import { PersonalFlashcardCardFormModal } from "./PersonalFlashcardCardFormModal";
import { PersonalFlashcardImportModal } from "./PersonalFlashcardImportModal";
import {
  getErrorMessage,
  hasSameCardOrder,
  isCompleteCardOrder,
  moveItem,
  normalizeCards,
  withSequentialOrderIndices,
} from "../utils/personal-flashcard-utils";

function cardIds(cards) {
  return cards.map((card) => card.id);
}

function toIdSet(cards) {
  return new Set(cards.map((card) => String(card.id)));
}

function pruneSelectedIds(selectedIds, cards) {
  const activeIds = toIdSet(cards);
  return new Set([...selectedIds].filter((id) => activeIds.has(String(id))));
}

function getFallbackActiveCardId(cards, preferredId, fallbackIndex) {
  if (!cards.length) return null;
  if (cards.some((card) => String(card.id) === String(preferredId))) {
    return preferredId;
  }
  return cards[Math.min(Math.max(fallbackIndex, 0), cards.length - 1)]?.id ||
    cards[0]?.id ||
    null;
}

export function PersonalFlashcardCardEditor({
  cards,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  onBulkDelete,
  onBulkCreateCards,
  onReorder,
  onUploadImage,
  onGenerateFromFile,
}) {
  const toast = useToast();
  const serverCards = useMemo(() => normalizeCards(cards), [cards]);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [activeCardId, setActiveCardId] = useState(null);
  const [cardModal, setCardModal] = useState({ open: false, card: null });
  const [importOpen, setImportOpen] = useState(false);
  const [deleteState, setDeleteState] = useState({ type: null, card: null });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fallbackActiveIndex, setFallbackActiveIndex] = useState(0);
  const previewTriggerRef = useRef(null);

  const displayCards = pendingOrder?.sourceCards === cards
    ? pendingOrder.cards
    : serverCards;
  const activeSelectedIds = useMemo(
    () => pruneSelectedIds(selectedIds, displayCards),
    [displayCards, selectedIds],
  );
  const activeCard = useMemo(
    () => {
      const resolvedActiveId = getFallbackActiveCardId(
        displayCards,
        activeCardId,
        fallbackActiveIndex,
      );
      return displayCards.find(
        (card) => String(card.id) === String(resolvedActiveId),
      ) || null;
    },
    [activeCardId, displayCards, fallbackActiveIndex],
  );
  const activeIndex = activeCard
    ? displayCards.findIndex((card) => String(card.id) === String(activeCard.id))
    : -1;
  const busy = reordering || deleting;
  const showPreviewBar =
    displayCards.length > 0 &&
    !cardModal.open &&
    !importOpen &&
    !deleteState.type &&
    !previewOpen;

  function selectActiveCard(card) {
    const nextIndex = displayCards.findIndex(
      (item) => String(item.id) === String(card?.id),
    );
    setFallbackActiveIndex(nextIndex >= 0 ? nextIndex : 0);
    setActiveCardId(card?.id || null);
  }

  function toggleCard(card) {
    if (!card?.id) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(card.id)) next.delete(card.id);
      else next.add(card.id);
      return next;
    });
  }

  function enterSelectionMode() {
    setSelectionMode(true);
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function selectAllCards() {
    setSelectedIds(new Set(cardIds(displayCards)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function restoreAfterReorderFailure(previousOrder) {
    const fallbackActiveId = getFallbackActiveCardId(
      previousOrder,
      activeCardId,
      fallbackActiveIndex,
    );
    setPendingOrder({ sourceCards: cards, cards: previousOrder });
    setSelectedIds((current) => pruneSelectedIds(current, previousOrder));
    setActiveCardId(fallbackActiveId);
  }

  async function commitReorder(nextCards) {
    const previousOrder = serverCards;
    const newOrder = withSequentialOrderIndices(nextCards);
    const nextIds = cardIds(newOrder);

    if (hasSameCardOrder(previousOrder, nextIds)) return;

    if (!isCompleteCardOrder(previousOrder, nextIds)) {
      toast.error("The card order is invalid. Reload the set and try again.");
      return;
    }

    setPendingOrder({ sourceCards: cards, cards: newOrder });
    setReordering(true);
    try {
      const detail = await onReorder(nextIds);
      const canonicalCards = normalizeCards(detail?.cards);
      const canonicalIds = cardIds(canonicalCards);
      if (
        !canonicalCards.length ||
        !isCompleteCardOrder(previousOrder, canonicalIds)
      ) {
        throw new Error("The server returned an invalid card order.");
      }
      setPendingOrder({ sourceCards: cards, cards: canonicalCards });
      setSelectedIds((current) => pruneSelectedIds(current, canonicalCards));
      setActiveCardId((currentId) =>
        getFallbackActiveCardId(
          canonicalCards,
          currentId,
          fallbackActiveIndex,
        ),
      );
      toast.success("Card order updated.");
    } catch (error) {
      restoreAfterReorderFailure(previousOrder);
      toast.error(getErrorMessage(error, "Unable to reorder cards. The previous order was restored."));
    } finally {
      setReordering(false);
    }
  }

  function handleMove({ fromVisibleIndex, toVisibleIndex }) {
    if (busy || selectionMode) return;
    const nextCards = moveItem(displayCards, fromVisibleIndex, toVisibleIndex);
    if (nextCards === displayCards) return;
    void commitReorder(nextCards);
  }

  async function saveCard(values) {
    try {
      if (cardModal.card?.id) {
        await onUpdateCard(cardModal.card.id, values);
        toast.success("Card updated.");
      } else {
        await onCreateCard(values);
        toast.success("Card added.");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save this card."));
      throw error;
    }
  }

  async function confirmDelete() {
    const targetIds = deleteState.type === "bulk"
      ? [...activeSelectedIds]
      : deleteState.card?.id
        ? [deleteState.card.id]
        : [];
    if (!targetIds.length) return;

    setDeleting(true);
    try {
      if (deleteState.type === "bulk") {
        await onBulkDelete(targetIds);
        setSelectionMode(false);
        toast.success(`${targetIds.length} ${targetIds.length === 1 ? "card" : "cards"} deleted.`);
      } else {
        await onDeleteCard(targetIds[0]);
        toast.success("Card deleted.");
      }
      const deletedIds = new Set(targetIds.map(String));
      setSelectedIds((current) =>
        new Set([...current].filter((id) => !deletedIds.has(String(id)))),
      );
      setDeleteState({ type: null, card: null });
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to delete the selected card."));
    } finally {
      setDeleting(false);
    }
  }

  function closePreview() {
    setPreviewOpen(false);
    window.requestAnimationFrame(() => {
      previewTriggerRef.current?.focus({ preventScroll: true });
    });
  }

  return (
    <section
      className={[
        "personal-flashcard-card-editor",
        showPreviewBar
          ? "personal-flashcard-card-editor--with-fixed-preview-bar"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="personal-flashcard-cards-heading"
    >
      <header className="personal-flashcard-card-editor__header">
        <div>
          <h2 id="personal-flashcard-cards-heading">Cards</h2>
          <p>{displayCards.length} active {displayCards.length === 1 ? "card" : "cards"}</p>
        </div>
      </header>

      <div className="personal-flashcard-card-editor__toolbar">
        <FlashcardSelectionToolbar
          selectionMode={selectionMode}
          selectedCount={activeSelectedIds.size}
          totalSelectableCount={displayCards.length}
          bulkDeleteCount={activeSelectedIds.size}
          disabled={busy}
          onEnterSelection={enterSelectionMode}
          onExitSelection={exitSelectionMode}
          onSelectAll={selectAllCards}
          onClearSelection={clearSelection}
          onBulkDelete={() => setDeleteState({ type: "bulk", card: null })}
          bulkDeleteDisabled={activeSelectedIds.size === 0}
          idleActions={
            <>
              <button
                type="button"
                className="flashcard-btn"
                onClick={() => setImportOpen(true)}
                disabled={busy}
              >
                <Upload size={16} />
                Import
              </button>
              <button
                type="button"
                className="flashcard-btn flashcard-btn--primary"
                onClick={() => setCardModal({ open: true, card: null })}
                disabled={busy}
              >
                <Plus size={16} />
                Add card
              </button>
            </>
          }
        />
      </div>

      {displayCards.length === 0 ? (
        <div className="personal-flashcard-empty-state">
          <h3>No cards yet</h3>
          <p>Add a card with text, an image, or both on each side.</p>
        </div>
      ) : (
        <div className="personal-flashcard-card-editor__list">
          <FlashcardCardList
            cards={displayCards}
            activeCardId={activeCard?.id}
            disabled={busy}
            dragDisabled={busy || selectionMode}
            selectionMode={selectionMode}
            selectedCardIds={[...activeSelectedIds]}
            onToggleSelect={toggleCard}
            onSelect={selectActiveCard}
            onEdit={(card) => setCardModal({ open: true, card })}
            onDelete={(card) => setDeleteState({ type: "single", card })}
            onMove={handleMove}
          />
        </div>
      )}

      {showPreviewBar && (
        <FlashcardPreviewBar
          activeCard={activeCard}
          activeIndex={activeIndex}
          totalCards={displayCards.length}
          onOpenPreview={() => setPreviewOpen(true)}
          triggerRef={previewTriggerRef}
        />
      )}

      {previewOpen && activeCard && (
        <Modal
          open
          title="Preview"
          description="Preview the active flashcard."
          size="lg"
          onClose={closePreview}
        >
          <div className="flashcard-current-editor__preview">
            <FlashcardPreview
              cards={[activeCard]}
              activeCardId={activeCard.id}
              emptyMessage="Select a card to preview it."
              contentLayout="management"
              showNavigation={false}
            />
          </div>
        </Modal>
      )}

      {cardModal.open && (
        <PersonalFlashcardCardFormModal
          open={cardModal.open}
          card={cardModal.card}
          onClose={() => setCardModal({ open: false, card: null })}
          onSave={saveCard}
          onUpload={onUploadImage}
        />
      )}

      {importOpen && (
        <PersonalFlashcardImportModal
          open
          existingCards={displayCards}
          onClose={() => setImportOpen(false)}
          onGenerateFromFile={onGenerateFromFile}
          onConfirmSave={onBulkCreateCards}
          onUpload={onUploadImage}
        />
      )}

      <Modal
        open={Boolean(deleteState.type)}
        title={deleteState.type === "bulk" ? "Delete selected cards?" : "Delete card?"}
        description={deleteState.type === "bulk"
          ? "Selected cards will be removed from this personal set."
          : "This card will be removed from this personal set."}
        closeDisabled={deleting}
        onClose={() => setDeleteState({ type: null, card: null })}
        footer={(
          <div className="personal-flashcard-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setDeleteState({ type: null, card: null })} disabled={deleting}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={confirmDelete} loading={deleting}>
              Delete
            </Button>
          </div>
        )}
      >
        <p className="personal-flashcard-confirm-copy">
          This action cannot be undone from the Personal Flashcard library.
        </p>
      </Modal>
    </section>
  );
}
