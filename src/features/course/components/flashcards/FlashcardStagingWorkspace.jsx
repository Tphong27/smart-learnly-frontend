import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Edit3,
  FileText,
  Image as ImageIcon,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Modal } from "@/shared/components/ui";
import { courseService } from "@/services/course.service";
import { flashcardService } from "@/services/flashcard.service";
import { FlashcardCardEditorModal } from "../../../flashcards-shared";
import { FlashcardCardList } from "./FlashcardCardList";
import { FlashcardCardEditor } from "./FlashcardCardEditor";
import { FlashcardPreview } from "./FlashcardPreview";
import {
  getErrorMessage,
  toCardPayload,
  validateCurrentCardDraft,
  validateStagingCardDraft,
} from "./flashcard-utils";
import "./Flashcards.css";

const LANGUAGES = [
  { value: "auto", label: "Auto-detect" },
  { value: "vi", label: "Vietnamese" },
  { value: "en", label: "English" },
];
const DEFAULT_GENERATION = {
  desiredCount: 10,
  language: "auto",
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
  moduleId: "",
};
const TEMP_CANDIDATE_EDITOR_FORM_ID = "flashcard-temp-candidate-editor-form";
const TEMP_CANDIDATE_PREVIEW_CARD_ID = "flashcard-temp-candidate-preview";

function normalizeResponse(payload) {
  return payload?.data ?? payload;
}

function orderedUniqueSelectedIds(selectedIds, allowedIds) {
  const seen = new Set();
  const uniqueIds = [];
  selectedIds.forEach((id) => {
    if (!allowedIds.has(id) || seen.has(id)) return;
    seen.add(id);
    uniqueIds.push(id);
  });
  return uniqueIds;
}

function formatLabel(value, fallback = "Unknown") {
  if (!value) return fallback;
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSourceTypeLabel(value, fallback = "Staging Batch") {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "COURSE_QUESTIONS") return "Course Questions";
  if (normalized === "QUESTION_BANK") return "Question Bank (Historical)";
  return formatLabel(value, fallback);
}

function getModuleId(question) {
  return question?.moduleId || question?.courseModuleId || question?.module?.id;
}

function getModuleTitle(module) {
  return module?.title || module?.name || module?.moduleTitle || "Untitled module";
}

function normalizeModules(payload) {
  const data = normalizeResponse(payload);
  const modules = Array.isArray(data?.modules)
    ? data.modules
    : Array.isArray(data)
      ? data
      : [];
  return modules
    .map((module) => ({
      ...module,
      id: module?.id || module?.moduleId,
      title: getModuleTitle(module),
    }))
    .filter((module) => module.id);
}

function normalizeStatus(status) {
  return String(status || "draft").toLowerCase();
}

function getQuestionId(question) {
  return question?.questionId || question?.id;
}

function isApprovedSourceQuestion(question) {
  return normalizeStatus(question?.status) === "approved";
}

function correctAnswersLabel(question) {
  const answers = Array.isArray(question?.correctAnswers)
    ? question.correctAnswers
    : (question?.answers || [])
        .filter((answer) => answer.correct || answer.isCorrect)
        .map((answer) => answer.answerText);
  return answers.filter(Boolean).join(", ") || "--";
}

function answersLabel(question) {
  const answers = Array.isArray(question?.answers) ? question.answers : [];
  if (!answers.length) return correctAnswersLabel(question);
  return (
    answers
      .map((answer, index) => {
        const label = answer.answerText || answer.text || `Answer ${index + 1}`;
        const correct = answer.correct || answer.isCorrect;
        return correct ? `${label} (correct)` : label;
      })
      .filter(Boolean)
      .join("; ") || "--"
  );
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

function getPendingBatchCards(batch) {
  return getBatchCards(batch).filter(isDraftCard);
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

function shouldIgnoreStagingContentClick(event) {
  return Boolean(
    event.target.closest(
      "button,a,input,textarea,select,label,[contenteditable='true']",
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

function normalizeTextForDuplicate(value) {
  const raw = String(value || "");
  let decoded = raw;
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = raw;
    decoded = textarea.value;

    const container = document.createElement("div");
    container.innerHTML = decoded;
    decoded = container.textContent || container.innerText || decoded;
  }

  return decoded
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeFlashcardSignature(frontText, backText) {
  return `${normalizeTextForDuplicate(frontText)}\n${normalizeTextForDuplicate(backText)}`;
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

function getShortfallNotice(requestedCount, createdCount) {
  const requested = Number(requestedCount);
  const created = Number(createdCount);
  if (!Number.isFinite(requested) || !Number.isFinite(created)) return null;
  if (requested <= created) return null;
  return `Created ${created} of ${requested} requested cards because the document did not contain enough supported content.`;
}

function formatGeneratedMessage(response, sourceLabel = "") {
  const generatedCount = getGeneratedCount(response);
  const suffix = sourceLabel ? ` ${sourceLabel}` : "";
  const cardLabel = generatedCount === 1 ? "card" : "cards";
  return `Prepared ${generatedCount} review ${cardLabel}${suffix}.`;
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

function InlineNotice({ children }) {
  if (!children) return null;
  return <div className="flashcard-staging__notice">{children}</div>;
}

function ModalNotice({ notice }) {
  if (!notice?.message) return null;
  const isError = notice.type === "error";
  return (
    <div className="flashcard-import-modal__notice">
      <div
        className={
          isError ? "flashcard-staging__alert" : "flashcard-staging__notice"
        }
        role={isError ? "alert" : "status"}
        aria-live={isError ? "assertive" : "polite"}
      >
        {notice.message}
      </div>
    </div>
  );
}

function sourceFilters(defaultModuleId) {
  return {
    ...DEFAULT_SOURCE_FILTERS,
    moduleId: defaultModuleId || "",
  };
}

function CourseQuestionsImportPanel({
  setId,
  courseId,
  defaultModuleId,
  notify,
  onTemporaryCandidates,
}) {
  const [filters, setFilters] = useState(() => sourceFilters(defaultModuleId));
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [modules, setModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesError, setModulesError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadModules() {
      if (!courseId) {
        setModules([]);
        setModulesError(null);
        return;
      }
      setModulesLoading(true);
      setModulesError(null);
      try {
        const response = await courseService.getCourseContent(courseId);
        if (!cancelled) {
          setModules(normalizeModules(response));
        }
      } catch (moduleError) {
        if (!cancelled) {
          setModules([]);
          setModulesError(
            getErrorMessage(moduleError, "Failed to load course modules."),
          );
        }
      } finally {
        if (!cancelled) {
          setModulesLoading(false);
        }
      }
    }

    loadModules();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const moduleTitleById = useMemo(() => {
    const titles = new Map();
    modules.forEach((module) => {
      if (module.id) {
        titles.set(String(module.id), module.title);
      }
    });
    return titles;
  }, [modules]);

  const loadQuestions = useCallback(async () => {
    if (!setId) return;
    setLoading(true);
    setError(null);
    try {
      const params = {
        keyword: appliedFilters.keyword.trim() || undefined,
        moduleId: appliedFilters.moduleId || undefined,
      };
      const items = await flashcardService.listSourceQuestions(setId, params);
      setQuestions(items);
      setPage(0);
      setSelectedIds((current) =>
        current.filter((id) =>
          items.some(
            (question) =>
              getQuestionId(question) === id &&
              isApprovedSourceQuestion(question),
          ),
        ),
      );
    } catch (loadError) {
      const message = getErrorMessage(
        loadError,
        "Failed to load source questions.",
      );
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, setId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadQuestions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadQuestions]);

  const filteredQuestions = useMemo(
    () => questions.filter(isApprovedSourceQuestion),
    [questions],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredQuestions.length / SOURCE_QUESTION_PAGE_SIZE),
  );
  const safePage = Math.min(page, totalPages - 1);
  const pageQuestions = filteredQuestions.slice(
    safePage * SOURCE_QUESTION_PAGE_SIZE,
    safePage * SOURCE_QUESTION_PAGE_SIZE + SOURCE_QUESTION_PAGE_SIZE,
  );
  const selectablePageQuestions = pageQuestions.filter(
    (question) => isApprovedSourceQuestion(question),
  );
  const selectedImportableIds = selectedIds.filter((id) =>
    questions.some(
      (question) =>
        getQuestionId(question) === id &&
        isApprovedSourceQuestion(question),
    ),
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
    const reset = sourceFilters(defaultModuleId);
    setPage(0);
    setSelectedIds([]);
    setFilters(reset);
    setAppliedFilters(reset);
  }

  function toggleQuestion(question) {
    if (!question || !isApprovedSourceQuestion(question)) return;
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
    notify(null);
    setSubmitting(true);
    try {
      const response = normalizeResponse(
        await flashcardService.importCourseQuestionsToTemporaryReview(setId, idsToImport),
      );
      setSelectedIds([]);
      notify(
        `Prepared ${response?.cards?.length || idsToImport.length} question${
          idsToImport.length === 1 ? "" : "s"
        } for review.`,
        "success",
      );
      await loadQuestions();
      onTemporaryCandidates?.(response, {
        requestedCount: idsToImport.length,
        createdCount: response?.cards?.length || idsToImport.length,
      });
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
        <h3 className="flashcard-panel__title">Course Questions</h3>
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
        <p className="flashcard-staging__muted">
          Choose approved questions from this course and review them as flashcard candidates.
        </p>
        <div className="flashcard-staging__filters flashcard-course-question-filters">
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
          <div className="flashcard-field flashcard-course-question-filters__module">
            <label htmlFor="staging-question-module">Module</label>
            <select
              id="staging-question-module"
              value={filters.moduleId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  moduleId: event.target.value,
                }))
              }
              disabled={modulesLoading}
            >
              <option value="">All modules</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="flashcard-btn"
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
            title="Clear filters"
            aria-label="Clear filters"
          >
            <X size={16} />
          </button>
        </div>
        <InlineAlert>{modulesError}</InlineAlert>
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
                <th>Module</th>
                <th>Answers</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5">Loading source questions...</td>
                </tr>
              ) : filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    No approved questions found in this module. Try All modules or another search.
                  </td>
                </tr>
              ) : (
                pageQuestions.map((question) => {
                  const questionId = getQuestionId(question);
                  const isSelected = selectedIds.includes(questionId);
                  return (
                    <tr
                      key={questionId}
                      className={[
                        "flashcard-staging__selectable-row",
                        isSelected ? "is-selected" : "",
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
                          aria-label="Select source question"
                        />
                      </td>
                      <td className="flashcard-staging__wrap-cell">
                        {question.questionText || "--"}
                      </td>
                      <td className="flashcard-staging__wrap-cell">
                        {moduleTitleById.get(String(getModuleId(question))) || "--"}
                      </td>
                      <td className="flashcard-staging__wrap-cell">
                        {answersLabel(question)}
                      </td>
                      <td>{question.sourceName || "Course questions"}</td>
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
            {submitting ? "Preparing" : "Review selected"}
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

  function handleTextKeyDown(event) {
    if (event.key !== "Tab" || event.shiftKey) return;

    event.preventDefault();
    const textarea = event.currentTarget;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const nextText = `${textarea.value.slice(0, selectionStart)}\t${textarea.value.slice(selectionEnd)}`;
    const nextCursorPosition = selectionStart + 1;

    updateValue("text", nextText);
    window.requestAnimationFrame(() => {
      textarea.selectionStart = nextCursorPosition;
      textarea.selectionEnd = nextCursorPosition;
    });
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
    try {
      const response = normalizeResponse(
        await flashcardService.approveTemporaryCards(
          setId,
          importableCards.map(toTemporaryApprovalPayload),
        ),
      );
      const createdCards = Array.isArray(response?.createdCards)
        ? response.createdCards
        : [];
      const createdCount = Number(response?.created ?? createdCards.length);
      const duplicateSkipped = Number(response?.duplicateSkipped ?? 0);
      const invalidSkipped = Number(response?.invalidSkipped ?? 0);
      const skipped = duplicateSkipped + invalidSkipped;
      const createdIds = createdCards.map((card) => card.id).filter(Boolean);
      if (createdCount === 0) {
        notify(
          skipped
            ? `No pasted flashcards imported. ${duplicateSkipped} duplicate and ${invalidSkipped} invalid skipped.`
            : "No pasted flashcards were imported.",
          "error",
        );
        return;
      }

      resetImport();
      onClose?.();
      await onCardsImported?.(createdIds);
      notify(
        `Imported ${createdCount} flashcard${createdCount === 1 ? "" : "s"} to Current Flashcards.${
          skipped
            ? ` ${skipped} skipped (${duplicateSkipped} duplicate, ${invalidSkipped} invalid).`
            : ""
        }`,
        "success",
      );
    } catch (importError) {
      const message = getErrorMessage(importError, "Failed to import pasted flashcards.");
      notify(message, "error");
    } finally {
      setSubmitting(false);
    }
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
          onKeyDown={handleTextKeyDown}
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

function DocumentGenerationPanel({ setId, notify, onTemporaryCandidates }) {
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
    notify(null);
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
      notify(null);
      return;
    }
    const settingsError = validateGenerationSettings(settings);
    if (settingsError) {
      notify(settingsError, "error");
      return;
    }
    const generationPayload = getGenerationPayload(settings);
    setUploadError(null);
    notify(null);
    setSubmitting(true);
    try {
      const response = normalizeResponse(
        await flashcardService.generateTemporaryFromFile(setId, {
          file,
          ...generationPayload,
        }),
      );
      const createdCount = getGeneratedCount(response);
      notify(
        formatGeneratedMessage(
          response,
          "from document",
        ),
        "success",
      );
      setFile(null);
      setFileError(null);
      setUploadError(null);
      setFileInputRevision((revision) => revision + 1);
      onTemporaryCandidates?.(response, {
        requestedCount: generationPayload.desiredCount,
        createdCount,
      });
    } catch (error) {
      const message = getErrorMessage(error, "Failed to generate from document.");
      setUploadError(null);
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

function newClientId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getTemporaryCardId(card, index) {
  return String(card?.id || card?.clientId || `candidate-${index}-${newClientId()}`);
}

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

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

function toTemporaryApprovalPayload(card, index) {
  return {
    ...(isUuid(card.id) ? { id: card.id } : {}),
    sourceQuestionId: card.sourceQuestionId || undefined,
    ...toCardPayload({ ...card, orderIndex: index }),
    sourceExcerpt: String(card.sourceExcerpt || "").trim() || undefined,
  };
}

function selectedCandidateIds() {
  return [];
}

function cardIssueKey(issue) {
  return String(issue || "").trim().toLowerCase();
}

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

function candidateDraftsMatch(left, right) {
  return (
    JSON.stringify(comparableCandidateDraft(left)) ===
    JSON.stringify(comparableCandidateDraft(right))
  );
}

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

function EditStagingCardModal(props) {
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

function StagingBatchCardGroup({
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

function StagingReviewPanel({
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

export function ImportedBatchReviewPanel({
  setId,
  initialBatch,
  existingCards = [],
  notify,
  reviewNotice,
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
  const [rejectConfirmError, setRejectConfirmError] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState(null);

  const batchId = initialBatch?.id;
  const cards = useMemo(() => getPendingBatchCards(batch), [batch]);
  const duplicateInfoByCardId = useMemo(
    () => buildDuplicateInfoByCardId(batch ? [batch] : [], existingCards),
    [batch, existingCards],
  );
  const draftIds = useMemo(
    () =>
      new Set(
        cards.map((card) => card.id),
      ),
    [cards],
  );
  const eligibleDraftIds = useMemo(
    () =>
      new Set(
        cards
          .filter((card) => getDuplicateReasons(duplicateInfoByCardId, card.id).length === 0)
          .map((card) => card.id),
      ),
    [cards, duplicateInfoByCardId],
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

  const loadImportedBatch = useCallback(async ({
    showRefreshedToast = false,
    clearSelection = false,
  } = {}) => {
    if (!setId || !batchId) return;
    if (showRefreshedToast) {
      notify(null);
    }
    if (clearSelection) {
      setSelectedIds([]);
    }
    setLoading(true);
    setError(null);
    try {
      const items = await flashcardService.listStaging(setId);
      const freshBatch = items.find((item) => item.id === batchId);
      if (!freshBatch) {
        const message = "Imported staging batch is no longer available.";
        setBatch(null);
        setSelectedIds([]);
        if (showRefreshedToast) {
          notify(message, "error");
        } else {
          setError(message);
        }
        return;
      }
      setBatch(freshBatch);
      const freshDraftIds = new Set(
        getPendingBatchCards(freshBatch)
          .map((card) => card.id),
      );
      setSelectedIds((current) =>
        clearSelection ? [] : current.filter((id) => freshDraftIds.has(id)),
      );
      if (showRefreshedToast) {
        notify("Imported batch refreshed.", "success");
      }
    } catch (loadError) {
      const message = getErrorMessage(loadError, "Failed to refresh imported batch.");
      if (showRefreshedToast) {
        notify(message, "error");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [batchId, notify, setId]);

  function toggleCard(cardId) {
    if (bulkActionInProgress) return;
    if (!draftIds.has(cardId)) return;
    setSelectedIds((current) =>
      current.includes(cardId)
        ? current.filter((id) => id !== cardId)
        : [...current, cardId],
    );
  }

  function toggleBatch(currentBatch, visibleCards = getPendingBatchCards(currentBatch)) {
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

  function startEdit(card) {
    if (bulkActionInProgress) return;
    notify(null);
    setEditingCard(card);
    onEditStateChange?.(true);
  }

  function cancelEdit(options = {}) {
    if (options?.clearNotice !== false) {
      notify(null);
    }
    setEditingCard(null);
    onEditStateChange?.(false);
  }

  async function handleApprove() {
    if (bulkActionInProgress) return;
    notify(null);
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
      onStagingChanged?.();
      await onApproved?.(response?.flashcardIds || []);
    } catch (approveError) {
      notify(
        getErrorMessage(approveError, "Failed to approve staging cards."),
        "error",
      );
      await loadImportedBatch();
    } finally {
      setApproving(false);
    }
  }

  function handleRejectSelected() {
    if (bulkActionInProgress) return;
    if (!selectedDraftIds.length) return;
    const count = selectedDraftIds.length;
    notify(null);
    setRejectConfirmError(null);
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
      setRejectConfirmError(null);
      await loadImportedBatch();
      return;
    }
    setRejectingSelected(true);
    setRejectConfirmError(null);
    notify(null);

    try {
      const response = normalizeResponse(
        await flashcardService.rejectStagingCards(setId, ids),
      );
      const count = response?.rejectedCount ?? ids.length;
      setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
      setRejectConfirm(null);
      notify(`Rejected ${count} staging card${count === 1 ? "" : "s"}.`, "success");
      await loadImportedBatch();
      onStagingChanged?.();
    } catch (rejectError) {
      setRejectConfirmError(
        getErrorMessage(
          rejectError,
          "Failed to reject selected staging cards.",
        ),
      );
      await loadImportedBatch();
    } finally {
      setRejectingSelected(false);
    }
  }

  async function handleSaveEdit(draft) {
    notify(null);
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
      cancelEdit({ clearNotice: false });
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

  return (
    <>
      <section
        className="flashcard-imported-review"
        aria-label="Imported flashcard review"
      >
        <div className="flashcard-section-heading flashcard-imported-review__header">
          <div>
            <p className="flashcard-imported-review__summary">
              {formatSourceTypeLabel(batch?.sourceType, "Imported Batch")}
              {batch?.sourceName ? ` - ${batch.sourceName}` : ""} - {cards.length} card
              {cards.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flashcard-staging__header-actions flashcard-imported-review__actions">
            <button
              type="button"
              className="flashcard-btn"
              onClick={() =>
                loadImportedBatch({
                  showRefreshedToast: true,
                  clearSelection: true,
                })
              }
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
          <InlineNotice>{reviewNotice}</InlineNotice>
          <InlineAlert>{error}</InlineAlert>
          {loading ? (
            <div className="flashcard-practice__loading">
              <span className="flashcard-spinner" />
              Loading imported batch...
            </div>
          ) : !batch || cards.length === 0 ? (
            <div className="flashcard-empty">
              <FileText size={28} />
              <p>Nothing to review.</p>
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
                actionLocked={bulkActionInProgress}
                hideSourceSummary
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
            <InlineAlert>{rejectConfirmError}</InlineAlert>
            <div className="flashcard-modal__actions">
              <button
                type="button"
                className="flashcard-btn"
                onClick={() => {
                  setRejectConfirm(null);
                  setRejectConfirmError(null);
                }}
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
          title="Card details"
          titleId="flashcard-imported-staging-edit-title"
          onCancel={cancelEdit}
          onSave={handleSaveEdit}
          onUploadImage={onUploadImage}
        />
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
  onImport,
  onModalOpen,
  importDisabled = false,
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
      onImport={onImport}
      onModalOpen={onModalOpen}
      importDisabled={importDisabled}
    />
  );
}
