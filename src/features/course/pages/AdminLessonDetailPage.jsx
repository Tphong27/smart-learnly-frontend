import { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { courseService } from "@/services/course.service";
import { flashcardService } from "@/services/flashcard.service";
import { LessonDetailEditor } from "@/features/course/components/lesson-editor/LessonDetailEditor";

/**
 * Admin/staff course lesson editor.
 * Luôn dùng admin services + master course endpoints.
 * Không suy mode theo role user — trang này là master authoring, kể cả khi
 * người login là TRAINER được mở quyền đọc/sửa master.
 */
export default function AdminLessonDetailPage() {
  const { courseId, lessonId } = useParams();
  const location = useLocation();

  const backPath = location.pathname.startsWith("/staff/")
    ? `/staff/courses/${courseId}/content`
    : `/admin/courses/${courseId}/content`;

  const context = useMemo(
    () => ({
      mode: "admin",
      lessonId,
      courseId,
      backPath,
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
    [backPath, courseId, lessonId],
  );

  return <LessonDetailEditor context={context} />;
}
