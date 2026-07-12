import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Download,
  File,
  FileText,
  FolderOpen,
  MessageSquare,
  StickyNote,
  UploadCloud,
} from "lucide-react";
import { fileNameFromUrl, isHtmlContent } from "../utils/lesson-content";
import { LearningQuizPlayer } from "./LearningQuizPlayer";
import { FlashcardPractice } from "./flashcards/FlashcardPractice";
import { assignmentService } from "@/services/flashtest.service";
import { getCurrentUser } from "@/services/api-client";
import DOMPurify from "dompurify";

const TABS = [
  { key: "overview", label: "Overview", icon: BookOpen },
  { key: "resources", label: "Resources", icon: FolderOpen },
  { key: "qa", label: "Q&A", icon: MessageSquare },
  { key: "notes", label: "Notes", icon: StickyNote },
];

function getLessonId(lesson) {
  return lesson?.lessonId ?? lesson?.id ?? null;
}

function OverviewContent({
  lesson,
  classId,
  workspaceMode,
  onQuizCompleted,
  onFlashcardCompleted,
  onEssayCompleted,
}) {
  const type = (lesson?.lessonType || "").toUpperCase();

  if (type === "FLASHCARD") {
    return (
      <FlashcardPractice
        lessonId={getLessonId(lesson)}
        classId={classId}
        adminMode={workspaceMode === "admin-preview"}
        readOnly={workspaceMode !== "student"}
        onCompleted={() => onFlashcardCompleted?.(getLessonId(lesson))}
      />
    );
  }

  if (type === "QUIZ" && lesson?.content) {
    return (
      <LearningQuizPlayer
        content={lesson.content}
        durationSeconds={lesson.durationSeconds}
        onCompleted={() => onQuizCompleted?.(getLessonId(lesson))}
      />
    );
  }

  if (type === "ESSAY") {
    return (
      <EssayLessonContent
        lesson={lesson}
        readOnly={workspaceMode !== "student"}
        onCompleted={() => onEssayCompleted?.(getLessonId(lesson))}
      />
    );
  }

  if (!lesson?.content) {
    return (
      <div className="tab-overview__empty">
        <BookOpen size={32} />
        <p>No additional overview content for this lesson.</p>
      </div>
    );
  }

  if (isHtmlContent(lesson.content)) {
    const cleanContent = DOMPurify.sanitize(lesson.content, {
      ADD_TAGS: ["iframe"],
      ADD_ATTR: [
        "target",
        "rel",
        "controls",
        "preload",
        "poster",
        "width",
        "height",
        "type",
        "class",
        "data-summary-video",
      ],
    });

    return (
      <div
        className="tab-overview__content learning-lesson__rich-content"
        dangerouslySetInnerHTML={{ __html: cleanContent }}
      />
    );
  }

  return (
    <div className="tab-overview__content learning-lesson__rich-content">
      {lesson.content
        .split("\n")
        .map((line, index) =>
          line.trim() ? <p key={index}>{line}</p> : <br key={index} />,
        )}
    </div>
  );
}

function EssayLessonContent({ lesson, readOnly = false, onCompleted }) {
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadEssay() {
      setLoading(true);
      setMessage("");
      try {
        const nextAssignment = await assignmentService.getByLesson(
          getLessonId(lesson),
        );
        if (cancelled) return;
        setAssignment(nextAssignment);

        const currentUser = getCurrentUser();
        const studentId =
          currentUser?.id || currentUser?.userId || currentUser?.accountId;
        if (!readOnly && studentId && nextAssignment?.id) {
          try {
            const currentSubmission =
              await assignmentService.getSubmissionByStudent(
                nextAssignment.id,
                studentId,
              );
            if (!cancelled) {
              setSubmission(currentSubmission);
              if (
                ["SUBMITTED", "GRADED", "LATE", "EXPIRED"].includes(
                  String(currentSubmission?.status || "").toUpperCase(),
                )
              ) {
                onCompleted?.();
              }
            }
          } catch (submissionError) {
            if (submissionError?.originalError?.response?.status !== 404) {
              throw submissionError;
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error?.message || "Could not load essay assignment.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (getLessonId(lesson)) loadEssay();
    return () => {
      cancelled = true;
    };
  }, [lesson, readOnly]);

  const downloadInstruction = async () => {
    const fileUrl = assignment?.instructionFileUrl || lesson?.attachmentUrl;
    if (!fileUrl) return;
    const blob = await assignmentService.downloadFile(fileUrl);
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download =
      assignment?.instructionFileName || fileNameFromUrl(fileUrl) || "essay";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
  };

  const submitEssay = async () => {
    if (!assignment?.id || !file) return;
    const currentUser = getCurrentUser();
    const studentId =
      currentUser?.id || currentUser?.userId || currentUser?.accountId;
    if (!studentId) {
      setMessage("Please sign in again before submitting.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    try {
      const uploaded = await assignmentService.uploadFile(file);
      await assignmentService.start({
        assignmentId: assignment.id,
        studentId,
        studentName: currentUser?.fullName || currentUser?.email || "Student",
      });
      const result = await assignmentService.submit({
        assignmentId: assignment.id,
        studentId,
        studentName: currentUser?.fullName || currentUser?.email || "Student",
        submissionText: "",
        fileUrl: uploaded?.fileUrl,
        fileName: uploaded?.fileName || file.name,
      });
      setSubmission(result);
      setFile(null);
      setMessage("Submission uploaded successfully.");
      onCompleted?.();
    } catch (error) {
      setMessage(error?.message || "Submit failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const instructionUrl =
    assignment?.instructionFileUrl || lesson?.attachmentUrl;

  if (loading) {
    return <div className="tab-overview__empty">Loading essay...</div>;
  }

  return (
    <div className="tab-overview__content learning-lesson__rich-content essay-lesson">
      <div className="essay-lesson__main">
        {lesson?.content && isHtmlContent(lesson.content) ? (
          <div
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(lesson.content, {
                ADD_ATTR: [
                  "target",
                  "rel",
                  "controls",
                  "preload",
                  "poster",
                  "width",
                  "height",
                  "type",
                  "class",
                  "data-summary-video",
                ],
              }),
            }}
          />
        ) : lesson?.content ? (
          lesson.content
            .split("\n")
            .map((line, index) =>
              line.trim() ? <p key={index}>{line}</p> : <br key={index} />,
            )
        ) : null}

        {instructionUrl && (
          <button
            type="button"
            className="tab-resources__item essay-lesson__instruction"
            onClick={downloadInstruction}
          >
            <div className="tab-resources__item-icon">
              <FileText size={20} />
            </div>
            <div className="tab-resources__item-info">
              <div className="tab-resources__item-name">
                {assignment?.instructionFileName ||
                  fileNameFromUrl(instructionUrl) ||
                  "Essay document"}
              </div>
              <div className="tab-resources__item-meta">
                Download instructions
              </div>
            </div>
            <div className="tab-resources__item-actions">
              <Download size={16} />
            </div>
          </button>
        )}
      </div>

      {!readOnly && (
        <div className="essay-submit">
          {submission?.fileUrl && (
            <div className="essay-submit__current">
              <FileText size={18} />
              <div>
                <span>Current submission</span>
                <strong>{submission.fileName || "Submitted file"}</strong>
                {submission.score != null && (
                  <small>Score: {submission.score}/10</small>
                )}
              </div>
            </div>
          )}
          <div className="essay-submit__controls">
            <label className="essay-submit__picker">
              <UploadCloud size={20} />
              <span>
                <strong>{file ? file.name : "Choose submission file"}</strong>
                <small>PDF, Word, PowerPoint, image, or ZIP</small>
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </label>
            <button
              type="button"
              className="lesson-tabs__next-btn essay-submit__button"
              onClick={submitEssay}
              disabled={submitting || !file || !assignment?.id}
            >
              <span>{submitting ? "Submitting..." : "Submit assignment"}</span>
              <ArrowRight size={18} />
            </button>
          </div>
          {message && <p className="essay-submit__message">{message}</p>}
        </div>
      )}

      {readOnly && message && (
        <p className="essay-submit__message">{message}</p>
      )}
    </div>
  );
}

function ResourcesContent({ lesson }) {
  const resources = Array.isArray(lesson?.resources) ? lesson.resources : [];
  const hasAttachment = !!lesson?.attachmentUrl;
  const totalResources = resources.length + (hasAttachment ? 1 : 0);

  if (totalResources === 0) {
    return (
      <div className="tab-resources__empty">
        <FolderOpen size={32} />
        <p>No resources attached to this lesson.</p>
      </div>
    );
  }

  return (
    <div className="tab-resources__list">
      {hasAttachment && (
        <a
          href={lesson.attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="tab-resources__item"
        >
          <div className="tab-resources__item-icon">
            <FileText size={20} />
          </div>
          <div className="tab-resources__item-info">
            <div className="tab-resources__item-name">
              {fileNameFromUrl(lesson.attachmentUrl) || "Attachment"}
            </div>
            <div className="tab-resources__item-meta">Main attachment</div>
          </div>
          <div className="tab-resources__item-actions">
            <Download size={16} />
          </div>
        </a>
      )}

      {resources.map((resource, index) => (
        <a
          key={`${resource.url || "resource"}-${index}`}
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="tab-resources__item"
        >
          <div className="tab-resources__item-icon">
            <File size={20} />
          </div>
          <div className="tab-resources__item-info">
            <div className="tab-resources__item-name">
              {resource.name ||
                fileNameFromUrl(resource.url) ||
                `Resource ${index + 1}`}
            </div>
            {resource.contentType && (
              <div className="tab-resources__item-meta">
                {resource.contentType}
              </div>
            )}
          </div>
          <div className="tab-resources__item-actions">
            <Download size={16} />
          </div>
        </a>
      ))}
    </div>
  );
}

export function LearningLessonTabs({
  lesson,
  classId,
  activeTab,
  onTabChange,
  note,
  onNoteChange,
  nextLesson,
  onNextLesson,
  canGoNext = true,
  isActivityLesson = false,
  workspaceMode = "student",
  onQuizCompleted,
  onFlashcardCompleted,
  onEssayCompleted,
}) {
  const resources = Array.isArray(lesson?.resources) ? lesson.resources : [];
  const totalResources = resources.length + (lesson?.attachmentUrl ? 1 : 0);

  return (
    <div className="lesson-tabs">
      <div className="lesson-tabs__bar">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`lesson-tabs__tab ${
              activeTab === key ? "lesson-tabs__tab--active" : ""
            }`}
            onClick={() => onTabChange(key)}
          >
            <Icon size={15} />
            {label}
            {key === "resources" && totalResources > 0 && (
              <span className="lesson-tabs__badge">{totalResources}</span>
            )}
          </button>
        ))}
      </div>

      <div className="lesson-tabs__content">
        {activeTab === "overview" && (
          <div className="tab-overview">
            <OverviewContent
              lesson={lesson}
              classId={classId}
              workspaceMode={workspaceMode}
              onQuizCompleted={onQuizCompleted}
              onFlashcardCompleted={onFlashcardCompleted}
              onEssayCompleted={onEssayCompleted}
            />
          </div>
        )}

        {activeTab === "resources" && (
          <div className="tab-resources">
            <ResourcesContent lesson={lesson} />
          </div>
        )}

        {activeTab === "qa" && (
          <div className="tab-qa">
            <div className="tab-qa__placeholder">
              <MessageSquare size={40} />
              <h4>Q&A is not available in admin preview yet.</h4>
              <p>
                The Q&A feature will be available when students access this
                course through the learner interface.
              </p>
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="tab-notes">
            <div className="tab-notes__placeholder">
              <StickyNote size={40} />
              <h4>Notes are local-only in preview</h4>
              <p>
                Your notes are saved in this browser session and will not be
                persisted.
              </p>
            </div>
            <textarea
              className="tab-notes__textarea"
              placeholder="Take notes about this lesson..."
              rows={8}
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
            />
          </div>
        )}
      </div>

      {nextLesson && (
        <div className="lesson-tabs__footer">
          <button
            type="button"
            className="lesson-tabs__next-btn"
            onClick={onNextLesson}
            disabled={!canGoNext}
            title={
              !canGoNext && isActivityLesson
                ? "Complete this activity before moving to the next lesson."
                : undefined
            }
          >
            <span>
              Next lesson
              <small>
                {!canGoNext && isActivityLesson
                  ? "Complete this activity first"
                  : nextLesson.title}
              </small>
            </span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
