import { StudentTakeTestPage } from "./StudentTakeTestPage";

export function TraineeFlashTestTakePage() {
  return <StudentTakeTestPage />;
}

export function TraineeAssignmentTakePage() {
  return (
    <StudentTakeTestPage
      listPath="/learning/assignments"
      accessStoragePrefix="assignmentAccess"
      resultKicker="Assignment result"
    />
  );
}
