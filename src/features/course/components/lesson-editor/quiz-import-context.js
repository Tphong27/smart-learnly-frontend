import { createContext } from "react";

/**
 * Nối import giữa tab "Lesson" (quiz panel) và tab "Question list".
 *
 * - bridge: được QuizQuestionsPanel đăng ký mỗi khi danh sách câu hỏi quiz
 *   thay đổi, gồm existingQuestions (để check trùng) và import (hàm persist).
 * - setBridge: QuizQuestionsPanel gọi để cập nhật bridge.
 * - openQuestionList: mở modal import từ Question List.
 */
export const QuizImportContext = createContext({
  bridge: { existingQuestions: [], import: null },
  setBridge: () => {},
  openQuestionList: () => {},
});
