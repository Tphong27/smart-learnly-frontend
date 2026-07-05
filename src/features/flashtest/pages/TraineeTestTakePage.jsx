import { StudentTakeTestPage } from "./StudentTakeTestPage";

export function TraineeTestTakePage() {
  return (
    <StudentTakeTestPage
      accessStoragePrefix="testAccess"
      listPath="/learning/tests"
      resultKicker="Test result"
    />
  );
}
