import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowDownUp, Plus, RefreshCw, Search } from "lucide-react";
import { Button, Input, Modal, useToast } from "@/shared/components/ui";
import Pagination from "@/shared/components/Pagination";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { personalFlashcardService } from "../services/personalFlashcardService";
import { PersonalFlashcardSetFormModal } from "../components/PersonalFlashcardSetFormModal";
import { PersonalFlashcardSetList } from "../components/PersonalFlashcardSetList";
import { getErrorMessage } from "../utils/personal-flashcard-utils";

const PAGE_SIZE = 20;
const SORT_OPTIONS = [
  { value: "updated_desc", label: "Recently updated" },
  { value: "title_asc", label: "Title A\u2013Z" },
];

function safePage(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export function PersonalFlashcardLibraryPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const requestedSort = searchParams.get("sort") || "updated_desc";
  const sort = SORT_OPTIONS.some((option) => option.value === requestedSort)
    ? requestedSort
    : "updated_desc";
  const page = safePage(searchParams.get("page"));
  const [searchInput, setSearchInput] = useState(query);
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const [pageData, setPageData] = useState({
    items: [],
    page,
    size: PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setSearchInput(query), 0);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    const normalizedQuery = debouncedSearch.trim();
    if (normalizedQuery === query) return;

    const next = new URLSearchParams(searchParams);
    if (normalizedQuery) next.set("q", normalizedQuery);
    else next.delete("q");
    next.delete("page");
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, query, searchParams, setSearchParams]);

  useEffect(() => {
    let active = true;
    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      setError("");

      personalFlashcardService
        .listSets({ q: query, sort, page, size: PAGE_SIZE })
        .then((data) => {
          if (active) setPageData(data);
        })
        .catch((loadError) => {
          if (!active) return;
          setPageData((current) => ({ ...current, items: [] }));
          setError(getErrorMessage(loadError, "Unable to load your flashcard sets."));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [page, query, refreshKey, sort]);

  function updateParams(nextValues) {
    const next = new URLSearchParams(searchParams);
    Object.entries(nextValues).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") next.delete(key);
      else next.set(key, String(value));
    });
    setSearchParams(next);
  }

  async function createSet(values) {
    const created = await personalFlashcardService.createSet(values);
    toast.success("Flashcard set created.");
    navigate(`/flashcards/${created.id}`);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await personalFlashcardService.deleteSet(deleteTarget.id);
      toast.success("Flashcard set deleted.");
      setDeleteTarget(null);
      if (pageData.items.length === 1 && page > 0) {
        updateParams({ page: page - 1 });
      } else {
        setRefreshKey((current) => current + 1);
      }
    } catch (deleteError) {
      toast.error(getErrorMessage(deleteError, "Unable to delete this flashcard set."));
    } finally {
      setDeleting(false);
    }
  }

  const hasSearch = Boolean(query);

  return (
    <section className="personal-flashcards-page">
      <header className="personal-flashcards-page__header">
        <div>
          <span className="personal-flashcards-page__eyebrow">Personal library</span>
          <h1>My Flashcards</h1>
          <p>Create private sets and study them whenever you need a quick review.</p>
        </div>
        <Button leftIcon={<Plus size={18} aria-hidden="true" />} onClick={() => setCreateOpen(true)}>
          Create set
        </Button>
      </header>

      <section className="personal-flashcards-panel" aria-label="Personal flashcard library">
        <div className="personal-flashcards-toolbar" role="search">
          <Input
            label="Search personal flashcards"
            inputClassName="personal-flashcards-toolbar__search"
            leftIcon={<Search size={18} aria-hidden="true" />}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search set titles"
          />
          <label className="personal-flashcards-toolbar__sort" htmlFor="personal-flashcard-sort">
            <span><ArrowDownUp size={16} aria-hidden="true" /> Sort by</span>
            <select
              id="personal-flashcard-sort"
              value={sort}
              onChange={(event) => updateParams({ sort: event.target.value, page: null })}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="personal-flashcard-state" role="status">Loading your flashcard sets...</div>
        ) : error ? (
          <div className="personal-flashcard-state personal-flashcard-state--error" role="alert">
            <p>{error}</p>
            <Button variant="secondary" size="sm" leftIcon={<RefreshCw size={16} aria-hidden="true" />} onClick={() => setRefreshKey((current) => current + 1)}>
              Try again
            </Button>
          </div>
        ) : pageData.items.length === 0 ? (
          <div className="personal-flashcard-empty-state">
            <h2>{hasSearch ? "No matching flashcard sets" : "No personal flashcard sets yet"}</h2>
            <p>{hasSearch ? "Try another title or clear the search." : "Create a set to start building your own study library."}</p>
            {hasSearch ? (
              <Button variant="secondary" size="sm" onClick={() => updateParams({ q: null, page: null })}>Clear search</Button>
            ) : (
              <Button size="sm" onClick={() => setCreateOpen(true)}>Create set</Button>
            )}
          </div>
        ) : (
          <>
            <PersonalFlashcardSetList
              sets={pageData.items}
              onOpen={(setId) => navigate(`/flashcards/${setId}`)}
              onDelete={setDeleteTarget}
            />
            <Pagination
              page={pageData.page + 1}
              totalPages={pageData.totalPages}
              totalItems={pageData.totalItems}
              size={pageData.size}
              onPageChange={(nextPage) => updateParams({ page: nextPage - 1 })}
              ariaLabel="Personal flashcard set pagination"
            />
          </>
        )}
      </section>

      <PersonalFlashcardSetFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={createSet}
      />

      <Modal
        open={Boolean(deleteTarget)}
        title="Delete flashcard set?"
        description="The set and its active cards will no longer appear in your Personal Flashcard Library."
        closeDisabled={deleting}
        onClose={() => setDeleteTarget(null)}
        footer={(
          <div className="personal-flashcard-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button type="button" variant="danger" onClick={confirmDelete} loading={deleting}>Delete set</Button>
          </div>
        )}
      >
        <p className="personal-flashcard-confirm-copy">
          You are deleting <strong>{deleteTarget?.title}</strong>.
        </p>
      </Modal>
    </section>
  );
}
