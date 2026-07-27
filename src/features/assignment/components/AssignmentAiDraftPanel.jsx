import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ArrowUp,
  BadgeCheck,
  Check,
  Copy,
  FileText,
  Loader2,
  Paperclip,
  Sparkles,
  X,
} from "lucide-react";
import { assignmentService } from "@/services/flashtest.service";
import "./AssignmentAiDraftPanel.css";

const DEFAULT_PROMPT =
  "Hay tao noi dung bai assignment dua tren tai lieu nay va kem tieu chi cham diem.";
const UNSUPPORTED_SOURCE_MESSAGE = "Only PDF or DOCX files can be uploaded.";
const MIN_THINKING_MS = 700;
const PROMPT_SUGGESTIONS = [
  "Create an assignment from the lesson summary",
  "Draft an essay with a detailed rubric",
  "Create 3 practice assignments",
];

function isSupportedSourceFile(file) {
  if (!file?.name) return false;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension === "pdf" || extension === "docx";
}

export function AssignmentAiDraftPanel({
  mode = "assignment",
  currentTitle = "",
  currentDescription = "",
  compact = false,
  onDraftGenerated,
}) {
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(DEFAULT_PROMPT);
  const [file, setFile] = useState(null);
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sourceCacheKey, setSourceCacheKey] = useState("");
  const [cachedSourceName, setCachedSourceName] = useState("");

  function resetDraftState({ keepOpen = true } = {}) {
    setMessage(DEFAULT_PROMPT);
    setFile(null);
    setSourceCacheKey("");
    setCachedSourceName("");
    setSubmittedMessage("");
    setReply("");
    setError("");
    setCopied(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (!keepOpen) {
      setOpen(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(
      () => resetDraftState({ keepOpen: false }),
      0,
    );
    return () => window.clearTimeout(timer);
  }, [location.key]);

  async function handleGenerate() {
    const trimmed = message.trim();
    if (!trimmed) {
      setError("Please enter what you want AI to draft.");
      return;
    }

    const startedAt = Date.now();
    setSubmittedMessage(trimmed);
    setLoading(true);
    setError("");
    setReply("");
    setCopied(false);
    try {
      const response = await assignmentService.generateAiDraft({
        message: trimmed,
        mode,
        currentTitle,
        currentDescription,
        file,
        sourceCacheKey,
      });
      setReply(response?.content || "");
      onDraftGenerated?.({
        content: response?.content || "",
        rubric: response?.rubric || "",
      });
      if (response?.sourceCacheKey) {
        setSourceCacheKey(response.sourceCacheKey);
        setCachedSourceName(
          response?.sourceName || file?.name || cachedSourceName,
        );
        setFile(null);
      }
    } catch (requestError) {
      setError(requestError?.message || "Could not generate AI draft.");
    } finally {
      const remainingMs = Math.max(
        0,
        MIN_THINKING_MS - (Date.now() - startedAt),
      );
      if (remainingMs > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingMs));
      }
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!reply) return;
    try {
      await navigator.clipboard.writeText(reply);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy. Please select the text manually.");
    }
  }

  function removeSource() {
    setFile(null);
    setSourceCacheKey("");
    setCachedSourceName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleComposerKeyDown(event) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      if (!loading) {
        handleGenerate();
      }
    }
  }

  return (
    <div className={`assignment-ai ${compact ? "assignment-ai--compact" : ""}`}>
      <button
        className="assignment-ai__toggle"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <Sparkles size={16} />
        <span>{open ? "Hide AI chat" : "AI draft assistant"}</span>
      </button>

      {open && (
        <div className="assignment-ai__panel">
          <div className="assignment-ai__header">
            <div className="assignment-ai__identity">
              <Sparkles size={18} aria-hidden="true" />
              <div>
                <div className="assignment-ai__title-row">
                  <strong>Smart Learnly AI</strong>
                  <span className="assignment-ai__standard">
                    <BadgeCheck size={13} />
                    Standard
                  </span>
                </div>
                <span>
                  Build assignment content and grading rubrics with AI. Max 5
                  questions per prompt
                </span>
              </div>
            </div>
          </div>

          <div className="assignment-ai__conversation" aria-live="polite">
            {!submittedMessage && (
              <div className="assignment-ai__assistant-message">
                <div className="assignment-ai__message-author">
                  <Sparkles size={15} aria-hidden="true" />
                  <strong>AI assistant</strong>
                </div>
                <p>
                  Tell me what learners should create or practice. You can also
                  attach a PDF or DOCX so the draft follows your source
                  material.
                </p>
                <div
                  className="assignment-ai__suggestions"
                  aria-label="Prompt suggestions"
                >
                  {PROMPT_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={loading}
                      onClick={() => setMessage(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {submittedMessage && (
              <div className="assignment-ai__user-message">
                <span>You</span>
                <div>{submittedMessage}</div>
                {(file || sourceCacheKey) && (
                  <small>
                    <Paperclip size={12} />
                    {file?.name || cachedSourceName || "Attached source"}
                  </small>
                )}
              </div>
            )}

            {loading && (
              <div className="assignment-ai__assistant-message" role="status">
                <div className="assignment-ai__message-author">
                  <Sparkles size={15} aria-hidden="true" />
                  <strong>AI assistant</strong>
                </div>
                <div className="assignment-ai__thinking">
                  <Loader2 className="assignment-ai__spin" size={16} />
                  <span>Reviewing your request and preparing a draft...</span>
                </div>
              </div>
            )}

            {reply && (
              <div className="assignment-ai__assistant-message">
                <div className="assignment-ai__message-author">
                  <Sparkles size={15} aria-hidden="true" />
                  <strong>AI assistant</strong>
                </div>
                <div className="assignment-ai__reply">
                  <div className="assignment-ai__reply-header">
                    <strong>AI draft</strong>
                    <button type="button" onClick={handleCopy}>
                      {copied ? <Check size={15} /> : <Copy size={15} />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="assignment-ai__reply-content">{reply}</div>
                  <p className="assignment-ai__disclaimer">
                    Review this draft before using it in your assignment.
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="assignment-ai__error" role="alert">
              {error}
            </div>
          )}

          <div className="assignment-ai__composer">
            {(file || sourceCacheKey) && (
              <div className="assignment-ai__file-pill">
                <FileText size={16} />
                <span>
                  <strong>
                    {file?.name || cachedSourceName || "Cached source"}
                  </strong>
                  <small>
                    {file ? "Ready to use" : "Source available for follow-up"}
                  </small>
                </span>
                <button
                  type="button"
                  title="Remove AI source"
                  aria-label="Remove AI source"
                  disabled={loading}
                  onClick={removeSource}
                >
                  <X size={15} />
                </button>
              </div>
            )}
            <label className="assignment-ai__field">
              <span className="sr-only">Message Smart Learnly AI</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Describe the assignment you want to create..."
                rows={compact ? 3 : 4}
                disabled={loading}
              />
            </label>
            <div className="assignment-ai__composer-actions">
              <label
                className="assignment-ai__upload"
                title="Attach PDF or DOCX"
              >
                <Paperclip size={17} />
                <span>
                  {file || sourceCacheKey ? "Replace source" : "Attach source"}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept=".pdf,.docx"
                  disabled={loading}
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0] || null;
                    if (selectedFile && !isSupportedSourceFile(selectedFile)) {
                      removeSource();
                      setError(UNSUPPORTED_SOURCE_MESSAGE);
                      return;
                    }
                    setFile(selectedFile);
                    setSourceCacheKey("");
                    setCachedSourceName("");
                    setError("");
                  }}
                />
              </label>
              <span className="assignment-ai__shortcut">
                Ctrl + Enter to send
              </span>
              <button
                className="assignment-ai__send"
                type="button"
                disabled={loading || !message.trim()}
                onClick={handleGenerate}
                aria-label={loading ? "Generating draft" : "Generate draft"}
              >
                {loading ? (
                  <Loader2 className="assignment-ai__spin" size={18} />
                ) : (
                  <ArrowUp size={18} />
                )}
                <span>{loading ? "Generating" : "Generate"}</span>
              </button>
            </div>
          </div>

          <p className="assignment-ai__privacy">
            AI uses your message, current lesson summary, and attached source
            only to prepare this draft. Up to 5 drafts per request.
          </p>
        </div>
      )}
    </div>
  );
}

export default AssignmentAiDraftPanel;
