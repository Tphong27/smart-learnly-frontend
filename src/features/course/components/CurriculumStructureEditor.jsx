import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Edit3,
  FileText,
  GripVertical,
  Layers,
  MoreVertical,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Video,
  ClipboardList,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Eye,
  X,
} from "lucide-react";
import { getLessonStatusMeta } from "../utils/lesson-status";
import { Button, Modal } from "../../../shared/components/ui";
import "../course-admin.css";

const reorderArray = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

function sortByOrder(items) {
  return [...(items || [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
}

const LESSON_TYPE_META = {
  video: {
    label: "Video lecture",
    description: "Upload an HLS video lesson for streaming.",
    Icon: Video,
  },
  document: {
    label: "Reading material",
    description: "PDF or Word document the learner can download or preview.",
    Icon: FileText,
  },
  pdf: {
    label: "Reading material",
    description: "PDF or Word document the learner can download or preview.",
    Icon: FileText,
  },
  quiz: {
    label: "Quiz",
    description: "Multiple-choice questions with auto-grading.",
    Icon: ClipboardList,
  },
  flashcard: {
    label: "Flashcard",
    description: "Front/back cards for memorisation practice.",
    Icon: Layers,
  },
  essay: {
    label: "Assignment",
    description: "Open-ended assignment with manual review.",
    Icon: Edit3,
  },
};

const DEFAULT_LESSON_TYPES = [
  { value: "video", label: "Video lecture" },
  { value: "document", label: "Reading material" },
  { value: "quiz", label: "Quiz" },
  { value: "flashcard", label: "Flashcard" },
];

function lessonTypeKey(type) {
  const t = String(type || "").toLowerCase();
  if (t === "rich_text" || t === "text") return "document";
  return LESSON_TYPE_META[t] ? t : "video";
}

function getLessonTypeMeta(type) {
  return LESSON_TYPE_META[lessonTypeKey(type)] || LESSON_TYPE_META.video;
}

function LessonTypeIcon({ type, size = 18 }) {
  const { Icon } = getLessonTypeMeta(type);
  return <Icon size={size} aria-hidden="true" />;
}

function LessonStatusPill({ status }) {
  const meta = getLessonStatusMeta(status);
  const value = (meta.value || "draft").toLowerCase();
  const className = `sl-cm-pill sl-cm-pill--${value}`;
  const Icon = STATUS_ICON[value] || STATUS_ICON.draft;
  const accessible = meta.label
    ? `Lesson status: ${meta.label}`
    : "Lesson status";
  return (
    <span className={className} aria-label={accessible}>
      <Icon size={12} aria-hidden="true" />
      <span>{meta.label || value}</span>
    </span>
  );
}

const STATUS_ICON = {
  draft: AlertTriangle,
  published: CheckCircle2,
  inactive: X,
};

/* ==========================================================================
   Kebab menu
   ========================================================================== */

function useClickOutside(ref, onClose) {
  useEffect(() => {
    function handle(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose?.();
      }
    }
    function handleKey(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handle);
    };
  }, [onClose, ref]);
}

function KebabMenu({ label = "Actions", items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div className="sl-cm-kebab" ref={ref}>
      <button
        type="button"
        className="sl-cm-btn sl-cm-btn--icon sl-cm-kebab__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical size={18} aria-hidden="true" />
      </button>
      {open && (
        <ul role="menu" className="sl-cm-kebab__menu">
          {items.map((item) => {
            const Icon = item.icon;
            const danger = item.variant === "danger";
            return (
              <li key={item.id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  className={`sl-cm-kebab__item${danger ? " sl-cm-kebab__item--danger" : ""}`}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect?.();
                  }}
                >
                  {Icon ? <Icon size={15} aria-hidden="true" /> : null}
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ==========================================================================
   Section row
   ========================================================================== */

function SectionRow({
  section,
  index,
  lessons,
  loadingLessons,
  readOnly,
  onOpenCreateLesson,
  onEditSection,
  onDeleteSection,
  onEditLesson,
  onDeleteLesson,
  onManageQuestions,
  showManageQuestions,
  lessonEditLabel,
  dragHandleProps,
  onMoveSectionUp,
  onMoveSectionDown,
  onMoveLesson,
  isFirstSection,
  isLastSection,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const sortedLessons = useMemo(() => sortByOrder(lessons), [lessons]);

  const totalDurationMinutes = sortedLessons.reduce(
    (sum, lesson) => sum + Math.floor((lesson?.durationSeconds || 0) / 60),
    0,
  );

  const publishedCount = sortedLessons.filter(
    (l) => String(l?.status || "").toLowerCase() === "published",
  ).length;

  const draftCount = sortedLessons.filter(
    (l) => String(l?.status || "").toLowerCase() === "draft",
  ).length;

  const sectionTitleId = `section-${section.id}-title`;
  const lessonsListId = `section-${section.id}-lessons`;

  return (
    <article className="sl-cm-section" aria-labelledby={sectionTitleId}>
      <header className="sl-cm-section__header">
        {!readOnly && (
          <button
            type="button"
            {...dragHandleProps}
            className="sl-cm-section__handle"
            aria-label={`Reorder section ${index + 1}`}
          >
            <GripVertical size={18} aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          className="sl-cm-section__toggle"
          aria-expanded={isExpanded}
          aria-controls={lessonsListId}
          aria-label={isExpanded ? "Collapse section" : "Expand section"}
          onClick={() => setIsExpanded((v) => !v)}
        >
          <ChevronDown size={18} aria-hidden="true" />
        </button>

        <h3
          id={sectionTitleId}
          className="sl-cm-section__title"
          onClick={() => setIsExpanded((v) => !v)}
        >
          <span className="sl-cm-section__index">Section {index + 1}</span>
          <span className="sl-cm-section__name">{section?.title}</span>
        </h3>

        <span className="sl-cm-section__meta" aria-label="Section summary">
          <span>
            <strong>{sortedLessons.length}</strong> lessons
          </span>
          <span aria-hidden="true">·</span>
          <span>{totalDurationMinutes} mins</span>
          {publishedCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="sl-cm-section__meta--success">
                {publishedCount} live
              </span>
            </>
          )}
          {draftCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="sl-cm-section__meta--warning">
                {draftCount} draft
              </span>
            </>
          )}
        </span>

        {!readOnly && (
          <div className="sl-cm-section__actions">
            <button
              type="button"
              className="sl-cm-btn sl-cm-btn--secondary sl-cm-btn--sm"
              onClick={() => {
                setIsExpanded(true);
                onOpenCreateLesson?.(section);
              }}
            >
              <Plus size={14} aria-hidden="true" /> Add lesson
            </button>
            <KebabMenu
              label={`Section ${index + 1} actions`}
              items={[
                {
                  id: "edit",
                  label: "Edit section",
                  icon: Edit3,
                  onSelect: () => onEditSection?.(section),
                },
                {
                  id: "move-up",
                  label: "Move section up",
                  icon: ArrowUp,
                  onSelect: onMoveSectionUp,
                  disabled: isFirstSection,
                },
                {
                  id: "move-down",
                  label: "Move section down",
                  icon: ArrowDown,
                  onSelect: onMoveSectionDown,
                  disabled: isLastSection,
                },
                {
                  id: "delete",
                  label: "Delete section",
                  icon: Trash2,
                  variant: "danger",
                  onSelect: () => onDeleteSection?.(section.id, section.title),
                },
              ]}
            />
          </div>
        )}
      </header>

      {isExpanded && (
        <div id={lessonsListId} className="sl-cm-section__body">
          <div className="sl-cm-lessons">
            {loadingLessons ? (
              <div className="sl-cm-section__loading" role="status">
                Loading lessons…
              </div>
            ) : sortedLessons.length > 0 ? (
              sortedLessons.map((lesson, lIndex) => (
                <LessonRow
                  key={lesson?.id || lIndex}
                  lesson={lesson}
                  sectionIndex={index}
                  lessonIndex={lIndex}
                  readOnly={readOnly}
                  onEditLesson={onEditLesson}
                  onDeleteLesson={onDeleteLesson}
                  onManageQuestions={onManageQuestions}
                  showManageQuestions={showManageQuestions}
                  lessonEditLabel={lessonEditLabel}
                  isFirstLesson={lIndex === 0}
                  isLastLesson={lIndex === sortedLessons.length - 1}
                  onMoveLessonUp={() => onMoveLesson?.(section, lesson, "up")}
                  onMoveLessonDown={() =>
                    onMoveLesson?.(section, lesson, "down")
                  }
                />
              ))
            ) : (
              <div className="sl-cm-section__empty">
                This section has no lessons yet.
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function LessonRow({
  lesson,
  sectionIndex,
  lessonIndex,
  readOnly,
  onEditLesson,
  onDeleteLesson,
  onManageQuestions,
  showManageQuestions,
  lessonEditLabel,
  isFirstLesson,
  isLastLesson,
  onMoveLessonUp,
  onMoveLessonDown,
}) {
  const draggableId = `lesson-${lesson.id}`;
  const statusValue = String(lesson?.status || "draft").toLowerCase();
  const durationText = lesson?.durationSeconds
    ? `${Math.floor(lesson.durationSeconds / 60)} mins`
    : "—";
  const isQuiz = statusValue === "quiz";

  const lessonType = getLessonTypeMeta(lesson?.lessonType);

  return (
    <div className="sl-cm-lesson">
      {!readOnly && (
        <button
          type="button"
          className="sl-cm-lesson__handle"
          aria-label={`Reorder lesson ${sectionIndex + 1}.${lessonIndex + 1}`}
          title="Use Move up / Move down in the actions menu to reorder."
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>
      )}

      <span
        className={`sl-cm-lesson__type sl-cm-lesson__type--${lessonTypeKey(lesson?.lessonType)}`}
        aria-hidden="true"
      >
        <LessonTypeIcon type={lesson?.lessonType} />
      </span>

      <div className="sl-cm-lesson__main">
        <span className="sl-cm-lesson__title">
          {sectionIndex + 1}.{lessonIndex + 1}. {lesson?.title}
        </span>
        <div className="sl-cm-lesson__meta">
          <span>{lessonType.label}</span>
          <span aria-hidden="true">·</span>
          <span>{durationText}</span>
          {lesson?.isPreview && (
            <span className="sl-cm-pill sl-cm-pill--preview">Preview</span>
          )}
        </div>
      </div>

      <LessonStatusPill status={lesson?.status} />

      <div className="sl-cm-lesson__actions">
        <button
          type="button"
          className="sl-cm-btn sl-cm-btn--secondary sl-cm-btn--sm"
          onClick={() => onEditLesson?.(lesson)}
        >
          {lessonEditLabel || "Open lesson"}
        </button>
        {!readOnly && (
          <KebabMenu
            label={`Lesson ${sectionIndex + 1}.${lessonIndex + 1} actions`}
            items={[
              ...(showManageQuestions && isQuiz
                ? [
                    {
                      id: "questions",
                      label: "Manage questions",
                      icon: ClipboardList,
                      onSelect: () => onManageQuestions?.(lesson),
                    },
                  ]
                : []),
              {
                id: "move-up",
                label: "Move up",
                icon: ArrowUp,
                disabled: isFirstLesson,
                onSelect: () => onMoveLessonUp?.(lesson, sectionIndex, lessonIndex),
              },
              {
                id: "move-down",
                label: "Move down",
                icon: ArrowDown,
                disabled: isLastLesson,
                onSelect: () => onMoveLessonDown?.(lesson, sectionIndex, lessonIndex),
              },
              {
                id: "delete",
                label: "Delete lesson",
                icon: Trash2,
                variant: "danger",
                onSelect: () =>
                  onDeleteLesson?.(lesson.id, lesson.title, lesson),
              },
            ].filter(Boolean)}
          />
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   Modals — dùng shared Modal component
   ========================================================================== */

function SectionFormModal({
  open,
  title,
  initialValue,
  submitLabel,
  onSubmit,
  onClose,
}) {
  const [value, setValue] = useState(initialValue || "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setValue(initialValue || "");
      setError("");
    }
  }, [open, initialValue]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Section name is required.");
      return;
    }
    onSubmit?.(trimmed);
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      position="right"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="sl-cm-section-form" variant="primary">
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id="sl-cm-section-form" onSubmit={handleSubmit}>
        <div className="sl-cm-field">
          <label className="sl-cm-field__label" htmlFor="sl-cm-section-name">
            Section name <span className="required">*</span>
          </label>
          <input
            id="sl-cm-section-name"
            type="text"
            className="sl-cm-field__control"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (event.target.value.trim()) setError("");
            }}
            placeholder="e.g. Section 1: Environment setup"
            autoFocus
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? "sl-cm-section-name-error" : undefined}
          />
          {error ? (
            <p
              id="sl-cm-section-name-error"
              className="sl-cm-field__error"
              role="alert"
            >
              {error}
            </p>
          ) : (
            <p className="sl-cm-field__helper">
              Group related lessons so learners can follow a logical flow.
            </p>
          )}
        </div>
      </form>
    </Modal>
  );
}

function LessonCreateModal({
  open,
  lessonTypeOptions,
  onSubmit,
  onClose,
}) {
  const [title, setTitle] = useState("");
  const [lessonType, setLessonType] = useState(
    lessonTypeOptions?.[0]?.value || "video",
  );
  const [isPreview, setIsPreview] = useState(false);
  const [titleError, setTitleError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setLessonType(lessonTypeOptions?.[0]?.value || "video");
      setIsPreview(false);
      setTitleError("");
    }
  }, [open, lessonTypeOptions]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError("Lesson title is required.");
      return;
    }
    onSubmit?.({ title: trimmed, lessonType, isPreview });
  };

  const options = lessonTypeOptions?.length
    ? lessonTypeOptions
    : DEFAULT_LESSON_TYPES;

  return (
    <Modal
      open={open}
      title="Add new lesson"
      position="right"
      onClose={onClose}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="sl-cm-lesson-form"
            variant="primary"
          >
            Create lesson
          </Button>
        </>
      }
    >
      <form id="sl-cm-lesson-form" onSubmit={handleSubmit} className="sl-cm-drawer-form">
        <div className="sl-cm-field">
          <label className="sl-cm-field__label" htmlFor="sl-cm-lesson-title">
            Lesson title <span className="required">*</span>
          </label>
          <input
            id="sl-cm-lesson-title"
            type="text"
            className="sl-cm-field__control"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (event.target.value.trim()) setTitleError("");
            }}
            placeholder="e.g. 1.1. ReactJS overview"
            autoFocus
            aria-invalid={Boolean(titleError) || undefined}
            aria-describedby={titleError ? "sl-cm-lesson-title-error" : undefined}
          />
          {titleError ? (
            <p
              id="sl-cm-lesson-title-error"
              className="sl-cm-field__error"
              role="alert"
            >
              {titleError}
            </p>
          ) : null}
        </div>

        <fieldset className="sl-cm-field sl-cm-field--fieldset" role="radiogroup" aria-label="Lesson type">
          <legend className="sl-cm-field__label">Lesson type</legend>
          <div className="sl-cm-type-grid">
            {options.map((option) => {
              const meta = LESSON_TYPE_META[option.value] || LESSON_TYPE_META.video;
              const { Icon } = meta;
              const selected = lessonType === option.value;
              return (
                <button
                  type="button"
                  key={option.value}
                  className="sl-cm-type-card"
                  aria-pressed={selected}
                  aria-checked={selected}
                  role="radio"
                  onClick={() => setLessonType(option.value)}
                >
                  <span className="sl-cm-type-card__icon" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span>
                    <span className="sl-cm-type-card__title">{option.label}</span>
                    <span className="sl-cm-type-card__desc">{meta.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="sl-cm-checkbox">
          <input
            type="checkbox"
            checked={isPreview}
            onChange={(event) => setIsPreview(event.target.checked)}
          />
          <span>
            <span className="sl-cm-checkbox__title">Allow preview</span>
            <span className="sl-cm-checkbox__desc">
              Learners who have not purchased the course can still view this lesson.
            </span>
          </span>
        </label>
      </form>
    </Modal>
  );
}

function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
  variant = "danger",
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="sl-cm-confirm__desc">{description}</p>
    </Modal>
  );
}

/* ==========================================================================
   Main component
   ========================================================================== */

export function CurriculumStructureEditor({
  sections,
  getLessons,
  isSectionLessonsLoading,
  stats,
  readOnly = false,
  lessonTypeOptions = DEFAULT_LESSON_TYPES,
  emptyMessage = "The course has no content structure yet.",
  emptyAddTitle = "Add a new section",
  emptyAddSubtitle = "Build a logical structure so learners can follow along easily.",
  showManageQuestions = false,
  lessonEditLabel = "Open lesson",
  onCreateSection,
  onUpdateSection,
  onDeleteSection,
  onReorderSections,
  onCreateLesson,
  onDeleteLesson,
  onReorderLessons,
  onEditLesson,
  onManageQuestions,
}) {
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [lessonModalSection, setLessonModalSection] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const sortedSections = useMemo(() => sortByOrder(sections), [sections]);

  const lessonSummary = useMemo(() => {
    const summary = { draft: 0, published: 0, inactive: 0 };
    sortedSections.forEach((section) => {
      const lessons = sortByOrder(getLessons?.(section) || []);
      lessons.forEach((lesson) => {
        const value = String(lesson?.status || "draft").toLowerCase();
        if (summary[value] != null) summary[value] += 1;
      });
    });
    return summary;
  }, [sortedSections, getLessons]);

  const draftCount = lessonSummary.draft;
  const inactiveCount = lessonSummary.inactive;
  const emptySectionCount = useMemo(
    () =>
      sortedSections.filter(
        (section) => (getLessons?.(section) || []).length === 0,
      ).length,
    [sortedSections, getLessons],
  );

  const handleCreateSection = async (title) => {
    await onCreateSection?.({ title });
    setIsSectionModalOpen(false);
  };

  const handleUpdateSection = async (title) => {
    if (!editingSection?.id) return;
    await onUpdateSection?.(editingSection.id, { title });
    setEditingSection(null);
  };

  const handleCreateLesson = async (payload) => {
    if (!lessonModalSection?.id) return;
    await onCreateLesson?.(lessonModalSection.id, payload);
    setLessonModalSection(null);
  };

  const requestDeleteSection = (sectionId, title) => {
    setConfirm({
      title: `Delete “${title}”?`,
      description:
        "All lessons inside this section will be deleted. This cannot be undone.",
      confirmLabel: "Delete section",
      onConfirm: async () => {
        setConfirm(null);
        await onDeleteSection?.(sectionId, title);
      },
    });
  };

  const requestDeleteLesson = (lessonId, lessonTitle, lesson) => {
    setConfirm({
      title: `Delete “${lessonTitle}”?`,
      description:
        "Learners will lose access to this lesson. This cannot be undone.",
      confirmLabel: "Delete lesson",
      onConfirm: async () => {
        setConfirm(null);
        await onDeleteLesson?.(lessonId, lessonTitle, lesson);
      },
    });
  };

  const moveSection = (section, direction) => {
    const index = sortedSections.findIndex(
      (item) => String(item.id) === String(section.id),
    );
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedSections.length) return;
    const reordered = reorderArray(sortedSections, index, targetIndex);
    onReorderSections?.(reordered.map((item) => item.id));
  };

  const moveLesson = (section, lesson, direction) => {
    const lessons = sortByOrder(getLessons?.(section) || []);
    const index = lessons.findIndex(
      (item) => String(item.id) === String(lesson.id),
    );
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;
    const reordered = reorderArray(lessons, index, targetIndex);
    onReorderLessons?.(
      section.id,
      reordered.map((item) => item.id),
    );
  };

  return (
    <div>
      {(draftCount > 0 || inactiveCount > 0 || emptySectionCount > 0) && (
        <div
          className={`sl-cm-attention${emptySectionCount > 0 && draftCount === 0 && inactiveCount === 0 ? " sl-cm-attention--info" : ""}`}
          role="status"
          aria-live="polite"
        >
          <span className="sl-cm-attention__icon" aria-hidden="true">
            <AlertTriangle size={18} color={emptySectionCount > 0 && draftCount === 0 && inactiveCount === 0 ? "#1d4ed8" : "#8a5b00"} />
          </span>
          <div className="sl-cm-attention__body">
            <p className="sl-cm-attention__title">
              {draftCount > 0
                ? `${draftCount} lesson${draftCount === 1 ? "" : "s"} still in draft`
                : inactiveCount > 0
                  ? `${inactiveCount} inactive lesson${inactiveCount === 1 ? "" : "s"}`
                  : `${emptySectionCount} section${emptySectionCount === 1 ? "" : "s"} still need${emptySectionCount === 1 ? "s" : ""} lessons`}
            </p>
            <div className="sl-cm-attention__links">
              <span>
                Review and publish so learners can enrol.
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="sl-cm-workspace">
        <div className="sl-cm-tree">
          {sortedSections.length > 0 ? (
            sortedSections.map((section, index) => (
              <div
                key={section.id}
                className="sl-cm-section-wrap"
              >
                <SectionRow
                  section={section}
                  index={index}
                  readOnly={readOnly}
                  lessons={getLessons?.(section) || []}
                  loadingLessons={
                    isSectionLessonsLoading?.(section.id) || false
                  }
                  onOpenCreateLesson={(s) => setLessonModalSection(s)}
                  onEditSection={(s) => setEditingSection(s)}
                  onDeleteSection={requestDeleteSection}
                  onEditLesson={(lesson) =>
                    onEditLesson?.(lesson, section)
                  }
                  onDeleteLesson={requestDeleteLesson}
                  onManageQuestions={onManageQuestions}
                  showManageQuestions={showManageQuestions}
                  lessonEditLabel={lessonEditLabel}
                  dragHandleProps={{}}
                  isFirstSection={index === 0}
                  isLastSection={index === sortedSections.length - 1}
                  onMoveSectionUp={() => moveSection(section, "up")}
                  onMoveSectionDown={() => moveSection(section, "down")}
                  onMoveLesson={moveLesson}
                />
              </div>
            ))
          ) : (
            <div className="sl-cm-empty">
              <span className="sl-cm-empty__icon" aria-hidden="true">
                <Sparkles size={26} />
              </span>
              <h3 className="sl-cm-empty__title">{emptyAddTitle}</h3>
              <p className="sl-cm-empty__desc">{emptyAddSubtitle}</p>
              {!readOnly && (
                <Button
                  leftIcon={<Plus size={16} />}
                  onClick={() => setIsSectionModalOpen(true)}
                >
                  Add first section
                </Button>
              )}
            </div>
          )}
        </div>

        {!readOnly && sortedSections.length > 0 && (
          <button
            type="button"
            className="sl-cm-empty sl-cm-empty--cta"
            onClick={() => setIsSectionModalOpen(true)}
          >
            <span className="sl-cm-empty__icon" aria-hidden="true">
              <Plus size={22} />
            </span>
            <h3 className="sl-cm-empty__title">{emptyAddTitle}</h3>
            <p className="sl-cm-empty__desc">{emptyAddSubtitle}</p>
          </button>
        )}
      </div>

      <SectionFormModal
        open={isSectionModalOpen}
        title="Add new section"
        submitLabel="Save section"
        initialValue=""
        onSubmit={handleCreateSection}
        onClose={() => setIsSectionModalOpen(false)}
      />

      <SectionFormModal
        open={Boolean(editingSection)}
        title="Edit section"
        submitLabel="Update section"
        initialValue={editingSection?.title || ""}
        onSubmit={handleUpdateSection}
        onClose={() => setEditingSection(null)}
      />

      <LessonCreateModal
        open={Boolean(lessonModalSection)}
        lessonTypeOptions={lessonTypeOptions}
        onSubmit={handleCreateLesson}
        onClose={() => setLessonModalSection(null)}
      />

      <ConfirmModal
        open={Boolean(confirm)}
        title={confirm?.title || ""}
        description={confirm?.description || ""}
        confirmLabel={confirm?.confirmLabel || "Confirm"}
        onConfirm={() => confirm?.onConfirm?.()}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}