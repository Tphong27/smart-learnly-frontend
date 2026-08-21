export function fileNameFromUrl(url) {
    if (!url) return null;
    try {
        const parsedUrl = new URL(url);
        const parts = parsedUrl.pathname.split("/");
        return decodeURIComponent(parts[parts.length - 1]) || null;
    } catch {
        return url.split("/").pop() || null;
    }
}

export function isPdfUrl(url, contentType) {
    if (!url) return false;
    if (contentType && contentType.toLowerCase().includes("pdf")) return true;
    return /\.(pdf)(\?|$)/i.test(url);
}

// Định dạng tài liệu được phép cho main material của lesson (type PDF).
export const MATERIAL_DOC_EXTENSIONS = ["pdf", "doc", "docx"];

// Định dạng tài liệu bổ sung (resources) — khớp whitelist backend LessonFileUploadService.
export const RESOURCE_EXTENSIONS = [
    "pdf",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "xls",
    "xlsx",
    "csv",
    "txt",
    "zip",
    "png",
    "jpg",
    "jpeg",
    "webp",
    "gif",
    "mp3",
    "m4a",
    "wav",
    "mp4",
];

export const MAX_RESOURCE_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export const RESOURCE_ACCEPT =
    ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.zip,.png,.jpg,.jpeg,.webp,.gif,.mp3,.m4a,.wav,.mp4";

// Lấy phần mở rộng (lowercase, không dấu chấm) từ tên file hoặc URL.
export function getFileExtension(nameOrUrl) {
    if (!nameOrUrl) return "";
    // Bỏ query string/hash nếu là URL.
    const clean = String(nameOrUrl).split(/[?#]/)[0];
    const lastSegment = clean.split("/").pop() || "";
    const dotIndex = lastSegment.lastIndexOf(".");
    if (dotIndex < 0 || dotIndex === lastSegment.length - 1) return "";
    return lastSegment.slice(dotIndex + 1).toLowerCase();
}

// Nhận diện file Word (DOC/DOCX) qua đuôi file hoặc MIME type.
export function isOfficeDocUrl(url, contentType) {
    if (!url) return false;
    if (contentType) {
        const lower = contentType.toLowerCase();
        if (lower.includes("msword") || lower.includes("wordprocessingml")) {
            return true;
        }
    }
    return /\.(docx?)(\?|$)/i.test(url);
}

// Tạo URL nhúng Microsoft Office Online Viewer để xem DOC/DOCX inline.
// Yêu cầu `url` là URL public truy cập được từ Internet.
export function officeViewerUrl(url) {
    if (!url) return "";
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
        url,
    )}`;
}

export function getPrimaryDocument(lesson) {
    if (!lesson) return null;

    if (lesson.attachmentUrl) {
        return {
            url: lesson.attachmentUrl,
            name: fileNameFromUrl(lesson.attachmentUrl),
            contentType: null,
        };
    }

    const resources = Array.isArray(lesson.resources) ? lesson.resources : [];
    if (resources.length === 0) return null;

    const pdfResource = resources.find((resource) =>
        isPdfUrl(resource.url, resource.contentType),
    );
    const selectedResource = pdfResource || resources[0];

    return {
        url: selectedResource.url,
        name: selectedResource.name || fileNameFromUrl(selectedResource.url),
        contentType: selectedResource.contentType || null,
    };
}

export function isHtmlContent(content) {
    if (!content) return false;
    return /<[a-z][\s\S]*>/i.test(content);
}

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_WATCH_HOSTS = new Set(["youtube.com", "www.youtube.com"]);

export function getYoutubeVideoId(value) {
    if (!value) return null;

    try {
        const url = new URL(String(value).trim());
        const host = url.hostname.toLowerCase();

        if (
            url.protocol !== "https:" ||
            url.username ||
            url.password ||
            (url.port && url.port !== "443")
        ) {
            return null;
        }

        let videoId = null;
        if (host === "youtu.be") {
            const parts = url.pathname.split("/").filter(Boolean);
            videoId = parts.length === 1 ? parts[0] : null;
        } else if (
            YOUTUBE_WATCH_HOSTS.has(host) &&
            (url.pathname === "/watch" || url.pathname === "/watch/")
        ) {
            videoId = url.searchParams.get("v");
        }

        return YOUTUBE_VIDEO_ID_PATTERN.test(videoId || "") ? videoId : null;
    } catch {
        return null;
    }
}

export function canonicalYoutubeUrl(value) {
    const videoId = getYoutubeVideoId(value);
    return videoId
        ? `https://www.youtube.com/watch?v=${videoId}`
        : null;
}

export function youtubeEmbedUrl(value) {
    const videoId = getYoutubeVideoId(value);
    return videoId
        ? `https://www.youtube-nocookie.com/embed/${videoId}`
        : null;
}
