import { StudentTakeTestPage } from "./StudentTakeTestPage";

/** Mở luồng nộp Assignment mà không yêu cầu mã truy cập Test. */
export function TraineeAssignmentTakePage() {
  return (
    <StudentTakeTestPage
      listPath="/learning/assignments"
      accessStoragePrefix="assignmentAccess"
      resultKicker="Assignment result"
    />
  );
}
