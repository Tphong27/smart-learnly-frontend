import apiClient from "@/services/api-client";
import { unwrapNestedApiData as unwrapData } from "@/services/api-response";
import { requireTrainerResourceId } from "./trainerServiceUtils";

// Đọc set ID từ các biến thể response flashcard hiện tại.
function readSetId(payload) {
  const data = payload?.data ?? payload;
  return data?.id ?? data?.setId ?? null;
}

// Tạo service flashcard giới hạn theo lớp/lesson và ghi nhớ set đang mở.
export function createTrainerFlashcardService(classId, lessonId) {
  requireTrainerResourceId(classId, "Class ID");
  requireTrainerResourceId(lessonId, "Lesson ID");

  const basePath = `/trainer/classes/${classId}/curriculum/lessons/${lessonId}/flashcards`;
  let activeSetId = null;

  // Ghi nhớ set ID từ response để editor chỉ cần truyền card ID ở thao tác sau.
  function rememberSet(payload) {
    const nextSetId = readSetId(payload);
    if (nextSetId) activeSetId = nextSetId;
    return payload;
  }

  // Ưu tiên set ID tường minh, nếu thiếu thì dùng set gần nhất đã tải.
  function resolveSetId(explicitSetId) {
    const setId = explicitSetId || activeSetId;
    requireTrainerResourceId(setId, "Flashcard set ID");
    return setId;
  }

  return {
    // Tạo flashcard set cho lesson và ghi nhớ set mới.
    async createLesson(payload) {
      const response = await apiClient.post(basePath, payload);
      const data = unwrapData(response);
      rememberSet(data);
      return data;
    },

    // Xác minh cache set bằng endpoint lesson-scoped vì backend không có GET theo set ID.
    async getAdminSet(setId) {
      const resolved = resolveSetId(setId);
      const response = await apiClient.get(`${basePath}/set`);
      const data = unwrapData(response);
      const loadedSetId = readSetId(data);
      if (loadedSetId && loadedSetId !== resolved) {
        throw new Error("The cached flashcard set does not belong to this lesson.");
      }
      rememberSet(data);
      return data;
    },

    // Tải flashcard set hiện tại của lesson.
    async getAdminSetByLesson() {
      const response = await apiClient.get(`${basePath}/set`);
      const data = unwrapData(response);
      rememberSet(data);
      return data;
    },

    // Cập nhật metadata của flashcard set.
    async updateSet(setId, payload) {
      const resolved = resolveSetId(setId);
      const response = await apiClient.patch(
        `${basePath}/set/${resolved}`,
        payload,
      );
      const data = unwrapData(response);
      rememberSet(data);
      return data;
    },

    // Xóa flashcard set và xóa cache ID nếu đó là set đang mở.
    async deleteSet(setId) {
      const resolved = resolveSetId(setId);
      await apiClient.delete(`${basePath}/set/${resolved}`);
      if (activeSetId === resolved) activeSetId = null;
      return true;
    },

    // Thêm card mới vào flashcard set.
    async addCard(setId, payload) {
      const resolved = resolveSetId(setId);
      const response = await apiClient.post(
        `${basePath}/set/${resolved}/cards`,
        payload,
      );
      return unwrapData(response);
    },

    // Cập nhật card trong set đang mở.
    async updateCard(cardId, payload) {
      requireTrainerResourceId(cardId, "Flashcard card ID");
      const resolved = resolveSetId();
      const response = await apiClient.patch(
        `${basePath}/set/${resolved}/cards/${cardId}`,
        payload,
      );
      return unwrapData(response);
    },

    // Xóa card khỏi set đang mở.
    async deleteCard(cardId) {
      requireTrainerResourceId(cardId, "Flashcard card ID");
      const resolved = resolveSetId();
      await apiClient.delete(`${basePath}/set/${resolved}/cards/${cardId}`);
      return true;
    },

    // Lưu thứ tự card mới và làm mới set ID từ response.
    async reorderCards(setId, ids) {
      const resolved = resolveSetId(setId);
      const response = await apiClient.patch(
        `${basePath}/set/${resolved}/cards/reorder`,
        { ids },
      );
      const data = unwrapData(response);
      rememberSet(data);
      return data;
    },

    // Tải ảnh card lên endpoint được kiểm tra quyền theo class và lesson.
    async uploadImage(setId, file) {
      const resolved = resolveSetId(setId);
      const formData = new FormData();
      formData.append("file", file);
      const response = await apiClient.post(
        `${basePath}/set/${resolved}/images`,
        formData,
      );
      return unwrapData(response);
    },
  };
}
