export const LESSON_STATUS = {
  PUBLISHED: "published",
  DRAFT: "draft",
  INACTIVE: "inactive",
};

export const LESSON_STATUS_OPTIONS = [
  {
    value: LESSON_STATUS.PUBLISHED,
    label: "Published",
    description: "Visible to enrolled learners and preview users when allowed.",
  },
  {
    value: LESSON_STATUS.DRAFT,
    label: "Draft",
    description: "Editable by staff, hidden from learners.",
  },
  {
    value: LESSON_STATUS.INACTIVE,
    label: "Inactive",
    description: "Temporarily disabled and hidden from learners.",
  },
];

export function normalizeLessonStatus(value, fallback = LESSON_STATUS.DRAFT) {
  const normalized = String(value || "").trim().toLowerCase();
  return Object.values(LESSON_STATUS).includes(normalized)
    ? normalized
    : fallback;
}

export function getLessonStatusMeta(value) {
  const normalized = normalizeLessonStatus(value);
  return (
    LESSON_STATUS_OPTIONS.find((option) => option.value === normalized) ||
    LESSON_STATUS_OPTIONS.find((option) => option.value === LESSON_STATUS.DRAFT)
  );
}

export function isLessonPublished(lesson, { allowMissingStatus = true } = {}) {
  if (!lesson || lesson.status == null || lesson.status === "") {
    return allowMissingStatus;
  }

  return normalizeLessonStatus(lesson.status) === LESSON_STATUS.PUBLISHED;
}

export function filterPublishedSections(sections = []) {
  return (sections || [])
    .map((section) => ({
      ...section,
      lessons: (section.lessons || []).filter((lesson) =>
        isLessonPublished(lesson, { allowMissingStatus: false }),
      ),
    }))
    .filter((section) => (section.lessons || []).length > 0);
}
