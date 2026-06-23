import DOMPurify from "dompurify";

export function sanitizeLessonHtml(html) {
  if (!html || typeof html !== "string") {
    return "";
  }

  return DOMPurify.sanitize(html, {
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
    ],
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|data:image\/(?:png|jpeg|jpg|gif|webp));|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}

export function isEmptyLessonHtml(html) {
  const cleanHtml = sanitizeLessonHtml(html);

  if (!cleanHtml) {
    return true;
  }

  const textOnly = cleanHtml
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

  return textOnly.length === 0;
}