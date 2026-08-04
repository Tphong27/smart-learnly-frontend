import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Pencil, RefreshCw } from "lucide-react";
import { Button, useToast } from "@/shared/components/ui";
import { personalFlashcardService } from "../services/personalFlashcardService";
import { PersonalFlashcardCardEditor } from "../components/PersonalFlashcardCardEditor";
import { PersonalFlashcardSetFormModal } from "../components/PersonalFlashcardSetFormModal";
import {
  formatPersonalFlashcardDate,
  getApiStatus,
  getErrorMessage,
  normalizeCards,
} from "../utils/personal-flashcard-utils";

export function PersonalFlashcardSetDetailPage() {
  const { setId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const mountedRef = useRef(true);
  const [flashcardSet, setFlashcardSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  const loadSet = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const data = await personalFlashcardService.getSet(setId);
      if (!mountedRef.current) return null;
      setFlashcardSet({ ...data, cards: normalizeCards(data?.cards) });
      return data;
    } catch (loadError) {
      if (!mountedRef.current) return null;
      if (getApiStatus(loadError) === 404) {
        navigate("/404", { replace: true });
        return null;
      }
      setError(getErrorMessage(loadError, "Unable to load this flashcard set."));
      return null;
    } finally {
      if (mountedRef.current && showLoading) setLoading(false);
    }
  }, [navigate, setId]);

  useEffect(() => {
    mountedRef.current = true;
    const timeoutId = window.setTimeout(() => void loadSet(), 0);
    return () => {
      mountedRef.current = false;
      window.clearTimeout(timeoutId);
    };
  }, [loadSet]);

  async function saveSet(values) {
    const updated = await personalFlashcardService.replaceSet(setId, values);
    setFlashcardSet({ ...updated, cards: normalizeCards(updated?.cards) });
    toast.success("Flashcard set updated.");
  }

  async function refreshAfterMutation() {
    await loadSet(false);
  }

  async function createCard(values) {
    await personalFlashcardService.createCard(setId, values);
    await refreshAfterMutation();
  }

  async function updateCard(cardId, values) {
    await personalFlashcardService.replaceCard(setId, cardId, values);
    await refreshAfterMutation();
  }

  async function deleteCard(cardId) {
    await personalFlashcardService.deleteCard(setId, cardId);
    await refreshAfterMutation();
  }

  async function bulkDeleteCards(ids) {
    await personalFlashcardService.bulkDeleteCards(setId, ids);
    await refreshAfterMutation();
  }

  async function bulkCreateCards(cards) {
    const updated = await personalFlashcardService.bulkCreateCards(setId, cards);
    setFlashcardSet({ ...updated, cards: normalizeCards(updated?.cards) });
    return updated;
  }

  async function generateFromFile(values) {
    return personalFlashcardService.generateFromFile(setId, values);
  }

  async function reorderCards(ids) {
    const updated = await personalFlashcardService.reorderCards(setId, ids);
    setFlashcardSet({ ...updated, cards: normalizeCards(updated?.cards) });
    return updated;
  }

  async function uploadImage(file) {
    return personalFlashcardService.uploadImage(setId, file);
  }

  if (loading) {
    return <section className="personal-flashcards-page"><div className="personal-flashcard-state" role="status">Loading flashcard set...</div></section>;
  }

  if (error) {
    return (
      <section className="personal-flashcards-page">
        <div className="personal-flashcard-state personal-flashcard-state--error" role="alert">
          <p>{error}</p>
          <Button variant="secondary" leftIcon={<RefreshCw size={16} aria-hidden="true" />} onClick={() => void loadSet()}>
            Try again
          </Button>
        </div>
      </section>
    );
  }

  if (!flashcardSet) return null;

  return (
    <section className="personal-flashcards-page">
      <Link to="/flashcards" className="personal-flashcards-back-link">
        <ArrowLeft size={17} aria-hidden="true" /> Back to My Flashcards
      </Link>
      <header className="personal-flashcards-page__header personal-flashcards-page__header--detail">
        <div>
          <span className="personal-flashcards-page__eyebrow">Personal flashcard set</span>
          <h1>{flashcardSet.title}</h1>
          <p>{flashcardSet.description || "No description"}</p>
          <span className="personal-flashcards-page__metadata">
            <BookOpen size={16} aria-hidden="true" />
            {flashcardSet.cards.length} {flashcardSet.cards.length === 1 ? "card" : "cards"}
            <span aria-hidden="true">{" \u00b7 "}</span>
            Updated {formatPersonalFlashcardDate(flashcardSet.updatedAt)}
          </span>
        </div>
        <div className="personal-flashcards-page__header-actions">
          <Button variant="secondary" leftIcon={<Pencil size={17} aria-hidden="true" />} onClick={() => setEditOpen(true)}>
            Edit set
          </Button>
          <Button to={`/flashcards/${setId}/study`}>Study</Button>
        </div>
      </header>

      <PersonalFlashcardCardEditor
        cards={flashcardSet.cards}
        onCreateCard={createCard}
        onUpdateCard={updateCard}
        onDeleteCard={deleteCard}
        onBulkDelete={bulkDeleteCards}
        onBulkCreateCards={bulkCreateCards}
        onReorder={reorderCards}
        onUploadImage={uploadImage}
        onGenerateFromFile={generateFromFile}
      />

      <PersonalFlashcardSetFormModal
        open={editOpen}
        mode="edit"
        initialSet={flashcardSet}
        onClose={() => setEditOpen(false)}
        onSave={saveSet}
      />
    </section>
  );
}
