import "./classroom.css";

export { TmoCreateClassPage } from "./pages/TmoCreateClassPage";
export { StaffClassListPage } from "./pages/StaffClassListPage";
export { TrainerClassWorkspacePage } from "./pages/TrainerClassWorkspacePage";
export { ClassCard } from "./components/ClassCard";
export { ClassStatusBadge } from "./components/ClassStatusBadge";
export { ClassListFilters } from "./components/ClassListFilters";
export { ClassOverviewTab } from "./components/ClassOverviewTab";
export { ScheduleCalendar } from "./components/ScheduleCalendar";

export const classroomFeature = {
  name: "Class Operations",
  routeBase: "/classrooms",
};