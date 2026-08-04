import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Loader } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { trainerCurriculumService } from "../services/trainerCurriculumService";
import { CurriculumStructureEditor } from "@/features/course/components/CurriculumStructureEditor";
// Dùng cùng design system với master course content (sl-cm-*).
import "@/features/course/course-admin.css";

const TRAINER_LESSON_TYPES = [
  { value: "video", label: "Video Lecture" },
  { value: "pdf", label: "Reading Material (PDF)" },
  { value: "rich_text", label: "Rich Text" },
  { value: "quiz", label: "Quiz" },
  { value: "essay", label: "Essay" },
];

// Chuyển enum backend thành nhãn dễ đọc trên giao diện curriculum.
function formatLabel(value) {
  if (!value) return "Not provided";
  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// Tổng hợp số module, lesson và loại nội dung để hiển thị thống kê nhanh.
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

// Hiển thị và điều phối bản curriculum riêng của một lớp trainer.
export function ClassCurriculumTab({ classId, readOnly = false }) {
  const navigate = useNavigate();
  const [curriculumData, setCurriculumData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const metadata = curriculumData?.metadata || null;
  const binding = curriculumData?.binding || null;
  // Backend trả customizationState dạng lowercase ("inherited"/"draft"/"published") —
  // normalize về uppercase để so sánh nhất quán trong FE.
  const rawCustomization = binding?.customizationState;
  const customizationState = rawCustomization
    ? String(rawCustomization).toUpperCase()
    : curriculumData?.hasDraft
      ? "DRAFT"
      : curriculumData?.hasPublished
        ? "PUBLISHED"
        : "INHERITED";

  const sections = useMemo(
    () => curriculumData?.curriculum?.sections || [],
    [curriculumData],
  );

  const stats = useMemo(() => computeStats(sections), [sections]);

  const canEdit = !readOnly && customizationState === "DRAFT";

  // Tải curriculum hiệu lực của lớp và đồng bộ trạng thái loading/error.
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
    const timeoutId = window.setTimeout(() => {
      void loadCurriculum();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadCurriculum]);

  // Chạy một thao tác chỉnh sửa rồi cập nhật lại curriculum và thông báo kết quả.
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

  // Khởi tạo curriculum draft riêng cho lớp từ bản đang kế thừa.
  const handleInitDraft = () =>
    runAction(
      () => trainerCurriculumService.initializeDraft(classId),
      "Draft initialized",
    );

  // Xuất bản draft hiện tại để học viên của lớp sử dụng.
  const handlePublishDraft = () =>
    runAction(
      () => trainerCurriculumService.publishDraft(classId),
      "Draft published",
    );

  // Tạo section mới rồi tải lại curriculum đã cập nhật.
  const handleCreateSection = ({ title }) =>
    runAction(async () => {
      await trainerCurriculumService.createSection(classId, {
        title,
        sortOrder: sections.length,
      });
      return trainerCurriculumService.getCurriculum(classId);
    }, "Section added");

  // Đổi tên section rồi tải lại curriculum.
  const handleUpdateSection = (sectionId, { title }) =>
    runAction(async () => {
      await trainerCurriculumService.updateSection(classId, sectionId, {
        title,
      });
      return trainerCurriculumService.getCurriculum(classId);
    }, "Section updated");

  // Xóa section khỏi draft rồi tải lại curriculum.
  const handleDeleteSection = (sectionId) =>
    runAction(async () => {
      await trainerCurriculumService.deleteSection(classId, sectionId);
      return trainerCurriculumService.getCurriculum(classId);
    }, "Section deleted");

  // Lưu thứ tự section do thao tác kéo thả tạo ra.
  const handleReorderSections = (orderedIds) =>
    runAction(async () => {
      await trainerCurriculumService.reorderSections(classId, orderedIds);
      return trainerCurriculumService.getCurriculum(classId);
    }, "Sections reordered");

  // Chuẩn hóa dữ liệu editor và tạo lesson ở cuối section đã chọn.
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

  // Xác nhận rồi xóa lesson khỏi curriculum draft.
  const handleDeleteLesson = (lessonId, lessonTitle) => {
    if (!window.confirm(`Delete lesson "${lessonTitle}"?`)) return;
    runAction(async () => {
      await trainerCurriculumService.deleteLesson(classId, lessonId);
      return trainerCurriculumService.getCurriculum(classId);
    }, "Lesson deleted");
  };

  // Lưu thứ tự lesson mới trong section.
  const handleReorderLessons = (sectionId, orderedIds) =>
    runAction(async () => {
      await trainerCurriculumService.reorderLessons(
        classId,
        sectionId,
        orderedIds,
      );
      return trainerCurriculumService.getCurriculum(classId);
    }, "Lessons reordered");

  // Mở trang editor toàn màn hình cho lesson trong lớp hiện tại.
  const handleEditLesson = (lesson) => {
    if (!lesson?.id || !classId) return;
    navigate(`/trainer/classes/${classId}/curriculum/lessons/${lesson.id}`);
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

  // Trainer có thể init draft khi chưa có draft hiện hành (state INHERITED hoặc PUBLISHED).
  const canInitializeDraft =
    !readOnly &&
    customizationState !== "DRAFT";

  const canPublishDraft = !readOnly && customizationState === "DRAFT";

  return (
    <div className="sl-cm-page sl-cm-page--curriculum" style={{ padding: 0, background: "transparent" }}>
      <header className="sl-cm-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="sl-cm-header__title">Class curriculum</h1>
          <p className="sl-cm-header__subtitle">
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
        <div className="sl-cm-header__actions">
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
      </header>

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
        <div className="sl-cm-workspace" style={{ textAlign: "center", padding: 32 }}>
          <h3 className="sl-cm-header__title" style={{ marginTop: 0 }}>
            Curriculum is inherited
          </h3>
          <p className="sl-cm-header__subtitle">
            This class currently follows the master course curriculum. Click
            &quot;Initialize draft&quot; above to create an editable class-specific
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
  );
}
