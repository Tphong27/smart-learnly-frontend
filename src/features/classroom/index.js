import "./classroom.css";

export { TmoCreateClassPage } from "./pages/TmoCreateClassPage";
export { StaffClassListPage } from "./pages/StaffClassListPage";
export { ClassDetailPage } from "./pages/ClassDetailPage";
export { default as TrainerLessonDetailPage } from "./pages/TrainerLessonDetailPage";
export { ClassCard } from "./components/ClassCard";
export { ClassStatusBadge } from "./components/ClassStatusBadge";
export { ClassListFilters } from "./components/ClassListFilters";
export { ClassOverviewTab } from "./components/ClassOverviewTab";
export { ClassCurriculumTab } from "./components/ClassCurriculumTab";
export { ClassAnalyticsPage } from "./pages/ClassAnalyticsPage";

export const classroomFeature = {
  name: "Class Operations",
  routeBase: "/classrooms",
};