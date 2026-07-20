import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VideoAiStatusPanel } from "./VideoAiStatusPanel";

function renderPanel(service, hlsStatus = { hlsStatus: "ready" }) {
  return render(
    <MemoryRouter>
      <VideoAiStatusPanel service={service} reviewPath="/review" hlsStatus={hlsStatus} />
    </MemoryRouter>,
  );
}

describe("VideoAiStatusPanel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts a manual generation job when the video is eligible", async () => {
    const user = userEvent.setup();
    const service = {
      getStatus: vi.fn().mockResolvedValue({ enabled: true, eligible: true, hlsReady: true }),
      createJob: vi.fn().mockResolvedValue({ id: "job-1", status: "QUEUED" }),
    };
    renderPanel(service);

    const button = await screen.findByRole("button", { name: /create study guide/i });
    await user.click(button);

    expect(service.createJob).toHaveBeenCalledWith({ sourceLanguage: "auto" });
    await waitFor(() => expect(service.getStatus).toHaveBeenCalledTimes(2));
  });

  it("shows a recovery action for failed jobs", async () => {
    const user = userEvent.setup();
    const service = {
      getStatus: vi.fn().mockResolvedValue({
        enabled: true,
        eligible: true,
        hlsReady: true,
        activeJob: { id: "job-1", status: "FAILED", errorMessage: "Worker stopped" },
      }),
      retryJob: vi.fn().mockResolvedValue({ id: "job-1", status: "QUEUED" }),
    };
    renderPanel(service);

    expect(
      await screen.findByText(
        "We could not create the study guide from this video. Please try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Worker stopped")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(service.retryJob).toHaveBeenCalledWith("job-1");
  });

  it("treats pending jobs as active and does not override backend eligibility", async () => {
    const service = {
      getStatus: vi.fn().mockResolvedValue({
        enabled: true,
        eligible: false,
        reason: "AI_AUDIO_NOT_READY",
        hlsReady: true,
        activeJob: { id: "job-1", status: "PENDING", progress: 0 },
      }),
    };

    renderPanel(service, { hlsStatus: "ready" });
    expect(await screen.findByText("Waiting")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /study guide creation progress/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create study guide/i })).not.toBeInTheDocument();
  });

  it("does not expose a checkpoint draft while the worker is still processing", async () => {
    const service = {
      getStatus: vi.fn().mockResolvedValue({
        enabled: true,
        eligible: true,
        hlsReady: true,
        contentId: "checkpoint-content",
        contentStatus: "DRAFT",
        activeJob: { id: "job-1", status: "PROCESSING", progress: 65 },
      }),
    };

    renderPanel(service);

    expect(await screen.findByText("In progress")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /review study guide/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/ready for your review/i)).not.toBeInTheDocument();
  });

  it("stops loading and offers retry when the status request times out", async () => {
    vi.useFakeTimers();
    const service = {
      getStatus: vi.fn(() => new Promise(() => {})),
    };
    const { unmount } = renderPanel(service);

    expect(screen.getByText("Checking study guide...")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(screen.queryByText("Checking study guide...")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "We could not check the study guide",
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
    unmount();
  });

  it("turns technical availability reasons into instructor-friendly guidance", async () => {
    const service = {
      getStatus: vi.fn().mockResolvedValue({
        enabled: true,
        eligible: false,
        reason: "TRANSCRIPTION_NOT_CONFIGURED",
        hlsReady: true,
      }),
    };

    renderPanel(service);

    expect(
      await screen.findByText(
        "Study guide creation is temporarily unavailable. Please try again later.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/faster-whisper|transcription|runtime/i)).not.toBeInTheDocument();
  });
});
