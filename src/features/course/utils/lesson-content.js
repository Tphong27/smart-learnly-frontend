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
