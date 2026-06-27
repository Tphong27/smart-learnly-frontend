import { useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Download,
    ExternalLink,
    File,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import {
    getPrimaryDocument,
    isPdfUrl,
    isOfficeDocUrl,
    officeViewerUrl,
} from "../utils/lesson-content";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).toString();

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function PdfSlideViewer({ url }) {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const openDocument = () => {
        window.open(url, "_blank", "noopener,noreferrer");
    };

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setLoading(false);
        setError(false);
    };

    const onDocumentLoadError = () => {
        setLoading(false);
        setError(true);
    };

    const goToPrevPage = () => setPageNumber((page) => Math.max(1, page - 1));
    const goToNextPage = () =>
        setPageNumber((page) => Math.min(numPages || 1, page + 1));

    const zoomIn = () => {
        setScale((currentScale) => {
            const currentIndex = ZOOM_LEVELS.indexOf(currentScale);
            return currentIndex < ZOOM_LEVELS.length - 1
                ? ZOOM_LEVELS[currentIndex + 1]
                : currentScale;
        });
    };

    const zoomOut = () => {
        setScale((currentScale) => {
            const currentIndex = ZOOM_LEVELS.indexOf(currentScale);
            return currentIndex > 0
                ? ZOOM_LEVELS[currentIndex - 1]
                : currentScale;
        });
    };

    if (error) {
        return (
            <div className="pdf-viewer-error">
                <div className="pdf-viewer-error__card">
                    <File size={48} className="pdf-viewer-error__icon" />
                    <h3>Could not load PDF</h3>
                    <p>
                        This file could not be previewed. You can download or
                        open it instead.
                    </p>
                    <div className="pdf-viewer-error__actions">
                        <button
                            className="pdf-viewer-error__btn pdf-viewer-error__btn--primary"
                            onClick={openDocument}
                        >
                            <Download size={16} />
                            Download PDF
                        </button>
                        <button
                            className="pdf-viewer-error__btn"
                            onClick={openDocument}
                        >
                            <ExternalLink size={16} />
                            Open in new tab
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="pdf-viewer">
            <div className="pdf-viewer__toolbar">
                <div className="pdf-viewer__toolbar-group">
                    <button
                        className="pdf-viewer__tool-btn"
                        onClick={goToPrevPage}
                        disabled={pageNumber <= 1}
                        title="Previous page"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="pdf-viewer__page-info">
                        {pageNumber} / {numPages || "–"}
                    </span>
                    <button
                        className="pdf-viewer__tool-btn"
                        onClick={goToNextPage}
                        disabled={pageNumber >= (numPages || 1)}
                        title="Next page"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                <div className="pdf-viewer__toolbar-group">
                    <button
                        className="pdf-viewer__tool-btn"
                        onClick={zoomOut}
                        disabled={scale <= ZOOM_LEVELS[0]}
                        title="Zoom out"
                    >
                        <ZoomOut size={18} />
                    </button>
                    <span className="pdf-viewer__zoom-info">
                        {Math.round(scale * 100)}%
                    </span>
                    <button
                        className="pdf-viewer__tool-btn"
                        onClick={zoomIn}
                        disabled={scale >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                        title="Zoom in"
                    >
                        <ZoomIn size={18} />
                    </button>
                </div>

                <div className="pdf-viewer__toolbar-group">
                    <button
                        className="pdf-viewer__tool-btn"
                        onClick={openDocument}
                        title="Download PDF"
                    >
                        <Download size={18} />
                    </button>
                    <button
                        className="pdf-viewer__tool-btn"
                        onClick={openDocument}
                        title="Open in new tab"
                    >
                        <ExternalLink size={18} />
                    </button>
                </div>
            </div>

            <div className="pdf-viewer__container">
                {loading && (
                    <div className="pdf-viewer__loading">
                        <div className="pdf-viewer__spinner" />
                        <span>Loading PDF...</span>
                    </div>
                )}
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading=""
                    className="pdf-viewer__document"
                >
                    <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        className="pdf-viewer__page"
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                    />
                </Document>
            </div>
        </div>
    );
}

function OfficeDocViewer({ url, name }) {
    const openDocument = () => {
        window.open(url, "_blank", "noopener,noreferrer");
    };

    return (
        <div className="office-viewer">
            <div className="office-viewer__toolbar">
                <span className="office-viewer__title">{name || "Document"}</span>
                <div className="office-viewer__toolbar-group">
                    <button
                        className="office-viewer__tool-btn"
                        onClick={openDocument}
                        title="Download"
                    >
                        <Download size={18} />
                    </button>
                    <button
                        className="office-viewer__tool-btn"
                        onClick={openDocument}
                        title="Open in new tab"
                    >
                        <ExternalLink size={18} />
                    </button>
                </div>
            </div>
            <div className="office-viewer__container">
                <iframe
                    title={name || "Document preview"}
                    src={officeViewerUrl(url)}
                    className="office-viewer__frame"
                />
            </div>
        </div>
    );
}

function DocumentFallback({ lesson }) {
    const document = getPrimaryDocument(lesson);
    const url = document?.url || "";
    const name = document?.name || "Document";
    const contentType = document?.contentType || "";

    return (
        <div className="doc-fallback">
            <div className="doc-fallback__icon">
                <File size={40} />
            </div>
            <div className="doc-fallback__info">
                <div className="doc-fallback__name">{name}</div>
                {contentType && (
                    <div className="doc-fallback__type">{contentType}</div>
                )}
            </div>
            <div className="doc-fallback__actions">
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="doc-fallback__btn doc-fallback__btn--primary"
                >
                    <Download size={16} />
                    Download
                </a>
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="doc-fallback__btn"
                >
                    <ExternalLink size={16} />
                    Open
                </a>
            </div>
        </div>
    );
}

export function LearningLessonMedia({ lesson }) {
    if (!lesson) return null;

    const type = (lesson.lessonType || "").toUpperCase();

    if (type === "VIDEO" && lesson.videoUrl) {
        return (
            <div className="learning-lesson-media learning-lesson-media--video">
                <video controls src={lesson.videoUrl} />
            </div>
        );
    }

    if (type === "PDF") {
        const document = getPrimaryDocument(lesson);
        if (!document?.url) return null;

        if (isPdfUrl(document.url, document.contentType)) {
            return (
                <div className="learning-lesson-media learning-lesson-media--pdf">
                    <PdfSlideViewer url={document.url} />
                </div>
            );
        }

        if (isOfficeDocUrl(document.url, document.contentType)) {
            return (
                <div className="learning-lesson-media learning-lesson-media--office">
                    <OfficeDocViewer url={document.url} name={document.name} />
                </div>
            );
        }

        return (
            <div className="learning-lesson-media learning-lesson-media--document">
                <DocumentFallback lesson={lesson} />
            </div>
        );
    }

    return null;
}
