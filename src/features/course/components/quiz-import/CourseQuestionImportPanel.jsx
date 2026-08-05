import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import Pagination from "@/shared/components/Pagination";
import { Button, Modal } from "@/shared/components/ui";
import { courseContentService } from "../../services/courseContentService";
import { questionBankService } from "@/features/admin/question-bank";
import { sanitizeQuestionHtml } from "@/shared/utils/htmlSanitizer";
import { prepareCourseQuestionImport } from "@/features/course/utils/course-question-quiz-import";
import "@/features/admin/admin-shared.css";
import "../quiz-question-manager.css";

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_FILTERS = {
    search: "",
    type: "all",
    moduleId: "all",
};

function normalizeModules(payload) {
    const root = payload?.data ?? payload;
    const items = Array.isArray(root)
        ? root
        : (root?.items ?? root?.content ?? root?.sections ?? []);

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

function isArchivedQuestion(question) {
    return (
        String(question?.status || "")
            .trim()
            .toLowerCase() === "archived"
    );
}

function questionLabel(question) {
    return String(
        question?.questionText || question?.title || question?.content || "",
    ).trim();
}

function questionTypeLabel(question) {
    const type = String(
        question?.questionType || question?.type || "",
    ).toLowerCase();
    if (type === "multiple_choice") return "Multiple choice";
    if (type === "true_false") return "True / False";
    if (type === "fill_in_the_blank") return "Fill in the blank";
    if (type === "single_choice") return "Single choice";
    return type || "Unknown";
}

function buildFilterParams(filters) {
    return {
        includeArchived: false,
        search: filters.search.trim() || undefined,
        type: filters.type === "all" ? undefined : filters.type,
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
    open = true,
    courseId,
    existingQuestions = [],
    onImport,
    onClose,
    onBusyChange,
}) {
    const [modules, setModules] = useState([]);
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [debouncedFilters, setDebouncedFilters] = useState(DEFAULT_FILTERS);
    const [items, setItems] = useState([]);
    const [pageInfo, setPageInfo] = useState({
        page: 0,
        totalPages: 1,
        totalItems: 0,
    });
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [questionsError, setQuestionsError] = useState("");
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [importError, setImportError] = useState("");
    const [importing, setImporting] = useState(false);

    const selectedIds = useMemo(
        () =>
            new Set(
                selectedQuestions.map((question) => getQuestionId(question)),
            ),
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
        !selectedQuestions.some(isArchivedQuestion) &&
        preparedSelection.valid &&
        preparedSelection.duplicates.length === 0 &&
        !bankBusy;

    useEffect(() => {
        onBusyChange?.(bankBusy);
    }, [bankBusy, onBusyChange]);

    useEffect(() => {
        const timer = window.setTimeout(
            () => setDebouncedFilters(filters),
            300,
        );
        return () => window.clearTimeout(timer);
    }, [filters]);

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
                const moduleData =
                    await courseContentService.getCourseContent(courseId);
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
                const response = await questionBankService.listCourseQuestions(
                    courseId,
                    {
                        page: pageInfo.page,
                        size: DEFAULT_PAGE_SIZE,
                        ...buildFilterParams(debouncedFilters),
                    },
                );
                if (cancelled) return;
                const responseItems = Array.isArray(response.items)
                    ? response.items
                    : [];
                setItems(
                    responseItems.filter(
                        (question) => !isArchivedQuestion(question),
                    ),
                );
                setSelectedQuestions((current) =>
                    current.filter((question) => !isArchivedQuestion(question)),
                );
                setPageInfo({
                    page: Number(response.page || 0),
                    totalPages: Number(response.totalPages || 1),
                    totalItems: Number(response.totalItems || 0),
                });
            } catch (error) {
                if (!cancelled) {
                    setQuestionsError(
                        error?.message || "Could not load questions.",
                    );
                    setItems([]);
                }
            } finally {
                if (!cancelled) setLoadingQuestions(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [courseId, debouncedFilters, pageInfo.page]);

    const updateFilter = (name, value) => {
        setFilters((current) => ({ ...current, [name]: value }));
        setPageInfo((current) => ({
            ...current,
            page: 0,
            totalPages: current.totalPages,
        }));
        setImportError("");
    };

    const resetFilters = () => {
        setFilters(DEFAULT_FILTERS);
        setPageInfo((current) => ({
            ...current,
            page: 0,
            totalPages: current.totalPages,
        }));
        setImportError("");
    };

    const toggleQuestion = (question) => {
        if (bankBusy) return;
        if (isArchivedQuestion(question)) {
            setImportError(
                "Archived questions cannot be imported into a quiz.",
            );
            return;
        }
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
        const selectableItems = items.filter(
            (question) => !isArchivedQuestion(question),
        );
        const visibleIds = selectableItems.map(getQuestionId).filter(Boolean);
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
            selectableItems.forEach((question) => {
                const id = getQuestionId(question);
                if (id && !currentIds.has(id)) next.push(question);
            });
            return next;
        });
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
        if (rawQuestions.some(isArchivedQuestion)) {
            setImportError(
                "Archived questions cannot be imported into a quiz.",
            );
            setSelectedQuestions((current) =>
                current.filter((question) => !isArchivedQuestion(question)),
            );
            return false;
        }

        const prepared = prepareCourseQuestionImport(
            existingQuestions,
            rawQuestions,
        );
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
                message ||
                    "Some selected questions already exist in this quiz.",
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
            const latestQuestions = await Promise.all(
                rawQuestions.map((question) =>
                    questionBankService.getCourseQuestion(
                        courseId,
                        getQuestionId(question),
                    ),
                ),
            );
            const archivedIds = new Set(
                latestQuestions
                    .filter(isArchivedQuestion)
                    .map(getQuestionId)
                    .filter(Boolean),
            );
            if (archivedIds.size > 0) {
                setSelectedQuestions((current) =>
                    current.filter(
                        (question) => !archivedIds.has(getQuestionId(question)),
                    ),
                );
                setImportError(
                    `${archivedIds.size} selected question(s) were archived and cannot be imported.`,
                );
                return false;
            }

            const saved = await onImport(prepared.mappedQuestions);
            if (!saved) {
                setImportError(
                    "Questions could not be imported. Please try again.",
                );
                return false;
            }
            setSelectedQuestions([]);
            onClose?.();
            return true;
        } catch (error) {
            console.error("Question list import error:", error);
            setImportError(
                "Questions could not be imported. Please try again.",
            );
            return false;
        } finally {
            setImporting(false);
        }
    };

    const visibleSelectedCount = items.filter((question) =>
        selectedIds.has(getQuestionId(question)),
    ).length;
    const hasActiveFilters =
        filters.search.trim() ||
        filters.type !== "all" ||
        filters.moduleId !== "all";

    return (
        <Modal
            open={open}
            size="xl"
            className="quiz-question-bank-modal"
            title="Import from question bank"
            description="Select questions from this course to add to the quiz. Archived questions are excluded."
            onClose={onClose}
            closeDisabled={importing}
            closeLabel="Close question bank"
            footer={
                <>
                    <div
                        className="quiz-question-bank-import__footer-summary"
                        aria-live="polite"
                    >
                        <strong>{selectedQuestions.length}</strong> selected
                    </div>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={importing}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={() => importQuestions(selectedQuestions)}
                        loading={importing}
                        loadingLabel="Importing..."
                        disabled={!canImportSelected}
                    >
                        Import questions ({selectedQuestions.length})
                    </Button>
                </>
            }
        >
            <div className="quiz-question-bank-import">
                <div className="quiz-question-bank-import__toolbar">
                    <label className="quiz-question-import__field quiz-question-bank-import__field--search">
                        <span className="quiz-question-import__field-label">
                            Search
                        </span>
                        <div className="quiz-question-import__input-group">
                            <Search size={16} aria-hidden="true" />
                            <input
                                className="quiz-question-import__input"
                                type="search"
                                value={filters.search}
                                placeholder="Search question text"
                                onChange={(event) =>
                                    updateFilter("search", event.target.value)
                                }
                                disabled={!courseId || importing}
                            />
                        </div>
                    </label>

                    <label className="quiz-question-import__field">
                        <span className="quiz-question-import__field-label">
                            Type
                        </span>
                        <select
                            className="quiz-question-import__select"
                            value={filters.type}
                            onChange={(event) =>
                                updateFilter("type", event.target.value)
                            }
                            disabled={!courseId || importing}
                        >
                            <option value="all">All types</option>
                            <option value="single_choice">Single choice</option>
                            <option value="multiple_choice">
                                Multiple choice
                            </option>
                            <option value="fill_in_the_blank">
                                Fill in the blank
                            </option>
                            <option value="true_false">True / False</option>
                        </select>
                    </label>

                    <label className="quiz-question-import__field">
                        <span className="quiz-question-import__field-label">
                            Module
                        </span>
                        <select
                            className="quiz-question-import__select"
                            value={filters.moduleId}
                            onChange={(event) =>
                                updateFilter("moduleId", event.target.value)
                            }
                            disabled={
                                !courseId || importing || modules.length === 0
                            }
                        >
                            <option value="all">All modules</option>
                            {modules.map((module) => (
                                <option key={module.id} value={module.id}>
                                    {module.title}
                                </option>
                            ))}
                        </select>
                    </label>

                    {hasActiveFilters && (
                        <Button
                            type="button"
                            variant="ghost"
                            className="quiz-question-bank-import__reset"
                            onClick={resetFilters}
                            disabled={!courseId || importing}
                        >
                            Reset
                        </Button>
                    )}
                </div>

                <div className="quiz-question-bank-import__selection-bar">
                    <div
                        className="quiz-question-bank-import__pool-meta"
                        aria-live="polite"
                    >
                        <strong>{pageInfo.totalItems}</strong> questions
                        <span aria-hidden="true">·</span>
                        <strong>{selectedQuestions.length}</strong> selected
                    </div>
                    <div className="quiz-question-bank-import__selection-actions">
                        {loadingQuestions && (
                            <span
                                className="quiz-question-bank-import__updating"
                                role="status"
                            >
                                Updating...
                            </span>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={toggleVisibleSelection}
                            disabled={
                                !courseId || items.length === 0 || bankBusy
                            }
                        >
                            {visibleSelectedCount === items.length &&
                            items.length > 0
                                ? "Unselect page"
                                : "Select page"}
                        </Button>
                        {selectedQuestions.length > 0 && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={clearSelection}
                                disabled={bankBusy}
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </div>

                <div className="quiz-question-bank-import__feedback">
                    {questionsError && (
                        <p
                            className="quiz-question-import__warning"
                            role="alert"
                            aria-live="assertive"
                        >
                            {questionsError}
                        </p>
                    )}

                    {preparedSelection.duplicates.length > 0 && (
                        <p
                            className="quiz-question-import__warning"
                            role="alert"
                            aria-live="assertive"
                        >
                            Remove the highlighted question(s) because they
                            already exist in this quiz.
                        </p>
                    )}

                    {preparedSelection.errors.length > 0 && (
                        <ul
                            className="quiz-question-import__errors"
                            role="alert"
                            aria-live="assertive"
                        >
                            {preparedSelection.errors.map((error, index) => (
                                <li key={`${error.message}-${index}`}>
                                    {error.message}
                                </li>
                            ))}
                        </ul>
                    )}

                    {importError && (
                        <p
                            className="quiz-question-import__warning"
                            role="alert"
                            aria-live="assertive"
                        >
                            {importError}
                        </p>
                    )}
                </div>

                <section
                    className="quiz-question-bank-import__results"
                    aria-label="Question bank items"
                >
                    {!courseId ? (
                        <div className="admin-empty">
                            Question list context is unavailable.
                        </div>
                    ) : loadingQuestions ? (
                        <div className="admin-loading">
                            Loading question list items...
                        </div>
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
                                                onChange={() =>
                                                    toggleQuestion(question)
                                                }
                                                disabled={bankBusy}
                                            />
                                            <div className="quiz-question-bank-import__item-body">
                                                <div
                                                    className="quiz-question-bank-import__item-title"
                                                    dangerouslySetInnerHTML={{
                                                        __html: sanitizeQuestionHtml(
                                                            questionLabel(
                                                                question,
                                                            ) ||
                                                                "Untitled question",
                                                        ),
                                                    }}
                                                />
                                                <div className="quiz-question-bank-import__item-meta">
                                                    <span className="quiz-question-bank-import__type">
                                                        {questionTypeLabel(
                                                            question,
                                                        )}
                                                    </span>
                                                    {question.status && (
                                                        <span
                                                            className={`admin-status admin-status--${question.status}`}
                                                        >
                                                            {question.status}
                                                        </span>
                                                    )}
                                                    <span>
                                                        {answers.length} answers
                                                    </span>
                                                    {duplicate && (
                                                        <span className="quiz-question-bank-import__duplicate">
                                                            Already in this quiz
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </label>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

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
            </div>
        </Modal>
    );
}
