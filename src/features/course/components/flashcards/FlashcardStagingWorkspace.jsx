import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Edit3,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { flashcardService } from "@/services/flashcard.service";
import { FlashcardCardEditor } from "./FlashcardCardEditor";
import {
  getErrorMessage,
  toCardPayload,
  validateCardDraft,
} from "./flashcard-utils";
import "./Flashcards.css";

const DIFFICULTIES = ["easy", "medium", "hard"];
const LANGUAGES = [
  { value: "auto", label: "Auto-detect" },
  { value: "vi", label: "Vietnamese" },
  { value: "en", label: "English" },
];
const DEFAULT_GENERATION = {
  desiredCount: 10,
  language: "auto",
  difficulty: "medium",
};

const STATUS_PRIORITY = {
  draft: 0,
  approved: 1,
  rejected: 2,
};
const SOURCE_QUESTION_PAGE_SIZE = 10;
const STAGING_REVIEW_PAGE_SIZE = 50;
const DOCUMENT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const DOCUMENT_MAX_FILE_SIZE_MESSAGE = "Uploaded file must not exceed 10 MB";
const FRONT_BACK_SEPARATOR_OPTIONS = [
  { value: "tab", label: "Tab" },
  { value: "comma", label: "Comma" },
  { value: "custom", label: "Custom" },
];
const CARD_SEPARATOR_OPTIONS = [
  { value: "newline", label: "New line" },
  { value: "semicolon", label: "Semicolon" },
  { value: "custom", label: "Custom" },
];
const DEFAULT_PASTED_IMPORT = {
  text: "",
  frontBackSeparator: "tab",
  customFrontBackSeparator: "",
  cardSeparator: "newline",
  customCardSeparator: "",
};
const DEFAULT_SOURCE_FILTERS = {
  keyword: "",
  difficulty: "",
  status: "",
  importStatus: "all",
};

function normalizeResponse(payload) {
  return payload?.data ?? payload;
}

function formatLabel(value, fallback = "Unknown") {
  if (!value) return fallback;
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeStatus(status) {
  return String(status || "draft").toLowerCase();
}

function getQuestionId(question) {
  return question?.questionId || question?.id;
}

function correctAnswersLabel(question) {
  const answers = Array.isArray(question?.correctAnswers)
    ? question.correctAnswers
    : (question?.answers || [])
        .filter((answer) => answer.correct || answer.isCorrect)
        .map((answer) => answer.answerText);
  return answers.filter(Boolean).join(", ") || "--";
}

function getBatchCards(batch) {
  return Array.isArray(batch?.cards)
    ? [...batch.cards].sort(
        (left, right) =>
          (STATUS_PRIORITY[normalizeStatus(left?.status)] ?? 99) -
            (STATUS_PRIORITY[normalizeStatus(right?.status)] ?? 99) ||
          Number(left?.sortOrder ?? 0) - Number(right?.sortOrder ?? 0),
      )
    : [];
}

function draftCardCount(batches) {
  return batches.reduce(
    (count, batch) =>
      count +
      getBatchCards(batch).filter((card) => normalizeStatus(card.status) === "draft").length,
    0,
  );
}

function shouldIgnoreSelectionClick(event) {
  return Boolean(
    event.target.closest(
      "button,a,input,textarea,select,label,[role='button']",
    ),
  );
}

function resolveFrontBackSeparator(values) {
  if (values.frontBackSeparator === "tab") return "\t";
  if (values.frontBackSeparator === "comma") return ",";
  return values.customFrontBackSeparator;
}

function resolveCardSeparator(values) {
  if (values.cardSeparator === "newline") return "\n";
  if (values.cardSeparator === "semicolon") return ";";
  return values.customCardSeparator;
}

function splitPastedCards(text, separator) {
  if (separator === "\n") {
    return String(text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n");
  }
  return String(text || "").split(separator);
}

function normalizeFlashcardSignature(frontText, backText) {
  return `${String(frontText || "").trim().replace(/\s+/g, " ").toLowerCase()}\n${String(backText || "").trim().replace(/\s+/g, " ").toLowerCase()}`;
}

function getFlashcardSignature(card) {
  const signature = normalizeFlashcardSignature(
    card?.frontText,
    card?.backText,
  );
  return signature.trim() ? signature : "";
}

function buildDuplicateInfoByCardId(batches, existingCards = []) {
  const existingSignatures = new Set(
    existingCards.map(getFlashcardSignature).filter(Boolean),
  );
  const duplicateInfoByCardId = {};

  (Array.isArray(batches) ? batches : []).forEach((batch) => {
    const cards = getBatchCards(batch);
    const batchSignatureCounts = new Map();

    cards
      .filter((card) => normalizeStatus(card.status) !== "rejected")
      .forEach((card) => {
        const signature = getFlashcardSignature(card);
        if (!signature) return;
        batchSignatureCounts.set(
          signature,
          (batchSignatureCounts.get(signature) || 0) + 1,
        );
      });

    cards.filter(isDraftCard).forEach((card) => {
      const signature = getFlashcardSignature(card);
      if (!signature) return;

      const reasons = [];
      if (existingSignatures.has(signature)) {
        reasons.push("Matches Current Flashcards");
      }
      if ((batchSignatureCounts.get(signature) || 0) > 1) {
        reasons.push("Duplicate in this batch");
      }
      if (reasons.length > 0) {
        duplicateInfoByCardId[card.id] = reasons;
      }
    });
  });

  return duplicateInfoByCardId;
}

function getDuplicateReasons(duplicateInfoByCardId, cardId) {
  return duplicateInfoByCardId?.[cardId] || [];
}

function isDraftCard(card) {
  return normalizeStatus(card?.status) === "draft";
}

function parsePastedFlashcards(values) {
  const sourceText = String(values.text || "");
  const frontBackSeparator = resolveFrontBackSeparator(values);
  const cardSeparator = resolveCardSeparator(values);

  if (!sourceText.trim()) {
    return { cards: [], invalidRows: [], configError: null };
  }
  if (!frontBackSeparator) {
    return {
      cards: [],
      invalidRows: [],
      configError: "Enter a custom separator between front and back.",
    };
  }
  if (!cardSeparator) {
    return {
      cards: [],
      invalidRows: [],
      configError: "Enter a custom separator between cards.",
    };
  }
  if (frontBackSeparator === cardSeparator) {
    return {
      cards: [],
      invalidRows: [],
      configError: "Use different separators for card sides and cards.",
    };
  }

  const cards = [];
  const invalidRows = [];
  splitPastedCards(sourceText, cardSeparator).forEach((chunk, index) => {
    const rawText = String(chunk || "").trim();
    if (!rawText) return;

    const separatorIndex = rawText.indexOf(frontBackSeparator);
    if (separatorIndex < 0) {
      invalidRows.push({
        rowNumber: index + 1,
        text: rawText,
        reason: "Missing front/back separator.",
      });
      return;
    }

    const frontText = rawText.slice(0, separatorIndex).trim();
    const backText = rawText
      .slice(separatorIndex + frontBackSeparator.length)
      .trim();
    if (!frontText || !backText) {
      invalidRows.push({
        rowNumber: index + 1,
        text: rawText,
        reason: !frontText ? "Front text is blank." : "Back text is blank.",
      });
      return;
    }

    cards.push({
      clientId: `${index + 1}-${frontText}-${backText}`,
      rowNumber: index + 1,
      frontText,
      backText,
    });
  });

  return { cards, invalidRows, configError: null };
}

function getGenerationPayload(values) {
  return {
    desiredCount: Number(values.desiredCount || DEFAULT_GENERATION.desiredCount),
    language: values.language || DEFAULT_GENERATION.language,
    difficulty: values.difficulty || DEFAULT_GENERATION.difficulty,
  };
}

function validateGenerationSettings(values) {
  const desiredCount = Number(values.desiredCount);
  if (!Number.isInteger(desiredCount) || desiredCount < 1 || desiredCount > 30) {
    return "Target cards must be between 1 and 30.";
  }
  return null;
}

function getGeneratedCount(response) {
  if (Array.isArray(response?.cards)) return response.cards.length;
  if (Number.isFinite(Number(response?.generatedCount))) {
    return Number(response.generatedCount);
  }
  if (Number.isFinite(Number(response?.count))) return Number(response.count);
  return 0;
}

function formatGeneratedMessage(response, requestedCount, sourceLabel = "") {
  const generatedCount = getGeneratedCount(response);
  const suffix = sourceLabel ? ` ${sourceLabel}` : "";
  const cardLabel = generatedCount === 1 ? "card" : "cards";
  const baseMessage = `Created ${generatedCount} staging ${cardLabel}${suffix}.`;
  if (generatedCount < requestedCount) {
    return `${baseMessage} Requested ${requestedCount}; fewer cards were generated because the source content had limited extractable ideas.`;
  }
  return baseMessage;
}

function GenerationSettings({ values, onChange, prefix }) {
  return (
    <>
      <div className="flashcard-staging__settings">
        <div className="flashcard-field">
          <label htmlFor={`${prefix}-count`}>Target cards</label>
          <input
            id={`${prefix}-count`}
            type="number"
            inputMode="numeric"
            value={values.desiredCount}
            onChange={(event) =>
              onChange({ ...values, desiredCount: event.target.value })
            }
          />
        </div>
        <div className="flashcard-field">
          <label htmlFor={`${prefix}-language`}>Language</label>
          <select
            id={`${prefix}-language`}
            value={values.language}
            onChange={(event) =>
              onChange({ ...values, language: event.target.value })
            }
          >
            {LANGUAGES.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flashcard-field">
          <label htmlFor={`${prefix}-difficulty`}>Difficulty</label>
          <select
            id={`${prefix}-difficulty`}
            value={values.difficulty}
            onChange={(event) =>
              onChange({ ...values, difficulty: event.target.value })
            }
          >
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {formatLabel(difficulty)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="flashcard-staging__settings-note">
        The system reads the document and creates reviewable draft flashcards.
      </p>
    </>
  );
}

function InlineAlert({ children }) {
  if (!children) return null;
  return <div className="flashcard-staging__alert">{children}</div>;
}

function QuestionBankImportPanel({ setId, notify, onStagingChanged }) {
  const [filters, setFilters] = useState(DEFAULT_SOURCE_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [questions, setQuestions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const loadQuestions = useCallback(async () => {
    if (!setId) return;
    setLoading(true);
    setError(null);
    try {
      const params = {
        keyword: appliedFilters.keyword.trim() || undefined,
        difficulty: appliedFilters.difficulty || undefined,
        status: appliedFilters.status || undefined,
      };
      const items = await flashcardService.listSourceQuestions(setId, params);
      setQuestions(items);
      setPage(0);
      setSelectedIds((current) =>
        current.filter((id) =>
          items.some((question) => getQuestionId(question) === id && !question.imported),
        ),
      );
    } catch (loadError) {
      const message = getErrorMessage(
        loadError,
        "Failed to load source questions.",
      );
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, notify, setId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadQuestions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadQuestions]);

  const filteredQuestions = useMemo(() => {
    if (appliedFilters.importStatus === "imported") {
      return questions.filter((question) => question.imported);
    }
    if (appliedFilters.importStatus === "all") {
      return questions;
    }
    return questions.filter((question) => !question.imported);
  }, [appliedFilters.importStatus, questions]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredQuestions.length / SOURCE_QUESTION_PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages - 1);
  const pageQuestions = filteredQuestions.slice(
    safePage * SOURCE_QUESTION_PAGE_SIZE,
    safePage * SOURCE_QUESTION_PAGE_SIZE + SOURCE_QUESTION_PAGE_SIZE,
  );
  const selectablePageQuestions = pageQuestions.filter((question) => !question.imported);
  const selectedImportableIds = selectedIds.filter((id) =>
    questions.some((question) => getQuestionId(question) === id && !question.imported),
  );
  const allVisibleSelected =
    selectablePageQuestions.length > 0 &&
    selectablePageQuestions.every((question) => selectedIds.includes(getQuestionId(question)));

  function applyFilters() {
    setPage(0);
    setSelectedIds([]);
    setAppliedFilters(filters);
  }

  function resetFilters() {
    setPage(0);
    setSelectedIds([]);
    setFilters(DEFAULT_SOURCE_FILTERS);
    setAppliedFilters(DEFAULT_SOURCE_FILTERS);
  }

  function toggleQuestion(question) {
    if (!question || question.imported) return;
    const questionId = getQuestionId(question);
    if (!questionId) return;
    setSelectedIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  }

  function toggleAllVisible() {
    const visibleIds = selectablePageQuestions
      .map(getQuestionId)
      .filter(Boolean);
    if (allVisibleSelected) {
      const visibleIdSet = new Set(visibleIds);
      setSelectedIds((current) => current.filter((id) => !visibleIdSet.has(id)));
      return;
    }
    setSelectedIds((current) => [
      ...new Set([...current, ...visibleIds]),
    ]);
  }

  function handleQuestionRowClick(event, question) {
    if (shouldIgnoreSelectionClick(event)) return;
    toggleQuestion(question);
  }

  async function handleImport() {
    const idsToImport = selectedImportableIds;
    if (!idsToImport.length) {
      notify("Select at least one question.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const response = normalizeResponse(
        await flashcardService.importQuestionBankToStaging(setId, idsToImport),
      );
      setSelectedIds([]);
      notify(
        `Imported ${response?.cards?.length || idsToImport.length} question${
          idsToImport.length === 1 ? "" : "s"
        } to staging.`,
        "success",
      );
      await loadQuestions();
      onStagingChanged?.(response);
    } catch (importError) {
      notify(
        getErrorMessage(importError, "Failed to import selected questions."),
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="flashcard-panel">
      <div className="flashcard-panel__header">
        <h3 className="flashcard-panel__title">Question Bank Import</h3>
        <button
          type="button"
          className="flashcard-btn"
          onClick={loadQuestions}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <div className="flashcard-panel__body flashcard-staging__section">
        <div className="flashcard-staging__filters">
          <div className="flashcard-field">
            <label htmlFor="staging-question-keyword">Search</label>
            <input
              id="staging-question-keyword"
              type="search"
              value={filters.keyword}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  keyword: event.target.value,
                }))
              }
              placeholder="Question text"
            />
          </div>
          <div className="flashcard-field">
            <label htmlFor="staging-question-difficulty">Difficulty</label>
            <select
              id="staging-question-difficulty"
              value={filters.difficulty}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  difficulty: event.target.value,
                }))
              }
            >
              <option value="">All</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>
          <div className="flashcard-field">
            <label htmlFor="staging-question-status">Status</label>
            <select
              id="staging-question-status"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flashcard-field">
            <label htmlFor="staging-question-import-status">Import status</label>
            <select
              id="staging-question-import-status"
              value={filters.importStatus}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  importStatus: event.target.value,
                }))
              }
            >
              <option value="not_imported">Not imported</option>
              <option value="imported">Imported</option>
              <option value="all">All</option>
            </select>
          </div>
          <button
            type="button"
            className="flashcard-btn flashcard-btn--primary"
            onClick={applyFilters}
            disabled={loading}
          >
            <Search size={16} />
            Search
          </button>
          <button
            type="button"
            className="flashcard-btn flashcard-btn--icon"
            onClick={resetFilters}
            disabled={loading}
            title="Reset filters"
            aria-label="Reset filters"
          >
            <RefreshCw size={16} />
          </button>
        </div>
        <InlineAlert>{error}</InlineAlert>

        <div className="flashcard-staging__table-wrap">
          <table className="flashcard-staging__table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    disabled={selectablePageQuestions.length === 0}
                    aria-label="Select all visible source questions"
                  />
                </th>
                <th>Question</th>
                <th>Correct answers</th>
                <th>Difficulty</th>
                <th>Status</th>
                <th>Import</th>
                <th>Question bank</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">Loading source questions...</td>
                </tr>
              ) : filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan="7">No source questions match these filters.</td>
                </tr>
              ) : (
                pageQuestions.map((question) => {
                  const questionId = getQuestionId(question);
                  const isImported = Boolean(question.imported);
                  const isSelected = selectedIds.includes(questionId);
                  return (
                    <tr
                      key={questionId}
                      className={[
                        !isImported ? "flashcard-staging__selectable-row" : "",
                        isSelected ? "is-selected" : "",
                        isImported ? "is-imported" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={(event) => handleQuestionRowClick(event, question)}
                      aria-selected={isSelected}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleQuestion(question)}
                          disabled={isImported}
                          aria-label="Select source question"
                        />
                      </td>
                      <td className="flashcard-staging__wrap-cell">
                        {question.questionText || "--"}
                      </td>
                      <td className="flashcard-staging__wrap-cell">
                        {correctAnswersLabel(question)}
                      </td>
                      <td>{question.difficulty ?? "--"}</td>
                      <td>
                        <span className="flashcard-staging__badge">
                          {formatLabel(question.status)}
                        </span>
                      </td>
                      <td>
                        {isImported ? (
                          <span className="flashcard-staging__badge flashcard-staging__badge--imported">
                            Imported
                          </span>
                        ) : (
                          <span className="flashcard-staging__muted">Not imported</span>
                        )}
                      </td>
                      <td>{question.questionBankName || "--"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredQuestions.length > 0 && (
          <div className="flashcard-staging__pagination">
            <span>
              Showing {safePage * SOURCE_QUESTION_PAGE_SIZE + 1}-
              {Math.min((safePage + 1) * SOURCE_QUESTION_PAGE_SIZE, filteredQuestions.length)} of{" "}
              {filteredQuestions.length}
            </span>
            <div className="flashcard-staging__pagination-controls">
              <button
                type="button"
                className="flashcard-btn"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
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
                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                disabled={safePage + 1 >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}

        <div className="flashcard-staging__actions">
          <span>{selectedImportableIds.length} selected</span>
          <button
            type="button"
            className="flashcard-btn flashcard-btn--primary"
            onClick={handleImport}
            disabled={submitting || loading || selectedImportableIds.length === 0}
          >
            <Upload size={16} />
            {submitting ? "Importing" : "Import selected to staging"}
          </button>
        </div>
      </div>
    </section>
  );
}

function PastedTextImportPanel({
  setId,
  existingCards = [],
  notify,
  onClose,
  onCardsImported,
}) {
  const [values, setValues] = useState(DEFAULT_PASTED_IMPORT);
  const [submitting, setSubmitting] = useState(false);

  const parsed = useMemo(() => parsePastedFlashcards(values), [values]);
  const existingSignatures = useMemo(
    () =>
      new Set(
        existingCards
          .map((card) =>
            normalizeFlashcardSignature(card?.frontText, card?.backText),
          )
          .filter((signature) => signature.trim()),
      ),
    [existingCards],
  );
  const previewRows = useMemo(() => {
    const seenSignatures = new Set();
    return parsed.cards.map((card) => {
      const signature = normalizeFlashcardSignature(card.frontText, card.backText);
      let duplicateReason = "";
      if (existingSignatures.has(signature)) {
        duplicateReason = "Already exists in Current Flashcards.";
      } else if (seenSignatures.has(signature)) {
        duplicateReason = "Duplicate in pasted text.";
      } else {
        seenSignatures.add(signature);
      }
      return {
        ...card,
        duplicateReason,
        importable: !duplicateReason,
      };
    });
  }, [existingSignatures, parsed.cards]);
  const duplicateRows = previewRows.filter((row) => row.duplicateReason);
  const importableCards = previewRows.filter((row) => row.importable);

  function updateValue(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function resetImport() {
    setValues(DEFAULT_PASTED_IMPORT);
  }

  async function handleImport(event) {
    event.preventDefault();
    if (parsed.configError) {
      notify(parsed.configError, "error");
      return;
    }
    if (!importableCards.length) {
      notify("Paste at least one non-duplicate front/back flashcard row.", "error");
      return;
    }

    setSubmitting(true);
    let createdCount = 0;
    try {
      for (const card of importableCards) {
        await flashcardService.addCard(setId, {
          frontText: card.frontText,
          backText: card.backText,
        });
        createdCount += 1;
      }
    } catch (importError) {
      setSubmitting(false);
      const message = getErrorMessage(importError, "Failed to import pasted flashcards.");
      if (createdCount > 0) {
        notify(
          `Imported ${createdCount} of ${importableCards.length} flashcards before an error: ${message} Current Flashcards were refreshed.`,
          "error",
        );
        onClose?.();
        await onCardsImported?.();
        return;
      }
      notify(message, "error");
      return;
    }

    setSubmitting(false);
    resetImport();
    onClose?.();
    await onCardsImported?.();
    notify(
      `Imported ${createdCount} flashcard${createdCount === 1 ? "" : "s"} to Current Flashcards.`,
      "success",
    );
  }

  return (
    <form
      className="flashcard-panel__body flashcard-staging__section"
      onSubmit={handleImport}
      noValidate
    >
      <div className="flashcard-field">
        <label htmlFor="pasted-import-text">Pasted text</label>
        <textarea
          id="pasted-import-text"
          value={values.text}
          onChange={(event) => updateValue("text", event.target.value)}
          placeholder={"Term\tDefinition\nAnother term\tAnother definition"}
          rows={12}
        />
      </div>

      <div className="flashcard-pasted-import__settings">
        <div className="flashcard-field">
          <label htmlFor="pasted-front-back-separator">
            Between front and back
          </label>
          <select
            id="pasted-front-back-separator"
            value={values.frontBackSeparator}
            onChange={(event) =>
              updateValue("frontBackSeparator", event.target.value)
            }
          >
            {FRONT_BACK_SEPARATOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {values.frontBackSeparator === "custom" && (
          <div className="flashcard-field">
            <label htmlFor="pasted-custom-front-back-separator">
              Custom side separator
            </label>
            <input
              id="pasted-custom-front-back-separator"
              type="text"
              value={values.customFrontBackSeparator}
              onChange={(event) =>
                updateValue("customFrontBackSeparator", event.target.value)
              }
            />
          </div>
        )}
        <div className="flashcard-field">
          <label htmlFor="pasted-card-separator">Between cards</label>
          <select
            id="pasted-card-separator"
            value={values.cardSeparator}
            onChange={(event) =>
              updateValue("cardSeparator", event.target.value)
            }
          >
            {CARD_SEPARATOR_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {values.cardSeparator === "custom" && (
          <div className="flashcard-field">
            <label htmlFor="pasted-custom-card-separator">
              Custom card separator
            </label>
            <input
              id="pasted-custom-card-separator"
              type="text"
              value={values.customCardSeparator}
              onChange={(event) =>
                updateValue("customCardSeparator", event.target.value)
              }
            />
          </div>
        )}
      </div>

      <InlineAlert>{parsed.configError}</InlineAlert>

      <div className="flashcard-pasted-import__summary">
        <span>
          {importableCards.length} ready to import
        </span>
        <span>
          {duplicateRows.length} duplicate row
          {duplicateRows.length === 1 ? "" : "s"}
        </span>
        <span>
          {parsed.invalidRows.length} invalid row
          {parsed.invalidRows.length === 1 ? "" : "s"}
        </span>
      </div>

      {parsed.invalidRows.length > 0 && (
        <div className="flashcard-pasted-import__invalid">
          <strong>Rows needing attention</strong>
          <ul>
            {parsed.invalidRows.map((row) => (
              <li key={`${row.rowNumber}-${row.reason}-${row.text}`}>
                <span>Row {row.rowNumber}: {row.reason}</span>
                <code>{row.text}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {duplicateRows.length > 0 && (
        <div className="flashcard-pasted-import__invalid flashcard-pasted-import__invalid--duplicate">
          <strong>Duplicate rows skipped</strong>
          <ul>
            {duplicateRows.map((row) => (
              <li key={`${row.rowNumber}-${row.duplicateReason}-${row.clientId}`}>
                <span>Row {row.rowNumber}: {row.duplicateReason}</span>
                <code>{row.frontText} / {row.backText}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flashcard-pasted-import__preview">
        <h4>Preview</h4>
        {previewRows.length === 0 ? (
          <p>No valid cards to preview yet.</p>
        ) : (
          <div className="flashcard-pasted-import__list">
            {previewRows.map((card) => (
              <article
                key={card.clientId}
                className={[
                  "flashcard-pasted-import__row",
                  card.importable ? "" : "is-duplicate",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="flashcard-pasted-import__index">
                  {card.rowNumber}
                </span>
                <div className="flashcard-pasted-import__side">
                  <strong>Front</strong>
                  <p>{card.frontText}</p>
                </div>
                <div className="flashcard-pasted-import__side">
                  <strong>Back</strong>
                  <p>{card.backText}</p>
                </div>
                <div className="flashcard-pasted-import__row-status">
                  <span
                    className={
                      card.importable
                        ? "flashcard-pasted-import__status"
                        : "flashcard-pasted-import__status flashcard-pasted-import__status--skip"
                    }
                  >
                    {card.importable ? "Ready" : "Duplicate"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="flashcard-staging__actions">
        <span>
          {parsed.invalidRows.length > 0
            ? "Only valid non-duplicate cards will be imported."
            : "Non-duplicate cards import directly to Current Flashcards."}
        </span>
        <button
          type="submit"
          className="flashcard-btn flashcard-btn--primary"
          disabled={
            submitting ||
            Boolean(parsed.configError) ||
            importableCards.length === 0
          }
        >
          <Upload size={16} />
          {submitting ? "Importing" : "Import ready cards"}
        </button>
      </div>
    </form>
  );
}

function DocumentGenerationPanel({ setId, notify, onStagingChanged }) {
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [fileInputRevision, setFileInputRevision] = useState(0);
  const [settings, setSettings] = useState(DEFAULT_GENERATION);
  const [submitting, setSubmitting] = useState(false);

  function handleFileChange(event) {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    setFileError(null);
    setUploadError(null);
    if (nextFile && nextFile.size > DOCUMENT_MAX_FILE_SIZE_BYTES) {
      setFileError(DOCUMENT_MAX_FILE_SIZE_MESSAGE);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) {
      notify("Choose a file.", "error");
      return;
    }
    if (file.size > DOCUMENT_MAX_FILE_SIZE_BYTES) {
      setFileError(DOCUMENT_MAX_FILE_SIZE_MESSAGE);
      notify(DOCUMENT_MAX_FILE_SIZE_MESSAGE, "error");
      return;
    }
    const settingsError = validateGenerationSettings(settings);
    if (settingsError) {
      notify(settingsError, "error");
      return;
    }
    const generationPayload = getGenerationPayload(settings);
    setUploadError(null);
    setSubmitting(true);
    try {
      const response = normalizeResponse(
        await flashcardService.generateStagingFromFile(setId, {
          file,
          ...generationPayload,
        }),
      );
      notify(
        formatGeneratedMessage(
          response,
          generationPayload.desiredCount,
          "from document",
        ),
        "success",
      );
      setFile(null);
      setFileError(null);
      setUploadError(null);
      setFileInputRevision((revision) => revision + 1);
      onStagingChanged?.(response);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to generate from document.");
      setUploadError(message);
      notify(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="flashcard-panel">
      <div className="flashcard-panel__header">
        <h3 className="flashcard-panel__title">Document</h3>
      </div>
      <form
        className="flashcard-panel__body flashcard-staging__section"
        onSubmit={handleSubmit}
        noValidate
      >
        <label className="flashcard-staging__file-drop" htmlFor="staging-document-file">
          <FileText size={22} />
          <span>{file ? file.name : "Upload DOCX or PDF"}</span>
          <input
            key={fileInputRevision}
            id="staging-document-file"
            type="file"
            accept=".docx,.pdf"
            onChange={handleFileChange}
          />
        </label>
        <InlineAlert>{fileError || uploadError}</InlineAlert>
        <GenerationSettings
          values={settings}
          onChange={setSettings}
          prefix="staging-document"
        />
        <div className="flashcard-staging__actions">
          <span>{file ? "Ready to create cards" : "No file selected"}</span>
          <button
            type="submit"
            className="flashcard-btn flashcard-btn--primary"
            disabled={submitting || Boolean(fileError)}
          >
            <Upload size={16} />
            {submitting ? "Creating" : "Create from document"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function ImportFlashcardsModal({
  setId,
  existingCards = [],
  notify,
  onClose,
  onStagingChanged,
  onCardsImported,
  onApproved,
  onUploadImage,
}) {
  const [activeImportTab, setActiveImportTab] = useState("pasted");
  const [reviewBatch, setReviewBatch] = useState(null);
  const [reviewEditing, setReviewEditing] = useState(false);

  function handleStagingImportComplete(batch) {
    if (batch?.id) {
      setReviewBatch(batch);
      setReviewEditing(false);
    }
    onStagingChanged?.(batch);
  }

  function handleBackToImport() {
    setReviewBatch(null);
    setReviewEditing(false);
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
              {reviewEditing
                ? "Edit staging card"
                : reviewBatch
                  ? "Review imported flashcards"
                  : "Import flashcards"}
            </h3>
            <p>
              {reviewEditing
                ? "Update this staging card, then save or cancel to return to the imported batch."
                : reviewBatch
                  ? "Review the staging cards created by this import batch."
                  : "Choose a source and review the result before importing."}
            </p>
          </div>
          <div className="flashcard-import-modal__header-actions">
            {reviewBatch && !reviewEditing && (
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

        {!reviewBatch && (
          <div
            className="flashcard-tabs flashcard-import-modal__tabs"
            role="tablist"
            aria-label="Flashcard import sources"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeImportTab === "pasted"}
              className={
                activeImportTab === "pasted"
                  ? "flashcard-tabs__tab is-active"
                  : "flashcard-tabs__tab"
              }
              onClick={() => setActiveImportTab("pasted")}
            >
              Pasted Text
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeImportTab === "document"}
              className={
                activeImportTab === "document"
                  ? "flashcard-tabs__tab is-active"
                  : "flashcard-tabs__tab"
              }
              onClick={() => setActiveImportTab("document")}
            >
              Document
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeImportTab === "question-bank"}
              className={
                activeImportTab === "question-bank"
                  ? "flashcard-tabs__tab is-active"
                  : "flashcard-tabs__tab"
              }
              onClick={() => setActiveImportTab("question-bank")}
            >
              Question Bank
            </button>
          </div>
        )}

        <div className="flashcard-import-modal__content">
          {reviewBatch ? (
            <ImportedBatchReviewPanel
              key={reviewBatch.id}
              setId={setId}
              initialBatch={reviewBatch}
              existingCards={existingCards}
              notify={notify}
              onStagingChanged={onStagingChanged}
              onApproved={onApproved}
              onUploadImage={onUploadImage}
              onEditStateChange={setReviewEditing}
            />
          ) : (
            <>
              {activeImportTab === "pasted" && (
                <section className="flashcard-panel">
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
                <DocumentGenerationPanel
                  setId={setId}
                  notify={notify}
                  onStagingChanged={handleStagingImportComplete}
                />
              )}
              {activeImportTab === "question-bank" && (
                <QuestionBankImportPanel
                  setId={setId}
                  notify={notify}
                  onStagingChanged={handleStagingImportComplete}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EditStagingCardForm({
  card,
  saving,
  onCancel,
  onSave,
  onUploadImage,
  notify,
  title = "Edit staging card",
  titleId = "flashcard-staging-edit-title",
}) {
  if (!card) return null;

  return (
    <FlashcardCardEditor
      key={card.id}
      value={card}
      mode="edit"
      title={title}
      submitLabel="Save staging card"
      savingLabel="Saving"
      saving={saving}
      titleId={titleId}
      onSave={onSave}
      onCancel={onCancel}
      onUploadImage={onUploadImage}
      onError={(message) => notify?.(message, "error")}
    />
  );
}

function EditStagingCardModal({
  card,
  saving,
  onClose,
  onSave,
  onUploadImage,
  notify,
}) {
  if (!card) return null;

  return (
    <div className="flashcard-modal" role="presentation">
      <div
        className="flashcard-modal__dialog flashcard-modal__dialog--card-editor flashcard-modal__dialog--staging-edit"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flashcard-staging-edit-title"
      >
        <EditStagingCardForm
          card={card}
          saving={saving}
          notify={notify}
          onCancel={onClose}
          onSave={onSave}
          onUploadImage={onUploadImage}
        />
      </div>
    </div>
  );
}

function StagingCardSidePreview({ label, text, imageUrl }) {
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

function StagingCardArticle({
  card,
  selected,
  selectable,
  duplicateReasons = [],
  savingEdit,
  onToggle,
  onEdit,
}) {
  const status = normalizeStatus(card?.status);
  const isDraft = status === "draft";
  const isDuplicate = duplicateReasons.length > 0;

  function handleCardClick(event) {
    if (!selectable || shouldIgnoreSelectionClick(event)) return;
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
      onClick={handleCardClick}
      aria-selected={selected}
    >
      <div className="flashcard-staging-card__select">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle?.(card.id)}
          disabled={!selectable}
          aria-label="Select staging card"
        />
      </div>
      <div className="flashcard-staging-card__content">
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
          onClick={() => onEdit?.(card)}
          disabled={!isDraft || savingEdit}
        >
          <Edit3 size={15} />
          Edit
        </button>
      </div>
    </article>
  );
}

function StagingBatchCardGroup({
  batch,
  cards,
  selectedIds,
  draftIds,
  duplicateInfoByCardId,
  savingEdit,
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
            {formatLabel(batch.sourceType, "Staging Batch")}
            {batch.sourceName ? ` - ${batch.sourceName}` : ""}
          </h4>
          <p>
            {formatLabel(batch.status)} - {cards.length} card
            {cards.length === 1 ? "" : "s"}
          </p>
        </div>
        <label className="flashcard-staging__select-all">
          <input
            type="checkbox"
            checked={allDraftSelected}
            onChange={() => onToggleBatch(batch, cards)}
            disabled={draftCards.length === 0}
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
            selectable={draftIds.has(card.id)}
            duplicateReasons={getDuplicateReasons(duplicateInfoByCardId, card.id)}
            savingEdit={savingEdit}
            onToggle={onToggleCard}
            onEdit={onEdit}
          />
        ))}
      </div>
    </article>
  );
}

function StagingReviewPanel({
  setId,
  existingCards = [],
  notify,
  refreshKey,
  onApproved,
  onUploadImage,
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

  const loadStaging = useCallback(async ({ showRefreshedToast = false } = {}) => {
    if (!setId) return;
    setLoading(true);
    setError(null);
    try {
      const items = await flashcardService.listStaging(setId);
      setBatches(items);
      const draftIds = new Set(
        items.flatMap((batch) =>
          getBatchCards(batch)
            .filter((card) => normalizeStatus(card.status) === "draft")
            .map((card) => card.id),
        ),
      );
      setSelectedIds((current) => current.filter((id) => draftIds.has(id)));
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
        getBatchCards(batch).map((card) => ({ batch, card })),
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
          getBatchCards(batch)
            .filter((card) => normalizeStatus(card.status) === "draft")
            .map((card) => card.id),
        ),
      ),
    [batches],
  );
  const eligibleDraftIds = useMemo(
    () =>
      new Set(
        batches.flatMap((batch) =>
          getBatchCards(batch)
            .filter(
              (card) =>
                isDraftCard(card) &&
                getDuplicateReasons(duplicateInfoByCardId, card.id).length === 0,
            )
            .map((card) => card.id),
        ),
      ),
    [batches, duplicateInfoByCardId],
  );
  const selectedDraftIds = useMemo(
    () => selectedIds.filter((id) => draftIds.has(id)),
    [draftIds, selectedIds],
  );
  const selectedEligibleDraftIds = useMemo(
    () => selectedIds.filter((id) => eligibleDraftIds.has(id)),
    [eligibleDraftIds, selectedIds],
  );

  function toggleCard(cardId) {
    if (!draftIds.has(cardId)) return;
    setSelectedIds((current) =>
      current.includes(cardId)
        ? current.filter((id) => id !== cardId)
        : [...current, cardId],
    );
  }

  function handleRefresh() {
    loadStaging({ showRefreshedToast: true });
  }

  function toggleBatch(batch, visibleCards = getBatchCards(batch)) {
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

  async function handleApprove() {
    if (!selectedEligibleDraftIds.length) {
      notify("Select at least one eligible staging card before approve.", "error");
      return;
    }
    setApproving(true);
    try {
      const response = normalizeResponse(
        await flashcardService.approveStagingCards(setId, selectedEligibleDraftIds),
      );
      notify(
        `Approved ${response?.approvedCount || selectedEligibleDraftIds.length} staging card${
          selectedEligibleDraftIds.length === 1 ? "" : "s"
        }.`,
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
    } finally {
      setApproving(false);
    }
  }

  function handleRejectSelected() {
    if (!selectedDraftIds.length) return;
    const count = selectedDraftIds.length;
    setRejectConfirm({
      mode: "selected",
      ids: selectedDraftIds,
      message: `Reject ${count} selected staging card${count === 1 ? "" : "s"}?`,
    });
  }

  async function confirmReject() {
    if (!rejectConfirm?.ids?.length) return;

    const ids = rejectConfirm.ids;
    setRejectingSelected(true);

    try {
      await Promise.all(ids.map((cardId) => flashcardService.rejectStagingCard(cardId)));
      const count = ids.length;
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
    } finally {
      setRejectingSelected(false);
    }
  }

  async function handleSaveEdit(draft) {
    const validationError = validateCardDraft(draft);
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
      <section className="flashcard-panel">
        <div className="flashcard-panel__header">
          <div>
            <h3 className="flashcard-panel__title">Staging Review</h3>
            <div className="flashcard-toolbar__meta">
              {draftCount} draft card{draftCount === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flashcard-staging__header-actions">
            <button
              type="button"
              className="flashcard-btn"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? "flashcard-spin-icon" : ""} />
              {loading ? "Refreshing" : "Refresh"}
            </button>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--danger"
              onClick={handleRejectSelected}
              disabled={loading || rejectingSelected || selectedDraftIds.length === 0}
            >
              <Trash2 size={16} />
              {rejectingSelected
                ? "Rejecting"
                : `Reject selected (${selectedDraftIds.length})`}
            </button>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--success"
              onClick={handleApprove}
              disabled={approving || loading || selectedEligibleDraftIds.length === 0}
            >
              <Check size={16} />
              {approving
                ? "Approving"
                : `Approve selected eligible (${selectedEligibleDraftIds.length})`}
            </button>
          </div>
        </div>
        <div className="flashcard-panel__body flashcard-staging__section">
          <InlineAlert>{error}</InlineAlert>
          {loading ? (
            <div className="flashcard-practice__loading">
              <span className="flashcard-spinner" />
              Loading staging cards...
            </div>
          ) : batches.length === 0 || flatStagingCards.length === 0 ? (
            <div className="flashcard-empty">
              <FileText size={28} />
              <p>No staging batches yet.</p>
            </div>
          ) : (
            <>
              <div className="flashcard-staging__batches">
                {pageBatches.map((batch) => (
                  <StagingBatchCardGroup
                    key={batch.id}
                    batch={batch}
                    cards={getBatchCards(batch)}
                    selectedIds={selectedIds}
                    draftIds={draftIds}
                    duplicateInfoByCardId={duplicateInfoByCardId}
                    savingEdit={savingEdit}
                    onToggleCard={toggleCard}
                    onToggleBatch={toggleBatch}
                    onEdit={setEditingCard}
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
                      onClick={() => setPage((current) => Math.max(0, current - 1))}
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
                      onClick={() =>
                        setPage((current) => Math.min(totalPages - 1, current + 1))
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

      {editingCard && (
        <EditStagingCardModal
          key={editingCard.id}
          card={editingCard}
          saving={savingEdit}
          notify={notify}
          onClose={() => setEditingCard(null)}
          onSave={handleSaveEdit}
          onUploadImage={onUploadImage}
        />
      )}
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
    </div>
  );
}

function ImportedBatchReviewPanel({
  setId,
  initialBatch,
  existingCards = [],
  notify,
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
  const [editingCard, setEditingCard] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState(null);

  const batchId = initialBatch?.id;
  const cards = useMemo(() => getBatchCards(batch), [batch]);
  const duplicateInfoByCardId = useMemo(
    () => buildDuplicateInfoByCardId(batch ? [batch] : [], existingCards),
    [batch, existingCards],
  );
  const draftIds = useMemo(
    () =>
      new Set(
        cards
          .filter((card) => normalizeStatus(card.status) === "draft")
          .map((card) => card.id),
      ),
    [cards],
  );
  const eligibleDraftIds = useMemo(
    () =>
      new Set(
        cards
          .filter(
            (card) =>
              isDraftCard(card) &&
              getDuplicateReasons(duplicateInfoByCardId, card.id).length === 0,
          )
          .map((card) => card.id),
      ),
    [cards, duplicateInfoByCardId],
  );
  const selectedDraftIds = useMemo(
    () => selectedIds.filter((id) => draftIds.has(id)),
    [draftIds, selectedIds],
  );
  const selectedEligibleDraftIds = useMemo(
    () => selectedIds.filter((id) => eligibleDraftIds.has(id)),
    [eligibleDraftIds, selectedIds],
  );

  const loadImportedBatch = useCallback(async ({ showRefreshedToast = false } = {}) => {
    if (!setId || !batchId) return;
    setLoading(true);
    setError(null);
    try {
      const items = await flashcardService.listStaging(setId);
      const freshBatch = items.find((item) => item.id === batchId);
      if (!freshBatch) {
        setError("Imported staging batch is no longer available.");
        return;
      }
      setBatch(freshBatch);
      const freshDraftIds = new Set(
        getBatchCards(freshBatch)
          .filter((card) => normalizeStatus(card.status) === "draft")
          .map((card) => card.id),
      );
      setSelectedIds((current) => current.filter((id) => freshDraftIds.has(id)));
      if (showRefreshedToast) {
        notify("Imported batch refreshed.", "success");
      }
    } catch (loadError) {
      const message = getErrorMessage(loadError, "Failed to refresh imported batch.");
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [batchId, notify, setId]);

  function toggleCard(cardId) {
    if (!draftIds.has(cardId)) return;
    setSelectedIds((current) =>
      current.includes(cardId)
        ? current.filter((id) => id !== cardId)
        : [...current, cardId],
    );
  }

  function toggleBatch(currentBatch, visibleCards = getBatchCards(currentBatch)) {
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

  function startEdit(card) {
    setEditingCard(card);
    onEditStateChange?.(true);
  }

  function cancelEdit() {
    setEditingCard(null);
    onEditStateChange?.(false);
  }

  async function handleApprove() {
    if (!selectedEligibleDraftIds.length) {
      notify("Select at least one eligible staging card before approve.", "error");
      return;
    }
    setApproving(true);
    try {
      const response = normalizeResponse(
        await flashcardService.approveStagingCards(setId, selectedEligibleDraftIds),
      );
      notify(
        `Approved ${response?.approvedCount || selectedEligibleDraftIds.length} staging card${
          selectedEligibleDraftIds.length === 1 ? "" : "s"
        }.`,
        "success",
      );
      setSelectedIds([]);
      await loadImportedBatch();
      onStagingChanged?.();
      await onApproved?.();
    } catch (approveError) {
      notify(
        getErrorMessage(approveError, "Failed to approve staging cards."),
        "error",
      );
    } finally {
      setApproving(false);
    }
  }

  function handleRejectSelected() {
    if (!selectedDraftIds.length) return;
    const count = selectedDraftIds.length;
    setRejectConfirm({
      mode: "selected",
      ids: selectedDraftIds,
      message: `Reject ${count} selected staging card${count === 1 ? "" : "s"}?`,
    });
  }

  async function confirmReject() {
    if (!rejectConfirm?.ids?.length) return;

    const ids = rejectConfirm.ids;
    setRejectingSelected(true);

    try {
      await Promise.all(ids.map((cardId) => flashcardService.rejectStagingCard(cardId)));
      const count = ids.length;
      notify(`Rejected ${count} staging card${count === 1 ? "" : "s"}.`, "success");
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      setRejectConfirm(null);
      await loadImportedBatch();
      onStagingChanged?.();
    } catch (rejectError) {
      notify(
        getErrorMessage(
          rejectError,
          "Failed to reject selected staging cards.",
        ),
        "error",
      );
    } finally {
      setRejectingSelected(false);
    }
  }

  async function handleSaveEdit(draft) {
    const validationError = validateCardDraft(draft);
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
      cancelEdit();
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

  if (editingCard) {
    return (
      <EditStagingCardForm
        card={editingCard}
        saving={savingEdit}
        notify={notify}
        title="Card details"
        titleId="flashcard-imported-staging-edit-title"
        onCancel={cancelEdit}
        onSave={handleSaveEdit}
        onUploadImage={onUploadImage}
      />
    );
  }

  return (
    <>
      <section className="flashcard-panel flashcard-imported-review">
        <div className="flashcard-panel__header flashcard-imported-review__header">
          <div>
            <h3 id="flashcard-imported-review-title">Review imported flashcards</h3>
            <p>
              {formatLabel(batch?.sourceType, "Imported Batch")}
              {batch?.sourceName ? ` - ${batch.sourceName}` : ""} - {cards.length} card
              {cards.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flashcard-staging__header-actions flashcard-imported-review__actions">
            <button
              type="button"
              className="flashcard-btn"
              onClick={() => loadImportedBatch({ showRefreshedToast: true })}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? "flashcard-spin-icon" : ""} />
              {loading ? "Refreshing" : "Refresh"}
            </button>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--danger"
              onClick={handleRejectSelected}
              disabled={loading || rejectingSelected || selectedDraftIds.length === 0}
            >
              <Trash2 size={16} />
              {rejectingSelected
                ? "Rejecting"
                : `Reject selected (${selectedDraftIds.length})`}
            </button>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--success"
              onClick={handleApprove}
              disabled={approving || loading || selectedEligibleDraftIds.length === 0}
            >
              <Check size={16} />
              {approving
                ? "Approving"
                : `Approve selected eligible (${selectedEligibleDraftIds.length})`}
            </button>
          </div>
        </div>

        <div className="flashcard-panel__body flashcard-staging__section">
          <InlineAlert>{error}</InlineAlert>
          {loading ? (
            <div className="flashcard-practice__loading">
              <span className="flashcard-spinner" />
              Loading imported batch...
            </div>
          ) : !batch || cards.length === 0 ? (
            <div className="flashcard-empty">
              <FileText size={28} />
              <p>No cards found for this imported batch.</p>
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
    </>
  );
}

export function FlashcardStagingWorkspace({
  setId,
  existingCards = [],
  notify,
  onUploadImage,
  onApproved,
  refreshKey = 0,
}) {
  if (!setId) {
    return (
      <div className="flashcard-empty">
        <FileText size={28} />
        <p>Save the flashcard set before using staging.</p>
      </div>
    );
  }

  return (
    <StagingReviewPanel
      setId={setId}
      existingCards={existingCards}
      notify={notify}
      refreshKey={refreshKey}
      onApproved={onApproved}
      onUploadImage={onUploadImage}
    />
  );
}
