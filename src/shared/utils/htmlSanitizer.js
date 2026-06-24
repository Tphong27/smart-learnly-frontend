import DOMPurify from "dompurify";

const SAFE_URI_REGEXP =
  /^(?:(?:https?|mailto|tel):|data:image\/(?:png|jpeg|jpg|gif|webp);base64,|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

export function sanitizeLessonHtml(html) {
  if (!html || typeof html !== "string") {
    return "";
  }

  const cleanHtml = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "h1",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "video",
      "source",
      "blockquote",
      "pre",
      "code",
      "span",
      "div",
    ],
    ALLOWED_ATTR: [
      "href",
      "target",
      "rel",
      "src",
      "alt",
      "title",
      "style",
      "class",
      "controls",
      "preload",
      "poster",
      "width",
      "height",
      "type",
      "data-summary-video",
    ],
    ALLOWED_URI_REGEXP: SAFE_URI_REGEXP,
  });

  return cleanHtml.replace(
    /<a\s+([^>]*href=["'][^"']+["'][^>]*)>/gi,
    (match, attrs) => {
      const hasTarget = /\starget=/i.test(attrs);
      const hasRel = /\srel=/i.test(attrs);

      return `<a ${attrs}${hasTarget ? "" : ' target="_blank"'}${
        hasRel ? "" : ' rel="noopener noreferrer"'
      }>`;
    },
  );
}

export function isEmptyLessonHtml(html) {
  const cleanHtml = sanitizeLessonHtml(html);

  if (!cleanHtml) {
    return true;
  }

  const textOnly = cleanHtml
    .replace(/<img[^>]*>/gi, " image ")
    .replace(/<video[^>]*>.*?<\/video>/gis, " video ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

  return textOnly.length === 0;
}