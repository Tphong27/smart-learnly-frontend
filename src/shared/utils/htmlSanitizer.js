import DOMPurify from "dompurify";

const SAFE_URI_REGEXP = /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

function removeDarkPasteBackground(html) {
  if (!html || typeof html !== "string") {
    return "";
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const wrapper = doc.body.firstElementChild;

  if (!wrapper) {
    return html;
  }

  wrapper.querySelectorAll("pre.ql-syntax").forEach((element) => {
    element.classList.remove("ql-syntax");

    if (!element.getAttribute("class")) {
      element.removeAttribute("class");
    }
  });

  wrapper.querySelectorAll("[style]").forEach((element) => {
    const currentStyle = element.getAttribute("style") || "";

    const cleanedStyle = currentStyle
      .split(";")
      .map((rule) => rule.trim())
      .filter(Boolean)
      .filter((rule) => !/^background(?:-color)?\s*:/i.test(rule))
      .join("; ");

    if (cleanedStyle) {
      element.setAttribute("style", cleanedStyle);
    } else {
      element.removeAttribute("style");
    }
  });

  return wrapper.innerHTML;
}

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

  const normalizedHtml = removeDarkPasteBackground(cleanHtml);

  return normalizedHtml.replace(
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
