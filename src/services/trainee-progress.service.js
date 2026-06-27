import apiClient from "./api-client";

function unwrap(response) {
  return response?.data ?? response;
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeMetric(metric, label) {
  return {
    label,
    completed: toNumber(metric?.completed),
    total: toNumber(metric?.total),
    percent: toNumber(metric?.percent),
  };
}

function normalizeCourse(course) {
  return {
    id: course.id ?? course.courseId,
    courseId: course.courseId ?? course.id,
    enrollmentId: course.enrollmentId,
    title: course.title || "Untitled course",
    categoryName: course.categoryName || "Course",
    enrollmentStatus: course.enrollmentStatus || "ACTIVE",
    courseStatus: course.courseStatus || "IN_PROGRESS",
    accessAllowed: course.accessAllowed !== false,
    accessBlockedReason: course.accessBlockedReason,
    thumbnailUrl: course.thumbnailUrl || "",

    overallPercent: toNumber(course.overallPercent),

    lesson: normalizeMetric(course.lesson, "Lesson"),
    quiz: normalizeMetric(course.quiz, "Quiz"),
    flashcard: normalizeMetric(course.flashcard, "Flashcard"),
  };
}

export const traineeProgressService = {
  async getMyProgress() {
    const response = await apiClient.get("/learning/progress/my");
    const data = unwrap(response);

    const courses = Array.isArray(data?.courses)
      ? data.courses.map(normalizeCourse)
      : [];

    const completedCourseItems = Array.isArray(data?.completedCourseItems)
      ? data.completedCourseItems.map(normalizeCourse)
      : courses.filter((course) => course.courseStatus === "COMPLETED");

    const inProgressCourseItems = Array.isArray(data?.inProgressCourseItems)
      ? data.inProgressCourseItems.map(normalizeCourse)
      : courses.filter((course) => course.courseStatus !== "COMPLETED");

    return {
      totalCourses: toNumber(data?.totalCourses, courses.length),
      completedCourses: toNumber(
        data?.completedCourses,
        completedCourseItems.length,
      ),
      inProgressCourses: toNumber(
        data?.inProgressCourses,
        inProgressCourseItems.length,
      ),
      courses,
      completedCourseItems,
      inProgressCourseItems,
    };
  },
};