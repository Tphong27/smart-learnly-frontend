import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  Edit2,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { Button, FormField, Modal, useToast } from "@/shared/components/ui";
import { sanitizeAnswerHtml, sanitizeQuestionHtml } from "@/shared/utils/htmlSanitizer";
import { courseService, getCurrentUser, questionBankService } from "@/services";
import { formatDate } from "@/shared/utils/formatters";
import { DEFAULT_PAGE_SIZE } from "@/shared/constants/pagination";
import "../../admin-shared.css";
import "./question-bank.css";
import { QuestionImportModal } from "../components/QuestionImportModal";
import { AdminQuestionFormModal } from "./AdminQuestionFormPage";

const PAGE_SIZE = DEFAULT_PAGE_SIZE;

function canWriteQuestionBank() {
  const role = getCurrentUser()?.role;
  return role === "ADMIN" || role === "SME";
}

function normalizeModules(payload) {
  const root = payload?.data ?? payload;
  const items = Array.isArray(root)
    ? root
    : (root?.items ?? root?.content ?? root?.sections ?? []);
  return items
    .map((item, index) => ({
      id: item.sectionId || item.id,
      title: item.title || item.name || 'Module ' + (index + 1),
    }))
    .filter((item) => item.id);
}

function mediaUrl(item) {
  return item?.mediaUrl || item?.fileUrl || item?.url || null;
}

function mediaName(item, fallback) {
  return item?.fileName || item?.originalFileName || item?.name || fallback;
}

function normalizeQuestionMedia(question) {
  const attachments = Array.isArray(question?.mediaAttachments)
    ? question.mediaAttachments
    : [];
  const sortedAttachments = [...attachments].sort(
    (left, right) =>
      (left.displayOrder ?? left.orderIndex ?? 0) -
      (right.displayOrder ?? right.orderIndex ?? 0),
  );
  const images = sortedAttachments.filter(
    (item) => String(item.mediaType || '').toLowerCase() === 'image' && mediaUrl(item),
  );
  const audios = sortedAttachments.filter(
    (item) => String(item.mediaType || '').toLowerCase() === 'audio' && mediaUrl(item),
  );

  return { images, audios };
}

export function AdminQuestionBankDetailPage() {
  const { bankId } = useParams();
  const toast = useToast();
  const writable = canWriteQuestionBank();
  const [bank, setBank] = useState(null);
  const [modules, setModules] = useState([]);
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
  const [difficulty, setDifficulty] = useState("all");
  const [moduleId, setModuleId] = useState("all");
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [archivingId, setArchivingId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [questionFormModal, setQuestionFormModal] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const bankData = await questionBankService.getBank(bankId);
        if (cancelled) return;
        setBank(bankData);

        const [moduleData, questionPage] = await Promise.all([
          bankData?.courseId
            ? courseService.getCourseContent(bankData.courseId)
            : Promise.resolve([]),
          questionBankService.listQuestions({
            bankId,
            search: search.trim() || undefined,
            type: type === "all" ? undefined : type,
            status: status === "all" ? undefined : status,
            difficulty: difficulty === "all" ? undefined : difficulty,
            moduleId: moduleId === "all" ? undefined : moduleId,
            page,
            size: PAGE_SIZE,
          }),
        ]);
        if (cancelled) return;
        setModules(normalizeModules(moduleData));
        setItems(questionPage.items || []);
        setPageInfo({
          page: questionPage.page,
          totalPages: questionPage.totalPages,
          totalItems: questionPage.totalItems,
        });
      } catch (err) {
        if (!cancelled) {
          const message = err?.message || "Could not load question bank.";
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
    difficulty,
    moduleId,
    page,
    refreshKey,
    search,
    status,
    toast,
    type,
  ]);

  const moduleNameById = useMemo(
    () => new Map(modules.map((module) => [module.id, module.title])),
    [modules],
  );

  function openCreateQuestionModal() {
    setQuestionFormModal({ questionId: null });
  }

  function openEditQuestionModal(questionId) {
    setQuestionFormModal({ questionId });
  }

  function closeQuestionFormModal() {
    setQuestionFormModal(null);
  }

  function handleQuestionSaved() {
    closeQuestionFormModal();
    setRefreshKey((key) => key + 1);
  }

  async function handleArchive(question) {
    if (!writable || !question?.questionId) return;
    const confirmed = window.confirm("Archive this question?");
    if (!confirmed) return;
    setArchivingId(question.questionId);
    try {
      await questionBankService.archiveQuestion(question.questionId);
      toast.success("Question archived");
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast.error(err?.message || "Could not archive question.");
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <Link
            to="/admin/question-banks"
            className="button button--ghost button--sm"
          >
            Back to banks
          </Link>
          <h1 className="admin-page__title" style={{ marginTop: 8 }}>
            {bank?.name || "Question bank"}
          </h1>
        </div>
        {writable && bank?.status !== "archived" && (
          <div style={{ display: "inline-flex", gap: 10 }}>
            <Button
              variant="secondary"
              leftIcon={<Upload size={16} />}
              onClick={() => setImportOpen(true)}
            >
              Import
            </Button>
            <Button leftIcon={<Plus size={16} />} onClick={openCreateQuestionModal}>
              Create question
            </Button>
          </div>
        )}
      </header>

      {bank && (
        <section className="admin-card" style={{ marginBottom: 18 }}>
          <div className="admin-toolbar" style={{ padding: 0 }}>
            <span>
              <strong>Status:</strong>{" "}
              <span className={`admin-status admin-status--${bank.status}`}>
                {bank.status}
              </span>
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

      <section className="admin-card admin-card--flush">
        <div className="admin-toolbar">
          <div className="admin-toolbar__filters">
            <div className="admin-toolbar__search">
              <FormField
                placeholder="Search questions..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                leftIcon={<Search size={16} />}
              />
            </div>
            <select
              className="admin-toolbar__select"
              value={moduleId}
              onChange={(event) => {
                setModuleId(event.target.value);
                setPage(0);
              }}
            >
              <option value="all">All modules</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
            <select
              className="admin-toolbar__select"
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setPage(0);
              }}
            >
              <option value="all">All types</option>
              <option value="multiple_choice">Multiple choice</option>
              <option value="true_false">True/False</option>
            </select>
            <select
              className="admin-toolbar__select"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(0);
              }}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </select>
            <select
              className="admin-toolbar__select"
              value={difficulty}
              onChange={(event) => {
                setDifficulty(event.target.value);
                setPage(0);
              }}
            >
              <option value="all">All difficulty</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>
          <span style={{ color: "#64748b", fontSize: 13 }}>
            {pageInfo.totalItems} questions
          </span>
        </div>

        {loading ? (
          <div className="admin-loading">Loading questions...</div>
        ) : error ? (
          <div className="admin-error">{error}</div>
        ) : items.length === 0 ? (
          <div className="admin-empty">
            No questions match the current filters.
          </div>
        ) : (
          <div className="question-card-list">
            {items.map((question, index) => {
              const answers = [...(question.answers || [])].sort(
                (left, right) =>
                  (left.displayOrder ?? left.orderIndex ?? 0) -
                  (right.displayOrder ?? right.orderIndex ?? 0),
              );
              const questionNumber = page * PAGE_SIZE + index + 1;
              const questionId = question.questionId || question.id;
              const moduleLabel =
                moduleNameById.get(question.moduleId) || "No module";
              const { images, audios } = normalizeQuestionMedia(question);
              const visibleImages = images.slice(0, 3);
              return (
                <article className="question-card" key={questionId}>
                  <div className="question-card__header">
                    <div>
                      <div className="question-card__eyebrow">
                        <span>Question {questionNumber}</span>
                        <span className="question-card__tag">
                          {moduleLabel}
                        </span>
                        <span
                          className={`admin-status admin-status--${question.status}`}
                        >
                          {question.status}
                        </span>
                      </div>
                      <div
                        className="question-card__title question-rich-text-viewer"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeQuestionHtml(question.questionText),
                        }}
                      />
                    </div>
                    {writable && question.status !== "archived" && (
                      <div className="question-card__actions">
                        <button
                          type="button"
                          className="admin-table__icon-btn"
                          title="Edit"
                          onClick={() => openEditQuestionModal(questionId)}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="admin-table__icon-btn admin-table__icon-btn--danger"
                          title="Archive"
                          disabled={archivingId === questionId}
                          onClick={() => handleArchive(question)}
                        >
                          <Archive size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="question-card__meta">
                    <span>
                      {question.questionType === "true_false"
                        ? "True/False"
                        : "Multiple choice"}
                    </span>
                    <span>Difficulty: {question.difficulty ?? "--"}</span>
                    <span>
                      Updated:{" "}
                      {formatDate(question.updatedAt || question.createdAt)}
                    </span>
                  </div>
                  {images.length > 0 && (
                    <div className={`question-card__image-gallery ${images.length === 1 ? "question-card__image-gallery--single" : ""}`}>
                      {visibleImages.map((image, imageIndex) => {
                        const url = mediaUrl(image);
                        const title = `Question ${questionNumber} image ${imageIndex + 1}`;
                        return (
                          <button
                            type="button"
                            className="question-card__image-wrap question-card__image-wrap--button"
                            key={image.attachmentId || image.id || url || imageIndex}
                            onClick={() => setImagePreview({ url, title, fileName: mediaName(image, title) })}
                          >
                            <img src={url} alt={mediaName(image, title)} className="question-card__image" />
                            {imageIndex === visibleImages.length - 1 && images.length > visibleImages.length && (
                              <span className="question-card__image-count">+{images.length - visibleImages.length}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {audios.length > 0 && (
                    <div className="question-card__audio-list" aria-label={`Question ${questionNumber} audio attachments`}>
                      {audios.map((audio, audioIndex) => {
                        const url = mediaUrl(audio);
                        return (
                          <div
                            className="question-card__audio-player"
                            key={audio.attachmentId || audio.id || url || audioIndex}
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
                    <strong>Explanation:</strong> {question.explanation || "--"}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {pageInfo.totalPages > 1 && (
          <div className="admin-pagination">
            <span>
              Page {pageInfo.page + 1} / {pageInfo.totalPages}
            </span>
            <div className="admin-pagination__controls">
              <Button
                size="sm"
                variant="secondary"
                disabled={page <= 0}
                onClick={() => setPage((value) => Math.max(0, value - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page + 1 >= pageInfo.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>

      <AdminQuestionFormModal
        open={Boolean(questionFormModal)}
        bankId={bankId}
        questionId={questionFormModal?.questionId}
        onClose={closeQuestionFormModal}
        onSaved={handleQuestionSaved}
      />
      <QuestionImportModal
        open={importOpen}
        bank={bank}
        existingQuestions={items}
        onClose={() => setImportOpen(false)}
        onImported={() => setRefreshKey((key) => key + 1)}
      />
      <Modal
        open={Boolean(imagePreview)}
        title={imagePreview?.title || "Question image"}
        size="xl"
        onClose={() => setImagePreview(null)}
      >
        {imagePreview?.url && (
          <div className="question-card__image-modal">
            <img src={imagePreview.url} alt={imagePreview.title || "Question attachment"} />
            {imagePreview.fileName && (
              <p className="question-card__media-modal-name">{imagePreview.fileName}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}







