import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { courseService } from "@/services/course.service";
import { flashcardService } from "@/services/flashcard.service";
import { getCurrentUser } from "@/services/api-client";
import { LessonDetailEditor } from "@/features/course/components/lesson-editor/LessonDetailEditor";

export default function AdminLessonDetailPage() {
  const { courseId, lessonId } = useParams();

  const currentUser = getCurrentUser();

  const isTrainer =
    String(currentUser?.role || "")
      .toLowerCase() === "trainer";

  const backPath = isTrainer
    ? `/staff/courses/${courseId}/content`
    : `/admin/courses/${courseId}/content`;

  const context = useMemo(
    () => ({
      mode: isTrainer ? "trainer" : "admin",
      lessonId,
      backPath,
      services: {
        getLessonDetail: (id) =>
          courseService.getLessonDetail(id),

        updateLesson: (id, payload) =>
          courseService.updateLesson(id, payload),

        getLessonAuditLogs: (id, page, size) =>
          courseService.getLessonAuditLogs(
            id,
            page,
            size,
          ),

        flashcardService,
      },
      features: {
        audit: !isTrainer,
        quizManager: true,
        flashcard: true,
        flashcardStaging: true,
      },
    }),
    [backPath, isTrainer, lessonId,]);

  return (
    <LessonDetailEditor context={context} />
  );
}