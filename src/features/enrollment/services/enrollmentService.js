import apiClient from "@/services/api-client";

// Bóc payload nghiệp vụ khỏi envelope chuẩn của backend.
function unwrap(response) {
  return response?.data ?? response;
}

// Nhận diện enrollment học online để không lẫn với enrollment theo lớp.
function isOnlineLearningEnrollment(course) {
  const learningType = String(course?.learningType || "").toUpperCase();
  if (learningType) {
    return learningType === "COURSE" || learningType === "ONLINE";
  }
  return !course?.classId && !course?.enrolledClass?.id;
}

export const enrollmentService = {
  // Ghi danh miễn phí vào khóa học online.
  async enrollFreeCourse(courseId) {
    if (!courseId) throw new Error("Course ID is required");
    const response = await apiClient.post("/enrollments/free-course", { courseId });
    return unwrap(response);
  },

  // Tải toàn bộ khóa học/lớp của trainee hiện tại.
  async getMyCourses() {
    const response = await apiClient.get("/enrollments/my-courses");
    const data = unwrap(response);
    return Array.isArray(data) ? data : [];
  },

  // Tạo tập ID khóa học online đã ghi danh để đánh dấu nhanh trên catalog.
  async getMyEnrolledCourseIds() {
    const courses = await this.getMyCourses();
    return new Set(
      courses
        .filter(isOnlineLearningEnrollment)
        .map((course) => course.id)
        .filter(Boolean),
    );
  },

  // Kiểm tra trainee đã ghi danh khóa học online theo ID hoặc slug hay chưa.
  async isCourseEnrolled(courseIdOrSlug) {
    if (!courseIdOrSlug) return false;
    const courses = await this.getMyCourses();
    return courses.filter(isOnlineLearningEnrollment).some(
      (course) => course.id === courseIdOrSlug || course.slug === courseIdOrSlug,
    );
  },

  // Tải lịch sử enrollment theo phân trang.
  async getHistory({ page = 0, size = 20 } = {}) {
    const response = await apiClient.get("/enrollments", { params: { page, size } });
    return (
      unwrap(response) || {
        items: [],
        page: 0,
        size,
        totalItems: 0,
        totalPages: 0,
      }
    );
  },

  // Tải lịch sử chuyển trạng thái của một enrollment.
  async getStatusHistory(enrollmentId) {
    const response = await apiClient.get(`/enrollments/${enrollmentId}/status-history`);
    return unwrap(response) || [];
  },

  // Ghi danh miễn phí vào lớp khai giảng.
  async enrollFreeClass(classId) {
    if (!classId) throw new Error("Class ID is required");
    const response = await apiClient.post("/enrollments/free-class", { classId });
    return unwrap(response);
  },
};
