import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  BookOpenText,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSearch,
  Layers3,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { learnerVideoAiService } from "@/services/video-ai.service";
import "./LearnerAiToolsPanel.css";

const REQUEST_TIMEOUT_MS = 12000;
const MIN_GENERATION_EFFECT_MS = 700;

const TOOL_OPTIONS = [
  {
    key: "summary",
    label: "Video summary",
    description: "Create a concise overview and key takeaways.",
    icon: BookOpenText,
  },
  {
    key: "chapters",
    label: "Video chapters",
    description: "Jump directly to a topic in the video.",
    icon: Clock3,
  },
  {
    key: "transcript",
    label: "Search transcript",
    description: "Find a phrase and return to that moment.",
    icon: FileSearch,
  },
  {
    key: "flashcards",
    label: "Personal flashcards",
    description: "Create a private deck for this lesson.",
    icon: Layers3,
  },
  {
    key: "quiz",
    label: "Quick quiz",
    description: "Check your understanding immediately.",
    icon: BrainCircuit,
  },
];

const GENERATION_STEPS = {
  summary: ["Reading the transcript", "Finding the main ideas", "Writing your summary"],
  chapters: ["Mapping the video timeline", "Grouping related ideas", "Preparing chapter links"],
  transcript: ["Opening the transcript", "Indexing spoken phrases", "Making every moment searchable"],
  flashcards: ["Reviewing the key ideas", "Writing recall prompts", "Saving your private deck"],
  quiz: ["Reviewing the lesson", "Writing balanced questions", "Saving your private quiz"],
};

function getLessonId(lesson) {
  return lesson?.lessonId ?? lesson?.id ?? null;
}

function formatTimestamp(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function requestMessage(error) {
  const status = error?.originalError?.response?.status;
  if (status === 403) return "AI tools are available to enrolled learners.";
  if (status === 404) return "This lesson is no longer available.";
  if (error?.code === "REQUEST_TIMEOUT") return "The request took too long. Try again.";
  return error?.message || "AI tools could not be loaded. Try again.";
}

function EmptyState({ icon: Icon = Sparkles, title, children, action }) {
  return (
    <div className="learner-ai__empty" role="status">
      <span className="learner-ai__empty-icon" aria-hidden="true">
        <Icon size={24} className={Icon === Loader2 ? "learner-ai__spin" : undefined} />
      </span>
      <h4>{title}</h4>
      <p>{children}</p>
      {action}
    </div>
  );
}

function GenerationState({ tool, step }) {
  const option = TOOL_OPTIONS.find((item) => item.key === tool);
  const steps = GENERATION_STEPS[tool] || ["Preparing your learning tool"];
  const currentStep = steps[Math.min(step, steps.length - 1)];

  return (
    <div className="learner-ai__generation" role="status" aria-live="polite">
      <div className="learner-ai__assistant-avatar" aria-hidden="true">
        <Bot size={20} />
      </div>
      <div className="learner-ai__generation-bubble">
        <span>Smart Learnly AI</span>
        <strong>{currentStep}</strong>
        <div className="learner-ai__typing-dots" aria-hidden="true">
          <i /><i /><i />
        </div>
        <div className="learner-ai__skeleton" aria-hidden="true">
          <i /><i /><i />
        </div>
        <small>{option?.label || "AI learning tool"} will appear here when it is ready.</small>
      </div>
    </div>
  );
}

function ToolPrompt() {
  return (
    <div className="learner-ai__prompt">
      <span className="learner-ai__prompt-icon" aria-hidden="true"><Sparkles size={24} /></span>
      <h4>What would you like to create?</h4>
      <p>Select a tool above. Smart Learnly will prepare it only when you ask.</p>
    </div>
  );
}

export function LearnerAiToolsPanel({ courseId, lesson, classId, workspaceMode }) {
  const lessonId = getLessonId(lesson);
  const lessonType = String(lesson?.lessonType || lesson?.type || "").toUpperCase();
  const canLoad = Boolean(
    workspaceMode === "student" && lessonType === "VIDEO" && courseId && lessonId,
  );
  const [tools, setTools] = useState(null);
  const [loading, setLoading] = useState(canLoad);
  const [error, setError] = useState("");
  const [selectedTool, setSelectedTool] = useState("");
  const [workingTool, setWorkingTool] = useState("");
  const [generationStep, setGenerationStep] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleAnswers, setVisibleAnswers] = useState({});
  const [quizAnswers, setQuizAnswers] = useState({});
  const automaticPollsRef = useRef(0);

  useEffect(() => {
    if (!workingTool) return undefined;
    const steps = GENERATION_STEPS[workingTool] || [];
    const intervalId = window.setInterval(() => {
      setGenerationStep((current) => Math.min(current + 1, Math.max(0, steps.length - 1)));
    }, 650);
    return () => window.clearInterval(intervalId);
  }, [workingTool]);

  async function loadTools() {
    if (!canLoad) return;
    setLoading(true);
    setError("");
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await learnerVideoAiService.getTools(
        courseId,
        lessonId,
        classId,
        { signal: controller.signal },
      );
      setTools(response);
    } catch (loadError) {
      if (!controller.signal.aborted) setError(requestMessage(loadError));
      else setError("The request took too long. Try again.");
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    if (!canLoad) return undefined;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    learnerVideoAiService
      .getTools(courseId, lessonId, classId, { signal: controller.signal })
      .then((response) => {
        if (active) setTools(response);
      })
      .catch((loadError) => {
        if (active) {
          setError(
            controller.signal.aborted
              ? "The request took too long. Try again."
              : requestMessage(loadError),
          );
        }
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [canLoad, classId, courseId, lessonId]);

  useEffect(() => {
    if (tools?.preparationStatus !== "PROCESSING" || automaticPollsRef.current >= 120) {
      return undefined;
    }

    let cancelled = false;
    let timerId;

    async function poll() {
      automaticPollsRef.current += 1;
      try {
        const response = await learnerVideoAiService.getTools(courseId, lessonId, classId);
        if (cancelled) return;
        setTools(response);
        setError("");
        if (response?.preparationStatus === "PROCESSING" && automaticPollsRef.current < 120) {
          timerId = window.setTimeout(poll, 5000);
        }
      } catch (pollError) {
        if (cancelled) return;
        setError(requestMessage(pollError));
        if (automaticPollsRef.current < 120) timerId = window.setTimeout(poll, 5000);
      }
    }

    timerId = window.setTimeout(poll, 5000);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [classId, courseId, lessonId, tools?.preparationStatus]);

  const filteredSegments = useMemo(() => {
    const segments = tools?.content?.transcriptSegments || [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return segments;
    return segments.filter((segment) =>
      String(segment.text || "").toLowerCase().includes(query),
    );
  }, [searchQuery, tools?.content?.transcriptSegments]);

  function seekTo(milliseconds) {
    window.dispatchEvent(
      new CustomEvent("smartlearnly:seek-video", {
        detail: { lessonId, seconds: Number(milliseconds || 0) / 1000 },
      }),
    );
  }

  async function openTool(type) {
    setSelectedTool(type);
    setGenerationStep(0);
    setWorkingTool(type);
    setError("");
    const effect = new Promise((resolve) => {
      window.setTimeout(resolve, MIN_GENERATION_EFFECT_MS);
    });
    try {
      if (type === "flashcards" || type === "quiz") {
        const current = type === "flashcards" ? tools?.flashcards : tools?.quiz;
        const payload = {
          desiredCount: type === "flashcards" ? 8 : 5,
          difficulty: "medium",
          regenerate: Boolean(current),
        };
        const request = type === "flashcards"
          ? learnerVideoAiService.generateFlashcards(courseId, lessonId, classId, payload)
          : learnerVideoAiService.generateQuiz(courseId, lessonId, classId, payload);
        const [result] = await Promise.all([request, effect]);
        setTools((currentTools) => ({ ...currentTools, [type]: result }));
        if (type === "flashcards") setVisibleAnswers({});
        else setQuizAnswers({});
      } else {
        const request = learnerVideoAiService.getTools(courseId, lessonId, classId);
        const [freshTools] = await Promise.all([request, effect]);
        setTools(freshTools);
      }
    } catch (generateError) {
      setError(requestMessage(generateError));
    } finally {
      setWorkingTool("");
    }
  }

  if (lessonType !== "VIDEO") {
    return (
      <EmptyState title="AI tools are designed for video lessons">
        Open a video lesson to use summaries, searchable transcripts, flashcards, and quizzes.
      </EmptyState>
    );
  }

  if (workspaceMode !== "student") {
    return (
      <EmptyState title="Available in the learner workspace">
        Enrolled learners can create private flashcards and quizzes here. Preview mode does not create learner data.
      </EmptyState>
    );
  }

  if (loading && !tools) {
    return (
      <div className="learner-ai__loading" role="status">
        <Loader2 size={22} className="learner-ai__spin" aria-hidden="true" />
        <span>Preparing your AI tools...</span>
      </div>
    );
  }

  if (error && !tools) {
    return (
      <EmptyState
        icon={RefreshCw}
        title="AI tools could not be loaded"
        action={(
          <button type="button" className="learner-ai__inline-button" onClick={loadTools}>
            Try again
          </button>
        )}
      >
        {error}
      </EmptyState>
    );
  }

  if (!tools?.available || !tools?.content) {
    const preparationStatus = tools?.preparationStatus || "NOT_STARTED";
    const stateCopy = {
      PROCESSING: {
        title: "AI tools are being prepared",
        message: "The transcript and study materials are being created automatically. You can keep watching while this finishes.",
      },
      FAILED: {
        title: "AI preparation needs attention",
        message: "The video is ready, but its study materials could not be created. Please ask the course instructor to try again.",
      },
      NEEDS_PUBLISHING: {
        title: "AI content is waiting for a lesson update",
        message: "Please ask the course instructor to open this lesson and select Fill details with AI once.",
      },
      VIDEO_NOT_READY: {
        title: "The video is still being prepared",
        message: "AI tools will start automatically after the lesson video is ready.",
      },
      NOT_STARTED: {
        title: "AI preparation has not started",
        message: "Please ask the course instructor to open the lesson editor and start AI preparation for this video.",
      },
    }[preparationStatus] || {
      title: "AI tools are not ready yet",
      message: "Please check again in a moment.",
    };

    return (
      <EmptyState
        icon={preparationStatus === "PROCESSING" ? Loader2 : Sparkles}
        title={stateCopy.title}
        action={(
          <button type="button" className="learner-ai__inline-button" onClick={loadTools}>
            {preparationStatus === "PROCESSING" ? "Refresh now" : "Check again"}
          </button>
        )}
      >
        {stateCopy.message}
      </EmptyState>
    );
  }

  const content = tools.content;
  const flashcards = tools.flashcards?.cards || [];
  const quizQuestions = tools.quiz?.questions || [];
  const answeredCount = Object.keys(quizAnswers).length;
  const correctCount = quizQuestions.reduce(
    (score, question, index) =>
      score + (quizAnswers[index] === question.correctIndex ? 1 : 0),
    0,
  );

  return (
    <section className="learner-ai" aria-labelledby="learner-ai-heading">
      <header className="learner-ai__header">
        <span className="learner-ai__eyebrow">
          <Sparkles size={15} aria-hidden="true" /> Personal study space
        </span>
        <h3 id="learner-ai-heading">Learn from this video your way</h3>
        <p>Choose one tool at a time. Your result is created when you ask for it.</p>
      </header>

      {error && <div className="learner-ai__alert" role="alert">{error}</div>}

      <div className="learner-ai__tool-grid" aria-label="AI learning tools">
        {TOOL_OPTIONS.map(({ key, label, description, icon: Icon }) => (
          <button
            type="button"
            key={key}
            className={`learner-ai__tool ${selectedTool === key ? "is-active" : ""}`}
            onClick={() => openTool(key)}
            disabled={Boolean(workingTool)}
            aria-pressed={selectedTool === key}
          >
            <span className="learner-ai__tool-icon" aria-hidden="true"><Icon size={20} /></span>
            <span className="learner-ai__tool-copy"><strong>{label}</strong><small>{description}</small></span>
            <span className="learner-ai__tool-action" aria-hidden="true">
              {workingTool === key ? <Loader2 size={16} className="learner-ai__spin" /> : <ChevronRight size={16} />}
            </span>
          </button>
        ))}
      </div>

      <div className="learner-ai__workspace" aria-busy={Boolean(workingTool)}>
        {!selectedTool && <ToolPrompt />}
        {workingTool && <GenerationState tool={workingTool} step={generationStep} />}

        {!workingTool && selectedTool === "summary" && (
          <article className="learner-ai__article learner-ai__article--revealed">
            <div className="learner-ai__response-meta"><Bot size={16} /> Smart Learnly AI</div>
            <h4>Video summary</h4>
            <p>{content.summary || "A summary is not available for this video."}</p>
            <h5>Key takeaways</h5>
            {content.keyPoints?.length ? (
              <ul className="learner-ai__key-points">
                {content.keyPoints.map((point, index) => <li key={`${index}-${point}`}>{point}</li>)}
              </ul>
            ) : <p>No key takeaways are available yet.</p>}
          </article>
        )}

        {!workingTool && selectedTool === "chapters" && (
          <article className="learner-ai__article learner-ai__article--revealed">
            <div className="learner-ai__response-meta"><Bot size={16} /> Smart Learnly AI</div>
            <h4>Video chapters</h4>
            <div className="learner-ai__timeline">
              {(content.chapters || []).map((chapter) => (
                <button type="button" key={chapter.id} onClick={() => seekTo(chapter.startMs)}>
                  <span>{formatTimestamp(chapter.startMs)}</span>
                  <strong>{chapter.title}</strong>
                  {chapter.summary && <small>{chapter.summary}</small>}
                </button>
              ))}
            </div>
          </article>
        )}

        {!workingTool && selectedTool === "transcript" && (
          <article className="learner-ai__article learner-ai__article--revealed">
            <div className="learner-ai__response-meta"><Bot size={16} /> Smart Learnly AI</div>
            <div className="learner-ai__article-heading">
              <h4>Search transcript</h4>
              <label className="learner-ai__search">
                <Search size={16} aria-hidden="true" />
                <span className="sr-only">Search transcript</span>
                <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search what was said" />
              </label>
            </div>
            <div className="learner-ai__transcript">
              {filteredSegments.map((segment) => (
                <button type="button" key={segment.id} onClick={() => seekTo(segment.startMs)}>
                  <span>{formatTimestamp(segment.startMs)}</span><p>{segment.text}</p>
                </button>
              ))}
              {!filteredSegments.length && <p>No transcript lines match your search.</p>}
            </div>
          </article>
        )}

        {!workingTool && selectedTool === "flashcards" && (
          <article className="learner-ai__article learner-ai__article--revealed">
            <div className="learner-ai__response-meta"><Bot size={16} /> Smart Learnly AI</div>
            <div className="learner-ai__article-heading">
              <div>
                <h4>Personal flashcards</h4>
                <p>Only you can see this deck.</p>
                {flashcards.length > 0 && (
                  <span className="learner-ai__saved"><CheckCircle2 size={14} /> Saved to your study space</span>
                )}
              </div>
              <button type="button" className="learner-ai__primary-button" onClick={() => openTool("flashcards")}>
                <Sparkles size={16} />
                Generate a new deck
              </button>
            </div>
            {flashcards.length ? (
              <div className="learner-ai__flashcards">
                {flashcards.map((card, index) => (
                  <div className="learner-ai__flashcard" key={`${index}-${card.front}`}>
                    <span>Card {index + 1}</span><strong>{card.front}</strong>
                    {visibleAnswers[index] ? <p>{card.back}</p> : (
                      <button type="button" onClick={() => setVisibleAnswers((answers) => ({ ...answers, [index]: true }))}>Show answer</button>
                    )}
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={Layers3} title="No personal deck yet">Generate flashcards from this video's key takeaways.</EmptyState>}
          </article>
        )}

        {!workingTool && selectedTool === "quiz" && (
          <article className="learner-ai__article learner-ai__article--revealed">
            <div className="learner-ai__response-meta"><Bot size={16} /> Smart Learnly AI</div>
            <div className="learner-ai__article-heading">
              <div>
                <h4>Quick quiz</h4>
                <p>Your answers stay private.</p>
                {quizQuestions.length > 0 && (
                  <span className="learner-ai__saved"><CheckCircle2 size={14} /> Saved to your study space</span>
                )}
              </div>
              <button type="button" className="learner-ai__primary-button" onClick={() => openTool("quiz")}>
                <Sparkles size={16} />
                Generate a new quiz
              </button>
            </div>
            {quizQuestions.length ? (
              <div className="learner-ai__quiz">
                <div className="learner-ai__quiz-score"><CheckCircle2 size={18} /> {correctCount} correct · {answeredCount}/{quizQuestions.length} answered</div>
                {quizQuestions.map((question, questionIndex) => (
                  <fieldset key={`${questionIndex}-${question.prompt}`}>
                    <legend>{questionIndex + 1}. {question.prompt}</legend>
                    {question.options.map((option, optionIndex) => {
                      const selected = quizAnswers[questionIndex] === optionIndex;
                      const answered = quizAnswers[questionIndex] !== undefined;
                      const correct = optionIndex === question.correctIndex;
                      return (
                        <button
                          type="button"
                          key={`${optionIndex}-${option}`}
                          className={`${selected ? "is-selected" : ""} ${answered && correct ? "is-correct" : ""} ${answered && selected && !correct ? "is-wrong" : ""}`}
                          onClick={() => setQuizAnswers((answers) => ({ ...answers, [questionIndex]: optionIndex }))}
                        >{option}</button>
                      );
                    })}
                    {quizAnswers[questionIndex] !== undefined && <p>{question.explanation}</p>}
                  </fieldset>
                ))}
              </div>
            ) : <EmptyState icon={BrainCircuit} title="No quiz yet">Generate a short knowledge check from this video.</EmptyState>}
          </article>
        )}
      </div>
    </section>
  );
}
