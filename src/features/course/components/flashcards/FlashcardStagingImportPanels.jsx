import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, RefreshCw, Search, Upload, X } from "lucide-react";
import Pagination from "@/shared/components/Pagination";
import { StatusBadge } from "@/shared/components/status";
import {
  Alert,
  Button,
  Checkbox,
  FilterBar,
  IconButton,
  Input,
  SearchInput,
  Select,
  Table,
  Textarea,
} from "@/shared/components/ui";
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
  toPlainText,
  toTemporaryApprovalPayload,
  validateGenerationSettings,
} from "./flashcardStagingUtils";

/** Hiển thị các tùy chọn số lượng và ngôn ngữ dùng chung cho generation. */
export function GenerationSettings({ values, onChange, prefix }) {
  return (
    <>
      <div className="flashcard-staging__settings">
        <Input
          id={`${prefix}-count`}
          label="Target cards"
          type="number"
          min="1"
          inputMode="numeric"
          value={values.desiredCount}
          onChange={(event) =>
            onChange({ ...values, desiredCount: event.target.value })
          }
        />
        <Select
          id={`${prefix}-language`}
          label="Language"
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
        </Select>
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
  return <Alert tone="danger">{children}</Alert>;
}

/** Hiển thị thông báo nghiệp vụ nội tuyến khi có nội dung. */
export function InlineNotice({ children }) {
  if (!children) return null;
  return <Alert tone="info">{children}</Alert>;
}

/** Chuyển notice của modal thành alert hoặc notice đúng loại. */
export function ModalNotice({ notice }) {
  if (!notice?.message) return null;
  const isError = notice.type === "error";
  return (
    <div className="flashcard-import-modal__notice">
      <Alert tone={isError ? "danger" : notice.type === "success" ? "success" : "info"}>
        {notice.message}
      </Alert>
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
        <Button
          type="button"
          variant="secondary"
          leftIcon={<RefreshCw size={16} />}
          onClick={loadQuestions}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>
      <div className="flashcard-panel__body flashcard-staging__section">
        <p className="flashcard-staging__muted">
          Choose approved questions from this course and review them as flashcard candidates.
        </p>
        <FilterBar
          className="flashcard-course-question-filters"
          ariaLabel="Course question filters"
          search={
            <SearchInput
              id="staging-question-keyword"
              label="Search"
              value={filters.keyword}
              onChange={(value) =>
                setFilters((current) => ({
                  ...current,
                  keyword: value,
                }))
              }
              placeholder="Question text"
            />
          }
          actions={
            <>
              <Button
                type="button"
                variant="secondary"
                leftIcon={<Search size={16} />}
                onClick={applyFilters}
                disabled={loading}
              >
                Apply
              </Button>
              <IconButton
                icon={<X size={16} />}
                label="Clear filters"
                onClick={resetFilters}
                disabled={loading}
              />
            </>
          }
        >
          <Select
              id="staging-question-module"
              className="flashcard-course-question-filters__module"
              label="Module"
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
          </Select>
        </FilterBar>
        <InlineAlert>{modulesError}</InlineAlert>
        <InlineAlert>{error}</InlineAlert>

        <Table
          ariaLabel="Approved course questions"
          className="flashcard-staging__table-wrap"
        >
            <thead>
              <tr>
                <th>
                  <Checkbox
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
                      <td data-label="Select">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleQuestion(question)}
                          aria-label="Select source question"
                        />
                      </td>
                      <td data-label="Question" className="flashcard-staging__wrap-cell">
                        {toPlainText(question.questionText) || "--"}
                      </td>
                      <td data-label="Module" className="flashcard-staging__wrap-cell">
                        {moduleTitleById.get(String(getModuleId(question))) || "--"}
                      </td>
                      <td data-label="Answers" className="flashcard-staging__wrap-cell">
                        {answersLabel(question)}
                      </td>
                      <td data-label="Source">{question.sourceName || "Course questions"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
        </Table>

        <Pagination
          page={safePage + 1}
          totalPages={totalPages}
          totalItems={filteredQuestions.length}
          size={SOURCE_QUESTION_PAGE_SIZE}
          onPageChange={(nextPage) => setPage(nextPage - 1)}
          ariaLabel="Course question pagination"
        />

        <div className="flashcard-staging__actions">
          <span>{selectedImportableIds.length} selected</span>
          <Button
            type="button"
            variant="primary"
            leftIcon={<Upload size={16} />}
            loading={submitting}
            loadingLabel="Preparing..."
            onClick={handleImport}
            disabled={submitting || loading || selectedImportableIds.length === 0}
          >
            Review selected
          </Button>
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
      <Textarea
          id="pasted-import-text"
          label="Pasted text"
          value={values.text}
          onChange={(event) => updateValue("text", event.target.value)}
          onKeyDown={handleTextKeyDown}
          placeholder={"Term\tDefinition\nAnother term\tAnother definition"}
          rows={12}
      />

      <div className="flashcard-pasted-import__settings">
        <Select
            id="pasted-front-back-separator"
            label="Between front and back"
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
        </Select>
        {values.frontBackSeparator === "custom" && (
          <Input
              id="pasted-custom-front-back-separator"
              label="Custom side separator"
              type="text"
              value={values.customFrontBackSeparator}
              onChange={(event) =>
                updateValue("customFrontBackSeparator", event.target.value)
              }
          />
        )}
        <Select
            id="pasted-card-separator"
            label="Between cards"
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
        </Select>
        {values.cardSeparator === "custom" && (
          <Input
              id="pasted-custom-card-separator"
              label="Custom card separator"
              type="text"
              value={values.customCardSeparator}
              onChange={(event) =>
                updateValue("customCardSeparator", event.target.value)
              }
          />
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
                  <StatusBadge
                    status={card.importable ? "ready" : "duplicate"}
                    label={card.importable ? "Ready" : "Duplicate"}
                    tone={card.importable ? "success" : "warning"}
                  />
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
        <Button
          type="submit"
          variant="primary"
          leftIcon={<Upload size={16} />}
          loading={submitting}
          loadingLabel="Importing..."
          disabled={
            submitting ||
            Boolean(parsed.configError) ||
            importableCards.length === 0
          }
        >
          Import ready cards
        </Button>
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
          <Button
            type="submit"
            variant="primary"
            leftIcon={<Upload size={16} />}
            loading={submitting}
            loadingLabel="Creating..."
            disabled={submitting || Boolean(fileError)}
          >
            Create from document
          </Button>
        </div>
      </form>
    </section>
  );
}
