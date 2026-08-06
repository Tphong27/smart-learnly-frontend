import { useCallback, useMemo, useState } from "react";
import { LessonDetailEditor } from "./LessonDetailEditor";
import { CourseQuestionImportPanel } from "../quiz-import/CourseQuestionImportPanel";
import { QuizImportContext } from "./quiz-import-context";
import "../quiz-question-manager.css";

/**
 * Bọc lesson editor thành màn hình 2 tab: "Lesson" và "Question list".
 *
 * - Tab Lesson: giữ nguyên LessonDetailEditor, luôn mount (ẩn bằng CSS khi
 *   không active) để state quiz không bị reset khi chuyển tab.
 * - Tab Question list: hiển thị CourseQuestionImportPanel để xem + chọn câu
 *   hỏi course và import vào quiz thông qua QuizImportContext bridge.
 */
export function LessonDetailTabs({ context }) {
  const [activeTab, setActiveTab] = useState("lesson");
  const [bridge, setBridge] = useState({
    existingQuestions: [],
    import: null,
  });

  const openQuestionList = useCallback(() => setActiveTab("question-list"), []);

  const contextValue = useMemo(
    () => ({ bridge, setBridge, openQuestionList }),
    [bridge, openQuestionList],
  );

  return (
    <QuizImportContext.Provider value={contextValue}>
      <div className="quiz-lesson-detail-tabs">
        <div className="quiz-question-panel__tabs">
          <button
            type="button"
            className={`quiz-question-panel__tab${activeTab === "lesson" ? " is-active" : ""}`}
            aria-pressed={activeTab === "lesson"}
            onClick={() => setActiveTab("lesson")}
          >
            Lesson
          </button>
          <button
            type="button"
            className={`quiz-question-panel__tab${activeTab === "question-list" ? " is-active" : ""}`}
            aria-pressed={activeTab === "question-list"}
            onClick={() => setActiveTab("question-list")}
          >
            Question list
          </button>
        </div>

        <div
          className="quiz-lesson-detail-tabs__pane"
          style={{ display: activeTab === "lesson" ? undefined : "none" }}
        >
          <LessonDetailEditor context={context} />
        </div>

        {activeTab === "question-list" && (
          <div className="quiz-lesson-detail-tabs__pane">
            <CourseQuestionImportPanel
              courseId={context?.courseId}
              existingQuestions={bridge.existingQuestions}
              onImport={bridge.import}
              onClose={() => setActiveTab("lesson")}
            />
          </div>
        )}
      </div>
    </QuizImportContext.Provider>
  );
}
