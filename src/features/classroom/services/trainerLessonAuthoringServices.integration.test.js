import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "@/services/api-client";
import { createTrainerFlashcardService } from "./trainerFlashcardService";
import { createTrainerQuizService } from "./trainerQuizService";

vi.mock("@/services/api-client", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Class lesson authoring service adapters", () => {
  it("FE-IT-CLASS-QUESTIONS-001 - keeps quiz requests scoped to class and lesson", async () => {
    const service = createTrainerQuizService("class-1");
    apiClient.get.mockResolvedValue({ data: { data: [{ questionId: "q-1" }] } });
    apiClient.post.mockResolvedValue({ data: { data: { questionId: "q-2" } } });

    await expect(service.getQuestions("lesson-1")).resolves.toEqual([
      { questionId: "q-1" },
    ]);
    await service.attachQuestion("lesson-1", {
      questionId: "q-2",
      orderIndex: 1,
      marks: 1,
    });

    const path = "/trainer/classes/class-1/curriculum/lessons/lesson-1/questions";
    expect(apiClient.get).toHaveBeenCalledWith(path);
    expect(apiClient.post).toHaveBeenCalledWith(path, {
      questionId: "q-2",
      orderIndex: 1,
      marks: 1,
    });
  });

  it("FE-IT-CLASS-FLASHCARD-001 - uses the existing lesson set route even with a cached set id", async () => {
    const service = createTrainerFlashcardService("class-1", "lesson-1");
    apiClient.get.mockResolvedValue({
      data: { data: { id: "set-1", lessonId: "lesson-1", cards: [] } },
    });

    await expect(service.getAdminSet("set-1")).resolves.toMatchObject({
      id: "set-1",
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      "/trainer/classes/class-1/curriculum/lessons/lesson-1/flashcards/set",
    );
  });

  it("FE-IT-CLASS-FLASHCARD-002 - uploads images through the class-scoped endpoint", async () => {
    const service = createTrainerFlashcardService("class-1", "lesson-1");
    apiClient.get.mockResolvedValue({ data: { data: { id: "set-1" } } });
    apiClient.post.mockResolvedValue({ data: { data: { url: "image-url" } } });
    await service.getAdminSetByLesson();

    const file = new File(["image"], "card.png", { type: "image/png" });
    await expect(service.uploadImage("set-1", file)).resolves.toEqual({
      url: "image-url",
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      "/trainer/classes/class-1/curriculum/lessons/lesson-1/flashcards/set/set-1/images",
      expect.any(FormData),
    );
  });
});
