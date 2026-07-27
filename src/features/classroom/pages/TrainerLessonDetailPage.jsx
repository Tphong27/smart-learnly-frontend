import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  classService,
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
 *
 * courseId is required so QuestionBankImportPanel can list banks of the
 * parent course (trainer imports existing bank questions, does not author banks).
 */
export default function TrainerLessonDetailPage() {
  const { classId, lessonId } = useParams();
  const [courseId, setCourseId] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!classId) return undefined;

    (async () => {
      try {
        const classDetail = await classService.getTrainer(classId);
        if (!cancelled) {
          setCourseId(classDetail?.courseId || null);
          setLoadError("");
        }
      } catch (error) {
        if (!cancelled) {
          setCourseId(null);
          setLoadError(
            error?.response?.data?.message ||
              error?.message ||
              "Could not load class for quiz bank import",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [classId]);

  const context = useMemo(() => {
    if (!classId || !lessonId) return null;

    const lessonService = createTrainerLessonService(classId);
    const quizService = createTrainerQuizService(classId);
    const flashcardService = createTrainerFlashcardService(classId, lessonId);

    return {
      mode: "trainer",
      lessonId,
      classId,
      // Bắt buộc cho import question bank (banks scoped theo course).
      courseId,
      // Về thẳng tab Curriculum của lớp sau khi save/back.
      backPath: `/staff/classrooms/${classId}/workspace?tab=curriculum`,
      videoAi: {
        service: createTrainerVideoAiService(classId, lessonId),
        reviewPath: `/trainer/classes/${classId}/curriculum/lessons/${lessonId}/video-ai`,
      },
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
        flashcardStaging: false,
      },
    };
  }, [classId, courseId, lessonId]);

  if (!classId || !lessonId) return null;

  if (loadError) {
    return (
      <div className="sl-cm-page sl-cm-page--curriculum">
        <div className="sl-cm-workspace" role="alert">
          <h1 className="sl-cm-header__title">Lesson editor unavailable</h1>
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

  if (!context || !courseId) {
    return (
      <div className="sl-cm-page sl-cm-page--curriculum" role="status">
        <div className="sl-cm-workspace" aria-busy="true">
          <div className="sl-cm-skeleton" style={{ width: "40%", marginBottom: 12 }} />
          <div className="sl-cm-skeleton" style={{ width: "70%", marginBottom: 24 }} />
          <div className="sl-cm-skeleton" style={{ width: "100%", height: 64 }} />
        </div>
      </div>
    );
  }

  return <LessonDetailEditor context={context} />;
}
