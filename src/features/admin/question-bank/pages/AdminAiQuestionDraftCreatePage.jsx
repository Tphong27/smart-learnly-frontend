import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Edit2,
  FileText,
  Info,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Button, Modal, useToast } from "@/shared/components/ui";
import { questionBankService } from "@/features/admin/question-bank";
import { getCurrentUser } from "@/services/api-client";
import { courseAdminService, courseContentService } from "@/features/course";
import { formatDate } from "@/shared/utils/formatters";
import { sanitizeQuestionHtml } from "@/shared/utils/htmlSanitizer";
import {
  aiQuestionTypeLabel,
  canDraftBeSelected,
  normalizeAiBatch,
  validationStatusLabel,
} from "../utils/aiQuestionDrafts";
import {
  buildDraftPayload,
  createAiDraftFormValues,
  getDraftValidationError,
} from "../utils/aiQuestionDraftReview";
import "../../admin-shared.css";
import "./question-bank.css";

const MAX_REQUESTED_COUNT = 20;
const QUESTION_TYPE_OPTIONS = [
  { value: "single_choice", label: "Single choice" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "true_false", label: "True/False" },
];

const DEFAULT_CAPABILITIES = {
  minTextCharacters: 100,
  maxPastedTextCharacters: 50000,
  maxDocumentBytes: 25 * 1024 * 1024,
  maxTranscriptCharacters: 200000,
  maxSourcesPerBatch: 8,
  maxNormalizedCharactersPerBatch: 300000,
  acceptedDocumentMimeTypes: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ],
  acceptedDocumentExtensions: ["pdf", "docx", "txt"],
};

/** Kiem tra role duoc phep tao va review AI question draft. */
function canWriteQuestionBank() {
  const role = getCurrentUser()?.role;
  return role === "ADMIN" || role === "SME";
}

/** Chuan hoa module course thanh danh sach option cho form AI generate. */
function normalizeModules(payload) {
  const root = payload?.data ?? payload;
  const items = Array.isArray(root)
    ? root
    : (root?.items ?? root?.content ?? root?.sections ?? []);
  return items
    .map((item, index) => ({
      id: item.moduleId || item.sectionId || item.id,
      title: item.title || item.name || `Module ${index + 1}`,
    }))
    .filter((item) => item.id);
}

/** Tao idempotency key de tranh tao trung batch khi nguoi dung submit lai. */
function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ai-draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Lay phan mo rong file de validate dinh dang tai lieu. */
function fileExtension(fileName = "") {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index + 1).toLowerCase() : "";
}

/** Dinh dang kich thuoc file thanh chuoi ngan gon cho UI. */
function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Tao khoa on dinh cho selection cua draft nam trong mot batch cu the. */
function draftSelectionKey(batchId, draftId) {
  return `${batchId}:${draftId}`;
}

/** Gop batch moi vao danh sach hien co va tranh trung batch theo id. */
function mergeDraftBatches(batches) {
  const seen = new Set();
  return batches.filter((batch) => {
    if (!batch?.id || seen.has(batch.id)) return false;
    seen.add(batch.id);
    return true;
  });
}

/** Trang tao AI question draft va hien thi lai cac draft da luu cua course. */
export function AdminAiQuestionDraftCreatePage() {
  const { bankId, courseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const writable = canWriteQuestionBank();
  const isCourseQuestionsMode = Boolean(courseId);
  const fileInputRef = useRef(null);
  const [bank, setBank] = useState(null);
  const [modules, setModules] = useState([]);
  const [capabilities, setCapabilities] = useState(DEFAULT_CAPABILITIES);
  const [draftBatches, setDraftBatches] = useState([]);
  const [selectedDraftKeys, setSelectedDraftKeys] = useState([]);
  const [files, setFiles] = useState([]);
  const [fileErrors, setFileErrors] = useState([]);
  const [questionTypes, setQuestionTypes] = useState([
    "single_choice",
    "multiple_choice",
    "true_false",
  ]);
  const [requestedCount, setRequestedCount] = useState(10);
  const [moduleId, setModuleId] = useState("");
  const [language, setLanguage] = useState("en");
  const [generationInstruction, setGenerationInstruction] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mutatingDrafts, setMutatingDrafts] = useState(false);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [editDraftRow, setEditDraftRow] = useState(null);
  const [editError, setEditError] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    createIdempotencyKey(),
  );

  useEffect(() => {
    let cancelled = false;

    /** Nap setup tao AI draft cung danh sach batch da co tu backend. */
    async function loadSetup() {
      setLoading(true);
      setError(null);
      try {
        const bankData = isCourseQuestionsMode
          ? await courseAdminService.get(courseId)
          : await questionBankService.getBank(bankId);
        if (cancelled) return;
        const normalizedBank = isCourseQuestionsMode
          ? {
              id: null,
              courseId,
              name: `${bankData?.title || "Course"} Questions`,
              status: bankData?.status,
              updatedAt: bankData?.updatedAt,
            }
          : bankData;
        const resolvedCourseId = isCourseQuestionsMode
          ? courseId
          : bankData?.courseId;

        const [moduleData, capabilityData, batchData] = await Promise.all([
          resolvedCourseId
            ? courseContentService.getCourseContent(resolvedCourseId)
            : Promise.resolve([]),
          isCourseQuestionsMode
            ? questionBankService
                .getCourseAiDraftSourceCapabilities(courseId)
                .catch(() => DEFAULT_CAPABILITIES)
            : questionBankService
                .getAiDraftSourceCapabilities(bankId)
                .catch(() => DEFAULT_CAPABILITIES),
          isCourseQuestionsMode
            ? questionBankService
                .listCourseAiDraftBatches(courseId)
                .catch(() => [])
            : questionBankService.listAiDraftBatches(bankId).catch(() => []),
        ]);
        if (cancelled) return;
        setBank(normalizedBank);
        setLanguage("en");
        setModules(normalizeModules(moduleData));
        setCapabilities({ ...DEFAULT_CAPABILITIES, ...(capabilityData || {}) });
        setDraftBatches(
          batchData.map(normalizeAiBatch).filter((batch) => batch.id),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Could not load AI generation setup.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSetup();
    return () => {
      cancelled = true;
    };
  }, [bankId, courseId, isCourseQuestionsMode]);

  const draftRows = useMemo(
    () =>
      draftBatches.flatMap((batch) =>
        (batch.drafts || []).map((draft) => ({
          batch,
          draft,
          key: draftSelectionKey(batch.id, draft.id),
        })),
      ),
    [draftBatches],
  );

  const selectableDraftRows = useMemo(
    () => draftRows.filter(({ draft }) => canDraftBeSelected(draft)),
    [draftRows],
  );

  const selectedDraftRows = useMemo(
    () => draftRows.filter((row) => selectedDraftKeys.includes(row.key)),
    [draftRows, selectedDraftKeys],
  );

  const selectedSourcesCount = files.length;
  const trimmedInstruction = generationInstruction.trim();
  const instructionTooLong = trimmedInstruction.length > 2000;
  const sourceCountExceeded =
    selectedSourcesCount > capabilities.maxSourcesPerBatch;
  const canSubmit =
    writable &&
    !loading &&
    !submitting &&
    !sourceCountExceeded &&
    fileErrors.length === 0 &&
    questionTypes.length > 0 &&
    Boolean(moduleId) &&
    Number.isInteger(requestedCount) &&
    requestedCount >= 1 &&
    requestedCount <= MAX_REQUESTED_COUNT &&
    ["vi", "en"].includes(language) &&
    !instructionTooLong &&
    bank?.status !== "archived";

  /** Tai lai danh sach AI draft batch sau khi tao hoac add vao list chinh. */
  async function refreshDraftBatches() {
    const batchData = isCourseQuestionsMode
      ? await questionBankService.listCourseAiDraftBatches(courseId)
      : await questionBankService.listAiDraftBatches(bankId);
    const normalizedBatches = batchData
      .map(normalizeAiBatch)
      .filter((batch) => batch.id);
    setDraftBatches(normalizedBatches);
    setSelectedDraftKeys((current) =>
      current.filter((key) =>
        normalizedBatches.some((batch) =>
          batch.drafts.some((draft) => key === draftSelectionKey(batch.id, draft.id)),
        ),
      ),
    );
  }

  /** Bat tat mot loai cau hoi ma backend se chia deu so luong generate. */
  function toggleQuestionType(type) {
    setQuestionTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type],
    );
  }

  /** Them file tai lieu va validate extension, kich thuoc truoc khi submit. */
  function addFiles(nextFiles) {
    const incoming = Array.from(nextFiles || []);
    const accepted = [];
    const errors = [];
    incoming.forEach((file) => {
      const extension = fileExtension(file.name);
      if (!capabilities.acceptedDocumentExtensions.includes(extension)) {
        errors.push(`${file.name}: PDF, DOCX, or TXT only.`);
      } else if (file.size > capabilities.maxDocumentBytes) {
        errors.push(
          `${file.name}: maximum ${formatBytes(capabilities.maxDocumentBytes)}.`,
        );
      } else {
        accepted.push(file);
      }
    });
    setFileErrors(errors);
    setFiles((current) => [...current, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  /** Xoa mot file tai lieu khoi request generate hien tai. */
  function removeFile(index) {
    setFiles((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
    setFileErrors([]);
  }

  /** Bat tat selection cua mot AI draft da du dieu kien add vao list chinh. */
  function toggleDraftSelection(key) {
    setSelectedDraftKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  /** Chon nhanh hoac bo chon tat ca draft hop le dang hien thi. */
  function toggleAllSelectableDrafts() {
    const selectableKeys = selectableDraftRows.map((row) => row.key);
    const allSelected =
      selectableKeys.length > 0 &&
      selectableKeys.every((key) => selectedDraftKeys.includes(key));
    setSelectedDraftKeys(allSelected ? [] : selectableKeys);
  }

  /** Tao batch AI moi va giu nguoi dung o lai man hinh danh sach draft. */
  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) {
      setError(
        "Complete the generation setup before creating draft questions.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    setActionError(null);
    try {
      const payload = {
        files,
        questionTypes,
        requestedCount,
        moduleId,
        language,
        generationInstruction: trimmedInstruction || null,
        idempotencyKey,
      };
      const batch = isCourseQuestionsMode
        ? await questionBankService.createCourseAiDraftBatch(courseId, payload)
        : await questionBankService.createAiDraftBatch(bankId, payload);
      const normalizedBatch = normalizeAiBatch(batch);
      toast.success("AI draft batch created");
      setIdempotencyKey(createIdempotencyKey());
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setDraftBatches((current) =>
        mergeDraftBatches([normalizedBatch, ...current]),
      );
      await refreshDraftBatches().catch(() => undefined);
    } catch (err) {
      setError(err?.message || "Could not create AI draft batch.");
      toast.error(err?.message || "Could not create AI draft batch.");
    } finally {
      setSubmitting(false);
    }
  }

  /** Add cac draft da chon vao question list chinh, neu chua chon thi quay ve list. */
  async function handleSelectAndReturn() {
    if (selectedDraftRows.length === 0) {
      navigate(backPath);
      return;
    }

    setMutatingDrafts(true);
    setActionError(null);
    try {
      const rowsByBatch = new Map();
      selectedDraftRows.forEach((row) => {
        const rows = rowsByBatch.get(row.batch.id) || [];
        rows.push(row.draft);
        rowsByBatch.set(row.batch.id, rows);
      });

      await Promise.all(
        Array.from(rowsByBatch.entries()).map(([batchId, drafts]) =>
          isCourseQuestionsMode
            ? questionBankService.addSelectedCourseAiDrafts(courseId, batchId, drafts)
            : questionBankService.addSelectedAiDrafts(bankId, batchId, drafts),
        ),
      );
      toast.success("Selected drafts processed");
      navigate(backPath);
    } catch (err) {
      setActionError(err?.message || "Could not add selected drafts.");
      toast.error(err?.message || "Could not add selected drafts.");
      await refreshDraftBatches().catch(() => undefined);
    } finally {
      setMutatingDrafts(false);
    }
  }

  /** Luu noi dung draft duoc sua truc tiep tu modal trong man AI Generating. */
  async function handleEditSave(values) {
    const validationError = getDraftValidationError(values);
    if (validationError) {
      setEditError(validationError);
      return;
    }
    if (!editDraftRow?.batch?.id) return;

    setMutatingDrafts(true);
    setEditError(null);
    setActionError(null);
    try {
      if (isCourseQuestionsMode) {
        await questionBankService.updateCourseAiDraft(
          courseId,
          editDraftRow.batch.id,
          values.id,
          buildDraftPayload(values),
        );
      } else {
        await questionBankService.updateAiDraft(
          bankId,
          editDraftRow.batch.id,
          values.id,
          buildDraftPayload(values),
        );
      }
      toast.success("Draft updated");
      setEditDraftRow(null);
      await refreshDraftBatches();
    } catch (err) {
      const message =
        err?.message || "Draft may have been updated by someone else. Please reload and try again.";
      setEditError(message);
      toast.error(err?.message || "Could not update draft.");
      await refreshDraftBatches().catch(() => undefined);
    } finally {
      setMutatingDrafts(false);
    }
  }

  if (!writable) {
    return (
      <div className="admin-page">
        <section className="admin-card">
          <h1 className="admin-page__title">Unauthorized</h1>
          <p className="ai-drafts-muted">
            Only Admin and SME users can generate AI question drafts.
          </p>
          <Button
            to={
              isCourseQuestionsMode
                ? `/admin/courses/${courseId}/questions`
                : "/admin/question-banks"
            }
            variant="secondary"
          >
            Back to questions
          </Button>
        </section>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">Loading AI generation setup...</div>
      </div>
    );
  }

  const bankArchived = !isCourseQuestionsMode && bank?.status === "archived";
  const backPath = isCourseQuestionsMode
    ? `/admin/courses/${courseId}/questions`
    : `/admin/question-banks/${bankId}`;
  const allSelectableSelected =
    selectableDraftRows.length > 0 &&
    selectableDraftRows.every((row) => selectedDraftKeys.includes(row.key));

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
            {bank?.name || "Course questions"} - Question Bank, AI Generating
          </h1>
          <p className="ai-drafts-muted">
            AI creates drafts only. Review every question and answer before
            adding it to this course.
          </p>
        </div>
      </header>

      {error && (
        <section
          className="ai-drafts-alert ai-drafts-alert--danger"
          role="alert"
        >
          {error}
        </section>
      )}

      {actionError && (
        <section
          className="ai-drafts-alert ai-drafts-alert--danger"
          role="alert"
        >
          {actionError}
        </section>
      )}

      {bankArchived && (
        <section
          className="ai-drafts-alert ai-drafts-alert--warning"
          role="alert"
        >
          This question bank is archived. Restore it before generating AI
          drafts.
        </section>
      )}

      <form className="ai-generating-form" onSubmit={handleSubmit}>
        <div className="ai-generating-field">
          <label className="input-field__label" htmlFor="ai-draft-instruction">
            Extra AI Guides
          </label>
          <textarea
            id="ai-draft-instruction"
            className={`admin-textarea ai-generating-guides ${instructionTooLong ? "admin-textarea--error" : ""}`}
            rows={3}
            value={generationInstruction}
            maxLength={2200}
            onChange={(event) => setGenerationInstruction(event.target.value)}
            disabled={submitting}
            placeholder="Mention scope, topic, or learning goals to cover."
          />
          <div className="ai-drafts-counter">
            <span>
              Optional. If blank, the backend uses the default instruction.
            </span>
            <strong className={instructionTooLong ? "is-danger" : ""}>
              {trimmedInstruction.length}/2000
            </strong>
          </div>
        </div>

        <details className="admin-card ai-source-collapsible">
          <summary>
            <span>Source material</span>
            <strong>
              Optional - {selectedSourcesCount}/{capabilities.maxSourcesPerBatch} selected
            </strong>
          </summary>
          <div className="ai-source-collapsible__body">
            <div className="ai-drafts-fieldset">
              <span className="input-field__label">Question type</span>
              <div className="ai-drafts-check-grid ai-drafts-check-grid--inline">
                {QUESTION_TYPE_OPTIONS.map((option) => (
                  <label className="admin-checkbox" key={option.value}>
                    <input
                      type="checkbox"
                      checked={questionTypes.includes(option.value)}
                      onChange={() => toggleQuestionType(option.value)}
                      disabled={submitting}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {questionTypes.length > 1 && (
                <p className="ai-drafts-hint">
                  Backend will split the requested count nearly evenly between
                  selected types.
                </p>
              )}
            </div>

            <SourceSection
              icon={<Upload size={18} />}
              title="Documents"
              description={`PDF, DOCX, or TXT up to ${formatBytes(capabilities.maxDocumentBytes)} each.`}
            >
              <div
                className="ai-file-dropzone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  addFiles(event.dataTransfer.files);
                }}
              >
                <input
                  ref={fileInputRef}
                  id="ai-source-files"
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={(event) => addFiles(event.target.files)}
                  disabled={submitting}
                />
                <Upload size={18} />
                <label htmlFor="ai-source-files">Choose files</label>
                <span>or drop them here</span>
              </div>
              {fileErrors.length > 0 && (
                <ul className="ai-draft-row__notes" role="alert">
                  {fileErrors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {files.length > 0 && (
                <div className="ai-source-list">
                  {files.map((file, index) => (
                    <div
                      className="ai-file-row"
                      key={`${file.name}-${file.size}-${index}`}
                    >
                      <FileText size={17} />
                      <span>{file.name}</span>
                      <strong>{formatBytes(file.size)}</strong>
                      <button
                        type="button"
                        className="admin-table__icon-btn"
                        onClick={() => removeFile(index)}
                        aria-label={`Remove ${file.name}`}
                        disabled={submitting}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SourceSection>

            <div className="ai-drafts-notice">
              <Info size={16} />
              <span>
                Source material is optional. Uploaded document originals are
                stored for audit and can be downloaded after review authorization.
              </span>
            </div>
          </div>
        </details>

        {sourceCountExceeded && (
          <div
            className="ai-drafts-alert ai-drafts-alert--danger"
            role="alert"
          >
            <p>Use at most {capabilities.maxSourcesPerBatch} sources.</p>
          </div>
        )}

        <div className="ai-generating-controls">
          <div className="ai-generating-control ai-generating-control--module">
            <label className="input-field__label" htmlFor="ai-draft-module">
              Module
            </label>
            <select
              id="ai-draft-module"
              className="admin-toolbar__select"
              value={moduleId}
              onChange={(event) => setModuleId(event.target.value)}
              disabled={submitting}
            >
              <option value="">Select module</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
          </div>

          <div className="ai-generating-control">
            <label className="input-field__label" htmlFor="ai-draft-count">
              Number of Questions
            </label>
            <input
              id="ai-draft-count"
              className="admin-toolbar__input"
              type="number"
              min="1"
              max={MAX_REQUESTED_COUNT}
              value={requestedCount}
              onChange={(event) =>
                setRequestedCount(Number(event.target.value))
              }
              disabled={submitting}
            />
          </div>

          <input type="hidden" value={language} readOnly />

          <div className="ai-generating-actions">
            <Button
              type="submit"
              leftIcon={<Sparkles size={16} />}
              loading={submitting}
              disabled={!canSubmit}
              loadingLabel="Creating batch..."
            >
              AI Generate
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSelectAndReturn}
              loading={mutatingDrafts}
              disabled={submitting || mutatingDrafts}
              loadingLabel="Adding..."
            >
              Select & Return
            </Button>
          </div>
        </div>

        <div className="admin-card admin-card--flush ai-generating-table-card">
          <div className="ai-drafts-toolbar">
            <div>
              <strong>Generated questions</strong>
              <span>
                {selectedDraftRows.length} selected - {selectableDraftRows.length} can be added
              </span>
            </div>
            <div className="ai-drafts-toolbar__actions">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={toggleAllSelectableDrafts}
                disabled={selectableDraftRows.length === 0 || mutatingDrafts}
              >
                {allSelectableSelected ? "Clear selection" : "Select valid drafts"}
              </Button>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table ai-generated-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Question content</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {draftRows.length === 0 ? (
                  <tr>
                    <td colSpan="5">
                      <div className="admin-empty ai-drafts-empty">
                        Generated draft questions will be saved here after AI Generate finishes.
                      </div>
                    </td>
                  </tr>
                ) : (
                  draftRows.map((row) => (
                    <DraftListRow
                      key={row.key}
                      row={row}
                      selected={selectedDraftKeys.includes(row.key)}
                      selectable={canDraftBeSelected(row.draft)}
                      mutating={mutatingDrafts}
                      onToggle={() => toggleDraftSelection(row.key)}
                      onEdit={() => {
                        setEditError(null);
                        setEditDraftRow(row);
                      }}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="ai-drafts-footnote">
          <CheckCircle2 size={15} />
          <span>
            Generated questions stay in this draft list until a reviewer selects
            them into the official question list.
          </span>
        </div>
        {bank?.updatedAt && (
          <p className="ai-drafts-muted ai-drafts-muted--small">
            Updated {formatDate(bank.updatedAt)}
          </p>
        )}
      </form>

      {editDraftRow && (
        <EditDraftModal
          key={`${editDraftRow.draft.id}-${editDraftRow.draft.version}`}
          draft={editDraftRow.draft}
          modules={modules}
          mutating={mutatingDrafts}
          error={editError}
          onClose={() => {
            setEditDraftRow(null);
            setEditError(null);
          }}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}

/** Nhom mot khu vuc source material va hien empty state neu can. */
function SourceSection({
  icon,
  title,
  description,
  emptyText,
  action,
  children,
}) {
  const isEmpty = Array.isArray(children) ? children.length === 0 : !children;
  return (
    <section className="ai-source-section">
      <div className="ai-source-section__header">
        <div className="ai-source-section__title">
          <span className="ai-source-row__icon" aria-hidden="true">
            {icon}
          </span>
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </div>
        {action}
      </div>
      {isEmpty && emptyText ? (
        <div className="admin-empty ai-drafts-empty">{emptyText}</div>
      ) : (
        children
      )}
    </section>
  );
}

/** Hien thi mot draft AI trong danh sach co the chon dua vao question list. */
function DraftListRow({
  row,
  selected,
  selectable,
  mutating,
  onToggle,
  onEdit,
}) {
  const { batch, draft } = row;
  const accepted = draft.status === "accepted";
  const rejected = draft.status === "rejected";
  const editable = draft.status === "generated_draft";

  return (
    <tr className={`ai-generated-table__row ai-generated-table__row--${draft.validationStatus}`}>
      <td className="ai-generated-table__select">
        <input
          type="checkbox"
          checked={selected}
          disabled={!selectable || mutating}
          onChange={onToggle}
          aria-label={`Select draft ${draft.rowNumber}`}
        />
      </td>
      <td className="ai-generated-table__content">
        <div className="ai-draft-row__meta">
          <span>Batch {String(batch.id).slice(0, 8)}</span>
          <span>Draft {draft.rowNumber}</span>
        </div>
        <div
          className="ai-draft-row__question question-rich-text-viewer"
          dangerouslySetInnerHTML={{
            __html: sanitizeQuestionHtml(draft.questionText),
          }}
        />
      </td>
      <td>{aiQuestionTypeLabel(draft.questionType)}</td>
      <td className="ai-generated-table__status">
        <strong>{accepted ? "Accepted" : rejected ? "Rejected" : draft.status}</strong>
        <span className={`admin-status admin-status--ai-${draft.validationStatus}`}>
          {validationStatusLabel(draft.validationStatus)}
        </span>
        <span className={`admin-status admin-status--ai-${batch.status}`}>
          {batch.status}
        </span>
      </td>
      <td>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<Edit2 size={15} />}
          onClick={onEdit}
          disabled={!editable || mutating}
        >
          Edit
        </Button>
      </td>
    </tr>
  );
}

/** Modal xem va sua chi tiet mot AI draft ngay tren man AI Generating. */
function EditDraftModal({ draft, modules, mutating, error, onClose, onSave }) {
  const [values, setValues] = useState(() => createAiDraftFormValues(draft));

  /** Cap nhat noi dung mot dap an trong form edit draft. */
  function updateAnswer(index, answerText) {
    setValues((current) => ({
      ...current,
      answers: current.answers.map((answer, answerIndex) =>
        answerIndex === index ? { ...answer, answerText } : answer,
      ),
    }));
  }

  /** Cap nhat dap an dung theo quy tac single choice hoac multiple choice. */
  function setCorrect(index) {
    setValues((current) => ({
      ...current,
      answers: current.answers.map((answer, answerIndex) => ({
        ...answer,
        correct:
          current.questionType === "multiple_choice"
            ? answerIndex === index
              ? !answer.correct
              : answer.correct
            : answerIndex === index,
      })),
    }));
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
          event.preventDefault();
          onSave(values);
        }}
      >
        {error && (
          <section className="ai-drafts-alert ai-drafts-alert--danger" role="alert">
            {error}
          </section>
        )}

        <div className="ai-drafts-fieldset">
          <span className="input-field__label">Question type</span>
          <p className="ai-drafts-readonly-value">
            {aiQuestionTypeLabel(values.questionType)} cannot be changed in MVP.
          </p>
        </div>

        <div className="ai-drafts-fieldset">
          <label className="input-field__label" htmlFor="ai-list-edit-question-text">
            Question text
          </label>
          <textarea
            id="ai-list-edit-question-text"
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
          <label className="input-field__label" htmlFor="ai-list-edit-module">
            Module
          </label>
          <select
            id="ai-list-edit-module"
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
                  type={values.questionType === "multiple_choice" ? "checkbox" : "radio"}
                  name="ai-list-draft-correct-answer"
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
          <label className="input-field__label" htmlFor="ai-list-edit-explanation">
            Explanation
          </label>
          <textarea
            id="ai-list-edit-explanation"
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
  );
}
