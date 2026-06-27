import {
  ArrowRight,
  BookOpen,
  Download,
  File,
  FileText,
  FolderOpen,
  MessageSquare,
  StickyNote,
} from "lucide-react";
import { fileNameFromUrl, isHtmlContent } from "../utils/lesson-content";
import { LearningQuizPlayer } from "./LearningQuizPlayer";
import { FlashcardPractice } from "./flashcards/FlashcardPractice";

const TABS = [
  { key: "overview", label: "Overview", icon: BookOpen },
  { key: "resources", label: "Resources", icon: FolderOpen },
  { key: "qa", label: "Q&A", icon: MessageSquare },
  { key: "notes", label: "Notes", icon: StickyNote },
];

function getLessonId(lesson) {
  return lesson?.lessonId ?? lesson?.id ?? null;
}

function OverviewContent({ lesson, workspaceMode, onQuizCompleted, onFlashcardCompleted }) {
  const type = (lesson?.lessonType || "").toUpperCase();

  if (type === "FLASHCARD") {
    return (
      <FlashcardPractice
        lessonId={getLessonId(lesson)}
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

  if (!lesson?.content) {
    return (
      <div className="tab-overview__empty">
        <BookOpen size={32} />
        <p>No additional overview content for this lesson.</p>
      </div>
    );
  }

  if (isHtmlContent(lesson.content)) {
    return (
      <div
        className="tab-overview__content learning-lesson__rich-content"
        dangerouslySetInnerHTML={{ __html: lesson.content }}
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
  activeTab,
  onTabChange,
  note,
  onNoteChange,
  nextLesson,
  onNextLesson,
  workspaceMode = "student",
  onQuizCompleted,
  onFlashcardCompleted,
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
              workspaceMode={workspaceMode}
              onQuizCompleted={onQuizCompleted}
              onFlashcardCompleted={onFlashcardCompleted}
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
          >
            <span>
              Next lesson
              <small>{nextLesson.title}</small>
            </span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}