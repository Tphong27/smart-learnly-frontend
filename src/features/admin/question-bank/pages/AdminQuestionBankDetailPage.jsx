import { useEffect, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  Download,
  Edit2,
  Plus,
  RotateCcw,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  Alert,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  Table,
  useToast,
} from "@/shared/components/ui";
import { StatusBadge } from "@/shared/components/status";
import Pagination from "@/shared/components/Pagination";
import {
  sanitizeAnswerHtml,
  sanitizeQuestionHtml,
} from "@/shared/utils/htmlSanitizer";
import { questionBankService } from "@/features/admin/question-bank";
import { courseAdminService } from "@/features/course";
import { formatDate } from "@/shared/utils/formatters";
import { DEFAULT_PAGE_SIZE } from "@/shared/constants/pagination";
import "../../admin-shared.css";
import "./question-bank.css";
import { QuestionImportModal } from "../components/QuestionImportModal";
import {
  canWriteQuestionBank,
  questionTypeLabel,
} from "../utils/questionFormUtils";
import { AdminQuestionFormModal } from "./AdminQuestionFormPage";
import {
  QuestionImagePreviewModal,
  RestoreQuestionBankModal,
} from "../components/QuestionBankDetailModals";
import { QuestionBankFilters } from "../components/QuestionBankFilters";
import {
  normalizeQuestionMedia,
  questionMediaName,
  questionMediaUrl,
} from "../utils/questionBankDetailUtils";

/** Điều phối Question List course-wide (filter module) hoặc legacy bank. */
export function AdminQuestionBankDetailPage() {
  const { bankId, courseId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const writable = canWriteQuestionBank();
  const isCourseQuestionsMode = Boolean(courseId);
  const [bank, setBank] = useState(null);
  const [items, setItems] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    page: 0,
    totalPages: 1,
    totalItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [refreshKey, setRefreshKey] = useState(0);
  const [archivingId, setArchivingId] = useState(null);
  const [pendingArchive, setPendingArchive] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [questionFormModal, setQuestionFormModal] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);

  /** Đặt lại toàn bộ bộ lọc câu hỏi và quay về trang đầu. */
  function clearQuestionFilters() {
    setSearch("");
    setType("all");
    setStatus("all");
    setPage(0);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [scopeData, questionPage] = isCourseQuestionsMode
          ? await Promise.all([
              courseAdminService.get(courseId),
              questionBankService.listCourseQuestions(courseId, {
                search: search.trim() || undefined,
                type: type === "all" ? undefined : type,
                status: status === "all" ? undefined : status,
                page,
                size: pageSize,
              }),
            ])
          : await (async () => {
              const bankData = await questionBankService.getBank(bankId);
              const legacyQuestions = await questionBankService.listQuestions({
                bankId,
                search: search.trim() || undefined,
                type: type === "all" ? undefined : type,
                status: status === "all" ? undefined : status,
                page,
                size: pageSize,
              });
              return [bankData, legacyQuestions];
            })();
        if (cancelled) return;
        if (isCourseQuestionsMode) {
          setBank({
            id: null,
            courseId,
            name: `${scopeData?.title || "Course"} Questions`,
            status: scopeData?.status,
          });
        } else {
          setBank(scopeData);
        }
        setItems(questionPage.items || []);
        setPageInfo({
          page: questionPage.page,
          totalPages: questionPage.totalPages,
          totalItems: questionPage.totalItems,
        });
      } catch (err) {
        if (!cancelled) {
          const message = err?.message || "Could not load questions.";
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    bankId,
    courseId,
    isCourseQuestionsMode,
    page,
    pageSize,
    refreshKey,
    search,
    status,
    // toast is intentionally included; useToast() returns a stable reference (useMemo in ToastProvider.jsx).
    toast,
    type,
  ]);

  /** Mở modal tạo câu hỏi mới trong scope hiện tại. */
  function openCreateQuestionModal() {
    setQuestionFormModal({ questionId: null });
  }

  /** Mở modal chỉnh sửa theo ID câu hỏi. */
  function openEditQuestionModal(questionId) {
    setQuestionFormModal({ questionId });
  }

  /** Đóng modal câu hỏi và làm sạch selection. */
  function closeQuestionFormModal() {
    setQuestionFormModal(null);
  }

  /** Đóng form và tải lại danh sách sau khi lưu thành công. */
  function handleQuestionSaved() {
    closeQuestionFormModal();
    setRefreshKey((key) => key + 1);
  }

  async function handleArchive(question) {
    if (!writable || !question?.questionId) return;
    setArchivingId(question.questionId);
    try {
      if (isCourseQuestionsMode) {
        await questionBankService.archiveCourseQuestion(
          courseId,
          question.questionId,
        );
      } else {
        await questionBankService.archiveQuestion(question.questionId);
      }
      toast.success("Question archived");
      setPendingArchive(null);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast.error(err?.message || "Could not archive question.");
    } finally {
      setArchivingId(null);
    }
  }

  /** Xuất danh sách câu hỏi course-wide đã lọc thành CSV. */
  async function handleExport() {
    if (!isCourseQuestionsMode || !courseId) return;
    try {
      const exportParams = {
        search: search.trim() || undefined,
      };
      const response = await questionBankService.exportCourseQuestions(
        courseId,
        exportParams,
      );
      const blob = response instanceof Blob ? response : response?.data;
      if (!blob) throw new Error("No export file returned.");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "course-questions.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err?.message || "Could not export questions.");
    }
  }

  /** Khôi phục question bank archived về draft hoặc approved. */
  async function handleRestore(targetStatus) {
    if (!writable || !bankId) return;
    try {
      await questionBankService.restoreBank(bankId, targetStatus);
      toast.success(
        targetStatus === "approved"
          ? "Question bank restored and approved"
          : "Question bank restored to draft",
      );
      setRestoreModalOpen(false);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast.error(err?.message || "Could not restore question bank.");
    }
  }

  const isBankArchived = !isCourseQuestionsMode && bank?.status === "archived";
  const canEditQuestion = writable && !isBankArchived;
  const courseBasePath = location.pathname.startsWith("/staff/")
    ? "/staff/courses"
    : "/admin/courses";
  // Trainer mở bank từ class curriculum qua ?returnTo=...; chỉ nhận path nội bộ.
  const rawReturnTo = searchParams.get("returnTo");
  const safeReturnTo =
    rawReturnTo &&
    rawReturnTo.startsWith("/") &&
    !rawReturnTo.startsWith("//") &&
    !rawReturnTo.includes("://")
      ? rawReturnTo
      : null;
  const backPath = safeReturnTo
    ? safeReturnTo
    : isCourseQuestionsMode
      ? `${courseBasePath}/${courseId}/content`
      : "/admin/question-banks";
  const title = isCourseQuestionsMode
    ? "Course questions"
    : bank?.name || "Question bank";
  const aiDraftPath = isCourseQuestionsMode
    ? `${courseBasePath}/${courseId}/questions/ai-drafts/new`
    : `/admin/question-banks/${bankId}/ai-drafts/new`;

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <Button to={backPath} variant="ghost" size="sm">
            {isCourseQuestionsMode ? "Back to curriculum" : "Back to banks"}
          </Button>
          <h1 className="admin-page__title question-bank-detail__title">
            {title}
          </h1>
        </div>
        {writable && !isBankArchived && (
          <div className="question-bank-detail__actions">
            <Button
              to={aiDraftPath}
              variant="secondary"
              leftIcon={<Sparkles size={16} />}
            >
              Generate AI drafts
            </Button>
            {isCourseQuestionsMode && (
              <Button
                variant="secondary"
                leftIcon={<Download size={16} />}
                onClick={handleExport}
              >
                Export
              </Button>
            )}
            <Button
              variant="secondary"
              leftIcon={<Upload size={16} />}
              onClick={() => setImportOpen(true)}
            >
              Import
            </Button>
            <Button
              leftIcon={<Plus size={16} />}
              onClick={openCreateQuestionModal}
            >
              Create question
            </Button>
          </div>
        )}
        {writable && isBankArchived && (
          <Button
            variant="secondary"
            leftIcon={<RotateCcw size={16} />}
            onClick={() => setRestoreModalOpen(true)}
          >
            Restore
          </Button>
        )}
      </header>

      {isBankArchived && (
        <Alert
          tone="warning"
          title="This question bank is archived."
          className="question-bank-detail__section"
          action={
            writable ? (
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<RotateCcw size={14} />}
                onClick={() => setRestoreModalOpen(true)}
              >
                Restore question bank
              </Button>
            ) : null
          }
        >
          All questions and media are read-only. Restore the bank to make changes again.
        </Alert>
      )}

      {bank && !isCourseQuestionsMode && (
        <section className="admin-card question-bank-detail__section">
          <div className="admin-toolbar question-bank-detail__meta">
            <span>
              <strong>Status:</strong>{" "}
              <StatusBadge status={bank.status} />
            </span>
            <span>
              <strong>Questions:</strong>{" "}
              {bank.questionCount ?? pageInfo.totalItems}
            </span>
            <span>
              <strong>Updated:</strong>{" "}
              {formatDate(bank.updatedAt || bank.createdAt)}
            </span>
          </div>
        </section>
      )}

      {importOpen && (
        <QuestionImportModal
          variant="inline"
          bank={bank}
          courseId={isCourseQuestionsMode ? courseId : undefined}
          existingQuestions={items}
          onClose={() => setImportOpen(false)}
          onImported={() => setRefreshKey((key) => key + 1)}
        />
      )}

      <section className="admin-card admin-card--flush admin-card--filterable">
        <QuestionBankFilters
          search={search}
          type={type}
          status={status}
          moduleFilter="all"
          modules={[]}
          showModuleFilter={false}
          onSearchChange={(nextSearch) => {
            setSearch(nextSearch);
            setPage(0);
          }}
          onApply={(nextFilters) => {
            setType(nextFilters.type);
            setStatus(nextFilters.status);
            setPage(0);
          }}
          onClear={clearQuestionFilters}
        />
        {loading ? (
          <LoadingState label="Loading questions..." />
        ) : error ? (
          <ErrorState title="Could not load questions" description={error} />
        ) : items.length === 0 ? (
          <EmptyState title="No questions match the current filters" />
        ) : isCourseQuestionsMode ? (
            <Table
              className="admin-table-wrapper"
              tableClassName="admin-table"
              ariaLabel="Course questions"
            >
                <thead>
                  <tr>
                    <th>Id</th>
                    <th>Question Title</th>
                    <th>Media</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((question, index) => {
                    const questionNumber = page * pageSize + index + 1;
                    const questionId = question.questionId || question.id;
                    const { images } = normalizeQuestionMedia(question);
                    const firstImage = images[0];
                    const firstImageUrl = firstImage ? questionMediaUrl(firstImage) : "";
                    const firstImageTitle = `Question ${questionNumber} image 1`;
                    return (
                      <tr key={questionId}>
                        <td data-label="Id">{questionNumber}</td>
                        <td data-label="Question Title">
                          <div
                            className="question-rich-text-viewer"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeQuestionHtml(
                                question.questionText,
                              ),
                            }}
                          />
                        </td>
                        <td data-label="Media">
                          {firstImageUrl ? (
                            <button
                              type="button"
                              className="question-module-media-thumb"
                              onClick={() =>
                                setImagePreview({
                                  url: firstImageUrl,
                                  title: firstImageTitle,
                                  fileName: questionMediaName(
                                    firstImage,
                                    firstImageTitle,
                                  ),
                                })
                              }
                            >
                              <img
                                src={firstImageUrl}
                                alt={questionMediaName(
                                  firstImage,
                                  firstImageTitle,
                                )}
                              />
                              {images.length > 1 && (
                                <span>+{images.length - 1}</span>
                              )}
                            </button>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td data-label="Type">
                          {questionTypeLabel(question.questionType)}
                        </td>
                        <td data-label="Status">
                          <StatusBadge status={question.status} />
                        </td>
                        <td data-label="Actions">
                          {canEditQuestion &&
                            question.status !== "archived" && (
                              <div className="admin-table__actions">
                                <IconButton
                                  icon={<Edit2 size={15} />}
                                  label={`Edit question ${questionNumber}`}
                                  onClick={() =>
                                    openEditQuestionModal(questionId)
                                  }
                                />
                                <IconButton
                                  icon={<Archive size={15} />}
                                  label={`Archive question ${questionNumber}`}
                                  variant="danger"
                                  disabled={archivingId === questionId}
                                  onClick={() => setPendingArchive(question)}
                                />
                              </div>
                            )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
            </Table>
          ) : (
            <div className="question-card-list">
              {items.map((question, index) => {
                const answers = [...(question.answers || [])].sort(
                  (left, right) =>
                    (left.displayOrder ?? left.orderIndex ?? 0) -
                    (right.displayOrder ?? right.orderIndex ?? 0),
                );
                const questionNumber = page * pageSize + index + 1;
                const questionId = question.questionId || question.id;
                const { images, audios, videos } =
                  normalizeQuestionMedia(question);
                const visibleImages = images.slice(0, 3);
                return (
                  <article className="question-card" key={questionId}>
                    <div className="question-card__header">
                      <div>
                        <div className="question-card__eyebrow">
                          <span>Question {questionNumber}</span>
                          <StatusBadge status={question.status} />
                        </div>
                        <div
                          className="question-card__title question-rich-text-viewer"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeQuestionHtml(question.questionText),
                          }}
                        />
                      </div>
                      {canEditQuestion && question.status !== "archived" && (
                        <div className="question-card__actions">
                          <IconButton
                            icon={<Edit2 size={15} />}
                            label={`Edit question ${questionNumber}`}
                            onClick={() => openEditQuestionModal(questionId)}
                          />
                          <IconButton
                            icon={<Archive size={15} />}
                            label={`Archive question ${questionNumber}`}
                            variant="danger"
                            disabled={archivingId === questionId}
                            onClick={() => setPendingArchive(question)}
                          />
                        </div>
                      )}
                    </div>
                    <div className="question-card__meta">
                      <span>
                        {questionTypeLabel(question.questionType)}
                      </span>
                      <span>
                        Updated:{" "}
                        {formatDate(question.updatedAt || question.createdAt)}
                      </span>
                    </div>
                    {images.length > 0 && (
                      <div
                        className={`question-card__image-gallery ${images.length === 1 ? "question-card__image-gallery--single" : ""}`}
                      >
                        {visibleImages.map((image, imageIndex) => {
                          const url = questionMediaUrl(image);
                          const title = `Question ${questionNumber} image ${imageIndex + 1}`;
                          return (
                            <button
                              type="button"
                              className="question-card__image-wrap question-card__image-wrap--button"
                              key={
                                image.attachmentId ||
                                image.id ||
                                url ||
                                imageIndex
                              }
                              onClick={() =>
                                setImagePreview({
                                  url,
                                  title,
                                  fileName: questionMediaName(image, title),
                                })
                              }
                            >
                              <img
                                src={url}
                                alt={questionMediaName(image, title)}
                                className="question-card__image"
                              />
                              {imageIndex === visibleImages.length - 1 &&
                                images.length > visibleImages.length && (
                                  <span className="question-card__image-count">
                                    +{images.length - visibleImages.length}
                                  </span>
                                )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {audios.length > 0 && (
                      <div
                        className="question-card__audio-list"
                        aria-label={`Question ${questionNumber} audio attachments`}
                      >
                        {audios.map((audio, audioIndex) => {
                          const url = questionMediaUrl(audio);
                          return (
                            <div
                              className="question-card__audio-player"
                              key={
                                audio.attachmentId ||
                                audio.id ||
                                url ||
                                audioIndex
                              }
                            >
                              <div className="question-card__audio-label">
                                <strong>Audio {audioIndex + 1}</strong>
                              </div>
                              <audio controls preload="metadata" src={url}>
                                <track kind="captions" />
                              </audio>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {videos.length > 0 && (
                      <div
                        className="question-card__video-list"
                        aria-label={`Question ${questionNumber} video attachments`}
                      >
                        {videos.map((video, videoIndex) => {
                          const url = questionMediaUrl(video);
                          return (
                            <div
                              className="question-card__video-player"
                              key={
                                video.attachmentId ||
                                video.id ||
                                url ||
                                videoIndex
                              }
                            >
                              <div className="question-card__video-label">
                                <strong>Video {videoIndex + 1}</strong>
                              </div>
                              <video controls preload="metadata" src={url}>
                                <track kind="captions" />
                              </video>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="question-card__answers">
                      {answers.map((answer, answerIndex) => {
                        const correct = Boolean(
                          answer.correct || answer.isCorrect,
                        );
                        return (
                          <div
                            className={`question-card__answer ${correct ? "question-card__answer--correct" : ""}`}
                            key={answer.answerId || answer.id || answerIndex}
                          >
                            <span
                              className="question-rich-text-viewer question-answer-rich-text"
                              dangerouslySetInnerHTML={{
                                __html: sanitizeAnswerHtml(answer.answerText),
                              }}
                            />
                            {correct && (
                              <span className="question-card__correct">
                                <CheckCircle2 size={15} /> Correct answer
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="question-card__explanation">
                      <strong>Explanation:</strong>
                      {question.explanation ? (
                        <div
                          className="question-rich-text-viewer"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeQuestionHtml(question.explanation),
                          }}
                        />
                      ) : (
                        "--"
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <Pagination
            page={pageInfo.page + 1}
            totalPages={pageInfo.totalPages}
            totalItems={pageInfo.totalItems}
            size={pageSize}
            disabled={loading}
            ariaLabel="Question list pagination"
            onPageChange={(nextPage) => setPage(nextPage - 1)}
            onSizeChange={(nextSize) => {
              setPage(0);
              setPageSize(nextSize);
            }}
          />
        </section>

      <AdminQuestionFormModal
        open={Boolean(questionFormModal)}
        bankId={bankId}
        courseId={isCourseQuestionsMode ? courseId : undefined}
        questionId={questionFormModal?.questionId}
        onClose={closeQuestionFormModal}
        onSaved={handleQuestionSaved}
      />
      <ConfirmDialog
        open={Boolean(pendingArchive)}
        title="Archive this question?"
        description="The question will become read-only until it is restored."
        confirmLabel="Archive"
        loading={Boolean(archivingId)}
        loadingLabel="Archiving..."
        onClose={() => setPendingArchive(null)}
        onConfirm={() => pendingArchive && handleArchive(pendingArchive)}
      />
      <QuestionImagePreviewModal
        preview={imagePreview}
        onClose={() => setImagePreview(null)}
      />
      <RestoreQuestionBankModal
        open={restoreModalOpen}
        bank={bank}
        onClose={() => setRestoreModalOpen(false)}
        onConfirm={handleRestore}
      />
    </div>
  );
}
