import { StudentTakeTestPage } from "./StudentTakeTestPage";

/** Mở luồng làm Test và lưu mã truy cập theo namespace Test. */
export function TraineeTestTakePage() {
  return (
    <StudentTakeTestPage
      accessStoragePrefix="testAccess"
      listPath="/dashboard"
      resultKicker="Test result"
    />
  );
}
