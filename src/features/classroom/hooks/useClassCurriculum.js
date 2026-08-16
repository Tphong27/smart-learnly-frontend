import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/shared/components/ui";
import { trainerCurriculumService } from "../services/trainerCurriculumService";

export const TRAINER_LESSON_TYPES = [
  { value: "video", label: "Video Lecture" },
  { value: "pdf", label: "Reading Material (PDF)" },
  { value: "rich_text", label: "Rich Text" },
  { value: "quiz", label: "Quiz" },
  { value: "flashcard", label: "Flashcard" },
  { value: "essay", label: "Essay" },
];

/** Chuyển enum backend thành nhãn dễ đọc trong mô tả trạng thái curriculum. */
function formatCurriculumLabel(value) {
  if (!value) return "Not provided";
  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Tổng hợp số module, lesson và loại nội dung cho editor dùng chung. */
function computeCurriculumStats(sections) {
  let totalVideos = 0;
  let totalDocuments = 0;
  let totalQuizzes = 0;
  let totalFlashcards = 0;
  let totalLessons = 0;

  for (const section of sections || []) {
    for (const lesson of section?.lessons || []) {
      totalLessons += 1;
      const lessonType = String(lesson.lessonType || "").toLowerCase();
      if (lessonType === "video") totalVideos += 1;
      else if (lessonType === "pdf" || lessonType === "document") {
        totalDocuments += 1;
      } else if (lessonType === "quiz") totalQuizzes += 1;
      else if (lessonType === "flashcard") totalFlashcards += 1;
    }
  }

  return {
    totalSections: sections?.length || 0,
    totalLessons,
    totalVideos,
    totalDocuments,
    totalQuizzes,
    totalFlashcards,
  };
}

/**
 * Điều phối dữ liệu curriculum theo lớp nhưng trả contract tương thích với UI curriculum tổng.
 * Mọi mutation vẫn đi qua endpoint class-scoped để không thay đổi master course hay lớp khác.
 */
export function useClassCurriculum({
  classId,
  courseId,
  routeBase = "/staff/classrooms",
  courseBasePath = "/staff/courses",
  enabled = true,
  readOnly = false,
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const [curriculumData, setCurriculumData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const metadata = curriculumData?.metadata || null;
  const binding = curriculumData?.binding || null;
  const sections = useMemo(
    () => curriculumData?.curriculum?.sections || [],
    [curriculumData],
  );
  const stats = useMemo(() => computeCurriculumStats(sections), [sections]);

  const rawCustomizationState = binding?.customizationState;
  const customizationState = rawCustomizationState
    ? String(rawCustomizationState).toUpperCase()
    : curriculumData?.hasDraft
      ? "DRAFT"
      : curriculumData?.hasPublished
        ? "PUBLISHED"
        : "INHERITED";

  /** Tải curriculum hiệu lực và metadata nguồn của lớp hiện tại. */
  const loadCurriculum = useCallback(async () => {
    if (!classId) return;

    try {
      setLoading(true);
      setLoadError("");
      const data = await trainerCurriculumService.getCurriculum(classId);
      setCurriculumData(data);
    } catch (error) {
      setLoadError(error?.message || "Could not load class curriculum.");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    if (!enabled) return undefined;

    const frame = window.requestAnimationFrame(() => {
      void loadCurriculum();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [enabled, loadCurriculum]);

  /** Chạy mutation, đồng bộ dữ liệu mới và thông báo kết quả mà không thay page bằng error state. */
  const runAction = useCallback(
    async (action, successMessage) => {
      if (readOnly) {
        toast.error("This class curriculum is read-only for your role.");
        return false;
      }

      try {
        setActionLoading(true);
        const result = await action();
        if (result?.curriculum || result?.metadata || result?.binding) {
          setCurriculumData(result);
        } else {
          await loadCurriculum();
        }
        toast.success(successMessage);
        return true;
      } catch (error) {
        toast.error(error?.message || "Curriculum action failed.");
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [loadCurriculum, readOnly, toast],
  );

  /** Xuất bản draft hiện tại để học viên trong lớp nhận curriculum mới. */
  const publishDraft = useCallback(
    () =>
      runAction(
        () => trainerCurriculumService.publishDraft(classId),
        "Class curriculum published.",
      ),
    [classId, runAction],
  );

  /** Tạo module ở cuối curriculum class draft rồi tải lại editor. */
  const createSection = useCallback(
    ({ title }) =>
      runAction(async () => {
        await trainerCurriculumService.createSection(classId, {
          title,
          sortOrder: sections.length,
        });
        return trainerCurriculumService.getCurriculum(classId);
      }, "Module added."),
    [classId, runAction, sections.length],
  );

  /** Đổi tên module trong class draft. */
  const updateSection = useCallback(
    (sectionId, { title }) =>
      runAction(async () => {
        await trainerCurriculumService.updateSection(classId, sectionId, {
          title,
        });
        return trainerCurriculumService.getCurriculum(classId);
      }, "Module updated."),
    [classId, runAction],
  );

  /** Xóa module đã được ConfirmDialog của editor xác nhận. */
  const deleteSection = useCallback(
    (sectionId) =>
      runAction(async () => {
        await trainerCurriculumService.deleteSection(classId, sectionId);
        return trainerCurriculumService.getCurriculum(classId);
      }, "Module deleted."),
    [classId, runAction],
  );

  /** Lưu thứ tự module mới trong class draft. */
  const reorderSections = useCallback(
    (orderedIds) =>
      runAction(async () => {
        await trainerCurriculumService.reorderSections(classId, orderedIds);
        return trainerCurriculumService.getCurriculum(classId);
      }, "Modules reordered."),
    [classId, runAction],
  );

  /** Chuẩn hóa payload, tạo draft rồi mở thẳng editor như master curriculum. */
  const createLesson = useCallback(
    async (sectionId, payload) => {
      if (readOnly) {
        toast.error("This class curriculum is read-only for your role.");
        return false;
      }

      let lessonType = String(payload.lessonType || "video").toLowerCase();
      if (lessonType === "document") lessonType = "pdf";

      const section = sections.find((item) => item.id === sectionId);
      const nextSortOrder = section?.lessons?.length || 0;

      try {
        setActionLoading(true);
        const createdLesson = await trainerCurriculumService.createLesson(
          classId,
          sectionId,
          {
          title: payload.title,
          lessonType,
          type: lessonType,
          isPreview: Boolean(payload.isPreview),
          status: payload.status || "draft",
          durationSeconds: payload.durationSeconds || 0,
          sortOrder: nextSortOrder,
          resources: [],
          },
        );
        const createdLessonId = createdLesson?.id || createdLesson?.lessonId;
        if (!createdLessonId) {
          throw new Error("Created lesson ID was not returned.");
        }

        await loadCurriculum();
        navigate(`${routeBase}/${classId}/curriculum/lessons/${createdLessonId}`, {
          state: { isNewLesson: true },
        });
        return true;
      } catch (error) {
        toast.error(error?.message || "Could not create lesson.");
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [classId, loadCurriculum, navigate, readOnly, routeBase, sections, toast],
  );

  /** Xóa lesson đã được ConfirmDialog dùng chung xác nhận. */
  const deleteLesson = useCallback(
    (lessonId) =>
      runAction(async () => {
        await trainerCurriculumService.deleteLesson(classId, lessonId);
        return trainerCurriculumService.getCurriculum(classId);
      }, "Lesson deleted."),
    [classId, runAction],
  );

  /** Lưu thứ tự lesson mới trong module của class draft. */
  const reorderLessons = useCallback(
    (sectionId, orderedIds) =>
      runAction(async () => {
        await trainerCurriculumService.reorderLessons(
          classId,
          sectionId,
          orderedIds,
        );
        return trainerCurriculumService.getCurriculum(classId);
      }, "Lessons reordered."),
    [classId, runAction],
  );

  /** Mở editor cho role soạn nội dung hoặc learning preview cho role chỉ xem. */
  const editLesson = useCallback(
    (lesson) => {
      if (!lesson?.id || !classId) return;

      if (readOnly) {
        if (!courseId) {
          toast.error("Course information was not found. Please reload the class.");
          return;
        }

        const params = new URLSearchParams({
          classId,
          lessonId: lesson.id,
          returnTo: `${routeBase}/${classId}/workspace?tab=curriculum`,
        });
        navigate(`${courseBasePath}/${courseId}/preview?${params.toString()}`);
        return;
      }

      navigate(`${routeBase}/${classId}/curriculum/lessons/${lesson.id}`);
    },
    [classId, courseBasePath, courseId, navigate, readOnly, routeBase, toast],
  );

  /** Mở trình quản lý câu hỏi của đúng quiz lesson trong class curriculum. */
  const manageLessonQuestions = useCallback(
    (lesson) => {
      if (!classId || !lesson?.id) {
        toast.error("Quiz lesson information was not found. Please reload the curriculum.");
        return false;
      }

      navigate(`${routeBase}/${classId}/curriculum/lessons/${lesson.id}`);
      return true;
    },
    [classId, navigate, routeBase, toast],
  );

  const stateLabel =
    customizationState === "DRAFT"
      ? "Draft class customization"
      : customizationState === "PUBLISHED"
        ? "Published class customization"
        : "Inherited from master course";

  const contextParts = [`Class state: ${stateLabel}`];
  if (metadata?.source) {
    contextParts.push(`Source: ${formatCurriculumLabel(metadata.source)}`);
  }
  if (metadata?.curriculumScope) {
    contextParts.push(
      `Scope: ${formatCurriculumLabel(metadata.curriculumScope)}`,
    );
  }

  return {
    sections,
    stats,
    loading,
    loadError,
    actionLoading,
    contextLabel: contextParts.join(" · "),
    canEdit: !readOnly,
    canPublish: !readOnly && customizationState === "DRAFT",
    reload: loadCurriculum,
    publishDraft,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    createLesson,
    deleteLesson,
    reorderLessons,
    editLesson,
    manageLessonQuestions,
  };
}
