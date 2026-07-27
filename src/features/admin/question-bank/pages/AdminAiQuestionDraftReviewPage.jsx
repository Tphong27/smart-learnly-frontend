import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Edit2,
  Eye,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react"
import { Button, Modal, useToast } from "@/shared/components/ui"
import { courseService, getCurrentUser, questionBankService } from "@/services"
import {
  sanitizeAnswerHtml,
  sanitizeQuestionHtml,
} from "@/shared/utils/htmlSanitizer"
import {
  AI_DRAFT_BATCH_PROCESSING_STATUSES,
  AI_DRAFT_READY_STATUSES,
  AI_DRAFT_REJECT_REASONS,
  aiQuestionTypeLabel,
  canDraftBeSelected,
  evidenceIsUnsuitable,
  evidenceNeedsReview,
  normalizeAiBatch,
  validationStatusLabel,
} from "../utils/aiQuestionDrafts"
import "../../admin-shared.css"
import "./question-bank.css"

function canWriteQuestionBank() {
  const role = getCurrentUser()?.role
  return role === "ADMIN" || role === "SME"
}

function normalizeModules(payload) {
  const root = payload?.data ?? payload
  const items = Array.isArray(root)
    ? root
    : (root?.items ?? root?.content ?? root?.sections ?? [])
  return items
    .map((item, index) => ({
      id: item.moduleId || item.sectionId || item.id,
      title: item.title || item.name || `Module ${index + 1}`,
    }))
    .filter((item) => item.id)
}

function sourceKindLabel(kind) {
  if (kind === "transcript") return "Transcript"
  if (kind === "temporary_file") return "Document"
  if (kind === "pasted_text") return "Pasted text"
  return "Source"
}

function formatBytes(value) {
  const bytes = Number(value || 0)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatEvidenceTime(startMs, endMs) {
  if (startMs == null && endMs == null) return null
  return `${formatMillis(startMs)}-${formatMillis(endMs)}`
}

function formatMillis(value) {
  const seconds = Math.floor(Math.max(0, Number(value || 0)) / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
}

function sortedAnswers(draft) {
  return [...(draft.answers || [])].sort(
    (left, right) => (left.displayOrder ?? 0) - (right.displayOrder ?? 0),
  )
}

function draftValidationError(values) {
  const questionText = values.questionText.trim()
  if (!questionText) return "Question text is required."
  if (!values.moduleId) return "Module is required."
  const answers = sortedAnswers(values)
  if (values.questionType === "multiple_choice") {
    if (answers.length < 2 || answers.length > 6) return "MCQ needs 2 to 6 answers."
    if (answers.some((answer) => !String(answer.answerText || "").trim())) {
      return "Answer text must not be empty."
    }
  }
  if (values.questionType === "true_false") {
    const labels = answers.map((answer) => String(answer.answerText || "").trim().toLowerCase())
    if (answers.length !== 2 || !labels.includes("true") || !labels.includes("false")) {
      return "True/False answers must be exactly True and False."
    }
  }
  if (answers.filter((answer) => answer.correct).length !== 1) {
    return "Exactly one correct answer is required."
  }
  return null
}

function buildDraftPayload(values) {
  return {
    version: values.version,
    questionText: values.questionText.trim(),
    explanation: values.explanation.trim() || null,
    moduleId: values.moduleId || null,
    answers: sortedAnswers(values).map((answer, index) => ({
      answerText: String(answer.answerText || "").trim(),
      correct: Boolean(answer.correct),
      displayOrder: index + 1,
    })),
  }
}

export function AdminAiQuestionDraftReviewPage() {
  const { bankId, courseId, batchId } = useParams()
  const toast = useToast()
  const writable = canWriteQuestionBank()
  const isCourseQuestionsMode = Boolean(courseId)
  const backPath = isCourseQuestionsMode
    ? `/admin/courses/${courseId}/questions`
    : `/admin/question-banks/${bankId}`
  const [bank, setBank] = useState(null)
  const [modules, setModules] = useState([])
  const [batch, setBatch] = useState(null)
  const [selectedDraftIds, setSelectedDraftIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [addResult, setAddResult] = useState(null)
  const [editDraft, setEditDraft] = useState(null)
  const [rejectDraft, setRejectDraft] = useState(null)
  const [detailDraft, setDetailDraft] = useState(null)
  const [mutating, setMutating] = useState(false)
  const [downloadingSourceId, setDownloadingSourceId] = useState(null)

  async function loadBatch({ silent = false } = {}) {
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const [bankData, batchData] = await Promise.all([
        isCourseQuestionsMode
          ? courseService.getAdmin(courseId)
          : questionBankService.getBank(bankId),
        isCourseQuestionsMode
          ? questionBankService.getCourseAiDraftBatch(courseId, batchId)
          : questionBankService.getAiDraftBatch(bankId, batchId),
      ])
      const normalizedBatch = normalizeAiBatch(batchData)
      const normalizedBank = isCourseQuestionsMode
        ? {
            id: null,
            courseId,
            name: `${bankData?.title || "Course"} Questions`,
            status: bankData?.status,
          }
        : bankData
      setBank(normalizedBank)
      setBatch(normalizedBatch)
      setSelectedDraftIds((current) =>
        current.filter((draftId) =>
          normalizedBatch.drafts.some((draft) => draft.id === draftId && canDraftBeSelected(draft)),
        ),
      )
      const resolvedCourseId = isCourseQuestionsMode ? courseId : bankData?.courseId
      if (resolvedCourseId) {
        const moduleData = await courseService.getCourseContent(resolvedCourseId)
        setModules(normalizeModules(moduleData))
      }
    } catch (err) {
      setError(err?.message || "Could not load AI draft batch.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      loadBatch()
    })
    return () => window.cancelAnimationFrame(frameId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankId, batchId, courseId, isCourseQuestionsMode])

  useEffect(() => {
    if (!batch || !AI_DRAFT_BATCH_PROCESSING_STATUSES.has(batch.status)) return undefined
    const timerId = window.setInterval(() => {
      loadBatch({ silent: true })
    }, 5000)
    return () => window.clearInterval(timerId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch?.status, bankId, batchId, courseId, isCourseQuestionsMode])

  const moduleNameById = useMemo(
    () => new Map(modules.map((module) => [module.id, module.title])),
    [modules],
  )

  const draftCounts = useMemo(() => {
    const drafts = batch?.drafts || []
    return {
      total: drafts.length,
      valid: drafts.filter((draft) => draft.validationStatus === "valid").length,
      warning: drafts.filter((draft) => draft.validationStatus === "warning").length,
      invalid: drafts.filter((draft) => draft.validationStatus === "invalid").length,
      accepted: drafts.filter((draft) => draft.status === "accepted").length,
      rejected: drafts.filter((draft) => draft.status === "rejected").length,
    }
  }, [batch])

  const selectableDrafts = useMemo(
    () => (batch?.drafts || []).filter(canDraftBeSelected),
    [batch],
  )

  function toggleDraft(draftId) {
    setSelectedDraftIds((current) =>
      current.includes(draftId)
        ? current.filter((id) => id !== draftId)
        : [...current, draftId],
    )
  }

  function toggleAllSelectable() {
    if (selectedDraftIds.length === selectableDrafts.length) {
      setSelectedDraftIds([])
    } else {
      setSelectedDraftIds(selectableDrafts.map((draft) => draft.id))
    }
  }

  async function handleRetry() {
    setMutating(true)
    setActionError(null)
    try {
      const nextBatch = isCourseQuestionsMode
        ? await questionBankService.retryCourseAiDraftBatch(courseId, batchId)
        : await questionBankService.retryAiDraftBatch(bankId, batchId)
      setBatch(normalizeAiBatch(nextBatch))
      toast.success("Retry started")
    } catch (err) {
      setActionError(err?.message || "Could not retry this batch.")
      toast.error(err?.message || "Could not retry this batch.")
    } finally {
      setMutating(false)
    }
  }

  async function handleAddSelected() {
    if (!selectedDraftIds.length) return
    setMutating(true)
    setActionError(null)
    setAddResult(null)
    try {
      const drafts = selectedDraftIds
        .map((draftId) => batch?.drafts?.find((draft) => draft.id === draftId))
        .filter(Boolean)
      const result = isCourseQuestionsMode
        ? await questionBankService.addSelectedCourseAiDrafts(courseId, batchId, drafts)
        : await questionBankService.addSelectedAiDrafts(bankId, batchId, drafts)
      setAddResult(result)
      toast.success("Selected drafts processed")
      setSelectedDraftIds([])
      await loadBatch({ silent: true })
    } catch (err) {
      setActionError(err?.message || "Could not add selected drafts.")
      toast.error(err?.message || "Could not add selected drafts.")
    } finally {
      setMutating(false)
    }
  }

  async function handleSourceDownload(source) {
    const sourceId = source.sourceId || source.generationSourceId || source.id
    if (!sourceId) return
    setDownloadingSourceId(sourceId)
    setActionError(null)
    try {
      const response = isCourseQuestionsMode
        ? await questionBankService.createCourseAiDraftSourceDownloadUrl(courseId, batchId, sourceId)
        : await questionBankService.createAiDraftSourceDownloadUrl(bankId, batchId, sourceId)
      if (response?.url) {
        window.open(response.url, "_blank", "noopener,noreferrer")
      }
    } catch (err) {
      setActionError(err?.message || "Could not create source download URL.")
      toast.error(err?.message || "Could not create source download URL.")
    } finally {
      setDownloadingSourceId(null)
    }
  }

  async function handleEvidenceConfirmation(draft, suitable) {
    setMutating(true)
    setActionError(null)
    try {
      const requestPayload = {
        version: draft.version,
        evidenceStillFits: suitable,
      }
      if (isCourseQuestionsMode) {
        await questionBankService.confirmCourseAiDraftEvidence(courseId, batchId, draft.id, requestPayload)
      } else {
        await questionBankService.confirmAiDraftEvidence(bankId, batchId, draft.id, requestPayload)
      }
      toast.success(suitable ? "Evidence confirmed" : "Evidence marked unsuitable")
      await loadBatch({ silent: true })
    } catch (err) {
      setActionError(err?.message || "Could not confirm evidence.")
      toast.error(err?.message || "Could not confirm evidence.")
    } finally {
      setMutating(false)
    }
  }

  async function handleEditSave(values) {
    const validationError = draftValidationError(values)
    if (validationError) {
      setActionError(validationError)
      return
    }
    setMutating(true)
    setActionError(null)
    try {
      if (isCourseQuestionsMode) {
        await questionBankService.updateCourseAiDraft(courseId, batchId, values.id, buildDraftPayload(values))
      } else {
        await questionBankService.updateAiDraft(bankId, batchId, values.id, buildDraftPayload(values))
      }
      toast.success("Draft updated")
      setEditDraft(null)
      await loadBatch({ silent: true })
    } catch (err) {
      setActionError(err?.message || "Draft may have been updated by someone else. Please reload and try again.")
      toast.error(err?.message || "Could not update draft.")
    } finally {
      setMutating(false)
    }
  }

  async function handleRejectSave(payload) {
    if (!rejectDraft) return
    setMutating(true)
    setActionError(null)
    try {
      const requestPayload = {
        version: rejectDraft.version,
        reasonCode: payload.reason || null,
        note: payload.note?.trim() || null,
      }
      if (isCourseQuestionsMode) {
        await questionBankService.rejectCourseAiDraft(courseId, batchId, rejectDraft.id, requestPayload)
      } else {
        await questionBankService.rejectAiDraft(bankId, batchId, rejectDraft.id, requestPayload)
      }
      toast.success("Draft rejected")
      setRejectDraft(null)
      await loadBatch({ silent: true })
    } catch (err) {
      setActionError(err?.message || "Could not reject draft.")
      toast.error(err?.message || "Could not reject draft.")
    } finally {
      setMutating(false)
    }
  }

  if (!writable) {
    return (
      <div className="admin-page">
        <section className="admin-card">
          <h1 className="admin-page__title">Unauthorized</h1>
          <p className="ai-drafts-muted">
            Only Admin and SME users can review AI question drafts.
          </p>
          <Button to={backPath} variant="secondary">
            Back to questions
          </Button>
        </section>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">Loading AI draft batch...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-page">
        <section className="admin-card">
          <h1 className="admin-page__title">AI draft batch unavailable</h1>
          <p className="admin-error">{error}</p>
          <Button to={backPath} variant="secondary">
            Back to questions
          </Button>
        </section>
      </div>
    )
  }

  const processing = AI_DRAFT_BATCH_PROCESSING_STATUSES.has(batch?.status)
  const ready = AI_DRAFT_READY_STATUSES.has(batch?.status)
  const failed = batch?.status === "failed"
  const sourceChanged = Boolean(batch?.sourceChanged || batch?.sourceSnapshotChanged)

  return (
    <div className="admin-page ai-drafts-page">
      <header className="admin-page__header">
        <div>
          <Button
            to={backPath}
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft size={16} />}
          >
            Back
          </Button>
          <h1 className="admin-page__title" style={{ marginTop: 8 }}>
            Review AI draft questions
          </h1>
          <p className="ai-drafts-muted">
            {bank?.name || "Course questions"} · Batch {batch?.id || batchId}
          </p>
        </div>
        <div className="ai-drafts-header-actions">
          <span className={`admin-status admin-status--ai-${batch?.status}`}>
            {batch?.status}
          </span>
          {failed && (
            <Button
              variant="secondary"
              leftIcon={<RefreshCw size={16} />}
              onClick={handleRetry}
              loading={mutating}
              loadingLabel="Retrying..."
            >
              Retry
            </Button>
          )}
        </div>
      </header>

      {processing && (
        <section className="ai-drafts-alert" aria-live="polite">
          Generation is still processing. You can leave this page; the batch will keep running.
          {refreshing ? " Refreshing status..." : ""}
        </section>
      )}

      {sourceChanged && (
        <section className="ai-drafts-alert ai-drafts-alert--warning" role="alert">
          Source material has been updated after this batch was created. Evidence still uses the original snapshot for audit.
        </section>
      )}

      {batch?.sources?.length > 0 && (
        <section className="admin-card ai-source-review-card">
          <div className="ai-drafts-section-header">
            <div>
              <h2>Generation sources</h2>
              <p>These source snapshots were used for this batch and retry.</p>
            </div>
          </div>
          <div className="ai-source-list">
            {batch.sources.map((source) => {
              const sourceId = source.sourceId || source.generationSourceId || source.id
              return (
                <div className="ai-file-row" key={sourceId}>
                  <span>{sourceKindLabel(source.kind || source.sourceKind)}</span>
                  <span>{source.title || source.sourceName}</span>
                  <strong>
                    {source.normalizedCharCount
                      ? `${source.normalizedCharCount.toLocaleString()} chars`
                      : source.fileSizeBytes
                        ? formatBytes(source.fileSizeBytes)
                        : source.version || "--"}
                  </strong>
                  {source.downloadable && (
                    <button
                      type="button"
                      className="admin-table__icon-btn"
                      onClick={() => handleSourceDownload(source)}
                      disabled={downloadingSourceId === sourceId}
                      aria-label={`Download ${source.title || source.sourceName}`}
                    >
                      <Download size={15} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {actionError && (
        <section className="ai-drafts-alert ai-drafts-alert--danger" role="alert">
          {actionError}
        </section>
      )}

      {addResult && <AddResultNotice result={addResult} />}

      <section className="ai-drafts-stats" aria-label="Batch summary">
        <div>
          <strong>{draftCounts.total}</strong>
          <span>Drafts</span>
        </div>
        <div>
          <strong>{draftCounts.valid}</strong>
          <span>Valid</span>
        </div>
        <div>
          <strong>{draftCounts.warning}</strong>
          <span>Warnings</span>
        </div>
        <div>
          <strong>{draftCounts.invalid}</strong>
          <span>Invalid</span>
        </div>
        <div>
          <strong>
            {draftCounts.accepted}/{batch?.requestedCount || draftCounts.total}
          </strong>
          <span>Accepted / requested</span>
        </div>
      </section>

      {failed ? (
        <section className="admin-card">
          <h2 className="ai-drafts-card-title">Generation failed</h2>
          <p className="ai-drafts-muted">
            {batch?.safeErrorMessage || "The provider or system could not finish this batch."}
          </p>
          <p className="ai-drafts-muted">
            Retry is available only for failed batches and should use the original source snapshot.
          </p>
        </section>
      ) : (
        <section className="admin-card admin-card--flush">
          <div className="ai-drafts-toolbar">
            <div>
              <strong>Draft items</strong>
              <span>
                {selectedDraftIds.length} selected · {selectableDrafts.length} can be added
              </span>
            </div>
            <div className="ai-drafts-toolbar__actions">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={toggleAllSelectable}
                disabled={!ready || selectableDrafts.length === 0 || mutating}
              >
                {selectedDraftIds.length === selectableDrafts.length ? "Clear selection" : "Select valid drafts"}
              </Button>
              <Button
                type="button"
                leftIcon={<Sparkles size={16} />}
                size="sm"
                onClick={handleAddSelected}
                loading={mutating}
                loadingLabel="Adding..."
                disabled={!ready || selectedDraftIds.length === 0}
              >
                Add selected drafts
              </Button>
            </div>
          </div>

          {batch?.drafts?.length === 0 ? (
            <div className="admin-empty">
              {processing ? "Drafts will appear here when generation is ready." : "No draft questions were generated."}
            </div>
          ) : (
            <div className="ai-draft-list">
              {batch.drafts.map((draft) => (
                <DraftReviewRow
                  key={draft.id}
                  draft={draft}
                  moduleName={moduleNameById.get(draft.moduleId)}
                  selected={selectedDraftIds.includes(draft.id)}
                  selectable={ready && canDraftBeSelected(draft)}
                  mutating={mutating}
                  onToggle={() => toggleDraft(draft.id)}
                  onEdit={() => setEditDraft(draft)}
                  onReject={() => setRejectDraft(draft)}
                  onDetail={() => setDetailDraft(draft)}
                  onConfirmEvidence={(suitable) => handleEvidenceConfirmation(draft, suitable)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {editDraft && (
        <EditDraftModal
          key={`${editDraft.id}-${editDraft.version}`}
          draft={editDraft}
          modules={modules}
          mutating={mutating}
          onClose={() => setEditDraft(null)}
          onSave={handleEditSave}
        />
      )}
      {rejectDraft && (
        <RejectDraftModal
          key={`${rejectDraft.id}-${rejectDraft.version}`}
          draft={rejectDraft}
          mutating={mutating}
          onClose={() => setRejectDraft(null)}
          onReject={handleRejectSave}
        />
      )}
      {detailDraft && (
        <DraftDetailModal
          draft={detailDraft}
          onClose={() => setDetailDraft(null)}
        />
      )}
    </div>
  )
}

function DraftReviewRow({
  draft,
  moduleName,
  selected,
  selectable,
  mutating,
  onToggle,
  onEdit,
  onReject,
  onDetail,
  onConfirmEvidence,
}) {
  const answers = sortedAnswers(draft)
  const accepted = draft.status === "accepted"
  const rejected = draft.status === "rejected"

  return (
    <article className={`ai-draft-row ai-draft-row--${draft.validationStatus}`}>
      <div className="ai-draft-row__select">
        <input
          type="checkbox"
          checked={selected}
          disabled={!selectable || mutating}
          onChange={onToggle}
          aria-label={`Select draft ${draft.rowNumber}`}
        />
      </div>
      <div className="ai-draft-row__main">
        <div className="ai-draft-row__meta">
          <span>Draft {draft.rowNumber}</span>
          <span className={`admin-status admin-status--ai-${draft.validationStatus}`}>
            {validationStatusLabel(draft.validationStatus)}
          </span>
          <span className={`admin-status admin-status--ai-${draft.status}`}>
            {draft.status}
          </span>
          <span>{aiQuestionTypeLabel(draft.questionType)}</span>
          <span>{moduleName || "Unassigned"}</span>
        </div>
        <div
          className="ai-draft-row__question question-rich-text-viewer"
          dangerouslySetInnerHTML={{
            __html: sanitizeQuestionHtml(draft.questionText),
          }}
        />
        <div className="ai-draft-row__answers">
          {answers.map((answer, index) => (
            <span
              className={answer.correct ? "is-correct" : ""}
              key={answer.answerId || answer.id || index}
              dangerouslySetInnerHTML={{
                __html: sanitizeAnswerHtml(answer.answerText),
              }}
            />
          ))}
        </div>
        {draft.warnings.length > 0 && (
          <ul className="ai-draft-row__notes">
            {draft.warnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>{String(warning)}</li>
            ))}
          </ul>
        )}
        {draft.duplicateCandidates.length > 0 && (
          <p className="ai-draft-row__duplicate">
            Similar or archived duplicate warning. Reviewer may override unless backend marks it exact-active duplicate.
          </p>
        )}
        {(evidenceNeedsReview(draft) || evidenceIsUnsuitable(draft)) && (
          <div className="ai-evidence-review-box">
            <strong>Evidence cần được xác nhận lại</strong>
            <p>
              Nội dung câu hỏi hoặc đáp án đúng đã thay đổi. Hãy kiểm tra đoạn nguồn bên dưới.
            </p>
            {evidenceNeedsReview(draft) ? (
              <div className="ai-evidence-review-box__actions">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  leftIcon={<CheckCircle2 size={15} />}
                  onClick={() => onConfirmEvidence(true)}
                  disabled={mutating}
                >
                  Evidence vẫn phù hợp
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={() => onConfirmEvidence(false)}
                  disabled={mutating}
                >
                  Không phù hợp
                </Button>
              </div>
            ) : (
              <p className="ai-drafts-danger-text">
                Evidence is marked unsuitable. Reject this draft or restore a suitable revision before adding it.
              </p>
            )}
          </div>
        )}
      </div>
      <div className="ai-draft-row__actions">
        <button
          type="button"
          className="admin-table__icon-btn"
          title="View evidence"
          aria-label="View evidence"
          onClick={onDetail}
        >
          <Eye size={15} />
        </button>
        <button
          type="button"
          className="admin-table__icon-btn"
          title="Edit"
          aria-label="Edit draft"
          onClick={onEdit}
          disabled={accepted || rejected || mutating}
        >
          <Edit2 size={15} />
        </button>
        <button
          type="button"
          className="admin-table__icon-btn admin-table__icon-btn--danger"
          title="Reject"
          aria-label="Reject draft"
          onClick={onReject}
          disabled={accepted || rejected || mutating}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  )
}

function AddResultNotice({ result }) {
  const addedCount = Number(
    result?.addedCount
    ?? result?.createdCount
    ?? result?.acceptedCount
    ?? result?.created?.length
    ?? 0,
  )
  const skipped = Array.isArray(result?.skipped)
    ? result.skipped
    : Array.isArray(result?.skippedDrafts)
      ? result.skippedDrafts
      : Array.isArray(result?.skippedItems)
        ? result.skippedItems
        : []

  return (
    <section className="ai-drafts-alert ai-drafts-alert--success" role="status">
      <strong>Added {addedCount} questions.</strong>
      {skipped.length > 0 && (
        <>
          <p>{skipped.length} draft was skipped:</p>
          <ul>
            {skipped.map((item, index) => (
              <li key={item.draftId || item.id || index}>
                {item.label || item.questionText || `Draft ${item.rowNumber || index + 1}`}:{" "}
                {item.reason || item.message || "Could not be added."}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

function createDraftFormValues(draft) {
  return {
    ...draft,
    answers: sortedAnswers(draft),
  }
}

function EditDraftModal({ draft, modules, mutating, onClose, onSave }) {
  const [values, setValues] = useState(() => createDraftFormValues(draft))

  function updateAnswer(index, answerText) {
    setValues((current) => ({
      ...current,
      answers: current.answers.map((answer, answerIndex) =>
        answerIndex === index ? { ...answer, answerText } : answer,
      ),
    }))
  }

  function setCorrect(index) {
    setValues((current) => ({
      ...current,
      answers: current.answers.map((answer, answerIndex) => ({
        ...answer,
        correct: answerIndex === index,
      })),
    }))
  }

  return (
    <Modal
      open={Boolean(draft)}
      title="Edit AI draft"
      size="xl"
      closeOnOverlayClick={false}
      onClose={onClose}
    >
      <form
        className="ai-draft-edit-form"
        onSubmit={(event) => {
          event.preventDefault()
          onSave(values)
        }}
      >
        <div className="ai-drafts-fieldset">
          <span className="input-field__label">Question type</span>
          <p className="ai-drafts-readonly-value">
            {aiQuestionTypeLabel(values.questionType)} cannot be changed in MVP.
          </p>
        </div>

        <div className="ai-drafts-fieldset">
          <label className="input-field__label" htmlFor="ai-edit-question-text">
            Question text
          </label>
          <textarea
            id="ai-edit-question-text"
            className="admin-textarea"
            rows={5}
            value={values.questionText}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                questionText: event.target.value,
              }))
            }
            disabled={mutating}
          />
        </div>

        <div className="ai-drafts-fieldset">
          <label className="input-field__label" htmlFor="ai-edit-module">
            Module
          </label>
          <select
            id="ai-edit-module"
            className="admin-toolbar__select"
            value={values.moduleId || ""}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                moduleId: event.target.value,
              }))
            }
            disabled={mutating}
          >
            <option value="">Select module</option>
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.title}
              </option>
            ))}
          </select>
        </div>

        <div className="ai-drafts-fieldset">
          <span className="input-field__label">Answers</span>
          <div className="ai-draft-edit-answers">
            {values.answers.map((answer, index) => (
              <div className="ai-draft-edit-answer" key={answer.answerId || answer.id || index}>
                <input
                  type="radio"
                  name="ai-draft-correct-answer"
                  checked={answer.correct}
                  onChange={() => setCorrect(index)}
                  aria-label={`Mark answer ${index + 1} correct`}
                  disabled={mutating}
                />
                <textarea
                  className="admin-textarea"
                  rows={2}
                  value={answer.answerText}
                  disabled={mutating || values.questionType === "true_false"}
                  onChange={(event) => updateAnswer(index, event.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="ai-drafts-fieldset">
          <label className="input-field__label" htmlFor="ai-edit-explanation">
            Explanation
          </label>
          <textarea
            id="ai-edit-explanation"
            className="admin-textarea"
            rows={4}
            value={values.explanation}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                explanation: event.target.value,
              }))
            }
            disabled={mutating}
          />
        </div>

        <div className="ai-drafts-notice">
          Editing question text or correct answer can require evidence review before this draft can be added.
        </div>

        <div className="ai-drafts-actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={mutating}>
            Cancel
          </Button>
          <Button type="submit" loading={mutating} loadingLabel="Saving...">
            Save draft
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function RejectDraftModal({ mutating, onClose, onReject }) {
  const [reason, setReason] = useState("")
  const [note, setNote] = useState("")

  return (
    <Modal
      open
      title="Reject AI draft"
      size="md"
      onClose={onClose}
    >
      <div className="ai-drafts-fieldset">
        <label className="input-field__label" htmlFor="ai-reject-reason">
          Reason
        </label>
        <select
          id="ai-reject-reason"
          className="admin-toolbar__select"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={mutating}
        >
          {AI_DRAFT_REJECT_REASONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="ai-drafts-fieldset">
        <label className="input-field__label" htmlFor="ai-reject-note">
          Note
        </label>
        <textarea
          id="ai-reject-note"
          className="admin-textarea"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          disabled={mutating}
        />
      </div>
      <div className="ai-drafts-actions">
        <Button type="button" variant="ghost" onClick={onClose} disabled={mutating}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          loading={mutating}
          loadingLabel="Rejecting..."
          onClick={() => onReject({ reason, note })}
        >
          Reject draft
        </Button>
      </div>
    </Modal>
  )
}

function DraftDetailModal({ draft, onClose }) {
  if (!draft) return null

  return (
    <Modal
      open={Boolean(draft)}
      title="Draft evidence"
      size="lg"
      onClose={onClose}
    >
      <div className="ai-evidence-list">
        {draft.evidences.length === 0 ? (
          <div className="admin-empty ai-drafts-empty">
            No evidence was returned for this draft. This draft should not be added until backend marks it valid.
          </div>
        ) : (
          draft.evidences.map((evidence, index) => (
            <section className="ai-evidence-card" key={evidence.id || evidence.evidenceId || index}>
              <div className="ai-draft-row__meta">
                <span>{evidence.sourceName || evidence.materialName || `Evidence ${index + 1}`}</span>
                <span>{evidence.chunkReference || evidence.chunkId || evidence.sourceId || "--"}</span>
                {formatEvidenceTime(evidence.startMs, evidence.endMs) && (
                  <span>{formatEvidenceTime(evidence.startMs, evidence.endMs)}</span>
                )}
              </div>
              <blockquote>{evidence.excerpt || evidence.sourceExcerpt || "--"}</blockquote>
            </section>
          ))
        )}
      </div>
    </Modal>
  )
}
