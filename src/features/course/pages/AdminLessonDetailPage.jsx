import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { courseService } from "@/services/course.service";
import { flashcardService } from "@/services/flashcard.service";
import { LessonDetailEditor } from "@/features/course/components/lesson-editor/LessonDetailEditor";

/**
 * Admin lesson detail page — thin wrapper around the shared
 * <LessonDetailEditor /> component. All feature logic lives in
 * LessonDetailEditor; this file only wires admin-flavored services
 * and feature flags.
 */
export default function AdminLessonDetailPage() {
  const { courseId, lessonId } = useParams();

  const context = useMemo(
    () => ({
      mode: "admin",
      lessonId,
      backPath: `/admin/courses/${courseId}/content`,
      services: {
        getLessonDetail: (id) => courseService.getLessonDetail(id),
        updateLesson: (id, payload) => courseService.updateLesson(id, payload),
        getLessonAuditLogs: (id, page, size) =>
          courseService.getLessonAuditLogs(id, page, size),
        flashcardService,
      },
      features: {
        audit: true,
        quizManager: true,
        flashcard: true,
        flashcardStaging: true,
      },
    }),
    [courseId, lessonId],
  );

  return <LessonDetailEditor context={context} />;
}
