import "./classroom.css";

export { StaffClassListPage } from "./pages/StaffClassListPage";
export { ClassDetailPage } from "./pages/ClassDetailPage";
export { default as TrainerLessonDetailPage } from "./pages/TrainerLessonDetailPage";
export { ClassList } from "./components/ClassList";
export { ClassStatusBadge } from "./components/ClassStatusBadge";
export { ClassListFilters } from "./components/ClassListFilters";
export { ClassOverviewTab } from "./components/ClassOverviewTab";
export { ClassCurriculumTab } from "./components/ClassCurriculumTab";
export { ClassAnalyticsTab } from "./components/ClassAnalyticsTab";
export { EditionClassPage } from "./pages/EditionClassPage";

export const classroomFeature = {
  name: "Class Operations",
  routeBase: "/classrooms",
};