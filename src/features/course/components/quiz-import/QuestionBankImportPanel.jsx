import { useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, Search, Shuffle, X } from "lucide-react";
import Pagination from "@/shared/components/Pagination";
import { Button } from "@/shared/components/ui";
import { courseService } from "@/services/course.service";
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

export function QuestionBankImportPanel({
  existingQuestions = [],
  onImport,
  onClose,
  onBusyChange,
}) {
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState("");
  const [bankSearch, setBankSearch] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");

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

  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [randomCount, setRandomCount] = useState("");
  const [randomError, setRandomError] = useState("");
  const [importError, setImportError] = useState("");
  const [importing, setImporting] = useState(false);
  const [randomLoading, setRandomLoading] = useState(false);

  const selectedBank = useMemo(
    () => banks.find((bank) => String(bank.bankId || bank.id) === selectedBankId),
    [banks, selectedBankId],
  );

  const visibleBanks = useMemo(() => {
    const query = bankSearch.trim().toLowerCase();
    if (!query) return banks;
    return banks.filter((bank) => {
      const title = String(bank.name || "").toLowerCase();
      const description = String(bank.description || "").toLowerCase();
      const courseId = String(bank.courseId || "").toLowerCase();
      return (
        title.includes(query) ||
        description.includes(query) ||
        courseId.includes(query)
      );
    });
  }, [bankSearch, banks]);

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

  const bankBusy = banksLoading || loadingQuestions || importing || randomLoading;
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
    let cancelled = false;
    (async () => {
      setBanksLoading(true);
      setBanksError("");
      try {
        const data = await questionBankService.listBanks();
        if (!cancelled) setBanks(Array.isArray(data) ? data : []);
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
  }, []);

  useEffect(() => {
    if (!selectedBankId) return;

    const bank = banks.find((item) => String(item.bankId || item.id) === selectedBankId);
    if (!bank?.courseId) return;

    let cancelled = false;
    (async () => {
      try {
        const moduleData = await courseService.getCourseContent(bank.courseId);
        if (!cancelled) setModules(normalizeModules(moduleData));
      } catch {
        if (!cancelled) setModules([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [banks, selectedBankId]);

  useEffect(() => {
    if (!selectedBankId) return undefined;

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
  }, [filters, pageInfo.page, selectedBankId]);

  const handleBankChange = (nextBankId) => {
    setSelectedBankId(nextBankId);
    setModules([]);
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
    setPageInfo((current) => ({ ...current, page: 0, totalPages: current.totalPages }));
    setRandomError("");
    setImportError("");
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPageInfo((current) => ({ ...current, page: 0, totalPages: current.totalPages }));
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
      setImportError("");
      setRandomCount("");
      onClose();
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
      setRandomError(`Only ${pageInfo.totalItems} questions are available in this filter.`);
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
        setRandomError(`Only ${pool.length} questions are available in this filter.`);
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

  return (
    <div className="quiz-question-bank-import">
      <section className="quiz-question-bank-import__section">
        <div className="quiz-question-bank-import__section-header">
          <div>
            <h3 className="quiz-question-bank-import__title">Question Bank</h3>
            <p className="quiz-question-bank-import__subtitle">
              Choose one bank first, then select questions manually or import a random set from the filtered pool.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            leftIcon={<RefreshCw size={15} />}
            onClick={() => {
              setBanksLoading(true);
              setBanksError("");
              questionBankService
                .listBanks()
                .then((data) => {
                  setBanks(Array.isArray(data) ? data : []);
                })
                .catch((error) => {
                  setBanksError(error?.message || "Could not load question banks.");
                })
                .finally(() => setBanksLoading(false));
            }}
            disabled={bankBusy}
          >
            Refresh banks
          </Button>
        </div>

        {banksError && (
          <p className="quiz-question-import__warning" role="alert" aria-live="assertive">
            {banksError}
          </p>
        )}

        <div className="quiz-question-import__bank-picker">
          <label className="quiz-question-import__field">
            <span className="quiz-question-import__field-label">Search bank</span>
            <input
              className="quiz-question-import__input"
              type="search"
              placeholder="Search by bank name or course"
              value={bankSearch}
              onChange={(event) => setBankSearch(event.target.value)}
              disabled={bankBusy}
            />
          </label>

          <label className="quiz-question-import__field">
            <span className="quiz-question-import__field-label">Question bank</span>
            <select
              className="quiz-question-import__select"
              value={selectedBankId}
              onChange={(event) => handleBankChange(event.target.value)}
              disabled={bankBusy || banksLoading}
            >
              <option value="">Choose a bank</option>
              {visibleBanks.map((bank) => (
                <option key={bank.bankId || bank.id} value={bank.bankId || bank.id}>
                  {bank.name}{bank.courseId ? ` · ${bank.courseId}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedBank && (
          <div className="quiz-question-bank-import__bank-summary">
            <span className="admin-status admin-status--approved">
              {selectedBank.status || "active"}
            </span>
            <span>{selectedBank.name}</span>
            {selectedBank.courseId && <span>Course: {selectedBank.courseId}</span>}
            {selectedBank.questionCount != null && (
              <span>{selectedBank.questionCount} question(s)</span>
            )}
          </div>
        )}
      </section>

      <section className="quiz-question-bank-import__section">
        <div className="quiz-question-bank-import__section-header">
          <div>
            <h4 className="quiz-question-bank-import__heading">Filters</h4>
            <p className="quiz-question-bank-import__subtitle">
              Search and narrow the question bank before selecting questions.
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={resetFilters} disabled={!selectedBankId || bankBusy}>
            Reset filters
          </Button>
        </div>

        <div className="quiz-question-bank-import__filters">
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

          <label className="quiz-question-import__field">
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

          <label className="quiz-question-import__field">
            <span className="quiz-question-import__field-label">Status</span>
            <select
              className="quiz-question-import__select"
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
              disabled={!selectedBankId || bankBusy}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>

          <label className="quiz-question-import__field">
            <span className="quiz-question-import__field-label">Difficulty</span>
            <select
              className="quiz-question-import__select"
              value={filters.difficulty}
              onChange={(event) => updateFilter("difficulty", event.target.value)}
              disabled={!selectedBankId || bankBusy}
            >
              <option value="all">All difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>

          <label className="quiz-question-import__field">
            <span className="quiz-question-import__field-label">Module</span>
            <select
              className="quiz-question-import__select"
              value={filters.moduleId}
              onChange={(event) => updateFilter("moduleId", event.target.value)}
              disabled={!selectedBankId || bankBusy || modules.length === 0}
            >
              <option value="all">All modules</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {selectedBankId && (
        <section className="quiz-question-bank-import__section">
          <div className="quiz-question-bank-import__section-header">
            <div>
              <h4 className="quiz-question-bank-import__heading">Random import</h4>
              <p className="quiz-question-bank-import__subtitle">
                Pick a random sample from the currently filtered bank result.
              </p>
            </div>
            <div className="quiz-question-bank-import__random-actions">
              <input
                className="quiz-question-import__input quiz-question-bank-import__random-input"
                type="number"
                min="1"
                max={questionPoolCount}
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
            </div>
          </div>
          {randomError && (
            <p className="quiz-question-import__warning" role="alert" aria-live="assertive">
              {randomError}
            </p>
          )}
          <p className="quiz-question-bank-import__subtitle">
            Available in current filter: {questionPoolCount}
          </p>
        </section>
      )}

      <section className="quiz-question-bank-import__section">
        <div className="quiz-question-bank-import__section-header">
          <div>
            <h4 className="quiz-question-bank-import__heading">Selected questions</h4>
            <p className="quiz-question-bank-import__subtitle">
              {selectedQuestions.length} selected question(s).
            </p>
          </div>
          <div className="quiz-question-bank-import__selection-actions">
            <Button type="button" variant="ghost" onClick={clearSelection} disabled={selectedQuestions.length === 0 || bankBusy}>
              Clear selection
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={toggleVisibleSelection}
              disabled={!selectedBankId || items.length === 0 || bankBusy}
            >
              {visibleSelectedCount === items.length && items.length > 0 ? "Unselect visible" : "Select visible"}
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

        {duplicateQuestionIds.size > 0 && (
          <p className="quiz-question-bank-import__subtitle">
            Duplicate rows are blocked and marked in the list below.
          </p>
        )}

        <div className="quiz-question-bank-import__selected-list">
          {selectedQuestions.length === 0 ? (
            <p className="admin-empty">No questions selected yet.</p>
          ) : (
            selectedQuestions.map((question) => {
              const id = getQuestionId(question);
              return (
                <div className="quiz-question-bank-import__selected-item" key={id || questionLabel(question)}>
                  <div>
                    <div
                      className="quiz-question-bank-import__selected-title"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeQuestionHtml(
                          questionLabel(question) || "Untitled question",
                        ),
                      }}
                    />
                    <div className="quiz-question-bank-import__selected-meta">
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
      </section>

      <section className="quiz-question-bank-import__section">
        <div className="quiz-question-bank-import__section-header">
          <div>
            <h4 className="quiz-question-bank-import__heading">Bank questions</h4>
            <p className="quiz-question-bank-import__subtitle">
              Browse the filtered bank result and add questions into the selection.
            </p>
          </div>
          <div className="quiz-question-bank-import__pool-meta">
            <span>{pageInfo.totalItems} total</span>
            <span>{pageInfo.totalPages} page(s)</span>
          </div>
        </div>

        {!selectedBankId ? (
          <div className="admin-empty">Choose a question bank to load its questions.</div>
        ) : banksLoading || loadingQuestions ? (
          <div className="admin-loading">Loading question bank...</div>
        ) : questionsError ? (
          <p className="quiz-question-import__warning" role="alert" aria-live="assertive">
            {questionsError}
          </p>
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
                            __html: sanitizeQuestionHtml(questionLabel(question) || "Untitled question"),
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
                      {answers.slice(0, 4).map((answer, index) => (
                        <div
                          className={`quiz-question-bank-import__answer${(answer.correct || answer.isCorrect) ? " is-correct" : ""}`}
                          key={answer.answerId || answer.id || index}
                        >
                          <span
                            dangerouslySetInnerHTML={{
                              __html: sanitizeAnswerHtml(answer.answerText || answer.content || answer.text || ""),
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
          ariaLabel="Question bank pagination"
          onPageChange={(nextPage) => {
            setPageInfo((current) => ({ ...current, page: nextPage - 1 }));
          }}
        />
      </section>
    </div>
  );
}
