export { CourseListPage } from './pages/CourseListPage'
export { CourseDetailPage } from './pages/CourseDetailPage'
export { CoursePreviewLessonsPage } from './pages/CoursePreviewLessonsPage'
export { MyCoursesPage } from './pages/MyCoursesPage'
export { CourseCard } from './components/CourseCard'
export { EnrolledCourseCard } from "./components/EnrolledCourseCard";
export { categoryService } from "./services/categoryService";
export { courseAdminService } from "./services/courseAdminService";
export { courseCatalogService } from "./services/courseCatalogService";
export { courseContentService } from "./services/courseContentService";
export { trainerProfileService } from "./services/trainerProfileService";
export { videoAiService } from "./services/videoAiService";

export const courseFeature = {
  name: 'Courses',
  routeBase: '/courses',
}
