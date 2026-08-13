import "./classroom.css";

export { StaffClassListPage } from "./pages/StaffClassListPage";
export { ClassDetailPage } from "./pages/ClassDetailPage";
export { default as TrainerLessonDetailPage } from "./pages/TrainerLessonDetailPage";
export { ClassList } from "./components/ClassList";
export { ClassStatusBadge } from "./components/ClassStatusBadge";
export { ClassListFilters } from "./components/ClassListFilters";
export { ClassOverviewTab } from "./components/ClassOverviewTab";
export { ClassAnalyticsTab } from "./components/ClassAnalyticsTab";
export { EditionClassPage } from "./pages/EditionClassPage";
export { ClassAnalyticsRedirect } from "./pages/ClassAnalyticsRedirect";
export { classAnalyticsService } from "./services/classAnalyticsService";
export { classroomService } from "./services/classroomService";
export { trainerCurriculumService } from "./services/trainerCurriculumService";
export { createTrainerLessonService } from "./services/trainerLessonService";
export { createTrainerQuizService } from "./services/trainerQuizService";
export { createTrainerFlashcardService } from "./services/trainerFlashcardService";

export const classroomFeature = {
  name: "Class Operations",
  routeBase: "/classrooms",
};
