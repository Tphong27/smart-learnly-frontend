import apiClient from "./api-client";

const BASE_PATH = "/my-flashcards/sets";

function unwrap(response) {
  return response?.data ?? response;
}

function optionalText(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function setPayload(values = {}) {
  return {
    title: String(values.title ?? "").trim(),
    description: optionalText(values.description),
  };
}

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

  async createSet(values) {
    return unwrap(await apiClient.post(BASE_PATH, setPayload(values)));
  },

  async getSet(setId) {
    return unwrap(await apiClient.get(`${BASE_PATH}/${setId}`));
  },

  async replaceSet(setId, values) {
    return unwrap(await apiClient.put(`${BASE_PATH}/${setId}`, setPayload(values)));
  },

  async deleteSet(setId) {
    return unwrap(await apiClient.delete(`${BASE_PATH}/${setId}`));
  },

  async createCard(setId, values) {
    return unwrap(
      await apiClient.post(`${BASE_PATH}/${setId}/cards`, cardPayload(values)),
    );
  },

  async replaceCard(setId, cardId, values) {
    return unwrap(
      await apiClient.put(
        `${BASE_PATH}/${setId}/cards/${cardId}`,
        cardPayload(values),
      ),
    );
  },

  async deleteCard(setId, cardId) {
    return unwrap(await apiClient.delete(`${BASE_PATH}/${setId}/cards/${cardId}`));
  },

  async bulkDeleteCards(setId, ids) {
    return unwrap(
      await apiClient.post(`${BASE_PATH}/${setId}/cards/bulk-delete`, { ids }),
    );
  },

  async bulkCreateCards(setId, cards) {
    return unwrap(
      await apiClient.post(`${BASE_PATH}/${setId}/cards/bulk-create`, {
        cards: cards.map(cardPayload),
      }),
    );
  },

  async generateFromText(setId, values = {}) {
    return unwrap(
      await apiClient.post(`${BASE_PATH}/${setId}/imports/generate-from-text`, {
        sourceText: String(values.sourceText ?? ""),
        desiredCount: Number(values.desiredCount ?? 10),
        language: values.language || "auto",
        difficulty: values.difficulty || "medium",
      }),
    );
  },

  async generateFromFile(setId, { file, desiredCount = 10, language = "auto", difficulty = "medium" } = {}) {
    const formData = new FormData();
    if (file) formData.append("file", file);
    return unwrap(
      await apiClient.post(`${BASE_PATH}/${setId}/imports/generate-from-file`, formData, {
        params: { desiredCount, language, difficulty },
      }),
    );
  },

  async reorderCards(setId, ids) {
    return unwrap(
      await apiClient.put(`${BASE_PATH}/${setId}/cards/reorder`, { ids }),
    );
  },

  async uploadImage(setId, file) {
    const formData = new FormData();
    formData.append("file", file);
    return unwrap(await apiClient.post(`${BASE_PATH}/${setId}/images`, formData));
  },

  async getStudy(setId) {
    return unwrap(await apiClient.get(`${BASE_PATH}/${setId}/study`));
  },
};
