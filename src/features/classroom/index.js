import "./classroom.css";

export { TmoCreateClassPage } from "./pages/TmoCreateClassPage";
export { StaffClassListPage } from "./pages/StaffClassListPage";
export { ClassDetailPage } from "./pages/ClassDetailPage";
export { ClassCard } from "./components/ClassCard";
export { ClassStatusBadge } from "./components/ClassStatusBadge";
export { ClassListFilters } from "./components/ClassListFilters";
export { ClassOverviewTab } from "./components/ClassOverviewTab";
export { ScheduleCalendar } from "@/shared/components/scheduleCalendar";

export const classroomFeature = {
  name: "Class Operations",
  routeBase: "/classrooms",
};