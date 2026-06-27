import { useCallback, useMemo, useRef } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import "./RichTextEditor.css";

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Learning Content...",
  minHeight = 260,
  imageUploader,
  videoUploader,
}) {
  const quillRef = useRef(null);

  const insertHtmlIntoEditor = useCallback((html) => {
    const editor = quillRef.current?.getEditor();

    if (!editor) {
      return;
    }

    const range = editor.getSelection(true);
    const insertIndex = range?.index ?? editor.getLength();

    editor.clipboard.dangerouslyPasteHTML(insertIndex, html, "user");
    editor.setSelection(insertIndex + 1, 0);
  }, []);

  const handleImageUpload = useCallback(() => {
    if (!imageUploader) {
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/gif";
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];

      if (!file) {
        return;
      }

      try {
        const uploadedImage = await imageUploader(file);
        const imageUrl = uploadedImage?.url || uploadedImage?.data?.url;

        if (!imageUrl) {
          throw new Error("Invalid image upload response");
        }

        const safeAlt = file.name
          .replaceAll('"', "")
          .replaceAll("<", "")
          .replaceAll(">", "");

        insertHtmlIntoEditor(
          `<p><img src="${imageUrl}" alt="${safeAlt}" /></p>`,
        );
      } catch (error) {
        console.error("Failed to upload summary image:", error);
      }
    };
  }, [imageUploader, insertHtmlIntoEditor]);

  const handleVideoUpload = useCallback(() => {
    if (!videoUploader) {
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];

      if (!file) {
        return;
      }

      try {
        const uploadedVideo = await videoUploader(file);
        const videoUrl = uploadedVideo?.url || uploadedVideo?.data?.url;
        const contentType =
          uploadedVideo?.contentType ||
          uploadedVideo?.data?.contentType ||
          file.type ||
          "video/mp4";

        if (!videoUrl) {
          throw new Error("Invalid video upload response");
        }

        insertHtmlIntoEditor(`
        <p>
          <video controls preload="metadata" data-summary-video="true">
            <source src="${videoUrl}" type="${contentType}" />
            Your browser does not support the video tag.
          </video>
        </p>
      `);
      } catch (error) {
        console.error("Failed to upload summary video:", error);
      }
    };
  }, [videoUploader, insertHtmlIntoEditor]);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }, { font: [] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ list: "ordered" }, { list: "bullet" }, { align: [] }],
          ["blockquote", "code-block"],
          ["link", "image", "video"],
          ["clean"],
        ],
        handlers: {
          ...(imageUploader ? { image: handleImageUpload } : {}),
          ...(videoUploader ? { video: handleVideoUpload } : {}),
        },
      },
    }),
    [handleImageUpload, handleVideoUpload, imageUploader, videoUploader],
  );

  const formats = [
    "header",
    "font",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "list",
    "bullet",
    "align",
    "blockquote",
    "code-block",
    "link",
    "image",
    "video",
  ];

  return (
    <div
      className="lesson-summary-editor"
      style={{ "--editor-min-height": `${minHeight}px` }}
    >
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ""}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}
