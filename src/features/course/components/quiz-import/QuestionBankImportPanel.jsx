import { useEffect, useMemo, useState } from "react";
import { Check, Search, Shuffle, X } from "lucide-react";
import Pagination from "@/shared/components/Pagination";
import { Button } from "@/shared/components/ui";
import { questionBankService } from "@/services/question-bank.service";
import {
  sanitizeAnswerHtml,
  sanitizeQuestionHtml,
} from "@/shared/utils/htmlSanitizer";
import {
  fetchAllFilteredBankQuestions,
  pickRandomQuestions,
  prepareQuizBankImport,
} from "@/features/course/utils/question-bank-quiz-import";
import "@/features/admin/admin-shared.css";
import "../quiz-question-manager.css";

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_FILTERS = {
  search: "",
  type: "all",
  // Match admin bank detail default: show all non-filtered statuses so draft banks still list questions.
  status: "all",
  difficulty: "all",
};

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

/**
 * Full-width bank import panel (not modal).
 * Banks are scoped to courseId. Filters stay compact: bank + search + type.
 */
export function QuestionBankImportPanel({
  courseId,
  existingQuestions = [],
  onImport,
  onBusyChange,
}) {
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [items, setItems] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    page: 0,
    totalPages: 1,
    totalItems: 0,
  });
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState("");

  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [randomCount, setRandomCount] = useState("");
  const [randomError, setRandomError] = useState("");
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [randomLoading, setRandomLoading] = useState(false);

  const selectedIds = useMemo(
    () => new Set(selectedQuestions.map((question) => getQuestionId(question))),
    [selectedQuestions],
  );

  const preparedSelection = useMemo(
    () => prepareQuizBankImport(existingQuestions, selectedQuestions),
    [existingQuestions, selectedQuestions],
  );

  const duplicateQuestionIds = useMemo(
    () => buildDuplicateQuestionIds(preparedSelection, selectedQuestions),
    [preparedSelection, selectedQuestions],
  );

  const bankBusy =
    banksLoading || loadingQuestions || importing || randomLoading;
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
    if (!courseId) return undefined;

    let cancelled = false;
    (async () => {
      setBanksLoading(true);
      setBanksError("");
      try {
        const data = await questionBankService.listBanks({ courseId });
        if (!cancelled) {
          setBanks(Array.isArray(data) ? data : []);
          setSelectedBankId("");
          setItems([]);
          setSelectedQuestions([]);
          setFilters(DEFAULT_FILTERS);
          setPageInfo({ page: 0, totalPages: 1, totalItems: 0 });
        }
      } catch (error) {
        if (!cancelled) {
          setBanksError(error?.message || "Could not load question banks.");
          setBanks([]);
        }
      } finally {
        if (!cancelled) setBanksLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  useEffect(() => {
    if (!courseId || !selectedBankId) return undefined;

    let cancelled = false;
    (async () => {
      setLoadingQuestions(true);
      setQuestionsError("");
      try {
        const response = await questionBankService.listQuestions({
          bankId: selectedBankId,
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
  }, [courseId, filters, pageInfo.page, selectedBankId]);

  const handleBankChange = (nextBankId) => {
    setSelectedBankId(nextBankId);
    setItems([]);
    setPageInfo({ page: 0, totalPages: 1, totalItems: 0 });
    setSelectedQuestions([]);
    setRandomCount("");
    setRandomError("");
    setImportError("");
    setQuestionsError("");
    setFilters(DEFAULT_FILTERS);
  };

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPageInfo((current) => ({
      ...current,
      page: 0,
      totalPages: current.totalPages,
    }));
    setRandomError("");
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
        return current.filter(
          (question) => !visibleIds.includes(getQuestionId(question)),
        );
      }
      const currentIds = new Set(
        current.map((question) => getQuestionId(question)),
      );
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

  const importQuestions = async (rawQuestions, sourceLabel) => {
    if (importing) return false;
    if (!selectedBankId) {
      setImportError("Choose a question bank first.");
      return false;
    }

    const prepared = prepareQuizBankImport(existingQuestions, rawQuestions);
    if (!rawQuestions.length) {
      setImportError("Select at least one question.");
      return false;
    }
    if (prepared.duplicates.length > 0) {
      const message = prepared.duplicates
        .map((duplicate) => {
          const label =
            questionLabel(rawQuestions[duplicate.index]) ||
            `Question ${duplicate.index + 1}`;
          return `${label}: ${duplicate.reasons.join(", ")}`;
        })
        .join(" ");
      setImportError(
        message || "Some selected questions already exist in this quiz.",
      );
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
      setImportError("");
      setRandomCount("");
      return true;
    } catch (error) {
      console.error(`Question bank import ${sourceLabel} error:`, error);
      setImportError("Questions could not be imported. Please try again.");
      return false;
    } finally {
      setImporting(false);
    }
  };

  const handleImportSelected = async () => {
    await importQuestions(selectedQuestions, "selected");
  };

  const handleRandomImport = async () => {
    if (!selectedBankId) {
      setRandomError("Choose a question bank first.");
      return;
    }
    const count = Number(randomCount || 0);
    if (!Number.isInteger(count) || count < 1) {
      setRandomError("Enter a whole number greater than 0.");
      return;
    }
    if (pageInfo.totalItems > 0 && count > pageInfo.totalItems) {
      setRandomError(
        `Only ${pageInfo.totalItems} questions are available in this filter.`,
      );
      return;
    }

    setRandomError("");
    setImportError("");
    setRandomLoading(true);
    try {
      const pool = await fetchAllFilteredBankQuestions({
        bankId: selectedBankId,
        filters: buildFilterParams(filters),
      });
      if (count > pool.length) {
        setRandomError(
          `Only ${pool.length} questions are available in this filter.`,
        );
        return;
      }
      const picked = pickRandomQuestions(pool, count);
      await importQuestions(picked, "random");
    } catch (error) {
      console.error("Question bank random import error:", error);
      setRandomError(error?.message || "Could not load random questions.");
    } finally {
      setRandomLoading(false);
    }
  };

  const questionPoolCount = pageInfo.totalItems || 0;
  const visibleSelectedCount = items.filter((question) =>
    selectedIds.has(getQuestionId(question)),
  ).length;

  if (!courseId) {
    return (
      <div className="quiz-question-bank-import">
        <div className="admin-empty">
          Course context is required to import from question banks of this course.
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-question-bank-import">
      <div className="quiz-question-bank-import__toolbar">
        <label className="quiz-question-import__field quiz-question-bank-import__field--bank">
          <span className="quiz-question-import__field-label">Bank</span>
          <select
            className="quiz-question-import__select"
            value={selectedBankId}
            onChange={(event) => handleBankChange(event.target.value)}
            disabled={bankBusy || banksLoading}
          >
            <option value="">
              {banksLoading ? "Loading banks..." : "Choose a bank"}
            </option>
            {banks.map((bank) => (
              <option key={bank.bankId || bank.id} value={bank.bankId || bank.id}>
                {bank.name}
                {bank.questionCount != null ? ` (${bank.questionCount})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="quiz-question-import__field">
          <span className="quiz-question-import__field-label">Search</span>
          <div className="quiz-question-import__input-group">
            <Search size={15} />
            <input
              className="quiz-question-import__input"
              type="search"
              value={filters.search}
              placeholder="Search question text"
              onChange={(event) => updateFilter("search", event.target.value)}
              disabled={!selectedBankId || bankBusy}
            />
          </div>
        </label>

        <label className="quiz-question-import__field quiz-question-bank-import__field--type">
          <span className="quiz-question-import__field-label">Type</span>
          <select
            className="quiz-question-import__select"
            value={filters.type}
            onChange={(event) => updateFilter("type", event.target.value)}
            disabled={!selectedBankId || bankBusy}
          >
            <option value="all">All types</option>
            <option value="single_choice">Single choice</option>
            <option value="multiple_choice">Multiple choice</option>
            <option value="fill_in_the_blank">Fill in the blank</option>
            <option value="true_false">True / False</option>
          </select>
        </label>

        <button
          type="button"
          className="quiz-question-bank-import__more-toggle"
          onClick={() => setShowMoreFilters((open) => !open)}
          disabled={!selectedBankId || bankBusy}
        >
          {showMoreFilters ? "Less" : "More"}
        </button>

        {showMoreFilters && (
          <>
            <label className="quiz-question-import__field quiz-question-bank-import__field--type">
              <span className="quiz-question-import__field-label">Status</span>
              <select
                className="quiz-question-import__select"
                value={filters.status}
                onChange={(event) => updateFilter("status", event.target.value)}
                disabled={!selectedBankId || bankBusy}
              >
                <option value="all">All statuses</option>
                <option value="approved">Approved</option>
                <option value="draft">Draft</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
            <label className="quiz-question-import__field quiz-question-bank-import__field--type">
              <span className="quiz-question-import__field-label">Difficulty</span>
              <select
                className="quiz-question-import__select"
                value={filters.difficulty}
                onChange={(event) =>
                  updateFilter("difficulty", event.target.value)
                }
                disabled={!selectedBankId || bankBusy}
              >
                <option value="all">All</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
          </>
        )}
      </div>

      {banksError && (
        <p className="quiz-question-import__warning" role="alert">
          {banksError}
        </p>
      )}

      {!banksLoading && !banksError && banks.length === 0 && (
        <div className="admin-empty">No question banks for this course.</div>
      )}

      {selectedBankId && (
        <div className="quiz-question-bank-import__actions-bar">
          <div className="quiz-question-bank-import__random-actions">
            <input
              className="quiz-question-import__input quiz-question-bank-import__random-input"
              type="number"
              min="1"
              max={questionPoolCount || undefined}
              placeholder="Count"
              value={randomCount}
              onChange={(event) => {
                setRandomCount(event.target.value);
                setRandomError("");
              }}
              disabled={bankBusy || questionPoolCount === 0}
            />
            <Button
              type="button"
              variant="secondary"
              leftIcon={<Shuffle size={15} />}
              onClick={handleRandomImport}
              loading={randomLoading}
              disabled={bankBusy || questionPoolCount === 0}
            >
              Random import
            </Button>
            <span className="quiz-question-bank-import__pool-meta">
              {questionPoolCount} in filter
            </span>
          </div>
          <div className="quiz-question-bank-import__selection-actions">
            <span className="quiz-question-bank-import__pool-meta">
              Selected: {selectedQuestions.length}
            </span>
            <Button
              type="button"
              variant="ghost"
              onClick={clearSelection}
              disabled={selectedQuestions.length === 0 || bankBusy}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={toggleVisibleSelection}
              disabled={!selectedBankId || items.length === 0 || bankBusy}
            >
              {visibleSelectedCount === items.length && items.length > 0
                ? "Unselect page"
                : "Select page"}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleImportSelected}
              loading={importing}
              disabled={!canImportSelected}
            >
              Import selected ({selectedQuestions.length})
            </Button>
          </div>
        </div>
      )}

      {randomError && (
        <p className="quiz-question-import__warning" role="alert">
          {randomError}
        </p>
      )}
      {importError && (
        <p className="quiz-question-import__warning" role="alert">
          {importError}
        </p>
      )}
      {preparedSelection.duplicates.length > 0 && (
        <p className="quiz-question-import__warning" role="alert">
          {preparedSelection.duplicates.length} selected question(s) already
          exist in this quiz or are duplicated in the selection.
        </p>
      )}
      {preparedSelection.errors.length > 0 && (
        <ul className="quiz-question-import__errors" role="alert">
          {preparedSelection.errors.map((error, index) => (
            <li key={`${error.message}-${index}`}>{error.message}</li>
          ))}
        </ul>
      )}

      {selectedBankId && (
        <div className="quiz-question-bank-import__split">
          <section className="quiz-question-bank-import__column">
            <div className="quiz-question-bank-import__column-header">
              <h4 className="quiz-question-bank-import__heading">
                Bank questions
              </h4>
              <span className="quiz-question-bank-import__pool-meta">
                {pageInfo.totalItems} total
              </span>
            </div>

            {loadingQuestions ? (
              <div className="admin-loading">Loading questions...</div>
            ) : questionsError ? (
              <p className="quiz-question-import__warning" role="alert">
                {questionsError}
              </p>
            ) : items.length === 0 ? (
              <div className="admin-empty">
                No questions match the current filters.
              </div>
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
                                  questionLabel(question) ||
                                    "Untitled question",
                                ),
                              }}
                            />
                          </div>
                          <div className="quiz-question-bank-import__item-meta">
                            <span className="admin-status admin-status--approved">
                              {questionTypeLabel(question)}
                            </span>
                            {question.difficulty && (
                              <span className="admin-status admin-status--draft">
                                {question.difficulty}
                              </span>
                            )}
                            <span>{answers.length} answer(s)</span>
                            {duplicate && (
                              <span className="quiz-question-import__warning">
                                Already in quiz
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                      {answers.length > 0 && (
                        <div className="quiz-question-bank-import__item-answers">
                          {answers.slice(0, 3).map((answer, index) => (
                            <div
                              className={`quiz-question-bank-import__answer${answer.correct || answer.isCorrect ? " is-correct" : ""}`}
                              key={answer.answerId || answer.id || index}
                            >
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: sanitizeAnswerHtml(
                                    answer.answerText ||
                                      answer.content ||
                                      answer.text ||
                                      "",
                                  ),
                                }}
                              />
                              {(answer.correct || answer.isCorrect) && (
                                <strong>Correct</strong>
                              )}
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
              ariaLabel="Question bank pagination"
              onPageChange={(nextPage) => {
                setPageInfo((current) => ({
                  ...current,
                  page: nextPage - 1,
                }));
              }}
            />
          </section>

          <aside className="quiz-question-bank-import__column quiz-question-bank-import__column--selected">
            <div className="quiz-question-bank-import__column-header">
              <h4 className="quiz-question-bank-import__heading">Selected</h4>
              <span className="quiz-question-bank-import__pool-meta">
                {selectedQuestions.length}
              </span>
            </div>
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
                      <div
                        className="quiz-question-bank-import__selected-title"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeQuestionHtml(
                            questionLabel(question) || "Untitled question",
                          ),
                        }}
                      />
                      <button
                        type="button"
                        className="quiz-question-edit-form__icon-btn"
                        onClick={() => removeSelectedQuestion(id)}
                        disabled={bankBusy}
                        aria-label={`Remove ${questionLabel(question) || id}`}
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
                onClick={handleImportSelected}
                loading={importing}
                disabled={!canImportSelected}
              >
                <Check size={15} /> Import {selectedQuestions.length}
              </Button>
            </div>
          </aside>
        </div>
      )}

      {!selectedBankId && banks.length > 0 && (
        <div className="admin-empty">
          Choose a question bank to browse and import questions.
        </div>
      )}
    </div>
  );
}
