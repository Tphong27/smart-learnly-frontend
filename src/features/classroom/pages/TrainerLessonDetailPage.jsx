import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { classroomService } from "../services/classroomService";
import { createTrainerLessonService } from "../services/trainerLessonService";
import { createTrainerQuizService } from "../services/trainerQuizService";
import { createTrainerFlashcardService } from "../services/trainerFlashcardService";
import { LessonDetailTabs } from "@/features/course/components/lesson-editor/LessonDetailTabs";
import { ROLES } from "@/shared/constants/roles";
import { getCurrentRole } from "@/shared/utils/auth";

/**
 * Lesson editor cho class curriculum của Trainer (và TMO xem nếu được mở route).
 * Audit tab bị ẩn; quiz và flashcard dùng endpoint theo class.
 * Classrooms chỉ còn không gian /staff — không còn /admin/classrooms.
 *
 * courseId is required so QuestionBankImportPanel can list banks of the
 * parent course (trainer imports existing bank questions, does not author banks).
 */
export default function TrainerLessonDetailPage() {
  const { classId, lessonId } = useParams();
  const currentRole = getCurrentRole();
  const classroomBasePath = "/staff/classrooms";
  const courseBasePath = "/staff/courses";
  const [courseId, setCourseId] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!classId) return undefined;

    (async () => {
      try {
        const classDetail =
          currentRole === ROLES.TRAINER
            ? await classroomService.getTrainer(classId)
            : await classroomService.getAdmin(classId);
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
  }, [classId, currentRole]);

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
      backPath: `${classroomBasePath}/${classId}/workspace?tab=curriculum`,
      courseBasePath,
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
  }, [classId, classroomBasePath, courseBasePath, courseId, lessonId]);

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

  return <LessonDetailTabs context={context} />;
}
