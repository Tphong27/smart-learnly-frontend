import apiClient from "@/services/api-client";

/** Chuyển giá trị API sang số hợp lệ, có giá trị dự phòng khi dữ liệu thiếu. */
function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}


/** Chuẩn hóa một chỉ số tiến độ để UI luôn có đầy đủ số lượng và phần trăm. */
function normalizeMetric(metric, label) {
  return {
    label,
    completed: toNumber(metric?.completed),
    total: toNumber(metric?.total),
    percent: toNumber(metric?.percent),
  };
}

/** Chuẩn hóa tiến độ khóa online hoặc lớp học về một cấu trúc UI thống nhất. */
function normalizeCourse(course) {
  const classId = course.classId ?? course.enrolledClass?.id ?? null;
  const className =
    course.className ?? course.enrolledClass?.className ?? "";

  return {
    id: course.id ?? course.courseId,
    courseId: course.courseId ?? course.id,
    enrollmentId: course.enrollmentId,

    classId,
    classEnrollmentId:
      course.classEnrollmentId ??
      course.enrolledClass?.classEnrollmentId ??
      null,
    className,

    classMeetingUrl:
      course.classMeetingUrl ??
      course.enrolledClass?.meetingUrl ??
      "",
    classScheduleDescription:
      course.classScheduleDescription ??
      course.enrolledClass?.scheduleDescription ??
      "",
    classStartDate:
      course.classStartDate ??
      course.enrolledClass?.startDate ??
      null,
    classEndDate:
      course.classEndDate ??
      course.enrolledClass?.endDate ??
      null,

    learningType: classId ? "CLASS" : "COURSE",

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
    assignment: normalizeMetric(course.assignment, "Assignment"),
  };
}

export const traineeProgressService = {
  /** Lấy và chuẩn hóa toàn bộ tiến độ của học viên đang đăng nhập. */
  async getMyProgress() {
    const response = await apiClient.get("/learning/progress/my");
    const data = response?.data ?? response;

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
