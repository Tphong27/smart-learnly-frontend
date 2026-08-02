import { useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, Search, X } from "lucide-react";
import Pagination from "@/shared/components/Pagination";
import { Button } from "@/shared/components/ui";
import { courseService } from "@/services/course.service";
import { questionBankService } from "@/services/question-bank.service";
import {
  sanitizeAnswerHtml,
  sanitizeQuestionHtml,
} from "@/shared/utils/htmlSanitizer";
import { prepareCourseQuestionImport } from "@/features/course/utils/course-question-quiz-import";
import "@/features/admin/admin-shared.css";
import "../quiz-question-manager.css";

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_FILTERS = {
  search: "",
  type: "all",
  status: "all",
  difficulty: "all",
  moduleId: "all",
};

function normalizeModules(payload) {
  const root = payload?.data ?? payload;
  const items = Array.isArray(root)
    ? root
    : root?.items ?? root?.content ?? root?.sections ?? [];

  return items
    .map((item, index) => ({
      id: item.sectionId || item.id,
      title: item.title || item.name || `Module ${index + 1}`,
    }))
    .filter((item) => item.id);
}

function getQuestionId(question) {
  return question?.questionId || question?.id || "";
}

function questionLabel(question) {
  return String(
    question?.questionText || question?.title || question?.content || "",
  ).trim();
}

function questionTypeLabel(question) {
  const type = String(question?.questionType || question?.type || "").toLowerCase();
  if (type === "multiple_choice") return "Multiple choice";
  if (type === "true_false") return "True / False";
  if (type === "fill_in_the_blank") return "Fill in the blank";
  if (type === "single_choice") return "Single choice";
  return type || "Unknown";
}

function buildFilterParams(filters) {
  return {
    search: filters.search.trim() || undefined,
    type: filters.type === "all" ? undefined : filters.type,
    status: filters.status === "all" ? undefined : filters.status,
    difficulty: filters.difficulty === "all" ? undefined : filters.difficulty,
    moduleId: filters.moduleId === "all" ? undefined : filters.moduleId,
  };
}

function buildDuplicateQuestionIds(prepared, selectedQuestions) {
  const ids = new Set();
  prepared.duplicates.forEach((duplicate) => {
    const matchedQuestion = selectedQuestions[duplicate.index];
    const id = getQuestionId(matchedQuestion);
    if (id) ids.add(id);
  });
  return ids;
}

export function CourseQuestionImportPanel({
  courseId,
  existingQuestions = [],
  onImport,
  onClose,
  onBusyChange,
}) {
  const source = useMemo(
    () =>
      courseId
        ? { id: courseId, courseId, name: "Question list", status: "active" }
        : null,
    [courseId],
  );

  const [modules, setModules] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [items, setItems] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    page: 0,
    totalPages: 1,
    totalItems: 0,
  });
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const selectedIds = useMemo(
    () => new Set(selectedQuestions.map((question) => getQuestionId(question))),
    [selectedQuestions],
  );

  const preparedSelection = useMemo(
    () => prepareCourseQuestionImport(existingQuestions, selectedQuestions),
    [existingQuestions, selectedQuestions],
  );

  const duplicateQuestionIds = useMemo(
    () => buildDuplicateQuestionIds(preparedSelection, selectedQuestions),
    [preparedSelection, selectedQuestions],
  );

  const bankBusy = loadingQuestions || importing;
  const canImportSelected =
    selectedQuestions.length > 0 &&
    preparedSelection.valid &&
    preparedSelection.duplicates.length === 0 &&
    !bankBusy;

  useEffect(() => {
    onBusyChange?.(bankBusy);
  }, [bankBusy, onBusyChange]);

  useEffect(
    () => () => {
      onBusyChange?.(false);
    },
    [onBusyChange],
  );

  useEffect(() => {
    if (!courseId) return;

    let cancelled = false;
    (async () => {
      try {
        const moduleData = await courseService.getCourseContent(courseId);
        if (!cancelled) setModules(normalizeModules(moduleData));
      } catch {
        if (!cancelled) setModules([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return undefined;

    let cancelled = false;
    (async () => {
      setLoadingQuestions(true);
      setQuestionsError("");
      try {
        const response = await questionBankService.listCourseQuestions(courseId, {
          page: pageInfo.page,
          size: DEFAULT_PAGE_SIZE,
          ...buildFilterParams(filters),
        });
        if (cancelled) return;
        setItems(Array.isArray(response.items) ? response.items : []);
        setPageInfo({
          page: Number(response.page || 0),
          totalPages: Number(response.totalPages || 1),
          totalItems: Number(response.totalItems || 0),
        });
      } catch (error) {
        if (!cancelled) {
          setQuestionsError(error?.message || "Could not load questions.");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoadingQuestions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courseId, filters, pageInfo.page, refreshKey]);

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPageInfo((current) => ({ ...current, page: 0, totalPages: current.totalPages }));
    setImportError("");
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPageInfo((current) => ({ ...current, page: 0, totalPages: current.totalPages }));
    setImportError("");
  };

  const toggleQuestion = (question) => {
    if (bankBusy) return;
    const id = getQuestionId(question);
    if (!id) return;
    setImportError("");
    setSelectedQuestions((current) => {
      if (current.some((item) => getQuestionId(item) === id)) {
        return current.filter((item) => getQuestionId(item) !== id);
      }
      return [...current, question];
    });
  };

  const toggleVisibleSelection = () => {
    if (bankBusy) return;
    const visibleIds = items.map(getQuestionId).filter(Boolean);
    if (visibleIds.length === 0) return;

    const allSelected = visibleIds.every((id) => selectedIds.has(id));
    setSelectedQuestions((current) => {
      if (allSelected) {
        return current.filter((question) => !visibleIds.includes(getQuestionId(question)));
      }

      const currentIds = new Set(current.map((question) => getQuestionId(question)));
      const next = [...current];
      items.forEach((question) => {
        const id = getQuestionId(question);
        if (id && !currentIds.has(id)) next.push(question);
      });
      return next;
    });
  };

  const removeSelectedQuestion = (id) => {
    if (bankBusy) return;
    setSelectedQuestions((current) =>
      current.filter((question) => getQuestionId(question) !== id),
    );
  };

  const clearSelection = () => {
    if (bankBusy) return;
    setSelectedQuestions([]);
    setImportError("");
  };

  const importQuestions = async (rawQuestions) => {
    if (importing) return false;
    if (!courseId) {
      setImportError("Question list context is missing.");
      return false;
    }
    if (!rawQuestions.length) {
      setImportError("Select at least one question.");
      return false;
    }

    const prepared = prepareCourseQuestionImport(existingQuestions, rawQuestions);
    if (prepared.duplicates.length > 0) {
      const message = prepared.duplicates
        .map((duplicate) => {
          const label = questionLabel(rawQuestions[duplicate.index]) || `Question ${duplicate.index + 1}`;
          return `${label}: ${duplicate.reasons.join(", ")}`;
        })
        .join(" ");
      setImportError(message || "Some selected questions already exist in this quiz.");
      return false;
    }
    if (!prepared.valid) {
      setImportError(
        prepared.errors.map((error) => error.message).join(" ") ||
          "Selected questions are invalid.",
      );
      return false;
    }

    setImporting(true);
    setImportError("");
    try {
      const saved = await onImport(prepared.mappedQuestions);
      if (!saved) {
        setImportError("Questions could not be imported. Please try again.");
        return false;
      }
      setSelectedQuestions([]);
      onClose?.();
      return true;
    } catch (error) {
      console.error("Question list import error:", error);
      setImportError("Questions could not be imported. Please try again.");
      return false;
    } finally {
      setImporting(false);
    }
  };

  const visibleSelectedCount = items.filter((question) =>
    selectedIds.has(getQuestionId(question)),
  ).length;

  return (
    <div className="quiz-question-bank-import">
      <div className="quiz-question-bank-import__summary-bar">
        <div className="quiz-question-bank-import__summary-main">
          <span className="admin-status admin-status--approved">
            {source?.status || "active"}
          </span>
          <div>
            <h3 className="quiz-question-bank-import__heading">
              {source?.name || "Question list"}
            </h3>
            <p className="quiz-question-bank-import__subtitle">
              Import question list items scoped to the current course into this quiz.
            </p>
          </div>
        </div>
        <div className="quiz-question-bank-import__summary-actions">
          <Button
            type="button"
            variant="secondary"
            leftIcon={<RefreshCw size={15} />}
            onClick={() => setRefreshKey((current) => current + 1)}
            disabled={bankBusy}
          >
            Refresh
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={bankBusy}>
            Done
          </Button>
        </div>
      </div>

      <div className="quiz-question-bank-import__toolbar">
        <label className="quiz-question-import__field quiz-question-bank-import__field--bank">
          <span className="quiz-question-import__field-label">Search</span>
          <div className="quiz-question-import__input-group">
            <Search size={15} />
            <input
              className="quiz-question-import__input"
              type="search"
              value={filters.search}
              placeholder="Search question text"
              onChange={(event) => updateFilter("search", event.target.value)}
              disabled={!courseId || bankBusy}
            />
          </div>
        </label>

        <label className="quiz-question-import__field quiz-question-bank-import__field--type">
          <span className="quiz-question-import__field-label">Type</span>
          <select
            className="quiz-question-import__select"
            value={filters.type}
            onChange={(event) => updateFilter("type", event.target.value)}
            disabled={!courseId || bankBusy}
          >
            <option value="all">All types</option>
            <option value="single_choice">Single choice</option>
            <option value="multiple_choice">Multiple choice</option>
            <option value="fill_in_the_blank">Fill in the blank</option>
            <option value="true_false">True / False</option>
          </select>
        </label>

        <label className="quiz-question-import__field quiz-question-bank-import__field--type">
          <span className="quiz-question-import__field-label">Module</span>
          <select
            className="quiz-question-import__select"
            value={filters.moduleId}
            onChange={(event) => updateFilter("moduleId", event.target.value)}
            disabled={!courseId || bankBusy || modules.length === 0}
          >
            <option value="all">All modules</option>
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.title}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="quiz-question-bank-import__more-toggle"
          onClick={() => setShowMoreFilters((current) => !current)}
          disabled={!courseId || bankBusy}
        >
          {showMoreFilters ? "Hide more filters" : "More filters"}
        </button>

        <Button type="button" variant="ghost" onClick={resetFilters} disabled={!courseId || bankBusy}>
          Reset filters
        </Button>
      </div>

      {showMoreFilters && (
        <div className="quiz-question-bank-import__filters-advanced">
          <label className="quiz-question-import__field quiz-question-bank-import__field--type">
            <span className="quiz-question-import__field-label">Status</span>
            <select
              className="quiz-question-import__select"
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
              disabled={!courseId || bankBusy}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>

          <label className="quiz-question-import__field quiz-question-bank-import__field--type">
            <span className="quiz-question-import__field-label">Difficulty</span>
            <select
              className="quiz-question-import__select"
              value={filters.difficulty}
              onChange={(event) => updateFilter("difficulty", event.target.value)}
              disabled={!courseId || bankBusy}
            >
              <option value="all">All difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>
      )}

      <div className="quiz-question-bank-import__actions-bar">
        <div className="quiz-question-bank-import__pool-meta">
          <span>{pageInfo.totalItems} total</span>
          <span>{selectedQuestions.length} selected</span>
          {duplicateQuestionIds.size > 0 && <span>{duplicateQuestionIds.size} duplicate</span>}
        </div>
        <div className="quiz-question-bank-import__selection-actions">
          <Button
            type="button"
            variant="ghost"
            onClick={toggleVisibleSelection}
            disabled={!courseId || items.length === 0 || bankBusy}
          >
            {visibleSelectedCount === items.length && items.length > 0
              ? "Unselect visible"
              : "Select visible"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={clearSelection}
            disabled={selectedQuestions.length === 0 || bankBusy}
          >
            Clear selection
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => importQuestions(selectedQuestions)}
            loading={importing}
            disabled={!canImportSelected}
          >
            Import selected ({selectedQuestions.length})
          </Button>
        </div>
      </div>

      <div className="quiz-question-bank-import__split">
        <section className="quiz-question-bank-import__column">
          <div className="quiz-question-bank-import__column-header">
            <div>
              <h4 className="quiz-question-bank-import__heading">Question list items</h4>
              <p className="quiz-question-bank-import__subtitle">
                Browse filtered items for the current course and add them to the selection.
              </p>
            </div>
            <div className="quiz-question-bank-import__pool-meta">
              <span>{pageInfo.totalPages} page(s)</span>
            </div>
          </div>

          {questionsError && (
            <p className="quiz-question-import__warning" role="alert" aria-live="assertive">
              {questionsError}
            </p>
          )}

          {!courseId ? (
            <div className="admin-empty">Question list context is unavailable.</div>
          ) : loadingQuestions ? (
            <div className="admin-loading">Loading question list items...</div>
          ) : items.length === 0 ? (
            <div className="admin-empty">No questions match the current filters.</div>
          ) : (
            <div className="quiz-question-bank-import__list">
              {items.map((question) => {
                const id = getQuestionId(question);
                const selected = selectedIds.has(id);
                const duplicate = duplicateQuestionIds.has(id);
                const answers = Array.isArray(question.answers)
                  ? question.answers
                  : Array.isArray(question.options)
                    ? question.options
                    : [];

                return (
                  <article
                    key={id || questionLabel(question)}
                    className={`quiz-question-bank-import__item${selected ? " is-selected" : ""}${duplicate ? " is-duplicate" : ""}`}
                  >
                    <label className="quiz-question-bank-import__item-main">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleQuestion(question)}
                        disabled={bankBusy}
                      />
                      <div className="quiz-question-bank-import__item-body">
                        <div className="quiz-question-bank-import__item-title">
                          <span
                            dangerouslySetInnerHTML={{
                              __html: sanitizeQuestionHtml(
                                questionLabel(question) || "Untitled question",
                              ),
                            }}
                          />
                        </div>
                        <div className="quiz-question-bank-import__item-meta">
                          <span className="admin-status admin-status--approved">
                            {questionTypeLabel(question)}
                          </span>
                          {question.status && (
                            <span className={`admin-status admin-status--${question.status}`}>
                              {question.status}
                            </span>
                          )}
                          {question.difficulty && (
                            <span className="admin-status admin-status--draft">
                              {question.difficulty}
                            </span>
                          )}
                          <span>{answers.length} answer(s)</span>
                        </div>
                      </div>
                    </label>
                    <div className="quiz-question-bank-import__item-actions">
                      {duplicate && (
                        <span className="quiz-question-import__warning">Already in this quiz</span>
                      )}
                      <button
                        type="button"
                        className="quiz-question-edit-form__icon-btn"
                        onClick={() => toggleQuestion(question)}
                        disabled={bankBusy}
                        aria-label={selected ? `Remove question ${questionLabel(question)}` : `Add question ${questionLabel(question)}`}
                      >
                        {selected ? <X size={15} /> : <Check size={15} />}
                      </button>
                    </div>
                    {answers.length > 0 && (
                      <div className="quiz-question-bank-import__item-answers">
                        {answers.slice(0, 2).map((answer, index) => (
                          <div
                            className={`quiz-question-bank-import__answer${answer.correct || answer.isCorrect ? " is-correct" : ""}`}
                            key={answer.answerId || answer.id || index}
                          >
                            <span
                              dangerouslySetInnerHTML={{
                                __html: sanitizeAnswerHtml(
                                  answer.answerText || answer.content || answer.text || "",
                                ),
                              }}
                            />
                            {(answer.correct || answer.isCorrect) && <strong>Correct</strong>}
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          <Pagination
            page={pageInfo.page + 1}
            totalPages={pageInfo.totalPages}
            totalItems={pageInfo.totalItems}
            size={DEFAULT_PAGE_SIZE}
            disabled={bankBusy}
            ariaLabel="Question list pagination"
            onPageChange={(nextPage) => {
              setPageInfo((current) => ({ ...current, page: nextPage - 1 }));
            }}
          />
        </section>

        <aside className="quiz-question-bank-import__column quiz-question-bank-import__column--selected">
          <div className="quiz-question-bank-import__column-header">
            <div>
              <h4 className="quiz-question-bank-import__heading">Selected questions</h4>
              <p className="quiz-question-bank-import__subtitle">
                Review your selection before importing into this quiz.
              </p>
            </div>
            <div className="quiz-question-bank-import__pool-meta">
              <span>{selectedQuestions.length} selected</span>
            </div>
          </div>

          {preparedSelection.duplicates.length > 0 && (
            <p className="quiz-question-import__warning" role="alert" aria-live="assertive">
              {preparedSelection.duplicates.length} selected question(s) already exist in this quiz or are duplicated in the selection.
            </p>
          )}

          {preparedSelection.errors.length > 0 && (
            <ul className="quiz-question-import__errors" role="alert" aria-live="assertive">
              {preparedSelection.errors.map((error, index) => (
                <li key={`${error.message}-${index}`}>{error.message}</li>
              ))}
            </ul>
          )}

          {importError && (
            <p className="quiz-question-import__warning" role="alert" aria-live="assertive">
              {importError}
            </p>
          )}

          <div className="quiz-question-bank-import__selected-list">
            {selectedQuestions.length === 0 ? (
              <p className="admin-empty">No questions selected yet.</p>
            ) : (
              selectedQuestions.map((question) => {
                const id = getQuestionId(question);
                return (
                  <div
                    className="quiz-question-bank-import__selected-item"
                    key={id || questionLabel(question)}
                  >
                    <div>
                      <div
                        className="quiz-question-bank-import__selected-title"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeQuestionHtml(
                            questionLabel(question) || "Untitled question",
                          ),
                        }}
                      />
                      <div className="quiz-question-bank-import__item-meta">
                        <span>{questionTypeLabel(question)}</span>
                        {question.difficulty && <span>{question.difficulty}</span>}
                        {question.status && <span>{question.status}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="quiz-question-edit-form__icon-btn"
                      onClick={() => removeSelectedQuestion(id)}
                      disabled={bankBusy}
                      aria-label={`Remove selected question ${questionLabel(question) || id || "item"}`}
                    >
                      <X size={15} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="quiz-question-bank-import__selected-footer">
            <Button
              type="button"
              variant="primary"
              onClick={() => importQuestions(selectedQuestions)}
              loading={importing}
              disabled={!canImportSelected}
            >
              Import selected ({selectedQuestions.length})
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
