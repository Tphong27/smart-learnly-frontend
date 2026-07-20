import { describe, expect, it } from "vitest";
import {
  normalizeLearnerVideoAiResponse,
  normalizeVideoAiContent,
  normalizeVideoAiStatus,
} from "./video-ai.service";

describe("video AI response normalization", () => {
  it("normalizes alternate backend field names into the frontend contract", () => {
    expect(normalizeVideoAiStatus({
      canGenerate: true,
      job: { jobId: "job-1", jobStatus: "processing", progressPercent: 42 },
      draftContentId: "content-1",
    })).toMatchObject({
      eligible: true,
      contentId: "content-1",
      activeJob: { id: "job-1", status: "PROCESSING", progress: 42 },
    });
  });

  it("normalizes transcript and chapter timestamps", () => {
    expect(normalizeVideoAiContent({
      contentId: "content-1",
      version: 3,
      highlights: ["First point"],
      chapters: [{ chapterId: "chapter-1", startTimeMs: 1200 }],
      segments: [{ segmentId: "segment-1", startTimeMs: 500, content: "Hello" }],
    })).toMatchObject({
      id: "content-1",
      revision: 3,
      keyPoints: ["First point"],
      chapters: [{ id: "chapter-1", startMs: 1200 }],
      transcriptSegments: [{ id: "segment-1", startMs: 500, text: "Hello" }],
    });
  });

  it("unwraps the learner content envelope", () => {
    expect(normalizeLearnerVideoAiResponse({
      available: true,
      content: { contentId: "content-2", summary: "Reviewed summary" },
    })).toMatchObject({
      available: true,
      id: "content-2",
      summary: "Reviewed summary",
    });
    expect(normalizeLearnerVideoAiResponse({ available: false })).toEqual({
      available: false,
    });
  });
});
