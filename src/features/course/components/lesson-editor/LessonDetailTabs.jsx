import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { Modal } from "@/shared/components/ui";
import { LessonDetailEditor } from "./LessonDetailEditor";
import { CourseQuestionImportPanel } from "../quiz-import/CourseQuestionImportPanel";
import { QuizImportContext } from "./quiz-import-context";
import "../quiz-question-manager.css";

/**
 * Bọc lesson editor và mở danh sách câu hỏi trong modal để người dùng import
 * mà không rời khỏi lesson; link tiêu đề mở Question List trong tab mới.
 */
export function LessonDetailTabs({ context }) {
  const [showImport, setShowImport] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [bridge, setBridge] = useState({
    existingQuestions: [],
    import: null,
    moduleId: null,
  });

  /** Mở modal import nhưng giữ lesson editor được mount để bảo toàn quiz state. */
  const openQuestionList = useCallback(() => setShowImport(true), []);
  /** Đóng modal sau khi hủy hoặc import thành công. */
  const closeQuestionList = useCallback(() => setShowImport(false), []);
  const courseBasePath = context?.courseBasePath || "/admin/courses";
  const questionListPath = bridge.moduleId
    ? `${courseBasePath}/${context?.courseId}/modules/${bridge.moduleId}/questions`
    : `${courseBasePath}/${context?.courseId}/content`;

  const contextValue = useMemo(
    () => ({ bridge, setBridge, openQuestionList }),
    [bridge, openQuestionList],
  );

  return (
    <QuizImportContext.Provider value={contextValue}>
      <div className="quiz-lesson-detail-tabs">
        <div className="quiz-lesson-detail-tabs__pane">
          <LessonDetailEditor context={context} />
        </div>

        <Modal
          open={showImport}
          title={
            <Link
              className="quiz-question-bank-import__title-link"
              to={questionListPath}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Question List in a new tab"
              title="Open Question List in a new tab"
            >
              <span>Import from question list</span>
              <ExternalLink size={16} aria-hidden="true" />
            </Link>
          }
          description="Select existing course questions to add to this quiz."
          size="xl"
          className="quiz-question-bank-import-modal"
          closeDisabled={importBusy}
          closeOnOverlayClick={!importBusy}
          closeLabel="Close question import"
          onClose={closeQuestionList}
        >
          {showImport && (
            <CourseQuestionImportPanel
              courseId={context?.courseId}
              moduleId={bridge.moduleId}
              existingQuestions={bridge.existingQuestions}
              onImport={bridge.import}
              onClose={closeQuestionList}
              onImportingChange={setImportBusy}
            />
          )}
        </Modal>
      </div>
    </QuizImportContext.Provider>
  );
}
