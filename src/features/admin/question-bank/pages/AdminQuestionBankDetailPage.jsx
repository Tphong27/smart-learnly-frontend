import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Archive,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Plus,
  RotateCcw,
  Search,
  Upload,
} from "lucide-react";
import { Button, FormField, Modal, useToast } from "@/shared/components/ui";
import { AdminFilterToolbar } from "@/features/admin/components/AdminFilterToolbar";
import Pagination from "@/shared/components/Pagination";
import { sanitizeAnswerHtml, sanitizeQuestionHtml } from "@/shared/utils/htmlSanitizer";
import { auditLogService, courseService, getCurrentUser, questionBankService } from "@/services";
import { formatDate } from "@/shared/utils/formatters";
import { DEFAULT_PAGE_SIZE } from "@/shared/constants/pagination";
import "../../admin-shared.css";
import "./question-bank.css";
import { QuestionImportModal } from "../components/QuestionImportModal";
import { AdminQuestionFormModal } from "./AdminQuestionFormPage";

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
  const videos = sortedAttachments.filter(
    (item) => String(item.mediaType || '').toLowerCase() === 'video' && mediaUrl(item),
  );

  return { images, audios, videos };
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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [refreshKey, setRefreshKey] = useState(0);
  const [archivingId, setArchivingId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [questionFormModal, setQuestionFormModal] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("questions");
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState(null);
  const [activityTotalItems, setActivityTotalItems] = useState(0);
  const [activityPage, setActivityPage] = useState(0);
  const ACTIVITY_PAGE_SIZE = 10;

  function clearQuestionFilters() {
    setSearch("");
    setModuleId("all");
    setType("all");
    setStatus("all");
    setDifficulty("all");
    setPage(0);
  }

  useEffect(() => {
    if (activeTab !== "activity" || !bankId) return;
    let cancelled = false;
    (async () => {
      setActivityLoading(true);
      setActivityError(null);
      try {
        const data = await auditLogService.list({
          targetType: "QUESTION_BANK",
          targetId: bankId,
          page: activityPage,
          size: ACTIVITY_PAGE_SIZE,
        });
        if (cancelled) return;
        setActivity(data.items || []);
        setActivityTotalItems(data.totalItems || 0);
      } catch (err) {
        if (!cancelled) {
          const message = err?.message || "Could not load activity.";
          setActivityError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, bankId, activityPage, refreshKey, toast]);

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
            size: pageSize,
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
    pageSize,
    refreshKey,
    search,
    status,
    // toast is intentionally included; useToast() returns a stable reference (useMemo in ToastProvider.jsx).
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

  async function handleRestore(targetStatus) {
    if (!writable || !bankId) return;
    try {
      await questionBankService.restoreBank(bankId, targetStatus);
      toast.success(
        targetStatus === "approved"
          ? "Question bank restored and approved"
          : "Question bank restored to draft"
      );
      setRestoreModalOpen(false);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast.error(err?.message || "Could not restore question bank.");
    }
  }

  const isBankArchived = bank?.status === "archived";
  const canEditQuestion = writable && !isBankArchived;

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <Button
            to="/admin/question-banks"
            variant="ghost"
            size="sm"
          >
            Back to banks
          </Button>
          <h1 className="admin-page__title" style={{ marginTop: 8 }}>
            {bank?.name || "Question bank"}
          </h1>
        </div>
        {writable && !isBankArchived && (
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
        <section
          className="admin-card"
          style={{
            marginBottom: 18,
            borderLeft: "4px solid #f59e0b",
            background: "#fffbeb",
          }}
          role="alert"
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <AlertTriangle size={20} style={{ color: "#b45309", flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <strong style={{ color: "#92400e" }}>
                This question bank is archived.
              </strong>
              <p style={{ margin: "4px 0 8px", color: "#78350f", fontSize: 14 }}>
                All questions and media are read-only. Restore the bank to make
                changes again.
              </p>
              {writable && (
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<RotateCcw size={14} />}
                  onClick={() => setRestoreModalOpen(true)}
                >
                  Restore question bank
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

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

      <nav
        className="admin-card admin-card--flush"
        style={{ marginBottom: 18, padding: 0 }}
        aria-label="Detail sections"
      >
        <div className="admin-toolbar" style={{ padding: 0, gap: 4 }}>
          <button
            type="button"
            className={`admin-tab ${activeTab === "questions" ? "is-active" : ""}`}
            onClick={() => setActiveTab("questions")}
            aria-pressed={activeTab === "questions"}
          >
            Questions ({pageInfo.totalItems})
          </button>
          <button
            type="button"
            className={`admin-tab ${activeTab === "activity" ? "is-active" : ""}`}
            onClick={() => setActiveTab("activity")}
            aria-pressed={activeTab === "activity"}
          >
            Activity
          </button>
        </div>
      </nav>

      {activeTab === "questions" && (
      <section className="admin-card admin-card--flush admin-card--filterable">
        <AdminFilterToolbar
          ariaLabel="Question search and filters"
          search={(
            <FormField
              id="question-list-search"
              aria-label="Search questions"
              placeholder="Search questions..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              leftIcon={<Search size={16} />}
            />
          )}
          fields={[
            {
              name: "moduleId",
              label: "Module",
              type: "select",
              value: moduleId,
              defaultValue: "all",
              options: [
                { value: "all", label: "All modules" },
                ...modules.map((module) => ({ value: module.id, label: module.title })),
              ],
            },
            {
              name: "type",
              label: "Question type",
              type: "select",
              value: type,
              defaultValue: "all",
              options: [
                { value: "all", label: "All types" },
                { value: "multiple_choice", label: "Multiple choice" },
                { value: "true_false", label: "True/False" },
              ],
            },
            {
              name: "status",
              label: "Status",
              type: "select",
              value: status,
              defaultValue: "all",
              options: [
                { value: "all", label: "All statuses" },
                { value: "draft", label: "Draft" },
                { value: "approved", label: "Approved" },
                { value: "archived", label: "Archived" },
              ],
            },
            {
              name: "difficulty",
              label: "Difficulty",
              type: "select",
              value: difficulty,
              defaultValue: "all",
              options: [
                { value: "all", label: "All difficulties" },
                ...[1, 2, 3, 4, 5].map((level) => ({ value: String(level), label: String(level) })),
              ],
            },
          ]}
          activeFilterCount={[
            moduleId !== "all",
            type !== "all",
            status !== "all",
            difficulty !== "all",
          ].filter(Boolean).length}
          canClear={Boolean(
            search.trim()
            || moduleId !== "all"
            || type !== "all"
            || status !== "all"
            || difficulty !== "all"
          )}
          resultLabel={`${pageInfo.totalItems} questions`}
          onApply={(nextFilters) => {
            setModuleId(nextFilters.moduleId);
            setType(nextFilters.type);
            setStatus(nextFilters.status);
            setDifficulty(nextFilters.difficulty);
            setPage(0);
          }}
          onClear={clearQuestionFilters}
        />

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
              const questionNumber = page * pageSize + index + 1;
              const questionId = question.questionId || question.id;
              const moduleLabel =
                moduleNameById.get(question.moduleId) || "No module";
              const { images, audios, videos } = normalizeQuestionMedia(question);
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
                    {canEditQuestion && question.status !== "archived" && (
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
                  {videos.length > 0 && (
                    <div className="question-card__video-list" aria-label={`Question ${questionNumber} video attachments`}>
                      {videos.map((video, videoIndex) => {
                        const url = mediaUrl(video);
                        return (
                          <div
                            className="question-card__video-player"
                            key={video.attachmentId || video.id || url || videoIndex}
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
                    <strong>Explanation:</strong> {question.explanation || "--"}
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
      )}

      {activeTab === "activity" && (
        <section className="admin-card admin-card--flush" aria-label="Bank activity log">
          <div className="admin-toolbar" style={{ padding: 0 }}>
            <strong>Activity log</strong>
            <span style={{ color: "#64748b", fontSize: 13 }}>
              {activityTotalItems} events
            </span>
          </div>
          {activityLoading ? (
            <div className="admin-loading">Loading activity...</div>
          ) : activityError ? (
            <div className="admin-error">{activityError}</div>
          ) : activity.length === 0 ? (
            <div className="admin-empty">
              No activity recorded for this bank yet.
            </div>
          ) : (
            <>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Result</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.map((log) => (
                    <tr key={log.auditLogId || log.id}>
                      <td>{formatDate(log.occurredAt)}</td>
                      <td>{log.actorEmail || "System"}</td>
                      <td>
                        <span className="admin-status admin-status--draft">
                          {log.action}
                        </span>
                      </td>
                      <td>{log.result}</td>
                      <td>{log.summary || log.actorRole || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                page={activityPage + 1}
                totalPages={Math.max(1, Math.ceil(activityTotalItems / ACTIVITY_PAGE_SIZE))}
                totalItems={activityTotalItems}
                size={ACTIVITY_PAGE_SIZE}
                disabled={activityLoading}
                ariaLabel="Question bank activity pagination"
                onPageChange={(nextPage) => setActivityPage(nextPage - 1)}
              />
            </>
          )}
        </section>
      )}

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
      <RestoreBankModal
        open={restoreModalOpen}
        bank={bank}
        onClose={() => setRestoreModalOpen(false)}
        onConfirm={handleRestore}
      />
    </div>
  );
}

function RestoreBankModal({ open, bank, onClose, onConfirm }) {
  return (
    <RestoreBankModalContent key={open ? "open" : "closed"} open={open} bank={bank} onClose={onClose} onConfirm={onConfirm} />
  );
}

function RestoreBankModalContent({ open, bank, onClose, onConfirm }) {
  const [targetStatus, setTargetStatus] = useState("draft");
  return (
    <Modal open={open} title="Restore question bank" size="sm" onClose={onClose}>
      <p style={{ marginTop: 0, color: "#475569" }}>
        Restore <strong>{bank?.name || "this question bank"}</strong> so it can
        be edited again. Choose the status to apply after restoring.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="radio"
            name="restore-target-detail"
            value="draft"
            checked={targetStatus === "draft"}
            onChange={() => setTargetStatus("draft")}
          />
          <span>Restore as <strong>Draft</strong> (still needs review)</span>
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="radio"
            name="restore-target-detail"
            value="approved"
            checked={targetStatus === "approved"}
            onChange={() => setTargetStatus("approved")}
          />
          <span>Restore as <strong>Approved</strong> (ready to use)</span>
        </label>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="button" leftIcon={<RotateCcw size={15} />} onClick={() => onConfirm(targetStatus)}>
          Restore
        </Button>
      </div>
    </Modal>
  );
}







