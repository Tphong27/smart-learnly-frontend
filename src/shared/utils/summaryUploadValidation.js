const MB = 1024 * 1024;

const SUMMARY_IMAGE_MAX_SIZE = 20 * MB;
const SUMMARY_VIDEO_MAX_SIZE = 500 * MB;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const ALLOWED_VIDEO_EXTENSIONS = ["mp4", "webm", "mov"];

function getFileExtension(fileName = "") {
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex < 0 || dotIndex === fileName.length - 1) {
    return "";
  }

  return fileName.slice(dotIndex + 1).toLowerCase();
}

export function validateSummaryImage(file) {
  if (!file) {
    return "Image file is required";
  }

  if (file.size > SUMMARY_IMAGE_MAX_SIZE) {
    return "Summary image must not exceed 20MB";
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Summary image must be JPEG, PNG, WebP, or GIF";
  }

  return null;
}

export function validateSummaryVideo(file) {
  if (!file) {
    return "Video file is required";
  }

  if (file.size > SUMMARY_VIDEO_MAX_SIZE) {
    return "Summary video must not exceed 500MB";
  }

  const extension = getFileExtension(file.name);

  if (!ALLOWED_VIDEO_EXTENSIONS.includes(extension)) {
    return "Summary video must be MP4, WebM, or MOV";
  }

  return null;
}