import apiClient from "@/services/api-client";
import { unwrapNestedApiData as unwrapData } from "@/services/api-response";
import { requireTrainerResourceId } from "./trainerServiceUtils";

// Tạo URL curriculum đã được giới hạn theo lớp trainer.
function curriculumPath(classId, suffix = "") {
  requireTrainerResourceId(classId, "Class ID");
  return `/trainer/classes/${classId}/curriculum${suffix}`;
}

export const trainerCurriculumService = {
  // Tải curriculum hiệu lực, binding và metadata của lớp.
  async getCurriculum(classId) {
    const response = await apiClient.get(curriculumPath(classId));
    return unwrapData(response);
  },

  // Tạo bản nháp riêng từ curriculum đang kế thừa của khóa học.
  async initializeDraft(classId) {
    const response = await apiClient.post(curriculumPath(classId, "/draft"));
    return unwrapData(response);
  },

  // Xuất bản curriculum draft để lớp sử dụng chính thức.
  async publishDraft(classId) {
    const response = await apiClient.post(curriculumPath(classId, "/publish"));
    return unwrapData(response);
  },

  // Thêm section vào curriculum draft của lớp.
  async createSection(classId, payload) {
    const response = await apiClient.post(
      curriculumPath(classId, "/sections"),
      payload,
    );
    return unwrapData(response);
  },

  // Cập nhật section trong curriculum draft của lớp.
  async updateSection(classId, sectionId, payload) {
    requireTrainerResourceId(sectionId, "Section ID");
    const response = await apiClient.put(
      curriculumPath(classId, `/sections/${sectionId}`),
      payload,
    );
    return unwrapData(response);
  },

  // Xóa section khỏi curriculum draft của lớp.
  async deleteSection(classId, sectionId) {
    requireTrainerResourceId(sectionId, "Section ID");
    await apiClient.delete(curriculumPath(classId, `/sections/${sectionId}`));
    return true;
  },

  // Lưu thứ tự section mới trong curriculum draft.
  async reorderSections(classId, ids) {
    const response = await apiClient.put(curriculumPath(classId, "/sections/order"), {
      ids,
    });
    return unwrapData(response);
  },

  // Thêm lesson vào một section của curriculum draft.
  async createLesson(classId, sectionId, payload) {
    requireTrainerResourceId(sectionId, "Section ID");
    const response = await apiClient.post(
      curriculumPath(classId, `/sections/${sectionId}/lessons`),
      payload,
    );
    return unwrapData(response);
  },

  // Cập nhật nội dung lesson trong curriculum draft.
  async updateLesson(classId, lessonId, payload) {
    requireTrainerResourceId(lessonId, "Lesson ID");
    const response = await apiClient.put(
      curriculumPath(classId, `/lessons/${lessonId}`),
      payload,
    );
    return unwrapData(response);
  },

  // Xóa lesson khỏi curriculum draft của lớp.
  async deleteLesson(classId, lessonId) {
    requireTrainerResourceId(lessonId, "Lesson ID");
    await apiClient.delete(curriculumPath(classId, `/lessons/${lessonId}`));
    return true;
  },

  // Lưu thứ tự lesson mới trong một section.
  async reorderLessons(classId, sectionId, ids) {
    requireTrainerResourceId(sectionId, "Section ID");
    const response = await apiClient.put(
      curriculumPath(classId, `/sections/${sectionId}/lessons/order`),
      { ids },
    );
    return unwrapData(response);
  },

  // Thêm một resource vào lesson của curriculum draft.
  async addResource(classId, lessonId, payload) {
    requireTrainerResourceId(lessonId, "Lesson ID");
    const response = await apiClient.post(
      curriculumPath(classId, `/lessons/${lessonId}/resources`),
      payload,
    );
    return unwrapData(response);
  },

  // Thay toàn bộ resource của lesson bằng danh sách mới.
  async replaceResources(classId, lessonId, resources) {
    requireTrainerResourceId(lessonId, "Lesson ID");
    const response = await apiClient.put(
      curriculumPath(classId, `/lessons/${lessonId}/resources`),
      resources,
    );
    return unwrapData(response);
  },

  // Lưu thứ tự resource mới của lesson.
  async reorderResources(classId, lessonId, ids) {
    requireTrainerResourceId(lessonId, "Lesson ID");
    const response = await apiClient.put(
      curriculumPath(classId, `/lessons/${lessonId}/resources/order`),
      { ids },
    );
    return unwrapData(response);
  },

  // Xóa một resource cụ thể khỏi lesson.
  async removeResource(classId, lessonId, resourceId) {
    requireTrainerResourceId(lessonId, "Lesson ID");
    requireTrainerResourceId(resourceId, "Resource ID");
    await apiClient.delete(
      curriculumPath(classId, `/lessons/${lessonId}/resources/${resourceId}`),
    );
    return true;
  },
};
