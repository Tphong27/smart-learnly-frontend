import apiClient from "@/services/api-client";
import { unwrapApiData as unwrap } from "@/services/api-response";

// Chuẩn hóa response upload (phẳng hoặc lồng data) về shape ổn định cho editor.
function normalizeUploadResult(raw, fallbackFileName = "") {
  const payload =
    raw && typeof raw === "object" && raw.data && typeof raw.data === "object"
      ? { ...raw, ...raw.data }
      : raw;

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid file upload response");
  }

  const url = payload.url || payload.fileUrl || payload.attachmentUrl || null;
  if (!url) {
    throw new Error("Upload succeeded but no file URL was returned");
  }

  const fileName =
    payload.fileName ||
    payload.name ||
    fallbackFileName ||
    null;

  return {
    ...payload,
    url,
    objectPath: payload.objectPath || null,
    fileName,
    // BE LessonFileUploadResponse dùng fileName; editor/save ưu tiên name.
    name: payload.name || fileName,
    fileSize: payload.fileSize ?? payload.size ?? null,
    contentType: payload.contentType || null,
  };
}

// Tải một file multipart lên endpoint content và trả metadata file đã chuẩn hóa.
async function uploadFile(path, file) {
  const formData = new FormData();
  formData.append("file", file);
  // Không set Content-Type thủ công — apiClient xóa header để browser gắn boundary.
  const response = await apiClient.post(path, formData);
  return normalizeUploadResult(unwrap(response), file?.name || "");
}

export const courseContentService = {
  // Tải tài liệu chính của bài học.
  uploadLessonMaterial(file) {
    return uploadFile("/admin/uploads/lesson-material", file);
  },

  // Tải resource đính kèm hoặc hình ảnh nội dung bài học.
  uploadLessonResource(file) {
    return uploadFile("/admin/uploads/lesson-resource", file);
  },

  // Tải ảnh tóm tắt bằng endpoint resource hiện tại.
  uploadSummaryImage(file) {
    return uploadFile("/admin/uploads/lesson-resource", file);
  },

  // Tải video tóm tắt bằng endpoint lesson material hiện tại.
  uploadSummaryVideo(file) {
    return uploadFile("/admin/uploads/lesson-material", file);
  },

  // Tải toàn bộ module và lesson của khóa học cho trình soạn nội dung.
  async getCourseContent(courseId) {
    const response = await apiClient.get(`/admin/courses/${courseId}/sections`);
    return unwrap(response);
  },

  // Tạo module mới trong khóa học.
  async createSection(courseId, payload) {
    const response = await apiClient.post(`/admin/courses/${courseId}/sections`, payload);
    return unwrap(response);
  },

  // Cập nhật tên và metadata của module.
  async updateSection(sectionId, payload) {
    const response = await apiClient.put(`/admin/sections/${sectionId}`, payload);
    return unwrap(response);
  },

  // Xóa module khỏi curriculum khóa học.
  async deleteSection(sectionId) {
    const response = await apiClient.delete(`/admin/sections/${sectionId}`);
    return unwrap(response);
  },

  // Lưu thứ tự module mới của khóa học.
  async reorderSections(courseId, orderedIds) {
    const response = await apiClient.put(`/admin/courses/${courseId}/sections/order`, {
      orderedIds,
    });
    return unwrap(response);
  },

  // Tạo lesson mới trong module đã chọn.
  async createLesson(sectionId, payload) {
    const response = await apiClient.post(`/admin/sections/${sectionId}/lessons`, payload);
    return unwrap(response);
  },

  // Tải chi tiết lesson cho màn hình biên tập.
  async getLessonDetail(lessonId) {
    const response = await apiClient.get(`/admin/lessons/${lessonId}`);
    return unwrap(response);
  },

  // Lưu toàn bộ nội dung lesson theo JSON contract hiện tại.
  async updateLesson(lessonId, payload) {
    const response = await apiClient.put(`/admin/lessons/${lessonId}`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return unwrap(response);
  },

  // Xóa lesson khỏi module.
  async deleteLesson(lessonId) {
    const response = await apiClient.delete(`/admin/lessons/${lessonId}`);
    return unwrap(response);
  },

  // Lưu thứ tự lesson mới trong một module.
  async reorderLessons(sectionId, orderedIds) {
    const response = await apiClient.put(`/admin/sections/${sectionId}/lessons/order`, {
      orderedIds,
    });
    return unwrap(response);
  },

  // Tải danh sách lesson của module và luôn trả về mảng.
  async getLessonsBySection(sectionId) {
    const response = await apiClient.get(`/admin/sections/${sectionId}/lessons`);
    const data = unwrap(response);
    return Array.isArray(data) ? data : data?.items || data?.content || [];
  },
};
