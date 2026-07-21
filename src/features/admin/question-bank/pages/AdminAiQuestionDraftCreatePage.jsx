import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  FileText,
  Info,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { Button, useToast } from "@/shared/components/ui";
import { courseService, getCurrentUser, questionBankService } from "@/services";
import { formatDate } from "@/shared/utils/formatters";
import {
  getDefaultLanguage,
  normalizeAiSource,
} from "../utils/aiQuestionDrafts";
import "../../admin-shared.css";
import "./question-bank.css";

const QUANTITY_OPTIONS = [5, 10, 20];
const QUESTION_TYPE_OPTIONS = [
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
      title: item.title || item.name || `Module ${index + 1}`,
    }))
    .filter((item) => item.id);
}

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `ai-draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sourceKindLabel(kind) {
  if (kind === "transcript") return "Transcript";
  if (kind === "temporary_file") return "Document";
  if (kind === "pasted_text") return "Pasted text";
  return "Material";
}

function fileExtension(fileName = "") {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index + 1).toLowerCase() : "";
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function newPastedTextItem() {
  return {
    id: createIdempotencyKey(),
    sourceName: "",
    text: "",
  };
}

export function AdminAiQuestionDraftCreatePage() {
  const { bankId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const writable = canWriteQuestionBank();
  const fileInputRef = useRef(null);
  const [bank, setBank] = useState(null);
  const [modules, setModules] = useState([]);
  const [sources, setSources] = useState([]);
  const [capabilities, setCapabilities] = useState(DEFAULT_CAPABILITIES);
  const [selectedTranscriptIds, setSelectedTranscriptIds] = useState([]);
  const [pastedTextSources, setPastedTextSources] = useState([]);
  const [files, setFiles] = useState([]);
  const [fileErrors, setFileErrors] = useState([]);
  const [questionTypes, setQuestionTypes] = useState([
    "multiple_choice",
    "true_false",
  ]);
  const [requestedCount, setRequestedCount] = useState(10);
  const [moduleId, setModuleId] = useState("");
  const [language, setLanguage] = useState("vi");
  const [generationInstruction, setGenerationInstruction] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => createIdempotencyKey());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const bankData = await questionBankService.getBank(bankId);
        if (cancelled) return;
        setBank(bankData);
        setLanguage(getDefaultLanguage(bankData));

        const [moduleData, sourceData, capabilityData] = await Promise.all([
          bankData?.courseId
            ? courseService.getCourseContent(bankData.courseId)
            : Promise.resolve([]),
          questionBankService.listAiDraftSources(bankId),
          questionBankService.getAiDraftSourceCapabilities(bankId).catch(() => DEFAULT_CAPABILITIES),
        ]);
        if (cancelled) return;
        setModules(normalizeModules(moduleData));
        setCapabilities({ ...DEFAULT_CAPABILITIES, ...(capabilityData || {}) });
        const normalizedSources = sourceData
          .map(normalizeAiSource)
          .filter((source) => source.id);
        setSources(normalizedSources);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Could not load AI generation setup.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bankId]);

  const transcriptSources = useMemo(
    () => sources.filter((source) => source.kind === "transcript" && source.ready),
    [sources],
  );

  const selectedSourcesCount =
    selectedTranscriptIds.length +
    pastedTextSources.filter((item) => item.text.trim()).length +
    files.length;

  const pastedTextErrors = useMemo(() => {
    const errors = new Map();
    pastedTextSources.forEach((item) => {
      const length = item.text.trim().length;
      if (length > 0 && length < capabilities.minTextCharacters) {
        errors.set(item.id, `At least ${capabilities.minTextCharacters} characters are required.`);
      } else if (length > capabilities.maxPastedTextCharacters) {
        errors.set(item.id, `Maximum ${capabilities.maxPastedTextCharacters.toLocaleString()} characters.`);
      }
    });
    return errors;
  }, [capabilities, pastedTextSources]);

  const totalEstimatedCharacters = useMemo(() => {
    const pasted = pastedTextSources.reduce((sum, item) => sum + item.text.trim().length, 0);
    const transcripts = transcriptSources
      .filter((source) => selectedTranscriptIds.includes(source.id))
      .reduce((sum, source) => sum + Number(source.normalizedCharCount || 0), 0);
    return pasted + transcripts;
  }, [pastedTextSources, selectedTranscriptIds, transcriptSources]);

  const trimmedInstruction = generationInstruction.trim();
  const instructionTooLong = trimmedInstruction.length > 2000;
  const sourceCountExceeded = selectedSourcesCount > capabilities.maxSourcesPerBatch;
  const contentBudgetExceeded =
    totalEstimatedCharacters > capabilities.maxNormalizedCharactersPerBatch;
  const canSubmit =
    writable &&
    !loading &&
    !submitting &&
    selectedSourcesCount > 0 &&
    !sourceCountExceeded &&
    !contentBudgetExceeded &&
    pastedTextErrors.size === 0 &&
    fileErrors.length === 0 &&
    questionTypes.length > 0 &&
    QUANTITY_OPTIONS.includes(requestedCount) &&
    ["vi", "en"].includes(language) &&
    !instructionTooLong &&
    bank?.status !== "archived";

  function toggleTranscript(sourceId) {
    setSelectedTranscriptIds((current) =>
      current.includes(sourceId)
        ? current.filter((id) => id !== sourceId)
        : [...current, sourceId],
    );
  }

  function toggleQuestionType(type) {
    setQuestionTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type],
    );
  }

  function addPastedText() {
    setPastedTextSources((current) => [...current, newPastedTextItem()]);
  }

  function updatePastedText(itemId, patch) {
    setPastedTextSources((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    );
  }

  function removePastedText(itemId) {
    setPastedTextSources((current) => current.filter((item) => item.id !== itemId));
  }

  function addFiles(nextFiles) {
    const incoming = Array.from(nextFiles || []);
    const accepted = [];
    const errors = [];
    incoming.forEach((file) => {
      const extension = fileExtension(file.name);
      if (!capabilities.acceptedDocumentExtensions.includes(extension)) {
        errors.push(`${file.name}: PDF, DOCX, or TXT only.`);
      } else if (file.size > capabilities.maxDocumentBytes) {
        errors.push(`${file.name}: maximum ${formatBytes(capabilities.maxDocumentBytes)}.`);
      } else {
        accepted.push(file);
      }
    });
    setFileErrors(errors);
    setFiles((current) => [...current, ...accepted]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index) {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setFileErrors([]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) {
      setError("Select at least one valid source and complete the generation setup.");
      return;
    }

    const trimmedPastedSources = pastedTextSources
      .map((item, index) => ({
        sourceName: item.sourceName.trim() || `Pasted text ${index + 1}`,
        text: item.text.trim(),
      }))
      .filter((item) => item.text);

    setSubmitting(true);
    setError(null);
    try {
      const batch = await questionBankService.createAiDraftBatch(bankId, {
        generationSourceIds: [],
        transcriptContentIds: selectedTranscriptIds,
        pastedTextSources: trimmedPastedSources,
        files,
        questionTypes,
        requestedCount,
        moduleId: moduleId || null,
        language,
        generationInstruction: trimmedInstruction || null,
        idempotencyKey,
      });
      const batchId = batch?.batchId || batch?.id;
      toast.success("AI draft batch created");
      setIdempotencyKey(createIdempotencyKey());
      navigate(
        batchId
          ? `/admin/question-banks/${bankId}/ai-drafts/${batchId}`
          : `/admin/question-banks/${bankId}`,
      );
    } catch (err) {
      setError(err?.message || "Could not create AI draft batch.");
      toast.error(err?.message || "Could not create AI draft batch.");
    } finally {
      setSubmitting(false);
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
          <Button to="/admin/question-banks" variant="secondary">
            Back to Question Bank
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

  const bankArchived = bank?.status === "archived";

  return (
    <div className="admin-page ai-drafts-page">
      <header className="admin-page__header">
        <div>
          <Button
            to={`/admin/question-banks/${bankId}`}
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft size={16} />}
          >
            Back
          </Button>
          <h1 className="admin-page__title" style={{ marginTop: 8 }}>
            Generate draft questions
          </h1>
          <p className="ai-drafts-muted">
            AI creates drafts only. Review every question and answer before
            adding it to this bank.
          </p>
        </div>
      </header>

      {error && (
        <section className="ai-drafts-alert ai-drafts-alert--danger" role="alert">
          {error}
        </section>
      )}

      {bankArchived && (
        <section className="ai-drafts-alert ai-drafts-alert--warning" role="alert">
          This question bank is archived. Restore it before generating AI drafts.
        </section>
      )}

      <form className="ai-drafts-layout" onSubmit={handleSubmit}>
        <section className="admin-card ai-drafts-form-card">
          <div className="ai-drafts-section-header">
            <div>
              <h2>Content sources</h2>
              <p>Paste text, attach documents, or use published video transcripts.</p>
            </div>
            <span className="admin-status admin-status--approved">
              {selectedSourcesCount}/{capabilities.maxSourcesPerBatch} selected
            </span>
          </div>

          <SourceSection
            icon={<Clipboard size={18} />}
            title="Pasted text"
            description={`Each item needs ${capabilities.minTextCharacters}-${capabilities.maxPastedTextCharacters.toLocaleString()} characters.`}
            action={(
              <Button type="button" variant="secondary" size="sm" leftIcon={<Plus size={15} />} onClick={addPastedText} disabled={submitting}>
                Add text
              </Button>
            )}
          >
            {pastedTextSources.length === 0 ? (
              <div className="admin-empty ai-drafts-empty">No pasted text added.</div>
            ) : pastedTextSources.map((item, index) => (
              <div className="ai-pasted-source" key={item.id}>
                <div className="ai-pasted-source__header">
                  <label className="input-field__label" htmlFor={`ai-pasted-name-${item.id}`}>
                    Source name
                  </label>
                  <button
                    type="button"
                    className="admin-table__icon-btn admin-table__icon-btn--danger"
                    onClick={() => removePastedText(item.id)}
                    aria-label={`Remove pasted text ${index + 1}`}
                    disabled={submitting}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <input
                  id={`ai-pasted-name-${item.id}`}
                  className="admin-toolbar__input"
                  value={item.sourceName}
                  onChange={(event) => updatePastedText(item.id, { sourceName: event.target.value })}
                  disabled={submitting}
                  placeholder={`Pasted text ${index + 1}`}
                />
                <label className="input-field__label" htmlFor={`ai-pasted-text-${item.id}`}>
                  Source text
                </label>
                <textarea
                  id={`ai-pasted-text-${item.id}`}
                  className={`admin-textarea ${pastedTextErrors.has(item.id) ? "admin-textarea--error" : ""}`}
                  rows={7}
                  value={item.text}
                  onChange={(event) => updatePastedText(item.id, { text: event.target.value })}
                  disabled={submitting}
                />
                <div className="ai-drafts-counter">
                  <span className={pastedTextErrors.has(item.id) ? "is-danger" : ""}>
                    {pastedTextErrors.get(item.id) || "This text will be snapshotted for retry and audit."}
                  </span>
                  <strong>{item.text.trim().length.toLocaleString()}</strong>
                </div>
              </div>
            ))}
          </SourceSection>

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
                {fileErrors.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
            {files.length > 0 && (
              <div className="ai-source-list">
                {files.map((file, index) => (
                  <div className="ai-file-row" key={`${file.name}-${file.size}-${index}`}>
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

          <SourceSection
            icon={<Video size={18} />}
            title="Video transcripts"
            description="Published course-level transcripts from Smart Learnly video lessons."
            emptyText="No published video transcripts are available for this question bank course."
          >
            {transcriptSources.map((source) => (
              <SourceRow
                key={source.id}
                source={source}
                checked={selectedTranscriptIds.includes(source.id)}
                disabled={submitting}
                onChange={() => toggleTranscript(source.id)}
              />
            ))}
          </SourceSection>
        </section>

        <aside className="admin-card ai-drafts-form-card ai-drafts-summary-panel">
          <div className="ai-drafts-section-header">
            <div>
              <h2>Generation setup</h2>
              <p>{bank?.name || "Question bank"}</p>
            </div>
          </div>

          <div className="ai-drafts-fieldset">
            <span className="input-field__label">Question type</span>
            <div className="ai-drafts-check-grid">
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
                Backend will split the requested count nearly evenly between selected types.
              </p>
            )}
          </div>

          <div className="ai-drafts-fieldset">
            <span className="input-field__label">Number of questions</span>
            <div className="ai-drafts-segmented" role="radiogroup" aria-label="Number of questions">
              {QUANTITY_OPTIONS.map((value) => (
                <button
                  type="button"
                  key={value}
                  className={requestedCount === value ? "is-active" : ""}
                  aria-pressed={requestedCount === value}
                  onClick={() => setRequestedCount(value)}
                  disabled={submitting}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="ai-drafts-fieldset">
            <label className="input-field__label" htmlFor="ai-draft-language">
              Output language
            </label>
            <select
              id="ai-draft-language"
              className="admin-toolbar__select"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              disabled={submitting}
            >
              <option value="vi">Vietnamese</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="ai-drafts-fieldset">
            <label className="input-field__label" htmlFor="ai-draft-module">
              Target module
            </label>
            <select
              id="ai-draft-module"
              className="admin-toolbar__select"
              value={moduleId}
              onChange={(event) => setModuleId(event.target.value)}
              disabled={submitting}
            >
              <option value="">No module</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.title}
                </option>
              ))}
            </select>
          </div>

          <div className="ai-drafts-fieldset">
            <label className="input-field__label" htmlFor="ai-draft-instruction">
              Generation instruction
            </label>
            <textarea
              id="ai-draft-instruction"
              className={`admin-textarea ${instructionTooLong ? "admin-textarea--error" : ""}`}
              rows={7}
              value={generationInstruction}
              maxLength={2200}
              onChange={(event) => setGenerationInstruction(event.target.value)}
              disabled={submitting}
              placeholder="Mention scope, topic, or learning goals to cover."
            />
            <div className="ai-drafts-counter">
              <span>Optional. If blank, the backend uses the default instruction.</span>
              <strong className={instructionTooLong ? "is-danger" : ""}>
                {trimmedInstruction.length}/2000
              </strong>
            </div>
          </div>

          <div className="ai-drafts-notice">
            <Info size={16} />
            <span>
              Selected sources are snapshotted for retry. Document originals are stored for audit and can be downloaded after review authorization.
            </span>
          </div>

          {(sourceCountExceeded || contentBudgetExceeded) && (
            <div className="ai-drafts-alert ai-drafts-alert--danger" role="alert">
              {sourceCountExceeded && <p>Use at most {capabilities.maxSourcesPerBatch} sources.</p>}
              {contentBudgetExceeded && <p>Selected text/transcripts exceed {capabilities.maxNormalizedCharactersPerBatch.toLocaleString()} characters.</p>}
            </div>
          )}

          <div className="ai-drafts-actions">
            <Button
              type="button"
              variant="ghost"
              to={`/admin/question-banks/${bankId}`}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              leftIcon={<Sparkles size={16} />}
              loading={submitting}
              disabled={!canSubmit}
              loadingLabel="Creating batch..."
            >
              Generate drafts
            </Button>
          </div>

          <div className="ai-drafts-footnote">
            <CheckCircle2 size={15} />
            <span>Created questions will be saved as draft after human review.</span>
          </div>
          {bank?.updatedAt && (
            <p className="ai-drafts-muted ai-drafts-muted--small">
              Bank updated {formatDate(bank.updatedAt)}
            </p>
          )}
        </aside>
      </form>
    </div>
  );
}

function SourceSection({ icon, title, description, emptyText, action, children }) {
  const isEmpty = Array.isArray(children) ? children.length === 0 : !children;
  return (
    <section className="ai-source-section">
      <div className="ai-source-section__header">
        <div className="ai-source-section__title">
          <span className="ai-source-row__icon" aria-hidden="true">{icon}</span>
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </div>
        {action}
      </div>
      {isEmpty && emptyText ? (
        <div className="admin-empty ai-drafts-empty">{emptyText}</div>
      ) : children}
    </section>
  );
}

function SourceRow({ source, checked, disabled, onChange }) {
  return (
    <label className="ai-source-row">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="ai-source-row__icon" aria-hidden="true">
        {source.kind === "transcript" ? <Video size={18} /> : <FileText size={18} />}
      </span>
      <span className="ai-source-row__body">
        <strong>{source.title}</strong>
        <span>
          {source.lessonTitle || sourceKindLabel(source.kind)} · {source.chunkCount || "--"} chunks
          {source.normalizedCharCount ? ` · ${source.normalizedCharCount.toLocaleString()} chars` : ""}
        </span>
        <span>
          Checksum: {source.checksum || "--"}
          {source.version ? ` · Version: ${source.version}` : ""}
        </span>
      </span>
      <span className="admin-status admin-status--approved">
        {sourceKindLabel(source.kind)}
      </span>
    </label>
  );
}
