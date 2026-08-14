import { useCallback, useEffect, useMemo, useState } from "react";
import {
    useLocation,
    useNavigate,
    useParams,
    useSearchParams,
} from "react-router-dom";
import { ArrowLeft, CheckCircle, Eye, RefreshCw, XCircle } from "lucide-react";
import { attemptService } from "../services/attemptService";
import { testService } from "../services/testService";
import {
    sanitizeAnswerHtml,
    sanitizeQuestionHtml,
} from "@/shared/utils/htmlSanitizer";
import { Alert, Button, LoadingState } from "@/shared/components/ui";
import "../test.css";

/** Chuyển giá trị số hợp lệ hoặc trả về null. */
function numberOrNull(value) {
    if (value == null || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

/** Tìm tổng số câu hỏi từ các biến thể response. */
function getQuestionTotal(...sources) {
    for (const source of sources) {
        const total =
            numberOrNull(source?.totalQuestions) ??
            numberOrNull(source?.total_questions) ??
            numberOrNull(source?.questionCount) ??
            numberOrNull(source?.question_count) ??
            numberOrNull(source?.numberOfQuestions) ??
            numberOrNull(source?.questions?.length);
        if (total && total > 0) return total;
    }
    return null;
}

/** Giới hạn và định dạng điểm theo thang 10. */
function formatScoreValue(value) {
    if (!Number.isFinite(value)) return "--";
    const score = Math.max(0, Math.min(10, value));
    return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

/** Quy đổi score hoặc percentage của attempt sang thang 10. */
function formatMcqScore(attempt, questionTotal) {
    const percentage = numberOrNull(attempt?.percentage);
    const rawScore = numberOrNull(attempt?.score);
    if (percentage && percentage > 0) {
        return {
            score: formatScoreValue(percentage / 10),
            percentage: Math.round(percentage),
        };
    }
    if (rawScore != null && questionTotal) {
        const computedPercentage = (rawScore / questionTotal) * 100;
        return {
            score: formatScoreValue(computedPercentage / 10),
            percentage: Math.round(computedPercentage),
        };
    }
    if (percentage === 0) {
        return { score: "0", percentage: 0 };
    }
    return { score: "--", percentage: null };
}

/** Chuẩn hóa boolean từ payload boolean, string hoặc number. */
function booleanOrNull(value) {
    if (value === true || value === "true" || value === 1 || value === "1")
        return true;
    if (value === false || value === "false" || value === 0 || value === "0")
        return false;
    return null;
}

/** Tính kết quả từ từng đáp án đã chấm khi backend trả chi tiết điểm. */
function scoreFromGradedAnswers(answers, questions) {
    if (
        !answers.some(
            (answer) => answer?.isCorrect != null || answer?.is_correct != null,
        )
    ) {
        return null;
    }
    const totalMarks = questions.reduce(
        (sum, question) => sum + (numberOrNull(question?.marks) || 1),
        0,
    );
    const earnedMarks = answers.reduce(
        (sum, answer) =>
            sum +
            (numberOrNull(answer?.scoreAwarded ?? answer?.score_awarded) || 0),
        0,
    );
    const percentage = totalMarks > 0 ? (earnedMarks / totalMarks) * 100 : 0;
    return {
        score: formatScoreValue(percentage / 10),
        percentage: Math.round(percentage),
    };
}

/** Lấy ID câu hỏi từ payload tương thích cũ và mới. */
function questionId(question) {
    return question?.questionId || question?.id || "";
}

/** Lấy ID đáp án từ payload tương thích cũ và mới. */
function answerId(answer) {
    return answer?.answerId || answer?.id || "";
}

/** Lấy nội dung hiển thị của câu hỏi. */
function questionText(question) {
    return (
        question?.questionText ||
        question?.content ||
        question?.title ||
        "Untitled question"
    );
}

/** Lấy nội dung hiển thị của đáp án. */
function answerText(answer) {
    return answer?.answerText || answer?.content || "Untitled answer";
}

/** Lấy ID đáp án trainee đã chọn từ các biến thể response. */
function selectedAnswerId(answer) {
    return (
        answer?.selectedAnswerId ||
        answer?.selected_answer_id ||
        answer?.answerId ||
        answer?.answer_id ||
        ""
    );
}

/** Hiển thị tổng kết và chi tiết đáp án của một attempt. */
export function TestAttemptDetailPage() {
    const { testId, attemptId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [test, setTest] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(location.state?.attempt || {});
    const studentName =
        location.state?.studentName || attempt?.studentName || "";
    const resultKicker = location.state?.resultKicker || "Test result";
    const resultMode = location.state?.resultMode || "";
    const hideAnswerReview = resultMode === "quiz";
    const contextClassId =
        location.state?.classId || searchParams.get("classId") || null;
    const backPath = location.state?.backPath || "";

    const questionTotal = useMemo(
        () => getQuestionTotal(attempt, { questions }),
        [attempt, questions],
    );
    const score = useMemo(
        () =>
            scoreFromGradedAnswers(answers, questions) ||
            formatMcqScore(attempt, questionTotal),
        [answers, attempt, questionTotal, questions],
    );

    /** Tải test, attempt, câu hỏi và đáp án theo quyền xem hiện tại. */
    const loadDetail = useCallback(async () => {
        if (!testId || !attemptId) return;
        setLoading(true);
        setError("");
        try {
            const [testData, attemptData, questionMappings, answerData] =
                await Promise.all([
                    testService
                        .getById(
                            testId,
                            contextClassId ? { classId: contextClassId } : {},
                        )
                        .catch(() => null),
                    attemptService.getById(
                        attemptId,
                        contextClassId ? { classId: contextClassId } : {},
                    ),
                    hideAnswerReview
                        ? Promise.resolve([])
                        : testService.getLearnerQuestions(testId),
                    hideAnswerReview
                        ? Promise.resolve([])
                        : attemptService.getStudentAnswers(attemptId),
                ]);
            setTest(testData);
            setAttempt(attemptData || {});
            setQuestions(questionMappings || []);
            setAnswers(answerData || []);
        } catch (detailError) {
            console.error("Failed to load attempt detail", detailError);
            setError(
                detailError.message || "Could not load this attempt detail.",
            );
        } finally {
            setLoading(false);
        }
    }, [attemptId, contextClassId, hideAnswerReview, testId]);

    useEffect(() => {
        const timer = window.setTimeout(loadDetail, 0);
        return () => window.clearTimeout(timer);
    }, [loadDetail]);

    /** Quay lại đường dẫn được truyền vào hoặc lịch sử trình duyệt. */
    const handleBack = () => {
        if (backPath) {
            navigate(backPath);
            return;
        }
        navigate(-1);
    };

    return (
        <section className="ft-page ft-page--monitor ft-attempt-detail-page">
            <div className="ft-result-panel ft-result-panel--attempt-detail">
                <div className="ft-result-panel__icon">
                    <Eye size={24} />
                </div>
                <div className="ft-result-panel__body">
                    <span className="ft-page-kicker">{resultKicker}</span>
                    <h2>{test?.title || test?.name || "Course quiz attempt"}</h2>
                    <p>
                        Status:{" "}
                        <strong>{attempt?.status || "SUBMITTED"}</strong>
                        {studentName ? ` - ${studentName}` : ""}
                    </p>
                    <div className="ft-result-panel__meta">
                        <span>
                            {questionTotal || questions.length || "--"}{" "}
                            questions
                        </span>
                        {attempt?.endTime || attempt?.submittedAt ? (
                            <span>
                                {new Date(
                                    attempt.endTime || attempt.submittedAt,
                                ).toLocaleString()}
                            </span>
                        ) : null}
                    </div>
                </div>
                <div className="ft-result-panel__score">
                    <span>Score</span>
                    <strong>{score.score}</strong>
                </div>
                <div className="ft-result-panel__actions">
                    <Button
                        leftIcon={<ArrowLeft size={16} />}
                        onClick={handleBack}
                    >
                        Back
                    </Button>
                </div>
            </div>

            {hideAnswerReview ? null : loading ? (
                <LoadingState label="Loading attempt detail..." />
            ) : error ? (
                <Alert
                    tone="danger"
                    action={
                        <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<RefreshCw size={16} />}
                            onClick={loadDetail}
                        >
                            Retry
                        </Button>
                    }
                >
                    {error}
                </Alert>
            ) : (
                <section className="ft-attempt-review">
                    <div className="ft-attempt-review__header">
                        <div>
                            <span className="ft-page-kicker">
                                Answer review
                            </span>
                            <h2>Question details</h2>
                        </div>
                    </div>
                    <div className="ft-attempt-detail-list">
                        {questions.map((question, index) => {
                            const currentQuestionId = questionId(question);
                            const studentAnswer = answers.find(
                                (item) =>
                                    questionId(item) === currentQuestionId,
                            );
                            const selectedId = selectedAnswerId(studentAnswer);
                            const gradedCorrect = booleanOrNull(
                                studentAnswer?.isCorrect ??
                                    studentAnswer?.is_correct ??
                                    studentAnswer?.correct,
                            );
                            const awardedScore = numberOrNull(
                                studentAnswer?.scoreAwarded ??
                                    studentAnswer?.score_awarded,
                            );
                            const gradedCorrectAnswerId =
                                studentAnswer?.correctAnswerId ||
                                studentAnswer?.correct_answer_id ||
                                "";
                            const answerOptions =
                                question.answers || question.options || [];
                            const correctAnswer = answerOptions.find(
                                (answer) =>
                                    String(answerId(answer)) ===
                                        String(gradedCorrectAnswerId) ||
                                    answer.correct ||
                                    answer.isCorrect,
                            );
                            const isCorrect =
                                gradedCorrect ??
                                (awardedScore != null
                                    ? awardedScore > 0
                                    : Boolean(
                                          selectedId &&
                                          correctAnswer &&
                                          String(selectedId) ===
                                              String(answerId(correctAnswer)),
                                      ));
                            const resultLabel = selectedId
                                ? isCorrect
                                    ? "Correct"
                                    : "Incorrect"
                                : "No answer";

                            return (
                                <div
                                    className="ft-attempt-question"
                                    key={currentQuestionId || index}
                                >
                                    <div className="ft-attempt-question__title">
                                        <div className="ft-attempt-question__heading">
                                            <span className="ft-attempt-question__eyebrow">
                                                Question {index + 1}
                                            </span>
                                            <div
                                                className="ft-attempt-question__text"
                                                dangerouslySetInnerHTML={{
                                                    __html: sanitizeQuestionHtml(
                                                        questionText(question),
                                                    ),
                                                }}
                                            />
                                        </div>
                                        <span
                                            className={`ft-badge ${
                                                isCorrect
                                                    ? "ft-status--submitted"
                                                    : "ft-status--expired"
                                            }`}
                                        >
                                            {isCorrect ? (
                                                <CheckCircle size={14} />
                                            ) : (
                                                <XCircle size={14} />
                                            )}
                                            {resultLabel}
                                        </span>
                                    </div>
                                    <div className="ft-attempt-answers">
                                        {answerOptions.map(
                                            (answer, answerIndex) => {
                                                const id = answerId(answer);
                                                const selected =
                                                    String(selectedId || "") ===
                                                    String(id);
                                                const correct =
                                                    String(id) ===
                                                        String(
                                                            gradedCorrectAnswerId,
                                                        ) ||
                                                    answer.correct ||
                                                    answer.isCorrect ||
                                                    (isCorrect && selected);
                                                return (
                                                    <div
                                                        className={`ft-attempt-answer ${
                                                            correct
                                                                ? "is-correct"
                                                                : ""
                                                        } ${selected ? "is-selected" : ""}`}
                                                        key={id || answerIndex}
                                                    >
                                                        <span
                                                            dangerouslySetInnerHTML={{
                                                                __html: sanitizeAnswerHtml(
                                                                    answerText(
                                                                        answer,
                                                                    ),
                                                                ),
                                                            }}
                                                        />
                                                        <div className="ft-attempt-answer__tags">
                                                            {selected && (
                                                                <strong>
                                                                    Selected
                                                                </strong>
                                                            )}
                                                            {correct && (
                                                                <strong>
                                                                    Answer
                                                                </strong>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {questions.length === 0 && (
                            <p className="ft-muted">
                                No questions found for this test.
                            </p>
                        )}
                    </div>
                </section>
            )}
        </section>
    );
}
