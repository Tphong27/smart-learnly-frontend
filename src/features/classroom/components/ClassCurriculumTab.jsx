import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { trainerCurriculumService } from "@/services";
import { CurriculumStructureEditor } from "@/features/course/components/CurriculumStructureEditor";
import { CurriculumLessonEditorModal } from "@/features/course/components/CurriculumLessonEditorModal";
import "@/features/course/pages/AdminCourseContent.css";

const TRAINER_LESSON_TYPES = [
  { value: "video", label: "Video Lecture" },
  { value: "pdf", label: "Reading Material (PDF)" },
  { value: "rich_text", label: "Rich Text" },
  { value: "quiz", label: "Quiz" },
  { value: "assignment", label: "Assignment" },
  { value: "essay", label: "Essay" },
];

function formatLabel(value) {
  if (!value) return "Not provided";
  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function computeStats(sections) {
  let totalVideos = 0;
  let totalDocs = 0;
  let totalQuizzes = 0;
  let totalFlashcards = 0;
  let totalLessons = 0;

  for (const section of sections || []) {
    for (const lesson of section?.lessons || []) {
      totalLessons++;
      const t = String(lesson.lessonType || "").toLowerCase();
      if (t === "video") totalVideos++;
      else if (t === "pdf" || t === "document") totalDocs++;
      else if (t === "quiz") totalQuizzes++;
      else if (t === "flashcard") totalFlashcards++;
    }
  }

  return {
    totalSections: sections?.length || 0,
    totalLessons,
    totalVideos,
    totalDocuments: totalDocs,
    totalQuizzes,
    totalFlashcards,
  };
}

function buildLessonPayload(form) {
  const type = form.lessonType || form.type || "video";
  return {
    title: form.title,
    lessonType: type,
    type,
    videoUrl: form.videoUrl || null,
    content: form.content || "",
    attachmentUrl: form.attachmentUrl || null,
    durationSeconds: Number(form.durationSeconds || 0),
    isPreview: Boolean(form.isPreview),
    status: form.status || "draft",
    sortOrder: Number(form.sortOrder || 0),
    resources: Array.isArray(form.resources)
      ? form.resources.map((resource, index) => ({
          url: resource.url || "",
          objectPath: resource.objectPath || null,
          name: resource.name || resource.fileName || "Class resource",
          fileName: resource.fileName || resource.name || "Class resource",
          fileSize: Number(resource.fileSize || 0),
          contentType: resource.contentType || null,
          sortOrder: index,
        }))
      : [],
  };
}

export function ClassCurriculumTab({ classId, readOnly = false }) {
  const [curriculumData, setCurriculumData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingLesson, setEditingLesson] = useState(null);
  const [savingLesson, setSavingLesson] = useState(false);

  const metadata = curriculumData?.metadata || null;
  const binding = curriculumData?.binding || null;
  const customizationState =
    binding?.customizationState || (curriculumData?.hasDraft ? "DRAFT" : null);

  const sections = useMemo(
    () => curriculumData?.curriculum?.sections || [],
    [curriculumData],
  );

  const stats = useMemo(() => computeStats(sections), [sections]);

  const canEdit = !readOnly && customizationState === "DRAFT";

  const loadCurriculum = useCallback(async () => {
    if (!classId) return;
    try {
      setLoading(true);
      setError("");
      const data = await trainerCurriculumService.getCurriculum(classId);
      setCurriculumData(data);
    } catch (err) {
      setError(err?.message || "Can not load class curriculum");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadCurriculum();
  }, [loadCurriculum]);

  const runAction = useCallback(
    async (action, successMessage) => {
      try {
        setActionLoading(true);
        setError("");
        setNotice("");
        const result = await action();
        if (result?.curriculum || result?.metadata || result?.binding) {
          setCurriculumData(result);
        } else {
          await loadCurriculum();
        }
        if (successMessage) setNotice(successMessage);
      } catch (err) {
        setError(err?.message || "Curriculum action failed");
      } finally {
        setActionLoading(false);
      }
    },
    [loadCurriculum],
  );

  const handleInitDraft = () =>
    runAction(
      () => trainerCurriculumService.initializeDraft(classId),
      "Draft initialized",
    );

  const handlePublishDraft = () =>
    runAction(
      () => trainerCurriculumService.publishDraft(classId),
      "Draft published",
    );

  const handleCreateSection = ({ title }) =>
    runAction(async () => {
      await trainerCurriculumService.createSection(classId, {
        title,
        sortOrder: sections.length,
      });
      return trainerCurriculumService.getCurriculum(classId);
    }, "Section added");

  const handleUpdateSection = (sectionId, { title }) =>
    runAction(async () => {
      await trainerCurriculumService.updateSection(classId, sectionId, {
        title,
      });
      return trainerCurriculumService.getCurriculum(classId);
    }, "Section updated");

  const handleDeleteSection = (sectionId, sectionTitle) => {
    if (
      !window.confirm(
        `Delete "${sectionTitle}" and all lessons inside? This cannot be undone.`,
      )
    ) {
      return;
    }
    runAction(async () => {
      await trainerCurriculumService.deleteSection(classId, sectionId);
      return trainerCurriculumService.getCurriculum(classId);
    }, "Section deleted");
  };

  const handleReorderSections = (orderedIds) =>
    runAction(async () => {
      await trainerCurriculumService.reorderSections(classId, orderedIds);
      return trainerCurriculumService.getCurriculum(classId);
    }, "Sections reordered");

  const handleCreateLesson = (sectionId, payload) => {
    let lessonType = String(payload.lessonType || "video").toLowerCase();
    if (lessonType === "document") lessonType = "pdf";
    if (lessonType === "flashcard") {
      setError("Flashcard lessons cannot be created here yet.");
      return Promise.resolve();
    }
    const section = sections.find((s) => s.id === sectionId);
    const nextSortOrder = section ? (section.lessons || []).length : 0;

    return runAction(async () => {
      await trainerCurriculumService.createLesson(classId, sectionId, {
        title: payload.title,
        lessonType,
        type: lessonType,
        isPreview: Boolean(payload.isPreview),
        status: "draft",
        durationSeconds: 0,
        sortOrder: nextSortOrder,
        resources: [],
      });
      return trainerCurriculumService.getCurriculum(classId);
    }, "Lesson added");
  };

  const handleDeleteLesson = (lessonId, lessonTitle) => {
    if (!window.confirm(`Delete lesson "${lessonTitle}"?`)) return;
    runAction(async () => {
      await trainerCurriculumService.deleteLesson(classId, lessonId);
      return trainerCurriculumService.getCurriculum(classId);
    }, "Lesson deleted");
  };

  const handleReorderLessons = (sectionId, orderedIds) =>
    runAction(async () => {
      await trainerCurriculumService.reorderLessons(
        classId,
        sectionId,
        orderedIds,
      );
      return trainerCurriculumService.getCurriculum(classId);
    }, "Lessons reordered");

  const handleEditLesson = (lesson) => {
    setEditingLesson(lesson);
  };

  const handleSubmitLessonEdit = async (formData) => {
    if (!editingLesson?.id) return;
    try {
      setSavingLesson(true);
      const payload = buildLessonPayload({
        ...formData,
        sortOrder: editingLesson.sortOrder ?? 0,
      });
      await trainerCurriculumService.updateLesson(
        classId,
        editingLesson.id,
        payload,
      );
      setEditingLesson(null);
      await loadCurriculum();
      setNotice("Lesson updated");
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to update lesson");
    } finally {
      setSavingLesson(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loading">
        <Loader className="spinner" size={32} />
        <p>Loading curriculum...</p>
      </div>
    );
  }

  const stateLabel =
    customizationState === "DRAFT"
      ? "Draft (class customization)"
      : customizationState === "PUBLISHED"
        ? "Published class customization"
        : "Inherited from master course";

  const canInitializeDraft =
    !readOnly &&
    (curriculumData?.canInitializeDraft ||
      customizationState === null ||
      customizationState === "INHERITED" ||
      customizationState === "PUBLISHED");

  const canPublishDraft = !readOnly && customizationState === "DRAFT";

  return (
    <div className="admin-course-page" style={{ padding: 0, background: "transparent" }}>
      <div className="page-container" style={{ maxWidth: "100%" }}>
        <div
          className="class-curriculum-summary"
          style={{ marginBottom: 20 }}
        >
          <div>
            <h3>Curriculum workspace</h3>
            <p>
              State: <strong>{stateLabel}</strong>
              {metadata?.source && (
                <>
                  {" · "}Source: <strong>{formatLabel(metadata.source)}</strong>
                </>
              )}
              {metadata?.curriculumScope && (
                <>
                  {" · "}Scope:{" "}
                  <strong>{formatLabel(metadata.curriculumScope)}</strong>
                </>
              )}
            </p>
          </div>

          <div className="class-curriculum-summary__actions">
            {canInitializeDraft && (
              <Button
                type="button"
                variant="create"
                size="sm"
                loading={actionLoading}
                onClick={handleInitDraft}
              >
                {customizationState === "PUBLISHED"
                  ? "Start new draft"
                  : "Initialize draft"}
              </Button>
            )}
            {canPublishDraft && (
              <Button
                type="button"
                variant="save"
                size="sm"
                loading={actionLoading}
                onClick={handlePublishDraft}
              >
                Publish draft
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="form-error" style={{ marginBottom: 12 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <p className="form-success-text" style={{ marginBottom: 12 }}>
            {notice}
          </p>
        )}

        {customizationState === "INHERITED" || !customizationState ? (
          <div
            className="workspace-card"
            style={{ textAlign: "center", padding: 32 }}
          >
            <h3 style={{ marginTop: 0 }}>Curriculum is inherited</h3>
            <p style={{ color: "#434655" }}>
              This class currently follows the master course curriculum. Click
              "Initialize draft" above to create an editable class-specific
              copy.
            </p>
          </div>
        ) : (
          <CurriculumStructureEditor
            sections={sections}
            getLessons={(section) => section?.lessons || []}
            isSectionLessonsLoading={() => false}
            stats={stats}
            readOnly={!canEdit}
            lessonTypeOptions={TRAINER_LESSON_TYPES}
            lessonEditLabel="Edit lesson"
            emptyMessage={
              canEdit
                ? "This class curriculum has no sections yet. Create the first one below."
                : "This published curriculum has no sections yet."
            }
            emptyAddTitle="Add a new section"
            emptyAddSubtitle="Organize class content so trainees can follow along."
            onCreateSection={handleCreateSection}
            onUpdateSection={handleUpdateSection}
            onDeleteSection={handleDeleteSection}
            onReorderSections={handleReorderSections}
            onCreateLesson={handleCreateLesson}
            onDeleteLesson={handleDeleteLesson}
            onReorderLessons={handleReorderLessons}
            onEditLesson={handleEditLesson}
          />
        )}
      </div>

      <CurriculumLessonEditorModal
        open={Boolean(editingLesson)}
        lesson={editingLesson}
        title="Edit class lesson"
        submitting={savingLesson}
        onClose={() => (savingLesson ? null : setEditingLesson(null))}
        onSubmit={handleSubmitLessonEdit}
      />
    </div>
  );
}
