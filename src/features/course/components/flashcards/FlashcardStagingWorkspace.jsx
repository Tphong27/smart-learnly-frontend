import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Edit3,
  FileText,
  ImagePlus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  WandSparkles,
} from "lucide-react";
import { flashcardService } from "@/services/flashcard.service";
import {
  getErrorMessage,
  toCardPayload,
  validateCardDraft,
} from "./flashcard-utils";
import "./Flashcards.css";

const DIFFICULTIES = ["easy", "medium", "hard"];
const GENERATION_MODES = ["RULE_BASED", "AI"];
const DEFAULT_GENERATION = {
  desiredCount: 10,
  language: "en",
  difficulty: "medium",
  generationMode: "RULE_BASED",
};

const STATUS_PRIORITY = {
  draft: 0,
  approved: 1,
  rejected: 2,
};

function normalizeResponse(payload) {
  return payload?.data ?? payload;
}

function formatLabel(value, fallback = "Unknown") {
  if (!value) return fallback;
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeStatus(status) {
  return String(status || "draft").toLowerCase();
}

function getQuestionId(question) {
  return question?.questionId || question?.id;
}

function correctAnswersLabel(question) {
  const answers = Array.isArray(question?.correctAnswers)
    ? question.correctAnswers
    : (question?.answers || [])
        .filter((answer) => answer.correct || answer.isCorrect)
        .map((answer) => answer.answerText);
  return answers.filter(Boolean).join(", ") || "--";
}

function getBatchCards(batch) {
  return Array.isArray(batch?.cards)
    ? [...batch.cards].sort(
        (left, right) =>
          (STATUS_PRIORITY[normalizeStatus(left?.status)] ?? 99) -
            (STATUS_PRIORITY[normalizeStatus(right?.status)] ?? 99) ||
          Number(left?.sortOrder ?? 0) - Number(right?.sortOrder ?? 0),
      )
    : [];
}

function draftCardCount(batches) {
  return batches.reduce(
    (count, batch) =>
      count +
      getBatchCards(batch).filter((card) => normalizeStatus(card.status) === "draft").length,
    0,
  );
}

function shouldIgnoreSelectionClick(event) {
  return Boolean(
    event.target.closest(
      "button,a,input,textarea,select,label,[role='button']",
    ),
  );
}

function getGenerationPayload(values) {
  return {
    desiredCount: Number(values.desiredCount || DEFAULT_GENERATION.desiredCount),
    language: values.language.trim() || DEFAULT_GENERATION.language,
    difficulty: values.difficulty || DEFAULT_GENERATION.difficulty,
    generationMode: values.generationMode || DEFAULT_GENERATION.generationMode,
  };
}

function validateGenerationSettings(values) {
  const desiredCount = Number(values.desiredCount);
  if (!Number.isInteger(desiredCount) || desiredCount < 1 || desiredCount > 30) {
    return "Desired count must be between 1 and 30.";
  }
  return null;
}

function GenerationSettings({ values, onChange, prefix }) {
  return (
    <div className="flashcard-staging__settings">
      <div className="flashcard-field">
        <label htmlFor={`${prefix}-count`}>Desired count</label>
        <input
          id={`${prefix}-count`}
          type="number"
          min="1"
          max="30"
          value={values.desiredCount}
          onChange={(event) =>
            onChange({ ...values, desiredCount: event.target.value })
          }
        />
      </div>
      <div className="flashcard-field">
        <label htmlFor={`${prefix}-language`}>Language</label>
        <input
          id={`${prefix}-language`}
          type="text"
          value={values.language}
          onChange={(event) =>
            onChange({ ...values, language: event.target.value })
          }
        />
      </div>
      <div className="flashcard-field">
        <label htmlFor={`${prefix}-difficulty`}>Difficulty</label>
        <select
          id={`${prefix}-difficulty`}
          value={values.difficulty}
          onChange={(event) =>
            onChange({ ...values, difficulty: event.target.value })
          }
        >
          {DIFFICULTIES.map((difficulty) => (
            <option key={difficulty} value={difficulty}>
              {formatLabel(difficulty)}
            </option>
          ))}
        </select>
      </div>
      <div className="flashcard-field">
        <label htmlFor={`${prefix}-mode`}>Generation mode</label>
        <select
          id={`${prefix}-mode`}
          value={values.generationMode}
          onChange={(event) =>
            onChange({ ...values, generationMode: event.target.value })
          }
        >
          {GENERATION_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {formatLabel(mode)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function InlineAlert({ children }) {
  if (!children) return null;
  return <div className="flashcard-staging__alert">{children}</div>;
}

function QuestionBankImportPanel({ setId, notify, onStagingChanged }) {
  const [filters, setFilters] = useState({
    keyword: "",
    questionBankId: "",
    difficulty: "",
    status: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [questions, setQuestions] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const loadQuestions = useCallback(async () => {
    if (!setId) return;
    setLoading(true);
    setError(null);
    try {
      const params = {
        questionBankId: appliedFilters.questionBankId.trim() || undefined,
        keyword: appliedFilters.keyword.trim() || undefined,
        difficulty: appliedFilters.difficulty || undefined,
        status: appliedFilters.status || undefined,
      };
      const items = await flashcardService.listSourceQuestions(setId, params);
      setQuestions(items);
      setSelectedIds((current) =>
        current.filter((id) =>
          items.some((question) => getQuestionId(question) === id),
        ),
      );
    } catch (loadError) {
      const message = getErrorMessage(
        loadError,
        "Failed to load source questions.",
      );
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, notify, setId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadQuestions();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadQuestions]);

  const allVisibleSelected =
    questions.length > 0 &&
    questions.every((question) => selectedIds.includes(getQuestionId(question)));

  function toggleQuestion(questionId) {
    setSelectedIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      const visibleIds = new Set(questions.map(getQuestionId));
      setSelectedIds((current) => current.filter((id) => !visibleIds.has(id)));
      return;
    }
    setSelectedIds((current) => [
      ...new Set([...current, ...questions.map(getQuestionId).filter(Boolean)]),
    ]);
  }

  async function handleImport() {
    if (!selectedIds.length) {
      notify("Select at least one question.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const response = normalizeResponse(
        await flashcardService.importQuestionBankToStaging(setId, selectedIds),
      );
      setSelectedIds([]);
      notify(
        `Imported ${response?.cards?.length || selectedIds.length} question${
          selectedIds.length === 1 ? "" : "s"
        } to staging.`,
        "success",
      );
      onStagingChanged?.();
    } catch (importError) {
      notify(
        getErrorMessage(importError, "Failed to import selected questions."),
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="flashcard-panel">
      <div className="flashcard-panel__header">
        <h3 className="flashcard-panel__title">Question Bank Import</h3>
        <button
          type="button"
          className="flashcard-btn"
          onClick={loadQuestions}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <div className="flashcard-panel__body flashcard-staging__section">
        <div className="flashcard-staging__filters">
          <div className="flashcard-field">
            <label htmlFor="staging-question-keyword">Search</label>
            <input
              id="staging-question-keyword"
              type="search"
              value={filters.keyword}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  keyword: event.target.value,
                }))
              }
              placeholder="Question text"
            />
          </div>
          <div className="flashcard-field">
            <label htmlFor="staging-question-bank">Question bank ID</label>
            <input
              id="staging-question-bank"
              type="text"
              value={filters.questionBankId}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  questionBankId: event.target.value,
                }))
              }
              placeholder="Optional UUID"
            />
          </div>
          <div className="flashcard-field">
            <label htmlFor="staging-question-difficulty">Difficulty</label>
            <select
              id="staging-question-difficulty"
              value={filters.difficulty}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  difficulty: event.target.value,
                }))
              }
            >
              <option value="">All</option>
              <option value="1">1 - Easy</option>
              <option value="2">2</option>
              <option value="3">3 - Medium</option>
              <option value="4">4</option>
              <option value="5">5 - Hard</option>
            </select>
          </div>
          <div className="flashcard-field">
            <label htmlFor="staging-question-status">Status</label>
            <select
              id="staging-question-status"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <button
            type="button"
            className="flashcard-btn flashcard-btn--primary"
            onClick={() => setAppliedFilters(filters)}
            disabled={loading}
          >
            <Search size={16} />
            Search
          </button>
        </div>

        <InlineAlert>{error}</InlineAlert>

        <div className="flashcard-staging__table-wrap">
          <table className="flashcard-staging__table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    aria-label="Select all visible source questions"
                  />
                </th>
                <th>Question</th>
                <th>Correct answers</th>
                <th>Difficulty</th>
                <th>Status</th>
                <th>Question bank</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">Loading source questions...</td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan="6">No source questions match these filters.</td>
                </tr>
              ) : (
                questions.map((question) => {
                  const questionId = getQuestionId(question);
                  return (
                    <tr key={questionId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(questionId)}
                          onChange={() => toggleQuestion(questionId)}
                          aria-label="Select source question"
                        />
                      </td>
                      <td className="flashcard-staging__wrap-cell">
                        {question.questionText || "--"}
                      </td>
                      <td className="flashcard-staging__wrap-cell">
                        {correctAnswersLabel(question)}
                      </td>
                      <td>{question.difficulty ?? "--"}</td>
                      <td>
                        <span className="flashcard-staging__badge">
                          {formatLabel(question.status)}
                        </span>
                      </td>
                      <td>{question.questionBankName || "--"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flashcard-staging__actions">
          <span>{selectedIds.length} selected</span>
          <button
            type="button"
            className="flashcard-btn flashcard-btn--primary"
            onClick={handleImport}
            disabled={submitting || loading}
          >
            <Upload size={16} />
            {submitting ? "Importing" : "Import selected to staging"}
          </button>
        </div>
      </div>
    </section>
  );
}

function TextGenerationPanel({ setId, notify, onStagingChanged }) {
  const [sourceText, setSourceText] = useState("");
  const [settings, setSettings] = useState(DEFAULT_GENERATION);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (sourceText.trim().length < 100) {
      notify("Source text must be at least 100 characters.", "error");
      return;
    }
    const settingsError = validateGenerationSettings(settings);
    if (settingsError) {
      notify(settingsError, "error");
      return;
    }
    setSubmitting(true);
    try {
      const response = normalizeResponse(
        await flashcardService.generateStagingFromText(setId, {
          sourceText: sourceText.trim(),
          ...getGenerationPayload(settings),
        }),
      );
      notify(
        `Generated ${response?.cards?.length || 0} staging card${
          response?.cards?.length === 1 ? "" : "s"
        }.`,
        "success",
      );
      setSourceText("");
      onStagingChanged?.();
    } catch (error) {
      notify(
        getErrorMessage(error, "Failed to generate staging cards."),
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="flashcard-panel">
      <div className="flashcard-panel__header">
        <h3 className="flashcard-panel__title">Pasted Text</h3>
      </div>
      <form className="flashcard-panel__body flashcard-staging__section" onSubmit={handleSubmit}>
        <div className="flashcard-field">
          <label htmlFor="staging-source-text">Source text</label>
          <textarea
            id="staging-source-text"
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            placeholder="Paste lesson notes or reading material"
            rows={7}
          />
        </div>
        <GenerationSettings
          values={settings}
          onChange={setSettings}
          prefix="staging-text"
        />
        {settings.generationMode === "AI" && (
          <p className="flashcard-staging__hint-text">
            AI provider not configured; rule-based fallback is used.
          </p>
        )}
        <div className="flashcard-staging__actions">
          <span>{sourceText.trim().length} characters</span>
          <button
            type="submit"
            className="flashcard-btn flashcard-btn--primary"
            disabled={submitting}
          >
            <WandSparkles size={16} />
            {submitting ? "Generating" : "Generate staging cards"}
          </button>
        </div>
      </form>
    </section>
  );
}

function DocumentGenerationPanel({ setId, notify, onStagingChanged }) {
  const [file, setFile] = useState(null);
  const [fileInputRevision, setFileInputRevision] = useState(0);
  const [settings, setSettings] = useState(DEFAULT_GENERATION);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) {
      notify("Choose a file.", "error");
      return;
    }
    const settingsError = validateGenerationSettings(settings);
    if (settingsError) {
      notify(settingsError, "error");
      return;
    }
    setSubmitting(true);
    try {
      const response = normalizeResponse(
        await flashcardService.generateStagingFromFile(setId, {
          file,
          ...getGenerationPayload(settings),
        }),
      );
      notify(
        `Generated ${response?.cards?.length || 0} staging card${
          response?.cards?.length === 1 ? "" : "s"
        } from document.`,
        "success",
      );
      setFile(null);
      setFileInputRevision((revision) => revision + 1);
      onStagingChanged?.();
    } catch (error) {
      notify(
        getErrorMessage(error, "Failed to generate from document."),
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="flashcard-panel">
      <div className="flashcard-panel__header">
        <h3 className="flashcard-panel__title">Document</h3>
      </div>
      <form className="flashcard-panel__body flashcard-staging__section" onSubmit={handleSubmit}>
        <label className="flashcard-staging__file-drop" htmlFor="staging-document-file">
          <FileText size={22} />
          <span>{file ? file.name : "Upload DOCX or PDF"}</span>
          <input
            key={fileInputRevision}
            id="staging-document-file"
            type="file"
            accept=".docx,.pdf"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </label>
        <GenerationSettings
          values={settings}
          onChange={setSettings}
          prefix="staging-document"
        />
        {settings.generationMode === "AI" && (
          <p className="flashcard-staging__hint-text">
            AI provider not configured; rule-based fallback is used.
          </p>
        )}
        <div className="flashcard-staging__actions">
          <span>{file ? "Ready to generate" : "No file selected"}</span>
          <button
            type="submit"
            className="flashcard-btn flashcard-btn--primary"
            disabled={submitting}
          >
            <Upload size={16} />
            {submitting ? "Generating" : "Generate from document"}
          </button>
        </div>
      </form>
    </section>
  );
}

function TranscriptGenerationPanel({ setId, notify, onStagingChanged }) {
  const [transcriptText, setTranscriptText] = useState("");
  const [sourceName, setSourceName] = useState("Lesson transcript");
  const [file, setFile] = useState(null);
  const [fileInputRevision, setFileInputRevision] = useState(0);
  const [settings, setSettings] = useState(DEFAULT_GENERATION);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!transcriptText.trim() && !file) {
      notify("Choose a file or paste transcript text.", "error");
      return;
    }
    const settingsError = validateGenerationSettings(settings);
    if (settingsError) {
      notify(settingsError, "error");
      return;
    }
    setSubmitting(true);
    try {
      const basePayload = getGenerationPayload(settings);
      const response = normalizeResponse(
        file
          ? await flashcardService.generateStagingFromTranscriptFile(setId, {
              file,
              ...basePayload,
            })
          : await flashcardService.generateStagingFromTranscript(setId, {
              transcriptText: transcriptText.trim(),
              sourceName: sourceName.trim() || "Lesson transcript",
              ...basePayload,
            }),
      );
      notify(
        `Generated ${response?.cards?.length || 0} staging card${
          response?.cards?.length === 1 ? "" : "s"
        } from transcript.`,
        "success",
      );
      setTranscriptText("");
      setFile(null);
      setFileInputRevision((revision) => revision + 1);
      onStagingChanged?.();
    } catch (error) {
      notify(
        getErrorMessage(error, "Failed to generate from transcript."),
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="flashcard-panel">
      <div className="flashcard-panel__header">
        <h3 className="flashcard-panel__title">Transcript</h3>
      </div>
      <form className="flashcard-panel__body flashcard-staging__section" onSubmit={handleSubmit}>
        <div className="flashcard-form__row">
          <div className="flashcard-field">
            <label htmlFor="staging-transcript-text">Transcript text</label>
            <textarea
              id="staging-transcript-text"
              value={transcriptText}
              onChange={(event) => setTranscriptText(event.target.value)}
              placeholder="Paste transcript text"
              rows={6}
              disabled={Boolean(file)}
            />
          </div>
          <div className="flashcard-field">
            <label htmlFor="staging-transcript-source">Source name</label>
            <input
              id="staging-transcript-source"
              type="text"
              value={sourceName}
              onChange={(event) => setSourceName(event.target.value)}
              disabled={Boolean(file)}
            />
            <label className="flashcard-staging__file-drop" htmlFor="staging-transcript-file">
              <FileText size={22} />
              <span>{file ? file.name : "Upload SRT or VTT instead"}</span>
              <input
                key={fileInputRevision}
                id="staging-transcript-file"
                type="file"
                accept=".srt,.vtt"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>
        <GenerationSettings
          values={settings}
          onChange={setSettings}
          prefix="staging-transcript"
        />
        {settings.generationMode === "AI" && (
          <p className="flashcard-staging__hint-text">
            AI provider not configured; rule-based fallback is used.
          </p>
        )}
        <div className="flashcard-staging__actions">
          <span>{file ? "Using uploaded transcript" : "Using pasted text"}</span>
          <button
            type="submit"
            className="flashcard-btn flashcard-btn--primary"
            disabled={submitting}
          >
            <WandSparkles size={16} />
            {submitting ? "Generating" : "Generate from transcript"}
          </button>
        </div>
      </form>
    </section>
  );
}

function toStagingDraft(card) {
  return {
    frontText: card?.frontText || "",
    backText: card?.backText || "",
    frontImageUrl: card?.frontImageUrl || "",
    backImageUrl: card?.backImageUrl || "",
    hint: card?.hint || "",
    explanation: card?.explanation || "",
  };
}

function EditStagingCardModal({
  card,
  saving,
  onClose,
  onSave,
  onUploadImage,
  notify,
}) {
  const [draft, setDraft] = useState(() => toStagingDraft(card));
  const [uploadingField, setUploadingField] = useState(null);
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleUpload(field, file) {
    if (!file) return;
    if (!onUploadImage) {
      notify?.("Image upload is not available.", "error");
      return;
    }
    if (file.type && !file.type.startsWith("image/")) {
      notify?.("Please upload an image file.", "error");
      return;
    }

    setUploadingField(field);
    try {
      const uploaded = await onUploadImage(file);
      const uploadedUrl = uploaded?.url || uploaded?.data?.url || uploaded;
      if (!uploadedUrl) {
        throw new Error("Upload response did not include a URL.");
      }
      updateDraft(field, uploadedUrl);
    } catch (error) {
      notify?.(error?.message || "Image upload failed.", "error");
    } finally {
      setUploadingField(null);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave(draft);
  }

  if (!card) return null;

  return (
    <div className="flashcard-modal" role="presentation">
      <div
        className="flashcard-modal__dialog flashcard-modal__dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flashcard-staging-edit-title"
      >
        <h3 id="flashcard-staging-edit-title">Edit staging card</h3>
        <form className="flashcard-form" onSubmit={handleSubmit}>
          <div className="flashcard-form__row">
            <div className="flashcard-field">
              <label htmlFor="staging-edit-front">Front text</label>
              <textarea
                id="staging-edit-front"
                value={draft.frontText}
                onChange={(event) => updateDraft("frontText", event.target.value)}
              />
            </div>
            <div className="flashcard-field">
              <label htmlFor="staging-edit-back">Back text</label>
              <textarea
                id="staging-edit-back"
                value={draft.backText}
                onChange={(event) => updateDraft("backText", event.target.value)}
              />
            </div>
          </div>
          <div className="flashcard-form__row">
            <div className="flashcard-field">
              <label htmlFor="staging-edit-front-image">Front image URL</label>
              <div className="flashcard-image-input">
                <input
                  id="staging-edit-front-image"
                  type="url"
                  value={draft.frontImageUrl}
                  onChange={(event) =>
                    updateDraft("frontImageUrl", event.target.value)
                  }
                  placeholder="https://..."
                />
                <button
                  type="button"
                  className="flashcard-btn"
                  onClick={() => frontInputRef.current?.click()}
                  disabled={!onUploadImage || Boolean(uploadingField)}
                >
                  <ImagePlus size={16} />
                  {uploadingField === "frontImageUrl" ? "Uploading" : "Upload"}
                </button>
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0];
                    event.target.value = "";
                    handleUpload("frontImageUrl", selectedFile);
                  }}
                />
              </div>
              {draft.frontImageUrl && (
                <img
                  src={draft.frontImageUrl}
                  alt=""
                  className="flashcard-image-preview"
                  loading="lazy"
                />
              )}
            </div>
            <div className="flashcard-field">
              <label htmlFor="staging-edit-back-image">Back image URL</label>
              <div className="flashcard-image-input">
                <input
                  id="staging-edit-back-image"
                  type="url"
                  value={draft.backImageUrl}
                  onChange={(event) =>
                    updateDraft("backImageUrl", event.target.value)
                  }
                  placeholder="https://..."
                />
                <button
                  type="button"
                  className="flashcard-btn"
                  onClick={() => backInputRef.current?.click()}
                  disabled={!onUploadImage || Boolean(uploadingField)}
                >
                  <ImagePlus size={16} />
                  {uploadingField === "backImageUrl" ? "Uploading" : "Upload"}
                </button>
                <input
                  ref={backInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0];
                    event.target.value = "";
                    handleUpload("backImageUrl", selectedFile);
                  }}
                />
              </div>
              {draft.backImageUrl && (
                <img
                  src={draft.backImageUrl}
                  alt=""
                  className="flashcard-image-preview"
                  loading="lazy"
                />
              )}
            </div>
          </div>
          <div className="flashcard-form__row">
            <div className="flashcard-field">
              <label htmlFor="staging-edit-hint">Hint</label>
              <textarea
                id="staging-edit-hint"
                value={draft.hint}
                onChange={(event) => updateDraft("hint", event.target.value)}
              />
            </div>
            <div className="flashcard-field">
              <label htmlFor="staging-edit-explanation">Explanation</label>
              <textarea
                id="staging-edit-explanation"
                value={draft.explanation}
                onChange={(event) =>
                  updateDraft("explanation", event.target.value)
                }
              />
            </div>
          </div>
          <div className="flashcard-modal__actions">
            <button
              type="button"
              className="flashcard-btn"
              onClick={onClose}
              disabled={saving || Boolean(uploadingField)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flashcard-btn flashcard-btn--primary"
              disabled={saving || Boolean(uploadingField)}
            >
              <Check size={16} />
              {saving ? "Saving" : "Save staging card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StagingReviewPanel({
  setId,
  notify,
  refreshKey,
  onApproved,
  onUploadImage,
}) {
  const [batches, setBatches] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectingSelected, setRejectingSelected] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState(null);

  const loadStaging = useCallback(async () => {
    if (!setId) return;
    setLoading(true);
    setError(null);
    try {
      const items = await flashcardService.listStaging(setId);
      setBatches(items);
      const draftIds = new Set(
        items.flatMap((batch) =>
          getBatchCards(batch)
            .filter((card) => normalizeStatus(card.status) === "draft")
            .map((card) => card.id),
        ),
      );
      setSelectedIds((current) => current.filter((id) => draftIds.has(id)));
    } catch (loadError) {
      const message = getErrorMessage(loadError, "Failed to load staging cards.");
      setError(message);
      notify(message, "error");
    } finally {
      setLoading(false);
    }
  }, [notify, setId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadStaging();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadStaging, refreshKey]);

  const draftCount = useMemo(() => draftCardCount(batches), [batches]);
  const draftIds = useMemo(
    () =>
      new Set(
        batches.flatMap((batch) =>
          getBatchCards(batch)
            .filter((card) => normalizeStatus(card.status) === "draft")
            .map((card) => card.id),
        ),
      ),
    [batches],
  );
  const selectedDraftIds = useMemo(
    () => selectedIds.filter((id) => draftIds.has(id)),
    [draftIds, selectedIds],
  );

  function toggleCard(cardId) {
    if (!draftIds.has(cardId)) return;
    setSelectedIds((current) =>
      current.includes(cardId)
        ? current.filter((id) => id !== cardId)
        : [...current, cardId],
    );
  }

  function handleCardClick(event, card) {
    if (normalizeStatus(card?.status) !== "draft" || shouldIgnoreSelectionClick(event)) {
      return;
    }
    toggleCard(card.id);
  }

  function toggleBatch(batch) {
    const draftIds = getBatchCards(batch)
      .filter((card) => normalizeStatus(card.status) === "draft")
      .map((card) => card.id);
    const allSelected = draftIds.every((id) => selectedIds.includes(id));
    setSelectedIds((current) =>
      allSelected
        ? current.filter((id) => !draftIds.includes(id))
        : [...new Set([...current, ...draftIds])],
    );
  }

  async function handleApprove() {
    if (!selectedDraftIds.length) {
      notify("Select at least one staging card before approve.", "error");
      return;
    }
    setApproving(true);
    try {
      const response = normalizeResponse(
        await flashcardService.approveStagingCards(setId, selectedDraftIds),
      );
      notify(
        `Approved ${response?.approvedCount || selectedDraftIds.length} staging card${
          selectedDraftIds.length === 1 ? "" : "s"
        }.`,
        "success",
      );
      setSelectedIds([]);
      await loadStaging();
      onApproved?.();
    } catch (approveError) {
      notify(
        getErrorMessage(approveError, "Failed to approve staging cards."),
        "error",
      );
    } finally {
      setApproving(false);
    }
  }

  async function handleReject(card) {
    if (!card?.id) return;
    const confirmed = window.confirm("Reject this staging card?");
    if (!confirmed) return;
    setRejectingId(card.id);
    try {
      await flashcardService.rejectStagingCard(card.id);
      notify("Staging card rejected.", "success");
      setSelectedIds((current) => current.filter((id) => id !== card.id));
      await loadStaging();
    } catch (rejectError) {
      notify(
        getErrorMessage(rejectError, "Failed to reject staging card."),
        "error",
      );
    } finally {
      setRejectingId(null);
    }
  }

  async function handleRejectSelected() {
    if (!selectedDraftIds.length) return;
    const confirmed = window.confirm(
      `Reject ${selectedDraftIds.length} selected staging card${
        selectedDraftIds.length === 1 ? "" : "s"
      }?`,
    );
    if (!confirmed) return;

    setRejectingSelected(true);
    try {
      await Promise.all(
        selectedDraftIds.map((cardId) =>
          flashcardService.rejectStagingCard(cardId),
        ),
      );
      notify(
        `Rejected ${selectedDraftIds.length} staging card${
          selectedDraftIds.length === 1 ? "" : "s"
        }.`,
        "success",
      );
      setSelectedIds([]);
      await loadStaging();
    } catch (rejectError) {
      notify(
        getErrorMessage(rejectError, "Failed to reject selected staging cards."),
        "error",
      );
    } finally {
      setRejectingSelected(false);
    }
  }

  async function handleSaveEdit(draft) {
    const validationError = validateCardDraft(draft);
    if (validationError) {
      notify(validationError, "error");
      return;
    }
    setSavingEdit(true);
    try {
      await flashcardService.updateStagingCard(
        editingCard.id,
        toCardPayload(draft),
      );
      notify("Staging card updated.", "success");
      setEditingCard(null);
      await loadStaging();
    } catch (editError) {
      notify(
        getErrorMessage(editError, "Failed to update staging card."),
        "error",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="flashcard-staging__review">
      <section className="flashcard-panel">
        <div className="flashcard-panel__header">
          <div>
            <h3 className="flashcard-panel__title">Staging Review</h3>
            <div className="flashcard-toolbar__meta">
              {draftCount} draft card{draftCount === 1 ? "" : "s"}
            </div>
          </div>
          <div className="flashcard-staging__header-actions">
            <button
              type="button"
              className="flashcard-btn"
              onClick={loadStaging}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--danger"
              onClick={handleRejectSelected}
              disabled={loading || rejectingSelected || selectedDraftIds.length === 0}
            >
              <Trash2 size={16} />
              {rejectingSelected
                ? "Rejecting"
                : `Reject selected (${selectedDraftIds.length})`}
            </button>
            <button
              type="button"
              className="flashcard-btn flashcard-btn--success"
              onClick={handleApprove}
              disabled={approving || loading || selectedDraftIds.length === 0}
            >
              <Check size={16} />
              {approving
                ? "Approving"
                : `Approve selected (${selectedDraftIds.length})`}
            </button>
          </div>
        </div>
        <div className="flashcard-panel__body flashcard-staging__section">
          <InlineAlert>{error}</InlineAlert>
          {loading ? (
            <div className="flashcard-practice__loading">
              <span className="flashcard-spinner" />
              Loading staging cards...
            </div>
          ) : batches.length === 0 ? (
            <div className="flashcard-empty">
              <FileText size={28} />
              <p>No staging batches yet.</p>
            </div>
          ) : (
            <div className="flashcard-staging__batches">
              {batches.map((batch) => {
                const cards = getBatchCards(batch);
                const draftCards = cards.filter(
                  (card) => normalizeStatus(card.status) === "draft",
                );
                const allBatchSelected =
                  draftCards.length > 0 &&
                  draftCards.every((card) => selectedIds.includes(card.id));

                return (
                  <article className="flashcard-staging-batch" key={batch.id}>
                    <div className="flashcard-staging-batch__header">
                      <div>
                        <h4>
                          {formatLabel(batch.sourceType, "Staging Batch")}
                          {batch.sourceName ? ` - ${batch.sourceName}` : ""}
                        </h4>
                        <p>
                          {formatLabel(batch.status)} - {cards.length} card
                          {cards.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <label className="flashcard-staging__select-all">
                        <input
                          type="checkbox"
                          checked={allBatchSelected}
                          onChange={() => toggleBatch(batch)}
                          disabled={draftCards.length === 0}
                        />
                        Select draft cards
                      </label>
                    </div>
                    <div className="flashcard-staging-card-list">
                      {cards.map((card) => {
                        const status = normalizeStatus(card.status);
                        const isDraft = status === "draft";
                        const isSelected = selectedIds.includes(card.id);
                        return (
                          <article
                            className={[
                              "flashcard-staging-card",
                              `flashcard-staging-card--${status}`,
                              isDraft ? "flashcard-staging-card--selectable" : "",
                              isSelected ? "is-selected" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            key={card.id}
                            onClick={(event) => handleCardClick(event, card)}
                            aria-selected={isSelected}
                          >
                            <div className="flashcard-staging-card__select">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleCard(card.id)}
                                disabled={!isDraft}
                                aria-label="Select staging card"
                              />
                            </div>
                            <div className="flashcard-staging-card__content">
                              <div className="flashcard-staging-card__sides">
                                <div>
                                  <span>Front</span>
                                  <p>{card.frontText || card.frontImageUrl || "--"}</p>
                                </div>
                                <div>
                                  <span>Back</span>
                                  <p>{card.backText || card.backImageUrl || "--"}</p>
                                </div>
                              </div>
                              {(card.hint || card.explanation || card.sourceExcerpt) && (
                                <div className="flashcard-staging-card__meta">
                                  {card.hint && <p><strong>Hint:</strong> {card.hint}</p>}
                                  {card.explanation && (
                                    <p><strong>Explanation:</strong> {card.explanation}</p>
                                  )}
                                  {card.sourceExcerpt && (
                                    <p><strong>Source:</strong> {card.sourceExcerpt}</p>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flashcard-staging-card__actions">
                              <span
                                className={`flashcard-staging__badge flashcard-staging__badge--${status}`}
                              >
                                {formatLabel(card.status)}
                              </span>
                              <button
                                type="button"
                                className="flashcard-btn flashcard-btn--icon"
                                title="Edit staging card"
                                onClick={() => setEditingCard(card)}
                                disabled={!isDraft || savingEdit}
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                type="button"
                                className="flashcard-btn flashcard-btn--icon flashcard-btn--danger"
                                title="Reject staging card"
                                onClick={() => handleReject(card)}
                                disabled={!isDraft || rejectingId === card.id}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {editingCard && (
        <EditStagingCardModal
          key={editingCard.id}
          card={editingCard}
          saving={savingEdit}
          notify={notify}
          onClose={() => setEditingCard(null)}
          onSave={handleSaveEdit}
          onUploadImage={onUploadImage}
        />
      )}
    </div>
  );
}

export function FlashcardStagingWorkspace({
  setId,
  activeTab,
  notify,
  onUploadImage,
  onStagingChanged,
  onApproved,
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleStagingChanged = useCallback(() => {
    setRefreshKey((key) => key + 1);
    onStagingChanged?.();
  }, [onStagingChanged]);

  if (!setId) {
    return (
      <div className="flashcard-empty">
        <FileText size={28} />
        <p>Save the flashcard set before using staging.</p>
      </div>
    );
  }

  if (activeTab === "import") {
    return (
      <div className="flashcard-staging__grid">
        <QuestionBankImportPanel
          setId={setId}
          notify={notify}
          onStagingChanged={handleStagingChanged}
        />
        <TextGenerationPanel
          setId={setId}
          notify={notify}
          onStagingChanged={handleStagingChanged}
        />
        <DocumentGenerationPanel
          setId={setId}
          notify={notify}
          onStagingChanged={handleStagingChanged}
        />
        <TranscriptGenerationPanel
          setId={setId}
          notify={notify}
          onStagingChanged={handleStagingChanged}
        />
      </div>
    );
  }

  return (
    <StagingReviewPanel
      setId={setId}
      notify={notify}
      refreshKey={refreshKey}
      onApproved={onApproved}
      onUploadImage={onUploadImage}
    />
  );
}
