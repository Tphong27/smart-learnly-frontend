import apiClient from "@/services/api-client";

const BASE_PATH = "/my-flashcards/sets";

/** Lấy payload nghiệp vụ từ response chuẩn của API. */
function unwrap(response) {
  return response?.data ?? response;
}

/** Chuẩn hóa chuỗi tùy chọn để API nhận null thay vì nội dung rỗng. */
function optionalText(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

/** Chuyển dữ liệu form thành payload tạo hoặc cập nhật bộ flashcard cá nhân. */
function setPayload(values = {}) {
  return {
    title: String(values.title ?? "").trim(),
    description: optionalText(values.description),
  };
}

/** Chuyển dữ liệu form thành payload tạo hoặc cập nhật thẻ flashcard cá nhân. */
function cardPayload(values = {}) {
  return {
    frontText: optionalText(values.frontText),
    frontImageUrl: optionalText(values.frontImageUrl),
    backText: optionalText(values.backText),
    backImageUrl: optionalText(values.backImageUrl),
    hint: optionalText(values.hint),
    explanation: optionalText(values.explanation),
  };
}

/** Chuẩn hóa danh sách phân trang để giao diện không phụ thuộc cấu trúc response. */
function normalizePage(payload) {
  const page = unwrap(payload) || {};
  return {
    items: Array.isArray(page.items) ? page.items : [],
    page: Number.isInteger(page.page) ? page.page : 0,
    size: Number.isInteger(page.size) ? page.size : 20,
    totalItems: Number(page.totalItems || 0),
    totalPages: Math.max(1, Number(page.totalPages || 1)),
  };
}

export const personalFlashcardService = {
  /** Lấy thư viện bộ flashcard cá nhân theo từ khóa, sắp xếp và phân trang. */
  async listSets({ q, sort = "updated_desc", page = 0, size = 20 } = {}) {
    const normalizedQuery = String(q ?? "").trim();
    const response = await apiClient.get(BASE_PATH, {
      params: {
        sort,
        page,
        size,
        ...(normalizedQuery ? { q: normalizedQuery } : {}),
      },
    });
    return normalizePage(response);
  },

  /** Tạo một bộ flashcard cá nhân mới. */
  async createSet(values) {
    return unwrap(await apiClient.post(BASE_PATH, setPayload(values)));
  },

  /** Lấy chi tiết một bộ flashcard cá nhân cùng các thẻ của nó. */
  async getSet(setId) {
    return unwrap(await apiClient.get(`${BASE_PATH}/${setId}`));
  },

  /** Thay thế thông tin cơ bản của một bộ flashcard cá nhân. */
  async replaceSet(setId, values) {
    return unwrap(await apiClient.put(`${BASE_PATH}/${setId}`, setPayload(values)));
  },

  /** Xóa một bộ flashcard cá nhân. */
  async deleteSet(setId) {
    return unwrap(await apiClient.delete(`${BASE_PATH}/${setId}`));
  },

  /** Thêm một thẻ vào bộ flashcard cá nhân. */
  async createCard(setId, values) {
    return unwrap(
      await apiClient.post(`${BASE_PATH}/${setId}/cards`, cardPayload(values)),
    );
  },

  /** Thay thế nội dung của một thẻ flashcard cá nhân. */
  async replaceCard(setId, cardId, values) {
    return unwrap(
      await apiClient.put(
        `${BASE_PATH}/${setId}/cards/${cardId}`,
        cardPayload(values),
      ),
    );
  },

  /** Xóa một thẻ khỏi bộ flashcard cá nhân. */
  async deleteCard(setId, cardId) {
    return unwrap(await apiClient.delete(`${BASE_PATH}/${setId}/cards/${cardId}`));
  },

  /** Xóa đồng thời các thẻ được chọn trong một bộ flashcard. */
  async bulkDeleteCards(setId, ids) {
    return unwrap(
      await apiClient.post(`${BASE_PATH}/${setId}/cards/bulk-delete`, { ids }),
    );
  },

  /** Tạo đồng thời nhiều thẻ đã được người dùng chuẩn bị. */
  async bulkCreateCards(setId, cards) {
    return unwrap(
      await apiClient.post(`${BASE_PATH}/${setId}/cards/bulk-create`, {
        cards: cards.map(cardPayload),
      }),
    );
  },

  /** Sinh thẻ nháp từ văn bản để người dùng xem và lưu lại. */
  async generateFromText(setId, values = {}) {
    return unwrap(
      await apiClient.post(`${BASE_PATH}/${setId}/imports/generate-from-text`, {
        sourceText: String(values.sourceText ?? ""),
        desiredCount: Number(values.desiredCount ?? 10),
        language: values.language || "auto",
      }),
    );
  },

  /** Sinh thẻ nháp từ tệp tài liệu người dùng tải lên. */
  async generateFromFile(setId, { file, desiredCount = 10, language = "auto" } = {}) {
    const formData = new FormData();
    if (file) formData.append("file", file);
    return unwrap(
      await apiClient.post(`${BASE_PATH}/${setId}/imports/generate-from-file`, formData, {
        params: { desiredCount, language },
      }),
    );
  },

  /** Sắp xếp lại thứ tự thẻ trong bộ flashcard cá nhân. */
  async reorderCards(setId, ids) {
    return unwrap(
      await apiClient.put(`${BASE_PATH}/${setId}/cards/reorder`, { ids }),
    );
  },

  /** Tải ảnh lên để dùng trong thẻ flashcard cá nhân. */
  async uploadImage(setId, file) {
    const formData = new FormData();
    formData.append("file", file);
    return unwrap(await apiClient.post(`${BASE_PATH}/${setId}/images`, formData));
  },

  /** Lấy dữ liệu luyện tập của một bộ flashcard cá nhân. */
  async getStudy(setId) {
    return unwrap(await apiClient.get(`${BASE_PATH}/${setId}/study`));
  },
};
