import { StudentTakeTestPage } from "./StudentTakeTestPage";

/** Mở quiz từ course và đưa kết quả về đúng namespace course quiz. */
export function TraineeTestTakePage() {
  return (
    <StudentTakeTestPage
      accessStoragePrefix="courseQuizAccess"
      listPath="/dashboard"
      resultKicker="Quiz result"
      resultDetailPath="/learning/course-quizzes/attempts"
    />
  );
}
