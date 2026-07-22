import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { BadgeCheck, Copy, Loader2, MessageSquare, Paperclip, RotateCcw, Sparkles, X } from "lucide-react";
import { assignmentService } from "@/services/flashtest.service";
import "./AssignmentAiDraftPanel.css";

const DEFAULT_PROMPT =
  "Hay tao noi dung bai assignment dua tren tai lieu nay va kem tieu chi cham diem.";
const UNSUPPORTED_SOURCE_MESSAGE = "Only PDF or DOCX files can be uploaded.";
const MIN_THINKING_MS = 700;

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
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(DEFAULT_PROMPT);
  const [file, setFile] = useState(null);
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
    setReply("");
    setError("");
    setCopied(false);
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
        setCachedSourceName(response?.sourceName || file?.name || cachedSourceName);
        setFile(null);
      }
    } catch (requestError) {
      setError(requestError?.message || "Could not generate AI draft.");
    } finally {
      const remainingMs = Math.max(0, MIN_THINKING_MS - (Date.now() - startedAt));
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
            <MessageSquare size={18} />
            <div>
              <div className="assignment-ai__title-row">
                <strong>AI draft chat</strong>
                <span className="assignment-ai__standard">
                  <BadgeCheck size={13} />
                  Standard
                </span>
              </div>
              <span>AI only creates copyable draft text, not saved content. Up to 5 questions per prompt.</span>
            </div>
            <button
              className="assignment-ai__clear"
              type="button"
              title="Clear AI chat"
              disabled={loading}
              onClick={() => resetDraftState()}
            >
              <RotateCcw size={15} />
              <span>Clear</span>
            </button>
          </div>

          <label className="assignment-ai__field">
            <span>Trainer message</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask AI to draft assignment content and grading criteria."
              rows={4}
              disabled={loading}
            />
          </label>

          <div className="assignment-ai__file-row">
            {file ? (
              <div className="assignment-ai__file-pill">
                <Paperclip size={15} />
                <span>{file.name}</span>
                <button
                  type="button"
                  title="Remove AI source file"
                  disabled={loading}
                  onClick={() => {
                    setFile(null);
                    setSourceCacheKey("");
                    setCachedSourceName("");
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            ) : sourceCacheKey ? (
              <div className="assignment-ai__file-pill">
                <Paperclip size={15} />
                <span>{cachedSourceName || "Cached source"}</span>
                <button
                  type="button"
                  title="Remove cached AI source"
                  disabled={loading}
                  onClick={() => {
                    setSourceCacheKey("");
                    setCachedSourceName("");
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <label className="assignment-ai__upload">
                <Paperclip size={16} />
                <span>Attach source for AI</span>
                <input
                  type="file"
                  hidden
                  accept=".pdf,.docx"
                  disabled={loading}
                  onChange={(event) => {
                    const selectedFile = event.target.files?.[0] || null;
                    if (selectedFile && !isSupportedSourceFile(selectedFile)) {
                      setFile(null);
                      setSourceCacheKey("");
                      setCachedSourceName("");
                      setError(UNSUPPORTED_SOURCE_MESSAGE);
                      event.target.value = "";
                      return;
                    }
                    setFile(selectedFile);
                    setSourceCacheKey("");
                    setCachedSourceName("");
                    setError("");
                  }}
                />
              </label>
            )}
            <button
              className="assignment-ai__send"
              type="button"
              disabled={loading}
              onClick={handleGenerate}
            >
              {loading ? <Loader2 className="assignment-ai__spin" size={16} /> : <Sparkles size={16} />}
              <span>{loading ? "Generating..." : "Generate draft"}</span>
            </button>
          </div>

          <p className="assignment-ai__hint">
            Suggested keywords to avoid blocked requests: assignment, essay, homework, rubric, grading criteria, exercise. To draft without a file, remove the attached source first. Only the latest message, current editor summary, and a shortened source excerpt are sent. Uploaded sources are reused from a temporary cache for follow-up drafts.
          </p>

          {loading && (
            <div className="assignment-ai__thinking" role="status" aria-live="polite">
              <Loader2 className="assignment-ai__spin" size={16} />
              <span>AI is reviewing your request...</span>
            </div>
          )}

          {error && <div className="assignment-ai__error">{error}</div>}

          {reply && (
            <div className="assignment-ai__reply">
              <div className="assignment-ai__reply-header">
                <strong>AI draft</strong>
                <button type="button" onClick={handleCopy}>
                  <Copy size={15} />
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre>{reply}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AssignmentAiDraftPanel;
