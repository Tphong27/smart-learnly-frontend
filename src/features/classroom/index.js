import "./classroom.css";

export { TmoCreateClassPage } from "./pages/TmoCreateClassPage";
export { StaffClassListPage } from "./pages/StaffClassListPage";
export { TrainerClassWorkspacePage } from "./pages/TrainerClassWorkspacePage";

export { ClassCard } from "./components/ClassCard";
export { ClassStatusBadge } from "./components/ClassStatusBadge";
export { ClassListFilters } from "./components/ClassListFilters";

export const classroomFeature = {
  name: "Class Operations",
  routeBase: "/classrooms",
};