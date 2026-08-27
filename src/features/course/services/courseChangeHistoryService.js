import apiClient from "@/services/api-client";
import { unwrapApiData as unwrap } from "@/services/api-response";

/** Domain ưu tiên cho timeline thay đổi course (CONTENT/COURSE/CLASS). */
export const COURSE_CHANGE_DOMAINS = ["CONTENT", "COURSE", "CLASS"];

/** Kết quả audit hiển thị trên filter. */
export const COURSE_CHANGE_RESULTS = ["SUCCESS", "FAILURE", "DENIED"];

/**
 * Allowlist action gắn course content — bỏ AUTH/PAYMENT/SETTINGS.
 * Label tiếng Việt map ở page (formatCourseChangeAction).
 */
export const COURSE_CHANGE_ACTIONS = [
  "COURSE_CREATED",
  "COURSE_UPDATED",
  "COURSE_PUBLISHED",
  "COURSE_DEACTIVATED",
  "COURSE_DELETED",
  "SECTION_CREATED",
  "SECTION_UPDATED",
  "SECTION_DELETED",
  "SECTIONS_REORDERED",
  "LESSON_CREATED",
  "LESSON_UPDATED",
  "LESSON_DEACTIVATED",
  "LESSON_DELETED",
  "LESSONS_REORDERED",
  "CLASS_CURRICULUM_DRAFT_INITIALIZED",
  "CLASS_CURRICULUM_PUBLISHED",
  "QUESTION_BANK_CREATED",
  "QUESTION_BANK_UPDATED",
  "QUESTION_BANK_ARCHIVED",
  "QUESTION_BANK_RESTORED",
  "FLASHCARD_SET_CREATED",
  "FLASHCARD_SET_UPDATED",
  "FLASHCARD_SET_DELETED",
  "FLASHCARD_CARD_CREATED",
  "FLASHCARD_CARD_UPDATED",
  "FLASHCARD_CARD_DELETED",
  "FLASHCARD_CARDS_REORDERED",
  "ASSIGNMENT_CREATED",
  "ASSIGNMENT_UPDATED",
  "ASSIGNMENT_DELETED",
];

/** Vai trò actor hay xuất hiện trên timeline course. */
export const COURSE_CHANGE_ACTOR_ROLES = ["SME", "TRAINER", "TMO"];

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== "" && value !== null && value !== undefined,
    ),
  );
}

/**
 * API lịch sử thay đổi theo course.
 * Không gọi /admin/audit-logs (global vẫn denyAll).
 */
export const courseChangeHistoryService = {
  async list(courseId, params = {}) {
    const response = await apiClient.get(
      `/admin/courses/${courseId}/change-history`,
      { params: cleanParams(params) },
    );

    return (
      unwrap(response) || {
        items: [],
        page: 0,
        size: params.size ?? 20,
        totalItems: 0,
        totalPages: 0,
      }
    );
  },

  async get(courseId, auditLogId) {
    const response = await apiClient.get(
      `/admin/courses/${courseId}/change-history/${auditLogId}`,
    );
    return unwrap(response);
  },
};
