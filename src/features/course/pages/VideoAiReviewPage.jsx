import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBeforeUnload, useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, Loader2, Sparkles } from "lucide-react";
import { Button, useToast } from "@/shared/components/ui";
import { createAdminVideoAiService, createTrainerVideoAiService } from "@/services/video-ai.service";
import "../components/video-ai/video-ai.css";

const TABS = [
  { key: "summary", label: "Summary" },
  { key: "chapters", label: "Chapters" },
  { key: "transcript", label: "Transcript" },
];

function formatTimestamp(ms) {
  const seconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function friendlyRequestError(error, fallback) {
  const status = error?.response?.status || error?.originalError?.response?.status;
  if (status === 401) return "Your session has expired. Sign in again to continue.";
  if (status === 403) return "You do not have permission to make this change.";
  return fallback;
}

export default function VideoAiReviewPage() {
  const { courseId, classId, lessonId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const tabRefs = useRef([]);
  const mountedRef = useRef(true);
  const contentRequestRef = useRef(0);
  const targetsRequestRef = useRef(0);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const [dirty, setDirty] = useState(false);
  const [flashcardTargets, setFlashcardTargets] = useState([]);
  const [targetLessonId, setTargetLessonId] = useState("");
  const [flashcardCount, setFlashcardCount] = useState(10);
  const [flashcardLoading, setFlashcardLoading] = useState(false);
  const [flashcardProgress, setFlashcardProgress] = useState(0);
  const [flashcardTargetsError, setFlashcardTargetsError] = useState("");
  const [flashcardTargetsLoading, setFlashcardTargetsLoading] = useState(true);

  const isTrainer = Boolean(classId) || location.pathname.startsWith("/trainer/");
  const routeKey = `${isTrainer ? "trainer" : "admin"}:${classId || courseId}:${lessonId}`;
  const routeKeyRef = useRef(routeKey);
  useEffect(() => {
    routeKeyRef.current = routeKey;
  }, [routeKey]);
  const service = useMemo(
    () => isTrainer
      ? createTrainerVideoAiService(classId, lessonId)
      : createAdminVideoAiService(courseId, lessonId),
    [classId, courseId, isTrainer, lessonId],
  );
  const backPath = isTrainer
    ? `/trainer/classes/${classId}/curriculum/lessons/${lessonId}`
    : `${location.pathname.startsWith("/staff/") ? "/staff" : "/admin"}/courses/${courseId}/lessons/${lessonId}`;
  const isDraft = content?.status === "DRAFT";
  const formDisabled = !isDraft || saving || publishing || flashcardLoading;

  const loadContent = useCallback(async () => {
    const requestId = ++contentRequestRef.current;
    const requestedRoute = routeKey;
    setLoading(true);
    setSaving(false);
    setPublishing(false);
    setFlashcardLoading(false);
    setContent(null);
    try {
      const next = await service.getCurrentContent();
      if (!mountedRef.current || requestedRoute !== routeKeyRef.current
        || requestId !== contentRequestRef.current) return;
      setContent(next?.id ? next : null);
      setDirty(false);
      setError("");
    } catch (loadError) {
      if (!mountedRef.current || requestedRoute !== routeKeyRef.current
        || requestId !== contentRequestRef.current) return;
      if (loadError?.originalError?.response?.status === 404) {
        setContent(null);
        setError("");
      } else {
        setError(friendlyRequestError(loadError, "We could not load the study guide. Please try again."));
      }
    } finally {
      if (mountedRef.current && requestedRoute === routeKeyRef.current
        && requestId === contentRequestRef.current) setLoading(false);
    }
  }, [routeKey, service]);

  const loadFlashcardTargets = useCallback(async () => {
    const requestId = ++targetsRequestRef.current;
    const requestedRoute = routeKey;
    setFlashcardTargetsLoading(true);
    try {
      const targets = await service.getFlashcardTargets();
      if (!mountedRef.current || requestedRoute !== routeKeyRef.current
        || requestId !== targetsRequestRef.current) return;
      setFlashcardTargets(targets);
      setTargetLessonId((current) => {
        const stillExists = targets.some((target) => String(target.lessonId ?? target.id) === String(current));
        return stillExists ? current : String(targets[0]?.lessonId ?? targets[0]?.id ?? "");
      });
      setFlashcardTargetsError("");
    } catch (targetsError) {
      if (!mountedRef.current || requestedRoute !== routeKeyRef.current
        || requestId !== targetsRequestRef.current) return;
      setFlashcardTargets([]);
      setFlashcardTargetsError(
        friendlyRequestError(targetsError, "We could not load the available flashcard lessons. Please try again."),
      );
    } finally {
      if (mountedRef.current && requestedRoute === routeKeyRef.current
        && requestId === targetsRequestRef.current) setFlashcardTargetsLoading(false);
    }
  }, [routeKey, service]);

  useEffect(() => {
    mountedRef.current = true;
    const timerId = window.setTimeout(loadContent, 0);
    return () => {
      window.clearTimeout(timerId);
      mountedRef.current = false;
      contentRequestRef.current += 1;
      targetsRequestRef.current += 1;
    };
  }, [loadContent]);
  useEffect(() => {
    const timerId = window.setTimeout(loadFlashcardTargets, 0);
    return () => window.clearTimeout(timerId);
  }, [loadFlashcardTargets]);

  useBeforeUnload(useCallback((event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
  }, [dirty]));

  useEffect(() => {
    if (!dirty) return undefined;
    const confirmLinkNavigation = (event) => {
      if (event.defaultPrevented || event.button !== 0
        || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target?.closest?.("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      if (destination.origin !== current.origin
        || (destination.pathname === current.pathname
          && destination.search === current.search
          && destination.hash === current.hash)) return;
      if (!window.confirm("You have unsaved changes to this study guide. Leave without saving?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", confirmLinkNavigation, true);
    return () => document.removeEventListener("click", confirmLinkNavigation, true);
  }, [dirty]);

  function updateContent(updater) {
    setContent((current) => typeof updater === "function" ? updater(current) : { ...current, ...updater });
    setDirty(true);
  }

  function goBack() {
    if (!dirty || window.confirm("You have unsaved changes to this study guide. Leave without saving?")) navigate(backPath);
  }

  function payload() {
    return {
      revision: content.revision,
      summary: content.summary,
      keyPoints: content.keyPoints,
      chapters: content.chapters.map(({ title, summary, startMs, endMs }) => ({ title, summary, startMs, endMs })),
      segments: content.transcriptSegments.map(({ text, startMs, endMs }) => ({ text, startMs, endMs })),
    };
  }

  async function save() {
    if (saving || publishing) return null;
    const actionRoute = routeKey;
    if (!content?.summary?.trim()) {
      setActiveTab("summary");
      showToast({ type: "error", message: "Summary cannot be empty." });
      return null;
    }
    setSaving(true);
    try {
      const saved = await service.saveContent(content.id, payload());
      if (!mountedRef.current || actionRoute !== routeKeyRef.current) return null;
      setContent(saved);
      setDirty(false);
      showToast({ type: "success", message: "Study guide draft saved." });
      return saved;
    } catch (saveError) {
      if (mountedRef.current && actionRoute === routeKeyRef.current) {
        showToast({ type: "error", message: friendlyRequestError(saveError, "We could not save the study guide. Please try again.") });
      }
      return null;
    } finally {
      if (mountedRef.current && actionRoute === routeKeyRef.current) setSaving(false);
    }
  }

  async function publish() {
    if (saving || publishing || flashcardLoading) return;
    const actionRoute = routeKey;
    const savedContent = dirty ? await save() : content;
    if (!savedContent) return;
    setPublishing(true);
    try {
      const published = await service.publishContent(savedContent.id, savedContent.revision);
      if (!mountedRef.current || actionRoute !== routeKeyRef.current) return;
      setContent(published);
      setDirty(false);
      showToast({ type: "success", message: "Study guide published to learners." });
    } catch (publishError) {
      if (mountedRef.current && actionRoute === routeKeyRef.current) {
        showToast({ type: "error", message: friendlyRequestError(publishError, "We could not publish the study guide. Please try again.") });
      }
    } finally {
      if (mountedRef.current && actionRoute === routeKeyRef.current) setPublishing(false);
    }
  }

  async function createFlashcards() {
    if (!targetLessonId || saving || publishing || flashcardLoading) return;
    const actionRoute = routeKey;
    setFlashcardLoading(true);
    setFlashcardProgress(0);
    try {
      const savedContent = dirty ? await save() : content;
      if (!savedContent) return;

      let job = await service.createFlashcardJob(savedContent.id, {
        targetLessonId,
        desiredCount: Math.min(30, Math.max(1, Number(flashcardCount) || 10)),
        difficulty: "medium",
      });
      showToast({ type: "success", message: "Flashcard candidates are being generated." });

      for (let attempt = 0; attempt < 180 && mountedRef.current
        && actionRoute === routeKeyRef.current; attempt += 1) {
        setFlashcardProgress(job.progress);
        if (job.status === "COMPLETED") {
          if (!job.setId || !job.targetLessonId) {
            throw new Error("Flashcards were created, but the review destination is missing.");
          }
          const prefix = isTrainer
            ? `/trainer/classes/${classId}/curriculum/lessons`
            : `${location.pathname.startsWith("/staff/") ? "/staff" : "/admin"}/courses/${courseId}/lessons`;
          const query = new URLSearchParams({
            flashcardSection: "review",
            flashcardSetId: job.setId,
          });
          navigate(`${prefix}/${job.targetLessonId}?${query}`, {
            state: { flashcardSection: "review", flashcardSetId: job.setId },
          });
          return;
        }
        if (["FAILED", "SUPERSEDED"].includes(job.status)) {
          throw new Error("Flashcard creation did not complete.");
        }
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        if (!mountedRef.current || actionRoute !== routeKeyRef.current) return;
        job = await service.getJob(job.id);
      }

      if (mountedRef.current && actionRoute === routeKeyRef.current) {
        throw new Error("Flashcard generation is taking longer than expected. The job is still running in the background.");
      }
    } catch (flashcardError) {
      if (mountedRef.current && actionRoute === routeKeyRef.current) {
        console.error("Unable to create flashcards from the study guide:", flashcardError);
        showToast({ type: "error", message: "We could not create the flashcards. Please try again." });
      }
    } finally {
      if (mountedRef.current && actionRoute === routeKeyRef.current) setFlashcardLoading(false);
    }
  }

  function handleTabKey(event, index) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
    setActiveTab(TABS[nextIndex].key);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <main className="video-ai-review" id="video-ai-review-main">
      <header className="video-ai-review__header">
        <button type="button" className="video-ai-review__back" onClick={goBack} aria-label="Back to lesson"><ArrowLeft size={20} /></button>
        <div><span className="video-ai-review__eyebrow"><Sparkles size={15} />Automatically created draft</span><h1>Review video study guide</h1><p>Check and edit every section before sharing it with learners.</p></div>
        {content && <span className={`video-ai-status video-ai-status--${content.status.toLowerCase()}`}>{content.status === "PUBLISHED" ? "Published" : "Draft"}</span>}
      </header>

      {loading && <div className="video-ai-review__state" role="status"><Loader2 className="video-ai-spin" />Loading study guide...</div>}
      {!loading && error && <div className="video-ai-review__state video-ai-alert video-ai-alert--error" role="alert"><AlertCircle /><span>{error}</span><Button variant="secondary" onClick={loadContent}>Try again</Button></div>}
      {!loading && !error && !content && <div className="video-ai-review__state"><Sparkles size={32} /><h2>No study guide yet</h2><p>Return to the lesson and create a study guide after the video is ready.</p><Button variant="secondary" onClick={goBack}>Back to lesson</Button></div>}

      {content && !loading && !error && (
        <>
          <div className="video-ai-review__tabs" role="tablist" aria-label="Study guide sections">
            {TABS.map((tab, index) => <button key={tab.key} ref={(node) => { tabRefs.current[index] = node; }} type="button" role="tab" aria-selected={activeTab === tab.key} aria-controls={`video-ai-${tab.key}-panel`} tabIndex={activeTab === tab.key ? 0 : -1} className={activeTab === tab.key ? "is-active" : ""} onClick={() => setActiveTab(tab.key)} onKeyDown={(event) => handleTabKey(event, index)}>{tab.label}</button>)}
          </div>
          <section id={`video-ai-${activeTab}-panel`} role="tabpanel" className="video-ai-review__panel">
            {activeTab === "summary" && <div className="video-ai-form"><label htmlFor="video-ai-summary">Summary</label><textarea id="video-ai-summary" rows="9" value={content.summary} disabled={formDisabled} onChange={(event) => updateContent({ ...content, summary: event.target.value })} /><label htmlFor="video-ai-key-points">Key points <span>one per line</span></label><textarea id="video-ai-key-points" rows="6" value={content.keyPoints.join("\n")} disabled={formDisabled} onChange={(event) => updateContent({ ...content, keyPoints: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} /></div>}
            {activeTab === "chapters" && <div className="video-ai-list">{content.chapters.length === 0 ? <p className="video-ai-empty">No chapters were generated.</p> : content.chapters.map((chapter, index) => <article key={chapter.id}><div className="video-ai-list__time"><Clock3 size={16} />{formatTimestamp(chapter.startMs)}</div><label htmlFor={`chapter-title-${chapter.id}`}>Chapter {index + 1} title</label><input id={`chapter-title-${chapter.id}`} value={chapter.title} disabled={formDisabled} onChange={(event) => updateContent({ ...content, chapters: content.chapters.map((item) => item.id === chapter.id ? { ...item, title: event.target.value } : item) })} /><label htmlFor={`chapter-summary-${chapter.id}`}>Chapter summary</label><textarea id={`chapter-summary-${chapter.id}`} rows="3" value={chapter.summary} disabled={formDisabled} onChange={(event) => updateContent({ ...content, chapters: content.chapters.map((item) => item.id === chapter.id ? { ...item, summary: event.target.value } : item) })} /></article>)}</div>}
            {activeTab === "transcript" && <div className="video-ai-transcript-edit">{content.transcriptSegments.length === 0 ? <p className="video-ai-empty">No transcript segments were generated.</p> : content.transcriptSegments.map((segment) => <div key={segment.id}><span>{formatTimestamp(segment.startMs)}</span><label className="video-ai-sr-only" htmlFor={`segment-${segment.id}`}>Transcript at {formatTimestamp(segment.startMs)}</label><textarea id={`segment-${segment.id}`} rows="2" value={segment.text} disabled={formDisabled} onChange={(event) => updateContent({ ...content, transcriptSegments: content.transcriptSegments.map((item) => item.id === segment.id ? { ...item, text: event.target.value } : item) })} /></div>)}</div>}
          </section>

          <section className="video-ai-review__flashcards" aria-labelledby="video-ai-flashcards-title"><div><h2 id="video-ai-flashcards-title">Create flashcard drafts</h2><p>Review and approve the cards before learners can use them.</p>{flashcardLoading && <p role="status" aria-live="polite">Creating flashcards: {flashcardProgress}%</p>}</div>{flashcardTargetsLoading ? <p className="video-ai-empty" role="status">Loading flashcard lessons...</p> : flashcardTargetsError ? <div className="video-ai-alert video-ai-alert--error" role="alert"><AlertCircle size={18} /><span>{flashcardTargetsError}</span><Button variant="secondary" size="sm" onClick={loadFlashcardTargets}>Try again</Button></div> : flashcardTargets.length ? <div className="video-ai-review__flashcard-controls"><label>Flashcard lesson<select value={targetLessonId} disabled={flashcardLoading || saving || publishing} onChange={(event) => setTargetLessonId(event.target.value)}>{flashcardTargets.map((target) => <option key={target.lessonId ?? target.id} value={target.lessonId ?? target.id}>{target.title ?? target.lessonTitle}</option>)}</select></label><label>Number of cards<input type="number" min="1" max="30" value={flashcardCount} disabled={flashcardLoading || saving || publishing} onChange={(event) => setFlashcardCount(event.target.value)} /></label><Button variant="secondary" loading={flashcardLoading} disabled={saving || publishing} onClick={createFlashcards}>Create flashcards</Button></div> : <p className="video-ai-empty">Create a flashcard lesson first, then return here to add cards from this study guide.</p>}</section>

          <footer className="video-ai-review__actions"><span aria-live="polite">{isDraft ? (dirty ? "Unsaved changes" : <><CheckCircle2 size={16} />All changes saved</>) : <><CheckCircle2 size={16} />Published content is read-only</>}</span>{isDraft && <><Button variant="secondary" onClick={save} loading={saving} disabled={!dirty || publishing || flashcardLoading}>Save draft</Button><Button onClick={publish} loading={publishing} disabled={saving || flashcardLoading}>Publish to learners</Button></>}</footer>
        </>
      )}
    </main>
  );
}
