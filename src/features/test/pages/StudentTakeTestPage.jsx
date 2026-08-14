import { useCallback, useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import {
    useLocation,
    useNavigate,
    useParams,
    useSearchParams,
} from "react-router-dom";
import {
    ArrowLeft,
    CheckCircle,
    Clock,
    Download,
    Eye,
    FileUp,
} from "lucide-react";
import { getCurrentUser } from "@/services/api-client";
import { assignmentService } from "@/features/assignment";
import { attemptService } from "../services/attemptService";
import { testService } from "../services/testService";
import {
    sanitizeAnswerHtml,
    sanitizeLessonHtml,
    sanitizeQuestionHtml,
} from "@/shared/utils/htmlSanitizer";
import { StatusBadge } from "@/shared/components/status";
import {
    Alert,
    Button,
    ConfirmDialog,
    EmptyState,
    LoadingState,
} from "@/shared/components/ui";
import "../test.css";

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8080/api/v1";

/** Chuyển API base URL thành WebSocket endpoint của monitor realtime. */
function wsUrl() {
    return API_BASE_URL.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "/ws");
}

/** Tính số giây còn lại và không trả về giá trị âm. */
function secondsUntil(endTime) {
    if (!endTime) return 0;
    return Math.max(
        0,
        Math.floor((new Date(endTime).getTime() - Date.now()) / 1000),
    );
}

/** Xác định submission essay đã ở trạng thái kết thúc. */
function isAssignmentFinal(status) {
    return ["SUBMITTED", "GRADED", "EXPIRED", "LATE"].includes(
        String(status || "").toUpperCase(),
    );
}

/** Kiểm tra submission essay đã hết hạn. */
function isExpiredAssignment(status) {
    return String(status || "").toUpperCase() === "EXPIRED";
}

/** Kiểm tra submission essay đã được nộp hoặc chấm. */
function isSubmittedAssignment(status) {
    return ["SUBMITTED", "GRADED", "LATE"].includes(
        String(status || "").toUpperCase(),
    );
}

/** Định dạng bộ đếm giây thành phút và giây. */
function formatTime(seconds) {
    const safe = Math.max(0, Number(seconds || 0));
    const minutes = Math.floor(safe / 60);
    const rest = safe % 60;
    return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** Chuẩn hóa định danh và tên trainee từ phiên đăng nhập hiện tại. */
function getStudent() {
    const user = getCurrentUser();
    return {
        id: user?.id || user?.userId || user?.accountId,
        name: user?.fullName || user?.name || user?.email || "Student",
    };
}

/** Xác định attempt MCQ đã kết thúc và không thể tiếp tục làm. */
function isCompletedAttempt(status) {
    const normalized = String(status || "").toUpperCase();
    return ["SUBMITTED", "GRADED", "EXPIRED", "TIMEOUT"].includes(normalized);
}

/** Sinh tiêu đề xác nhận nộp bài theo loại dữ liệu còn thiếu. */
function submitWarningTitle(warning) {
    if (warning?.type === "essay-empty") {
        return "You have not attached a submission file.";
    }
    if (warning?.type === "mcq-incomplete") {
        return "You have not answered all questions.";
    }
    return warning?.title || "Submit warning";
}

/** Sinh mô tả xác nhận nộp bài theo tiến độ hiện tại. */
function submitWarningMessage(warning) {
    if (warning?.type === "essay-empty") {
        return "Do you want to submit without uploading anything?";
    }
    if (warning?.type === "mcq-incomplete") {
        return `You answered ${warning.answeredCount}/${warning.totalQuestions} questions. Do you still want to submit?`;
    }
    return warning?.message || "";
}

/** Lấy URL media từ payload tương thích cũ và mới. */
function mediaItemUrl(item) {
    if (!item) return null;
    return item.mediaUrl || item.url || null;
}

/** Tìm media đầu tiên của đáp án theo loại yêu cầu. */
function findMediaByType(answer, mediaType) {
    const items = Array.isArray(answer?.media) ? answer.media : [];
    return items.find((item) => item.mediaType === mediaType) || null;
}

/** Hiển thị media đáp án với control native phù hợp từng định dạng. */
function renderAnswerMedia(answer) {
    if (!answer || !Array.isArray(answer.media) || answer.media.length === 0) {
        return null;
    }
    const image = findMediaByType(answer, "image");
    const audio = findMediaByType(answer, "audio");
    const video = findMediaByType(answer, "video");
    if (!image && !audio && !video) return null;
    return (
        <div className="ft-answer-media">
            {image && mediaItemUrl(image) ? (
                <img
                    src={mediaItemUrl(image)}
                    alt={image.fileName || "Answer image"}
                    className="ft-answer-media__image"
                />
            ) : null}
            {audio && mediaItemUrl(audio) ? (
                <audio
                    controls
                    preload="metadata"
                    src={mediaItemUrl(audio)}
                    className="ft-answer-media__audio"
                >
                    <track kind="captions" />
                </audio>
            ) : null}
            {video && mediaItemUrl(video) ? (
                <video
                    controls
                    preload="metadata"
                    src={mediaItemUrl(video)}
                    className="ft-answer-media__video"
                >
                    <track kind="captions" />
                </video>
            ) : null}
        </div>
    );
}

/** Điều phối luồng làm MCQ hoặc nộp essay của trainee. */
export function StudentTakeTestPage({
    listPath = "/dashboard",
    accessStoragePrefix = "courseQuizAccess",
    resultKicker: defaultResultKicker = "Quiz result",
    resultDetailPath = "/learning/course-quizzes/attempts",
} = {}) {
    const { id, type } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const normalizedType =
        type === "assignment" || type === "essay" ? "essay" : "mcq";
    const student = getStudent();
    const stompRef = useRef(null);
    const submittedRef = useRef(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [testData, setTestData] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [attempt, setAttempt] = useState(null);
    const [submission, setSubmission] = useState(null);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(0);
    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitWarning, setSubmitWarning] = useState(null);
    const [completedResult, setCompletedResult] = useState(null);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const effectiveListPath = location.state?.resultBackPath || listPath;
    const resultKicker = location.state?.resultKicker || defaultResultKicker;
    const contextClassId =
        location.state?.classId || searchParams.get("classId") || null;

    const accessCode =
        location.state?.accessCode ||
        window.sessionStorage.getItem(
            `${accessStoragePrefix}:${normalizedType}:${id}`,
        ) ||
        "";

    /** Điều hướng tới trang kết quả attempt và giữ context quay lại danh sách. */
    const openAttemptResult = useCallback(
        (attemptResult, { replace = false } = {}) => {
            const resultAttemptId =
                attemptResult?.id || attemptResult?.attemptId;
            if (!resultAttemptId) return;
            const resultParams = new URLSearchParams();
            if (contextClassId) resultParams.set("classId", contextClassId);
            const resultQuery = resultParams.toString();
            navigate(
                `${resultDetailPath}/${id}/${resultAttemptId}${resultQuery ? `?${resultQuery}` : ""}`,
                {
                    replace,
                    state: {
                        attempt: attemptResult,
                        studentName: student.name,
                        backPath: effectiveListPath,
                        resultKicker,
                        resultMode: location.state?.resultMode || null,
                        classId: contextClassId,
                    },
                },
            );
        },
        [
            contextClassId,
            effectiveListPath,
            id,
            location.state?.resultMode,
            navigate,
            resultDetailPath,
            resultKicker,
            student.name,
        ],
    );

    /** Phát trạng thái làm bài hiện tại tới kênh monitor realtime. */
    const publishMonitor = useCallback(
        (payload) => {
            if (normalizedType !== "essay") return;
            const client = stompRef.current;
            if (!client?.connected) return;
            client.publish({
                destination: "/app/assignments/monitor",
                body: JSON.stringify({
                    targetId: id,
                    studentId: student.id,
                    studentName: student.name,
                    type: normalizedType,
                    ...payload,
                }),
            });
        },
        [id, normalizedType, student.id, student.name],
    );

    useEffect(() => {
        if (normalizedType !== "essay") return undefined;
        const client = new Client({ brokerURL: wsUrl(), reconnectDelay: 3000 });
        stompRef.current = client;
        client.activate();
        return () => client.deactivate();
    }, [normalizedType]);

    useEffect(() => {
        /** Khởi tạo attempt hoặc submission tương ứng với loại assessment. */
        async function init() {
            if (!student.id) {
                setError("Cannot find the current student profile.");
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                if (normalizedType === "mcq") {
                    submittedRef.current = false;
                    setAnswers({});
                    setCompletedResult(null);
                    setSubmitWarning(null);
                    setActiveQuestionIndex(0);
                    const test = await testService.getById(
                        id,
                        contextClassId ? { classId: contextClassId } : {},
                    );
                    const started = await attemptService.start(
                        id,
                        student.id,
                        null,
                        student.name,
                        accessCode,
                        contextClassId,
                    );
                    if (isCompletedAttempt(started.status)) {
                        openAttemptResult(started, { replace: true });
                        return;
                    }
                    const mappings = await testService.getLearnerQuestions(id);
                    const hydrated = mappings.map((mapping) => ({
                        id: mapping.questionId,
                        questionText: mapping.questionText,
                        questionType: mapping.questionType,
                        marks: mapping.marks,
                        options: mapping.answers || [],
                    }));
                    setTestData(test);
                    setAttempt(started);
                    setQuestions(hydrated);
                    setActiveQuestionIndex(0);
                    setTimeLeft(secondsUntil(started.endTime));
                    publishMonitor({
                        attemptId: started.id,
                        status: "DOING",
                        startTime: started.startTime,
                        endTime: started.endTime,
                    });
                } else {
                    const assignment = await assignmentService.getById(id);
                    let existingSubmission = null;
                    try {
                        existingSubmission =
                            await assignmentService.getSubmissionByStudent(
                                id,
                                student.id,
                            );
                    } catch (submissionError) {
                        if (
                            submissionError?.originalError?.response?.status !==
                            404
                        ) {
                            console.warn(
                                "Could not load current submission",
                                submissionError,
                            );
                        }
                    }
                    setSubmission(existingSubmission);
                    if (
                        existingSubmission &&
                        isAssignmentFinal(existingSubmission.status)
                    ) {
                        const assignmentOpen =
                            !assignment.dueDate ||
                            secondsUntil(assignment.dueDate) > 0;
                        if (
                            isExpiredAssignment(existingSubmission.status) &&
                            !assignmentOpen
                        ) {
                            setError("This essay assignment has expired.");
                            setTestData(assignment);
                            setSubmission(existingSubmission);
                            setTimeLeft(0);
                            return;
                        }
                        if (isSubmittedAssignment(existingSubmission.status)) {
                            setTestData(assignment);
                            setSubmission(existingSubmission);
                            setError("");
                            setTimeLeft(secondsUntil(assignment.dueDate));
                            return;
                        }
                    }
                    setTestData(assignment);
                    try {
                        const started = await assignmentService.start({
                            assignmentId: id,
                            studentId: student.id,
                            studentName: student.name,
                            accessCode,
                        });
                        setSubmission(started);
                        setError("");
                        setTimeLeft(secondsUntil(assignment.dueDate));
                        publishMonitor({
                            submissionId: started.id,
                            status: "DOING",
                            startTime: started.startTime,
                            endTime: assignment.dueDate,
                        });
                    } catch (startError) {
                        console.warn(
                            "Could not start essay session yet",
                            startError,
                        );
                        setTimeLeft(secondsUntil(assignment.dueDate));
                    }
                }
            } catch (initError) {
                setError(
                    initError.message || "Could not load this assessment.",
                );
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [
        accessCode,
        id,
        normalizedType,
        openAttemptResult,
        publishMonitor,
        contextClassId,
        student.id,
        student.name,
    ]);

    /** Tải file submission essay hiện tại về thiết bị. */
    const handleDownloadCurrentSubmission = async () => {
        if (!submission?.fileUrl) return;
        try {
            const blob = await assignmentService.downloadFile(
                submission.fileUrl,
            );
            const href = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = href;
            link.download = submission.fileName || "submission";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(href);
        } catch (downloadError) {
            setError(
                downloadError.message ||
                    "Could not download your submitted file.",
            );
        }
    };

    /** Tải file hướng dẫn do giảng viên đính kèm. */
    const handleDownloadInstructionFile = async () => {
        if (!testData?.instructionFileUrl) return;
        try {
            const blob = await assignmentService.downloadFile(
                testData.instructionFileUrl,
            );
            const href = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = href;
            link.download =
                testData.instructionFileName || "essay-instructions";
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(href);
        } catch (downloadError) {
            setError(
                downloadError.message ||
                    "Could not download the instruction file.",
            );
        }
    };

    /** Bảo đảm essay đã có submission session trước khi upload hoặc submit. */
    const ensureEssayStarted = useCallback(async () => {
        if (normalizedType !== "essay" || submission?.id) {
            return submission;
        }
        const started = await assignmentService.start({
            assignmentId: id,
            studentId: student.id,
            studentName: student.name,
            accessCode,
        });
        setSubmission(started);
        publishMonitor({
            submissionId: started.id,
            status: "DOING",
            startTime: started.startTime,
            endTime: testData?.dueDate,
        });
        return started;
    }, [
        id,
        accessCode,
        normalizedType,
        publishMonitor,
        student.id,
        student.name,
        submission,
        testData?.dueDate,
    ]);

    /** Xác thực tiến độ và nộp MCQ hoặc essay theo đúng contract dịch vụ. */
    const handleSubmit = useCallback(
        async ({ skipWarning = false } = {}) => {
            if (submittedRef.current || submitting) return;
            if (
                normalizedType === "essay" &&
                testData?.dueDate &&
                secondsUntil(testData.dueDate) <= 0
            ) {
                setError("This essay assignment has expired.");
                return;
            }
            if (!skipWarning) {
                if (
                    normalizedType === "essay" &&
                    !file &&
                    !submission?.fileUrl
                ) {
                    setSubmitWarning({
                        type: "essay-empty",
                        title: "Bạn chưa làm gì cho bài essay.",
                        message:
                            "Bạn có muốn tiếp tục nộp bài trống hay ở lại để làm tiếp?",
                    });
                    return;
                }
                if (normalizedType === "mcq") {
                    const answeredCount = questions.filter(
                        (question) => answers[question.id],
                    ).length;
                    if (answeredCount < questions.length) {
                        setSubmitWarning({
                            type: "mcq-incomplete",
                            answeredCount,
                            totalQuestions: questions.length,
                            title: "Bạn chưa làm hết các câu hỏi.",
                            message: `Bạn đã trả lời ${answeredCount}/${questions.length} câu. Bạn có muốn tiếp tục nộp không?`,
                        });
                        return;
                    }
                }
            }
            submittedRef.current = true;
            setSubmitting(true);
            try {
                if (normalizedType === "mcq") {
                    const result = await attemptService.submit(attempt.id, {
                        forceSubmit: true,
                        classId: contextClassId,
                    });
                    setCompletedResult(result);
                    openAttemptResult(result);
                    publishMonitor({
                        attemptId: attempt.id,
                        status: result.status,
                        score: result.score,
                        percentage: result.percentage,
                        startTime: result.startTime,
                        endTime: result.endTime,
                    });
                } else {
                    const activeSubmission = await ensureEssayStarted();
                    const uploaded = file
                        ? await assignmentService.uploadFile(file)
                        : null;
                    const result = await assignmentService.submit({
                        assignmentId: id,
                        studentId: student.id,
                        studentName: student.name,
                        fileUrl:
                            uploaded?.fileUrl || submission?.fileUrl || null,
                        fileName:
                            uploaded?.fileName ||
                            file?.name ||
                            submission?.fileName ||
                            null,
                    });
                    setSubmission(result);
                    publishMonitor({
                        submissionId: activeSubmission?.id || result.id,
                        status: result.status,
                        fileUrl: result.fileUrl,
                        fileName: result.fileName,
                        startTime: result.startTime,
                        endTime: testData?.dueDate,
                    });
                }
                if (normalizedType === "essay") {
                    navigate(effectiveListPath);
                }
            } catch (submitError) {
                submittedRef.current = false;
                setError(submitError.message || "Submit failed.");
            } finally {
                setSubmitting(false);
            }
        },
        [
            attempt,
            answers,
            contextClassId,
            file,
            id,
            ensureEssayStarted,
            navigate,
            effectiveListPath,
            normalizedType,
            openAttemptResult,
            publishMonitor,
            questions,
            student.id,
            student.name,
            submission,
            submitting,
            testData,
        ],
    );

    useEffect(() => {
        if (!testData || loading || submittedRef.current || completedResult) {
            return undefined;
        }
        const timer = window.setInterval(() => {
            const end =
                normalizedType === "mcq" ? attempt?.endTime : testData?.dueDate;
            const next = secondsUntil(end);
            setTimeLeft(next);
            if (next <= 0 && normalizedType === "mcq") {
                window.clearInterval(timer);
                handleSubmit({ skipWarning: true });
            }
        }, 1000);
        return () => window.clearInterval(timer);
    }, [
        attempt?.endTime,
        completedResult,
        handleSubmit,
        loading,
        normalizedType,
        testData?.dueDate,
        testData,
    ]);

    /** Lưu lựa chọn đáp án ngay khi trainee thay đổi radio. */
    const handleSelectAnswer = async (questionId, answerId) => {
        setAnswers((current) => ({ ...current, [questionId]: answerId }));
        if (!attempt?.id) return;
        try {
            await attemptService.saveAnswer(
                attempt.id,
                questionId,
                answerId,
                "",
            );
        } catch (saveError) {
            setError(
                saveError.message ||
                    "Could not save the answer. The timer may be over.",
            );
        }
    };

    if (loading) {
        return (
            <section className="ft-page ft-take-workspace">
                <LoadingState label="Loading assessment..." />
            </section>
        );
    }

    return (
        <section className="ft-page ft-take-workspace">
            <header className="ft-take-header">
                <div>
                    <h1 className="ft-page-title">
                        {testData?.title || testData?.name}
                    </h1>
                </div>
                <div className="ft-toolbar">
                    <span
                        className={`ft-timer ${timeLeft < 60 ? "is-danger" : ""}`}
                    >
                        <Clock size={20} /> {formatTime(timeLeft)}
                    </span>
                    {!completedResult && (
                        <Button
                            leftIcon={<CheckCircle size={18} />}
                            loading={submitting}
                            loadingLabel="Submitting..."
                            disabled={
                                submitting ||
                                Boolean(error && normalizedType === "mcq") ||
                                Boolean(
                                    normalizedType === "essay" &&
                                    testData?.dueDate &&
                                    timeLeft <= 0,
                                )
                            }
                            onClick={handleSubmit}
                        >
                            Submit
                        </Button>
                    )}
                </div>
            </header>

            {error && <Alert tone="danger">{error}</Alert>}

            {completedResult ? (
                <div className="ft-result-panel">
                    <div className="ft-result-panel__icon">
                        <Eye size={24} />
                    </div>
                    <div className="ft-result-panel__body">
                        <span className="ft-page-kicker">{resultKicker}</span>
                        <h2>
                            {testData?.title ||
                                testData?.name ||
                                "MCQ practice"}
                        </h2>
                        <StatusBadge
                            status={completedResult.status || "SUBMITTED"}
                            tone="success"
                        />
                    </div>
                    <div className="ft-result-panel__score">
                        <span>Score</span>
                        <strong>{completedResult.score ?? "--"}</strong>
                    </div>
                    <div className="ft-result-panel__actions">
                        <Button
                            leftIcon={<ArrowLeft size={16} />}
                            onClick={() => navigate(listPath)}
                        >
                            Back to list
                        </Button>
                    </div>
                </div>
            ) : normalizedType === "mcq" ? (
                <div className="ft-question-layout">
                    <aside
                        className="ft-question-sidebar"
                        aria-label="Question navigation"
                    >
                        <div className="ft-question-sidebar__header">
                            <strong>Questions</strong>
                            <span>
                                {
                                    questions.filter((question) =>
                                        Boolean(answers[question.id]),
                                    ).length
                                }
                                /{questions.length}
                            </span>
                        </div>
                        <div className="ft-question-nav">
                            {questions.map((question, index) => (
                                <button
                                    key={question.id}
                                    className={`ft-question-nav__item ${
                                        index === activeQuestionIndex
                                            ? "is-active"
                                            : ""
                                    } ${answers[question.id] ? "is-answered" : ""}`}
                                    type="button"
                                    aria-current={
                                        index === activeQuestionIndex
                                            ? "true"
                                            : undefined
                                    }
                                    title={`Question ${index + 1}`}
                                    onClick={() =>
                                        setActiveQuestionIndex(index)
                                    }
                                >
                                    {index + 1}
                                </button>
                            ))}
                        </div>
                    </aside>

                    {questions[activeQuestionIndex] ? (
                        <article className="ft-question-card">
                            <div className="ft-question-card__header">
                                <span className="ft-page-kicker">
                                    Question {activeQuestionIndex + 1} of{" "}
                                    {questions.length}
                                </span>
                                {answers[questions[activeQuestionIndex].id] && (
                                    <StatusBadge
                                        status="completed"
                                        label="Answered"
                                        tone="success"
                                    />
                                )}
                            </div>
                            <div
                                className="ft-question-rich-text ft-question-card__prompt"
                                dangerouslySetInnerHTML={{
                                    __html: sanitizeQuestionHtml(
                                        questions[activeQuestionIndex]
                                            .questionText ||
                                            questions[activeQuestionIndex]
                                                .content,
                                    ),
                                }}
                            />
                            <div className="ft-option-list">
                                {(
                                    questions[activeQuestionIndex].options || []
                                ).map((answer) => (
                                    <label
                                        className="ft-option"
                                        key={answer.id}
                                    >
                                        <input
                                            type="radio"
                                            name={`q-${questions[activeQuestionIndex].id}`}
                                            checked={
                                                answers[
                                                    questions[
                                                        activeQuestionIndex
                                                    ].id
                                                ] === answer.id
                                            }
                                            onChange={() =>
                                                handleSelectAnswer(
                                                    questions[
                                                        activeQuestionIndex
                                                    ].id,
                                                    answer.id,
                                                )
                                            }
                                        />
                                        <div className="ft-option__body">
                                            <span
                                                className="ft-answer-rich-text"
                                                dangerouslySetInnerHTML={{
                                                    __html: sanitizeAnswerHtml(
                                                        answer.answerText ||
                                                            answer.content,
                                                    ),
                                                }}
                                            />
                                            {renderAnswerMedia(answer)}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </article>
                    ) : (
                        <EmptyState title="No questions available" />
                    )}
                </div>
            ) : (
                <div className="ft-upload-panel">
                    <div className="ft-essay-prompt">
                        <span className="ft-page-kicker">
                            Teacher instructions
                        </span>
                        <h2>Description</h2>
                        {testData?.description ? (
                            <div
                                className="ft-rich-content"
                                dangerouslySetInnerHTML={{
                                    __html: sanitizeLessonHtml(
                                        testData.description,
                                    ),
                                }}
                            />
                        ) : (
                            <p>No description provided.</p>
                        )}
                        {testData?.instructionFileUrl && (
                            <Button
                                variant="secondary"
                                leftIcon={<Download size={16} />}
                                onClick={handleDownloadInstructionFile}
                            >
                                Download instruction file
                            </Button>
                        )}
                    </div>
                    {submission?.fileUrl && (
                        <div className="ft-submission-summary">
                            <div>
                                <strong>Current submission</strong>
                                <p className="ft-muted">
                                    {submission.fileName || "Submitted file"}
                                    {submission.submittedAt
                                        ? ` - submitted ${new Date(submission.submittedAt).toLocaleString()}`
                                        : ""}
                                </p>
                            </div>
                            <Button
                                variant="secondary"
                                leftIcon={<Download size={16} />}
                                onClick={handleDownloadCurrentSubmission}
                            >
                                Download
                            </Button>
                        </div>
                    )}
                    <label className="ft-upload-zone ft-upload-zone--spaced">
                        <FileUp size={32} />
                        <strong>
                            {file
                                ? file.name
                                : submission?.fileUrl
                                  ? "Choose another file to replace your submission"
                                  : "Choose a PDF, Word, or ZIP file"}
                        </strong>
                        <span className="ft-muted">
                            The selected file will be uploaded when you submit.
                        </span>
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx,.zip"
                            hidden
                            onChange={(event) =>
                                setFile(event.target.files?.[0] || null)
                            }
                        />
                    </label>
                </div>
            )}
            <ConfirmDialog
                open={Boolean(submitWarning)}
                title={submitWarningTitle(submitWarning)}
                description={submitWarningMessage(submitWarning)}
                tone="warning"
                confirmLabel="Submit anyway"
                cancelLabel="Continue working"
                loading={submitting}
                loadingLabel="Submitting..."
                onClose={() => setSubmitWarning(null)}
                onConfirm={() => {
                    setSubmitWarning(null);
                    handleSubmit({ skipWarning: true });
                }}
            />
        </section>
    );
}
