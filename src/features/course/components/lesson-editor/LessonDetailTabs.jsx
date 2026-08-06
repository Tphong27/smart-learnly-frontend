import { useCallback, useMemo, useState } from "react";
import { LessonDetailEditor } from "./LessonDetailEditor";
import { CourseQuestionImportPanel } from "../quiz-import/CourseQuestionImportPanel";
import { QuizImportContext } from "./quiz-import-context";
import "../quiz-question-manager.css";

/**
 * Bọc lesson editor với vùng import question list mở theo yêu cầu.
 *
 * - Mặc định hiển thị lesson editor (step 1-3 như hiện tại, câu hỏi quiz nằm
 *   trong step 2).
 * - Khi user bấm "Import from question list", chuyển sang vùng làm việc riêng
 *   full-width cho việc import (không phải tab cố định). Editor vẫn giữ mount
 *   (ẩn bằng CSS) để state quiz không bị reset và đồng bộ qua context bridge.
 */
export function LessonDetailTabs({ context }) {
  const [showImport, setShowImport] = useState(false);
  const [bridge, setBridge] = useState({
    existingQuestions: [],
    import: null,
  });

  const openQuestionList = useCallback(() => setShowImport(true), []);
  const closeQuestionList = useCallback(() => setShowImport(false), []);

  const contextValue = useMemo(
    () => ({ bridge, setBridge, openQuestionList }),
    [bridge, openQuestionList],
  );

  return (
    <QuizImportContext.Provider value={contextValue}>
      <div className="quiz-lesson-detail-tabs">
        <div
          className="quiz-lesson-detail-tabs__pane"
          style={{ display: showImport ? "none" : undefined }}
        >
          <LessonDetailEditor context={context} />
        </div>

        {showImport && (
          <div className="quiz-lesson-detail-tabs__pane">
            <CourseQuestionImportPanel
              courseId={context?.courseId}
              existingQuestions={bridge.existingQuestions}
              onImport={bridge.import}
              onClose={closeQuestionList}
            />
          </div>
        )}
      </div>
    </QuizImportContext.Provider>
  );
}
