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
