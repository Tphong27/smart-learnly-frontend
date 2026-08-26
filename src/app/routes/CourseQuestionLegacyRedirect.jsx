import { Navigate, useParams } from "react-router-dom";

/** Chuyển deep-link Question theo module cũ về route Question Bank course-wide tương ứng. */
export function CourseQuestionLegacyRedirect({ basePath, destination }) {
  const { courseId, batchId } = useParams();
  const questionsPath = `${basePath}/courses/${courseId}/questions`;
  const target =
    destination === "ai-create"
      ? `${questionsPath}/ai-drafts/new`
      : destination === "ai-review"
        ? `${questionsPath}/ai-drafts/${batchId}`
        : questionsPath;

  return <Navigate to={target} replace />;
}
