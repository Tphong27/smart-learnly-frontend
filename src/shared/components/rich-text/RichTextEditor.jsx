import { useCallback, useEffect, useMemo, useRef } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import "./RichTextEditor.css";

const RICH_TEXT_FORMATS = [
  "header",
  "font",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "list",
  "bullet",
  "align",
  "blockquote",
  "code-block",
  "link",
  "image",
  "video",
];

function sanitizeFileName(fileName = "uploaded-file") {
  return fileName.replaceAll('"', "").replaceAll("<", "").replaceAll(">", "");
}

function removeBase64Media(html) {
  if (!html || typeof html !== "string") {
    return "";
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const wrapper = doc.body.firstElementChild;

  if (!wrapper) {
    return html;
  }

  wrapper.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") || "";

    if (src.startsWith("data:image/")) {
      img.remove();
    }
  });

  wrapper.querySelectorAll("video, source").forEach((element) => {
    const src = element.getAttribute("src") || "";

    if (src.startsWith("data:video/")) {
      const video = element.closest("video") || element;
      video.remove();
    }
  });

  return wrapper.innerHTML;
}

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Learning Content...",
  minHeight = 260,
  imageUploader,
  videoUploader,
}) {
  const quillRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const imageUploaderRef = useRef(imageUploader);
  const videoUploaderRef = useRef(videoUploader);
  const hasImageUploader = typeof imageUploader === "function";
  const hasVideoUploader = typeof videoUploader === "function";

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    imageUploaderRef.current = imageUploader;
  }, [imageUploader]);

  useEffect(() => {
    videoUploaderRef.current = videoUploader;
  }, [videoUploader]);

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

  const uploadAndInsertImage = useCallback(
    async (file) => {
      const uploadImage = imageUploaderRef.current;

      if (!uploadImage || !file) {
        return;
      }

      const uploadedImage = await uploadImage(file);
      const imageUrl = uploadedImage?.url || uploadedImage?.data?.url;

      if (!imageUrl) {
        throw new Error("Invalid image upload response");
      }

      const safeAlt = sanitizeFileName(file.name);

      insertHtmlIntoEditor(
        `<p><img src="${imageUrl}" alt="${safeAlt}" /></p>`,
      );
    },
    [insertHtmlIntoEditor],
  );

  const uploadAndInsertVideo = useCallback(
    async (file) => {
      const uploadVideo = videoUploaderRef.current;

      if (!uploadVideo || !file) {
        return;
      }

      const uploadedVideo = await uploadVideo(file);
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
    },
    [insertHtmlIntoEditor],
  );

  const handleImageUpload = useCallback(() => {
    if (!imageUploaderRef.current) {
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
        await uploadAndInsertImage(file);
      } catch (error) {
        console.error("Failed to upload summary image:", error);
      }
    };
  }, [uploadAndInsertImage]);

  const handleVideoUpload = useCallback(() => {
    if (!videoUploaderRef.current) {
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
        await uploadAndInsertVideo(file);
      } catch (error) {
        console.error("Failed to upload summary video:", error);
      }
    };
  }, [uploadAndInsertVideo]);

  const handlePaste = useCallback(
    async (event) => {
      const items = Array.from(event.clipboardData?.items || []);

      const mediaFiles = items
        .filter((item) => {
          const type = item.type || "";
          return type.startsWith("image/") || type.startsWith("video/");
        })
        .map((item) => item.getAsFile())
        .filter(Boolean);

      if (mediaFiles.length === 0) {
        const html = event.clipboardData?.getData("text/html") || "";

        if (
          html.includes("data:image/") ||
          html.includes("data:video/")
        ) {
          event.preventDefault();
          const cleanedHtml = removeBase64Media(html);

          if (cleanedHtml.trim()) {
            insertHtmlIntoEditor(cleanedHtml);
          }
        }

        return;
      }

      event.preventDefault();

      for (const file of mediaFiles) {
        try {
          if (file.type.startsWith("image/")) {
            await uploadAndInsertImage(file);
          } else if (file.type.startsWith("video/")) {
            await uploadAndInsertVideo(file);
          }
        } catch (error) {
          console.error("Failed to upload pasted summary media:", error);
        }
      }
    },
    [insertHtmlIntoEditor, uploadAndInsertImage, uploadAndInsertVideo],
  );

  const handleEditorChange = useCallback(
    (html) => {
      const cleanedHtml = removeBase64Media(html);
      onChangeRef.current?.(cleanedHtml);
    },
    [],
  );

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }, { font: [] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }],
          [{ list: "ordered" }, { list: "bullet" }, { align: [] }],
          ["blockquote", "code-block"],
          ["link", "image", "video"],
          ["clean"],
        ],
        handlers: {
          ...(hasImageUploader ? { image: handleImageUpload } : {}),
          ...(hasVideoUploader ? { video: handleVideoUpload } : {}),
        },
      },
      clipboard: {
        matchVisual: false,
      },
    }),
    [
      handleImageUpload,
      handleVideoUpload,
      hasImageUploader,
      hasVideoUploader,
    ],
  );

  return (
    <div
      className="lesson-summary-editor"
      style={{ "--editor-min-height": `${minHeight}px` }}
      onPasteCapture={handlePaste}
    >
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ""}
        onChange={handleEditorChange}
        modules={modules}
        formats={RICH_TEXT_FORMATS}
        placeholder={placeholder}
      />
    </div>
  );
}
