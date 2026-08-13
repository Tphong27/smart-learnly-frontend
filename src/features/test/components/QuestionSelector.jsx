import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Plus, RefreshCw, Shuffle, Trash2 } from "lucide-react";
import { questionBankService } from "@/features/admin/question-bank";
import {
    Alert,
    Button,
    IconButton,
    Input,
    LoadingState,
    Modal,
} from "@/shared/components/ui";
import {
    sanitizeAnswerHtml,
    sanitizeQuestionHtml,
} from "@/shared/utils/htmlSanitizer";
import "../test.css";

/** Lấy nội dung hiển thị từ các kiểu payload câu hỏi tương thích. */
function questionText(question) {
    return (
        question.questionText ||
        question.content ||
        question.title ||
        "Untitled question"
    );
}

/** Lấy định danh câu hỏi từ response cũ hoặc mới. */
function questionId(question) {
    return question?.id || question?.questionId || "";
}

/** Cho giảng viên chọn hoặc rút ngẫu nhiên câu hỏi của một khóa học vào đề. */
export function QuestionSelector({
    courseId,
    moduleId,
    selectedQuestions = [],
    onQuestionsChange,
}) {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [expandedQuestionId, setExpandedQuestionId] = useState(null);
    const [randomCount, setRandomCount] = useState("");
    const [randomModalOpen, setRandomModalOpen] = useState(false);

    const selectedIds = useMemo(
        () =>
            new Set(selectedQuestions.map((question) => questionId(question))),
        [selectedQuestions],
    );
    const availableQuestions = useMemo(
        () =>
            questions.filter(
                (question) => !selectedIds.has(questionId(question)),
            ),
        [questions, selectedIds],
    );

    const randomCountNumber = Number(randomCount || 0);
    const randomCountError =
        randomCount &&
        (!Number.isInteger(randomCountNumber) || randomCountNumber < 1)
            ? "Enter a whole number greater than 0."
            : randomCountNumber > availableQuestions.length
              ? `Only ${availableQuestions.length} questions are available.`
              : "";

    /** Tải toàn bộ câu hỏi phù hợp với course/module hiện tại theo từng trang API. */
    const loadQuestions = useCallback(async () => {
        if (!courseId) {
            setQuestions([]);
            setLoadError("");
            return;
        }
        setLoading(true);
        setLoadError("");
        try {
            const pageSize = 100;
            const loaded = [];
            for (let page = 0; page < 20; page += 1) {
                const response = await questionBankService.listCourseQuestions(
                    courseId,
                    {
                        size: pageSize,
                        page,
                        ...(moduleId && moduleId !== "all" ? { moduleId } : {}),
                    },
                );
                const batch = response.items;
                loaded.push(...batch);
                if (batch.length < pageSize) break;
            }
            setQuestions(loaded);
        } catch (error) {
            console.error("Failed to load questions", error);
            setQuestions([]);
            setLoadError(
                error?.message || "Could not load questions for this course.",
            );
        } finally {
            setLoading(false);
        }
    }, [courseId, moduleId]);

    useEffect(() => {
        const timer = window.setTimeout(loadQuestions, 0);
        return () => window.clearTimeout(timer);
    }, [loadQuestions]);

    /** Loại một câu hỏi khỏi danh sách đã chọn và đóng preview liên quan. */
    const handleRemove = (id) => {
        onQuestionsChange(
            selectedQuestions.filter((question) => questionId(question) !== id),
        );
        if (expandedQuestionId === id) {
            setExpandedQuestionId(null);
        }
    };

    /** Thêm câu hỏi chưa được chọn vào đề hiện tại. */
    const handleAdd = (question) => {
        const id = questionId(question);
        if (!id || selectedIds.has(id)) return;
        onQuestionsChange([...selectedQuestions, question]);
    };

    /** Mở hoặc đóng phần xem trước đáp án của một câu hỏi. */
    const toggleExpanded = (id) => {
        setExpandedQuestionId((current) => (current === id ? null : id));
    };

    /** Hiển thị danh sách đáp án đã sanitize cho câu hỏi đang mở rộng. */
    const renderAnswerPreview = (question) => {
        const answers = question.answers || question.options || [];
        return (
            <div className="ft-answer-preview">
                {answers.length === 0 ? (
                    <p className="ft-muted">
                        No answers available for this question.
                    </p>
                ) : (
                    answers.map((answer, index) => (
                        <div
                            className={`ft-answer-preview__item ${
                                answer.correct || answer.isCorrect
                                    ? "is-correct"
                                    : ""
                            }`}
                            key={answer.id || answer.answerId || index}
                        >
                            <span
                                className="ft-answer-rich-text"
                                dangerouslySetInnerHTML={{
                                    __html: sanitizeAnswerHtml(
                                        answer.answerText || answer.content,
                                    ),
                                }}
                            />
                            {(answer.correct || answer.isCorrect) && (
                                <strong>Correct</strong>
                            )}
                        </div>
                    ))
                )}
            </div>
        );
    };

    /** Chọn ngẫu nhiên số lượng câu hỏi hợp lệ từ pool còn khả dụng. */
    const handleRandomSelect = () => {
        const count = Number(randomCount || 0);
        if (
            !Number.isInteger(count) ||
            count < 1 ||
            count > availableQuestions.length
        ) {
            return;
        }

        const shuffled = [...availableQuestions].sort(
            () => Math.random() - 0.5,
        );
        const pickedQuestions = shuffled.slice(0, count);
        if (pickedQuestions.length === 0) return;
        onQuestionsChange([...selectedQuestions, ...pickedQuestions]);
        setRandomModalOpen(false);
        setRandomCount("");
    };

    return (
        <div className="ft-question-selector">
            <div className="ft-question-bank-header">
                <span className="ft-muted">
                    {availableQuestions.length} available /{" "}
                    {selectedQuestions.length} selected
                </span>
                <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Shuffle size={14} />}
                    disabled={
                        loading || !courseId || availableQuestions.length === 0
                    }
                    onClick={() => {
                        setRandomCount("");
                        setRandomModalOpen(true);
                    }}
                >
                    Random
                </Button>
            </div>

            {loading && (
                <LoadingState compact label="Loading available questions..." />
            )}
            {!loading && loadError && (
                <Alert
                    tone="danger"
                    className="ft-question-load-error"
                    action={
                        <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<RefreshCw size={14} />}
                            onClick={loadQuestions}
                        >
                            Retry
                        </Button>
                    }
                >
                    {loadError}
                </Alert>
            )}
            {!loading && !loadError && courseId && questions.length === 0 && (
                <p className="ft-muted">
                    No questions found for the selected{" "}
                    {moduleId === "all" ? "course" : "module"}.
                </p>
            )}

            {!loading && !loadError && availableQuestions.length > 0 && (
                <div className="ft-question-pool">
                    <strong>Available questions</strong>
                    <div className="ft-question-list">
                        {availableQuestions.map((question) => {
                            const id = questionId(question);
                            return (
                                <div className="ft-question-row-wrap" key={id}>
                                    <div className="ft-question-row">
                                        <span
                                            className="ft-question-text ft-question-rich-text"
                                            dangerouslySetInnerHTML={{
                                                __html: sanitizeQuestionHtml(
                                                    questionText(question),
                                                ),
                                            }}
                                        />
                                        <div className="ft-question-actions">
                                            <IconButton
                                                icon={<Eye size={16} />}
                                                label="View question answers"
                                                aria-expanded={expandedQuestionId === id}
                                                onClick={() =>
                                                    toggleExpanded(id)
                                                }
                                            />
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="ft-question-add"
                                                leftIcon={<Plus size={14} />}
                                                onClick={() =>
                                                    handleAdd(question)
                                                }
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    </div>
                                    {expandedQuestionId === id &&
                                        renderAnswerPreview(question)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="ft-question-pool">
                <strong>Selected questions</strong>
                <div className="ft-question-list">
                    {selectedQuestions.length === 0 ? (
                        <p className="ft-muted">No question selected.</p>
                    ) : (
                        selectedQuestions.map((question) => {
                            const id = questionId(question);
                            return (
                                <div className="ft-question-row-wrap" key={id}>
                                    <div className="ft-question-row">
                                        <span
                                            className="ft-question-text ft-question-rich-text"
                                            dangerouslySetInnerHTML={{
                                                __html: sanitizeQuestionHtml(
                                                    questionText(question),
                                                ),
                                            }}
                                        />
                                        <div className="ft-question-actions">
                                            <IconButton
                                                icon={<Eye size={16} />}
                                                label="View question answers"
                                                aria-expanded={expandedQuestionId === id}
                                                onClick={() =>
                                                    toggleExpanded(id)
                                                }
                                            />
                                            <IconButton
                                                icon={<Trash2 size={16} />}
                                                label="Remove question"
                                                variant="danger"
                                                onClick={() => handleRemove(id)}
                                            />
                                        </div>
                                    </div>
                                    {expandedQuestionId === id &&
                                        renderAnswerPreview(question)}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <Modal
                open={randomModalOpen}
                title="Choose quantity"
                description={`${availableQuestions.length} questions are available.`}
                size="sm"
                onClose={() => setRandomModalOpen(false)}
                footer={
                    <>
                        <Button
                            variant="ghost"
                            onClick={() => setRandomModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            leftIcon={<Shuffle size={16} />}
                            disabled={!randomCountNumber || Boolean(randomCountError)}
                            onClick={handleRandomSelect}
                        >
                            Random
                        </Button>
                    </>
                }
            >
                <Input
                    autoFocus
                    label="Number of questions"
                    min="1"
                    max={availableQuestions.length}
                    type="number"
                    value={randomCount}
                    placeholder="Enter number of questions"
                    error={randomCountError}
                    onChange={(event) => setRandomCount(event.target.value)}
                />
            </Modal>
        </div>
    );
}
