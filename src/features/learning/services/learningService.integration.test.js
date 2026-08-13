import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/mocks/server";
import { learningService } from "./learningService";

describe("learningService flashcard progress", () => {
  it("omits classId for online flashcard progress", async () => {
    let receivedClassId = "not-observed";

    server.use(
      http.post(/.*\/api\/v1\/learning\/flashcards\/card-1\/progress$/, ({ request }) => {
        receivedClassId = new URL(request.url).searchParams.get("classId");
        return HttpResponse.json({
          success: true,
          data: {
            cardId: "card-1",
            learningStatus: "known",
            lessonCompleted: false,
          },
        });
      }),
    );

    const response = await learningService.submitFlashcardProgress("card-1", "known");

    expect(receivedClassId).toBeNull();
    expect(response).toMatchObject({
      cardId: "card-1",
      learningStatus: "known",
      lessonCompleted: false,
    });
  });

  it("sends classId for class-scoped flashcard progress", async () => {
    let receivedClassId = null;

    server.use(
      http.post(/.*\/api\/v1\/learning\/flashcards\/card-2\/progress$/, ({ request }) => {
        receivedClassId = new URL(request.url).searchParams.get("classId");
        return HttpResponse.json({
          success: true,
          data: {
            cardId: "card-2",
            learningStatus: "learning",
            lessonCompleted: true,
          },
        });
      }),
    );

    const response = await learningService.submitFlashcardProgress(
      "card-2",
      "still_learning",
      "class-9",
    );

    expect(receivedClassId).toBe("class-9");
    expect(response).toMatchObject({
      cardId: "card-2",
      learningStatus: "learning",
      lessonCompleted: true,
    });
  });
});
