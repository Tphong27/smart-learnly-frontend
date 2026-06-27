import apiClient from "./api-client";
import { courseService } from "./course.service";

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isCompletedCourse(course) {
  return String(course?.enrollmentStatus || course?.status || "")
    .toUpperCase()
    .includes("COMPLETED");
}

function calculatePercent(completed, total, fallback = 0) {
  const completedNumber = toNumber(completed);
  const totalNumber = toNumber(total);

  if (totalNumber <= 0) {
    return fallback;
  }

  return Math.min(100, Math.round((completedNumber / totalNumber) * 100));
}

function normalizeCourseProgress(course, learningContent) {
  const stats = learningContent?.stats || {};
  const completed = isCompletedCourse(course);

  const lessonTotal = toNumber(
    course.lessonTotal ??
      course.totalLessons ??
      stats.totalLessons,
  );

  const quizTotal = toNumber(
    course.quizTotal ??
      course.totalQuizzes ??
      stats.totalQuizzes,
  );

  const flashcardTotal = toNumber(
    course.flashcardTotal ??
      course.totalFlashcards,
  );

  const lessonCompleted = completed
    ? lessonTotal
    : toNumber(course.lessonCompleted ?? course.completedLessons);

  const quizCompleted = completed
    ? quizTotal
    : toNumber(course.quizCompleted ?? course.completedQuizzes);

  const flashcardCompleted = completed
    ? flashcardTotal
    : toNumber(
        course.flashcardCompleted ??
          course.reviewedFlashcards ??
          course.completedFlashcards,
      );

  const lessonPercent = calculatePercent(
    lessonCompleted,
    lessonTotal,
    completed ? 100 : 0,
  );

  const quizPercent = calculatePercent(
    quizCompleted,
    quizTotal,
    completed ? 100 : 0,
  );

  const flashcardPercent = calculatePercent(
    flashcardCompleted,
    flashcardTotal,
    completed ? 100 : 0,
  );

  const availableParts = [
    { percent: lessonPercent, weight: lessonTotal > 0 ? 0.6 : 0 },
    { percent: quizPercent, weight: quizTotal > 0 ? 0.25 : 0 },
    { percent: flashcardPercent, weight: flashcardTotal > 0 ? 0.15 : 0 },
  ].filter((part) => part.weight > 0);

  const totalWeight = availableParts.reduce((sum, part) => sum + part.weight, 0);

  const overallPercent =
    totalWeight > 0
      ? Math.round(
          availableParts.reduce(
            (sum, part) => sum + part.percent * part.weight,
            0,
          ) / totalWeight,
        )
      : completed
        ? 100
        : 0;

  return {
    id: course.id,
    courseId: course.id,
    enrollmentId: course.enrollmentId,
    title: course.title || "Untitled course",
    categoryName: course.category?.name || course.categoryName || "Course",
    enrollmentStatus: course.enrollmentStatus || course.status || "ACTIVE",
    courseStatus: completed ? "COMPLETED" : "IN_PROGRESS",
    accessAllowed: course.accessAllowed !== false,
    accessBlockedReason: course.accessBlockedReason,
    thumbnailUrl: course.avatarUrl || course.thumbnailUrl || "",

    overallPercent,

    lesson: {
      label: "Lesson",
      completed: lessonCompleted,
      total: lessonTotal,
      percent: lessonPercent,
    },

    quiz: {
      label: "Quiz",
      completed: quizCompleted,
      total: quizTotal,
      percent: quizPercent,
    },

    flashcard: {
      label: "Flashcard",
      completed: flashcardCompleted,
      total: flashcardTotal,
      percent: flashcardPercent,
    },
  };
}

export const traineeProgressService = {
  async getMyProgress() {
    const myCourses = await courseService.getMyCourses();

    const results = await Promise.allSettled(
      myCourses.map(async (course) => {
        const response = await apiClient.get(`/learning/courses/${course.id}`);
        const learningContent = unwrap(response);

        return normalizeCourseProgress(course, learningContent);
      }),
    );

    const courses = results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }

      return normalizeCourseProgress(myCourses[index], null);
    });

    const completedCourses = courses.filter(
      (course) => course.courseStatus === "COMPLETED",
    );

    const inProgressCourses = courses.filter(
      (course) => course.courseStatus !== "COMPLETED",
    );

    return {
      totalCourses: courses.length,
      completedCourses: completedCourses.length,
      inProgressCourses: inProgressCourses.length,
      courses,
      completedCourseItems: completedCourses,
      inProgressCourseItems: inProgressCourses,
    };
  },
};