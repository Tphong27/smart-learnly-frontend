import { useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  createTrainerLessonService,
  createTrainerQuizService,
  createTrainerFlashcardService,
  createTrainerVideoAiService,
} from "@/services";
import { LessonDetailEditor } from "@/features/course/components/lesson-editor/LessonDetailEditor";

/**
 * Trainer lesson detail page — mirror of AdminLessonDetailPage but
 * scoped to a class curriculum draft. Audit tab is hidden; quiz &
 * flashcard editors are wired to trainer-scoped services.
 */
export default function TrainerLessonDetailPage() {
  const { classId, lessonId } = useParams();

  const context = useMemo(() => {
    if (!classId || !lessonId) return null;

    const lessonService = createTrainerLessonService(classId);
    const quizService = createTrainerQuizService(classId);
    const flashcardService = createTrainerFlashcardService(classId, lessonId);

    return {
      mode: "trainer",
      lessonId,
      classId,
      videoAi: {
        service: createTrainerVideoAiService(classId, lessonId),
        reviewPath: `/trainer/classes/${classId}/curriculum/lessons/${lessonId}/video-ai`,
      },
      // Về thẳng tab Curriculum của lớp sau khi save/back để tránh trainer phải bấm lại tab.
      backPath: `/staff/classrooms/${classId}/workspace?tab=curriculum`,
      services: {
        getLessonDetail: lessonService.getLessonDetail,
        updateLesson: lessonService.updateLesson,
        getQuestions: quizService.getQuestions,
        attachQuestion: quizService.attachQuestion,
        updateQuestion: quizService.updateQuestion,
        detachQuestion: quizService.detachQuestion,
        reorderQuestions: quizService.reorderQuestions,
        flashcardService,
      },
      features: {
        audit: false,
        quizManager: true,
        flashcard: true,
        flashcardStaging: true,
      },
    };
  }, [classId, lessonId]);

  if (!context) return null;
  return <LessonDetailEditor context={context} />;
}
