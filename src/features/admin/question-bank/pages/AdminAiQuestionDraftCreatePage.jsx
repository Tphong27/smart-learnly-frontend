import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Info,
  Sparkles,
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

export function AdminAiQuestionDraftCreatePage() {
  const { bankId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const writable = canWriteQuestionBank();
  const [bank, setBank] = useState(null);
  const [modules, setModules] = useState([]);
  const [sources, setSources] = useState([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState([]);
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

        const [moduleData, sourceData] = await Promise.all([
          bankData?.courseId
            ? courseService.getCourseContent(bankData.courseId)
            : Promise.resolve([]),
          questionBankService.listAiDraftSources(bankId),
        ]);
        if (cancelled) return;
        setModules(normalizeModules(moduleData));
        const normalizedSources = sourceData
          .map(normalizeAiSource)
          .filter((source) => source.id);
        setSources(normalizedSources);
        const readyIds = normalizedSources
          .filter((source) => source.ready && source.kind === "material")
          .map((source) => source.id);
        setSelectedSourceIds(readyIds.slice(0, 1));
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

  const readyMaterialSources = useMemo(
    () =>
      sources.filter((source) => source.kind === "material" && source.ready),
    [sources],
  );

  const selectedSources = useMemo(
    () =>
      readyMaterialSources.filter((source) =>
        selectedSourceIds.includes(source.id),
      ),
    [readyMaterialSources, selectedSourceIds],
  );

  const trimmedInstruction = generationInstruction.trim();
  const instructionTooLong = trimmedInstruction.length > 2000;
  const canSubmit =
    writable &&
    !loading &&
    !submitting &&
    selectedSourceIds.length > 0 &&
    questionTypes.length > 0 &&
    QUANTITY_OPTIONS.includes(requestedCount) &&
    ["vi", "en"].includes(language) &&
    !instructionTooLong &&
    bank?.status !== "archived";

  function toggleSource(sourceId) {
    setSelectedSourceIds((current) =>
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

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) {
      setError(
        "Select at least one RAG-ready material source and a valid generation setup.",
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const batch = await questionBankService.createAiDraftBatch(bankId, {
        generationSourceIds: selectedSourceIds,
        questionTypes,
        requestedCount,
        moduleId: moduleId || null,
        language,
        generationInstruction: trimmedInstruction || null,
        idempotencyKey: createIdempotencyKey(),
      });
      const batchId = batch?.batchId || batch?.id;
      toast.success("AI draft batch created");
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
        <section
          className="ai-drafts-alert ai-drafts-alert--danger"
          role="alert"
        >
          {error}
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

      <form className="ai-drafts-layout" onSubmit={handleSubmit}>
        <section className="admin-card ai-drafts-form-card">
          <div className="ai-drafts-section-header">
            <div>
              <h2>Content sources</h2>
              <p>MVP accepts lesson materials that are already RAG-ready.</p>
            </div>
            <span className="admin-status admin-status--approved">
              {selectedSources.length} selected
            </span>
          </div>

          {readyMaterialSources.length === 0 ? (
            <div className="admin-empty ai-drafts-empty">
              No RAG-ready lesson materials are available for this question bank
              yet.
            </div>
          ) : (
            <div className="ai-source-list">
              {readyMaterialSources.map((source) => (
                <label className="ai-source-row" key={source.id}>
                  <input
                    type="checkbox"
                    checked={selectedSourceIds.includes(source.id)}
                    onChange={() => toggleSource(source.id)}
                    disabled={submitting}
                  />
                  <span className="ai-source-row__icon" aria-hidden="true">
                    <FileText size={18} />
                  </span>
                  <span className="ai-source-row__body">
                    <strong>{source.title}</strong>
                    <span>
                      {source.lessonTitle || "Lesson material"} ·{" "}
                      {source.chunkCount || "--"} chunks
                    </span>
                    <span>
                      Checksum: {source.checksum || "--"}
                      {source.version ? ` · Version: ${source.version}` : ""}
                    </span>
                  </span>
                  <span className="admin-status admin-status--approved">
                    RAG-ready
                  </span>
                </label>
              ))}
            </div>
          )}
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
                Backend will split the requested count nearly evenly between
                selected types.
              </p>
            )}
          </div>

          <div className="ai-drafts-fieldset">
            <span className="input-field__label">Number of questions</span>
            <div
              className="ai-drafts-segmented"
              role="radiogroup"
              aria-label="Number of questions"
            >
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
            <label
              className="input-field__label"
              htmlFor="ai-draft-instruction"
            >
              Hướng dẫn tạo câu hỏi
            </label>
            <textarea
              id="ai-draft-instruction"
              className={`admin-textarea ${instructionTooLong ? "admin-textarea--error" : ""}`}
              rows={7}
              value={generationInstruction}
              maxLength={2200}
              onChange={(event) => setGenerationInstruction(event.target.value)}
              disabled={submitting}
              placeholder="Nêu phạm vi, chủ đề hoặc mục tiêu cần bao phủ."
            />
            <div className="ai-drafts-counter">
              <span>
                Optional. If left blank, the backend uses the default
                instruction.
              </span>
              <strong className={instructionTooLong ? "is-danger" : ""}>
                {trimmedInstruction.length}/2000
              </strong>
            </div>
          </div>

          <div className="ai-drafts-notice">
            <Info size={16} />
            <span>
              AI can only use the selected lesson materials. Pasted text, file
              upload and transcript sources are phase-after-MVP.
            </span>
          </div>

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
            <span>
              Created questions will be saved as draft after human review.
            </span>
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
