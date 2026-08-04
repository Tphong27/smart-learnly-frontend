import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, RefreshCw, Search, Upload, X } from "lucide-react";
import { courseContentService } from "../../services/courseContentService";
import { flashcardAuthoringService as flashcardService } from "@/features/flashcard";
import { getErrorMessage } from "./flashcard-utils";
import {
  answersLabel,
  CARD_SEPARATOR_OPTIONS,
  DEFAULT_GENERATION,
  DEFAULT_PASTED_IMPORT,
  DEFAULT_SOURCE_FILTERS,
  DOCUMENT_MAX_FILE_SIZE_BYTES,
  DOCUMENT_MAX_FILE_SIZE_MESSAGE,
  formatGeneratedMessage,
  FRONT_BACK_SEPARATOR_OPTIONS,
  getGenerationPayload,
  getGeneratedCount,
  getModuleId,
  getQuestionId,
  isApprovedSourceQuestion,
  LANGUAGES,
  normalizeFlashcardSignature,
  normalizeModules,
  normalizeResponse,
  parsePastedFlashcards,
  shouldIgnoreSelectionClick,
  SOURCE_QUESTION_PAGE_SIZE,
  toTemporaryApprovalPayload,
  validateGenerationSettings,
} from "./flashcardStagingUtils";

/** Hiển thị các tùy chọn số lượng và ngôn ngữ dùng chung cho generation. */
export function GenerationSettings({ values, onChange, prefix }) {
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

/** Hiển thị thông báo lỗi nội tuyến khi có nội dung. */
export function InlineAlert({ children }) {
  if (!children) return null;
  return <div className="flashcard-staging__alert">{children}</div>;
}

/** Hiển thị thông báo nghiệp vụ nội tuyến khi có nội dung. */
export function InlineNotice({ children }) {
  if (!children) return null;
  return <div className="flashcard-staging__notice">{children}</div>;
}

/** Chuyển notice của modal thành alert hoặc notice đúng loại. */
export function ModalNotice({ notice }) {
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

/** Tạo giá trị bộ lọc nguồn câu hỏi ban đầu. */
function sourceFilters(defaultModuleId) {
  return {
    ...DEFAULT_SOURCE_FILTERS,
    moduleId: defaultModuleId || "",
  };
}

/** Tìm, chọn và tạo temporary candidates từ câu hỏi đã duyệt của khóa học. */
export function CourseQuestionsImportPanel({
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
        const response = await courseContentService.getCourseContent(courseId);
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

/** Parse văn bản dán vào, preview card và chuyển ứng viên sang bước review. */
export function PastedTextImportPanel({
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

/** Upload DOCX/PDF để backend sinh temporary candidates cho human review. */
export function DocumentGenerationPanel({ setId, notify, onTemporaryCandidates }) {
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
