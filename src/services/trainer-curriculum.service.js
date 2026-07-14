import apiClient from "./api-client";

function unwrap(response) {
  return response?.data ?? response;
}

function unwrapData(response) {
  const root = unwrap(response);
  return root?.data ?? root;
}

function requireId(value, label) {
  if (!value) {
    throw new Error(`${label} is required`);
  }
}

function curriculumPath(classId, suffix = "") {
  requireId(classId, "Class ID");
  return `/trainer/classes/${classId}/curriculum${suffix}`;
}

export const trainerCurriculumService = {
  async getCurriculum(classId) {
    const response = await apiClient.get(curriculumPath(classId));
    return unwrapData(response);
  },

  async initializeDraft(classId) {
    const response = await apiClient.post(curriculumPath(classId, "/draft"));
    return unwrapData(response);
  },

  async publishDraft(classId) {
    const response = await apiClient.post(curriculumPath(classId, "/publish"));
    return unwrapData(response);
  },

  async createSection(classId, payload) {
    const response = await apiClient.post(
      curriculumPath(classId, "/sections"),
      payload,
    );
    return unwrapData(response);
  },

  async updateSection(classId, sectionId, payload) {
    requireId(sectionId, "Section ID");
    const response = await apiClient.put(
      curriculumPath(classId, `/sections/${sectionId}`),
      payload,
    );
    return unwrapData(response);
  },

  async deleteSection(classId, sectionId) {
    requireId(sectionId, "Section ID");
    await apiClient.delete(curriculumPath(classId, `/sections/${sectionId}`));
    return true;
  },

  async reorderSections(classId, ids) {
    const response = await apiClient.put(curriculumPath(classId, "/sections/order"), {
      ids,
    });
    return unwrapData(response);
  },

  async createLesson(classId, sectionId, payload) {
    requireId(sectionId, "Section ID");
    const response = await apiClient.post(
      curriculumPath(classId, `/sections/${sectionId}/lessons`),
      payload,
    );
    return unwrapData(response);
  },

  async updateLesson(classId, lessonId, payload) {
    requireId(lessonId, "Lesson ID");
    const response = await apiClient.put(
      curriculumPath(classId, `/lessons/${lessonId}`),
      payload,
    );
    return unwrapData(response);
  },

  async deleteLesson(classId, lessonId) {
    requireId(lessonId, "Lesson ID");
    await apiClient.delete(curriculumPath(classId, `/lessons/${lessonId}`));
    return true;
  },

  async reorderLessons(classId, sectionId, ids) {
    requireId(sectionId, "Section ID");
    const response = await apiClient.put(
      curriculumPath(classId, `/sections/${sectionId}/lessons/order`),
      { ids },
    );
    return unwrapData(response);
  },

  async addResource(classId, lessonId, payload) {
    requireId(lessonId, "Lesson ID");
    const response = await apiClient.post(
      curriculumPath(classId, `/lessons/${lessonId}/resources`),
      payload,
    );
    return unwrapData(response);
  },

  async replaceResources(classId, lessonId, resources) {
    requireId(lessonId, "Lesson ID");
    const response = await apiClient.put(
      curriculumPath(classId, `/lessons/${lessonId}/resources`),
      resources,
    );
    return unwrapData(response);
  },

  async reorderResources(classId, lessonId, ids) {
    requireId(lessonId, "Lesson ID");
    const response = await apiClient.put(
      curriculumPath(classId, `/lessons/${lessonId}/resources/order`),
      { ids },
    );
    return unwrapData(response);
  },

  async removeResource(classId, lessonId, resourceId) {
    requireId(lessonId, "Lesson ID");
    requireId(resourceId, "Resource ID");
    await apiClient.delete(
      curriculumPath(classId, `/lessons/${lessonId}/resources/${resourceId}`),
    );
    return true;
  },
};
