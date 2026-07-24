import { Navigate, useParams } from "react-router-dom";

export function ClassAnalyticsRedirect({ routeBase = "/staff/classrooms" }) {
  const { classId } = useParams();

  if (!classId) {
    return <Navigate to={routeBase} replace />;
  }

  return (
    <Navigate to={`${routeBase}/${classId}/workspace?tab=analytics`} replace />
  );
}
