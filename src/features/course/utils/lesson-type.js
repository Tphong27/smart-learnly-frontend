const EDITOR_LESSON_TYPES = new Set([
  "VIDEO",
  "PDF",
  "RICH_TEXT",
  "QUIZ",
  "FLASHCARD",
  "ESSAY",
]);

export function normalizeEditorLessonType(value) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "DOCUMENT") return "PDF";
  if (normalized === "TEXT") return "RICH_TEXT";
  if (normalized === "ASSIGNMENT") return "ESSAY";

  return EDITOR_LESSON_TYPES.has(normalized) ? normalized : "RICH_TEXT";
}
