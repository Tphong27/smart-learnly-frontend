import { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { courseContentService } from "../services/courseContentService";
import { flashcardAuthoringService as flashcardService } from "@/features/flashcard";
import { LessonDetailTabs } from "@/features/course/components/lesson-editor/LessonDetailTabs";

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
        getLessonDetail: (id) => courseContentService.getLessonDetail(id),
        updateLesson: (id, payload) => courseContentService.updateLesson(id, payload),
        getLessonAuditLogs: (id, page, size) =>
          courseContentService.getLessonAuditLogs(id, page, size),
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

  return <LessonDetailTabs context={context} />;
}
