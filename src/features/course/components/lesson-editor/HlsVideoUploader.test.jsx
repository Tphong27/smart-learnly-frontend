import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HlsVideoUploader } from "./HlsVideoUploader";

const courseServiceMocks = vi.hoisted(() => ({
  checkHlsHealth: vi.fn(),
  getHlsProcessingStatus: vi.fn(),
  uploadHlsVideo: vi.fn(),
}));

vi.mock("@/services/course.service", () => ({
  courseService: courseServiceMocks,
}));

function createDeferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("HlsVideoUploader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    courseServiceMocks.checkHlsHealth.mockResolvedValue({
      hlsEnabled: true,
      status: "healthy",
    });
    courseServiceMocks.getHlsProcessingStatus.mockImplementation(
      async (lessonId) => ({
        lessonId,
        hlsStatus: "not_found",
        progressPercent: 0,
      }),
    );
  });

  it("does not carry an in-progress upload into another lesson", async () => {
    const user = userEvent.setup();
    const pendingUpload = createDeferred();
    courseServiceMocks.uploadHlsVideo.mockReturnValueOnce(
      pendingUpload.promise,
    );

    const commonProps = {
      videoUrl: "",
      onVideoUrlChange: vi.fn(),
      showToast: vi.fn(),
    };
    const { container, rerender } = render(
      <HlsVideoUploader lessonId="lesson-a" {...commonProps} />,
    );

    const firstUploadButton = await screen.findByRole("button", {
      name: "Upload lesson video",
    });
    await waitFor(() => expect(firstUploadButton).toBeEnabled());

    const fileInput = container.querySelector('input[type="file"]');
    await user.upload(
      fileInput,
      new File(["video-content"], "lesson-a.mp4", { type: "video/mp4" }),
    );

    await waitFor(() =>
      expect(courseServiceMocks.uploadHlsVideo).toHaveBeenCalledWith(
        "lesson-a",
        expect.any(File),
        false,
        expect.any(Function),
      ),
    );
    expect(
      screen.getByRole("button", { name: "Video is uploading" }),
    ).toBeDisabled();

    rerender(<HlsVideoUploader lessonId="lesson-b" {...commonProps} />);

    await waitFor(() =>
      expect(courseServiceMocks.getHlsProcessingStatus).toHaveBeenCalledWith(
        "lesson-b",
      ),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Upload lesson video" }),
      ).toBeEnabled(),
    );

    await act(async () => {
      pendingUpload.resolve({ status: "processing" });
      await pendingUpload.promise;
    });
  });

  it("does not expose technical processing steps returned by the backend", async () => {
    courseServiceMocks.getHlsProcessingStatus.mockResolvedValue({
      hlsStatus: "processing",
      progressPercent: 45,
      currentStep: "Downloading source from R2 through GitHub runner",
      message: "HLS manifest generation is running",
    });

    render(<HlsVideoUploader lessonId="lesson-a" videoUrl="" />);

    expect(await screen.findByText("Preparing video")).toBeInTheDocument();
    expect(
      screen.getByText("Making your video ready for smooth playback."),
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/HLS|R2|GitHub|manifest/i);
  });
});
