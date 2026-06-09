import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { AppLayout } from "./layouts/AppLayout";
import { WorkspaceLayout } from "./layouts/WorkspaceLayout";
import { ClassWorkspaceLayout } from "./layouts/ClassWorkspaceLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { RoleGuard } from "./routes/RoleGuard";
import { LoginPage } from "../features/auth/LoginPage";
import { HomePage } from "../features/home/HomePage";
import { CourseCatalogPage } from "../features/course/CourseCatalogPage";
import { CourseDetailPage } from "../features/course/CourseDetailPage";
import { MyAnalyticsPage } from "../features/analytics/MyAnalyticsPage";
import { TestDetailPage } from "../features/assessment/TestDetailPage";
import { TestListPage } from "../features/assessment/TestListPage";
import { TestResultPage } from "../features/assessment/TestResultPage";
import { TakeTestPage } from "../features/assessment/TakeTestPage";
import { MyCoursesPage } from "../features/enrollment/MyCoursesPage";
import { LearningWorkspacePage } from "../features/learning/LearningWorkspacePage";
import { CheckoutPage } from "../features/payment/CheckoutPage";
import { PaymentSimulationPage } from "../features/payment/PaymentSimulationPage";
import { DashboardPage } from "../features/analytics/DashboardPage";
import { ReportsPage } from "../features/analytics/ReportsPage";
import { CourseContentPage } from "../features/course/CourseContentPage";
import { SmeAssignedCoursesPage } from "../features/course/SmeAssignedCoursesPage";
import { SmeCourseEditorPage } from "../features/course/SmeCourseEditorPage";
import { TmoCourseDetailPage } from "../features/course/TmoCourseDetailPage";
import { TmoCourseManagementPage } from "../features/course/TmoCourseManagementPage";
import { TmoCourseReviewPage } from "../features/course/TmoCourseReviewPage";
import { TmoCreateCoursePage } from "../features/course/TmoCreateCoursePage";
import { QuestionBankPage } from "../features/assessment/QuestionBankPage";
import { TrainerClassesPage } from "../features/classroom/TrainerClassesPage";
import { UsersRolesPage } from "../features/admin/UsersRolesPage";
import { SystemSettingsPage } from "../features/admin/SystemSettingsPage";
import { FlashcardsPage } from "../features/flashcard/FlashcardsPage";
import { TraineeMyClassesPage } from "../features/classroom/TraineeMyClassesPage";
import { PaymentHistoryPage } from "../features/payment/PaymentHistoryPage";
import { TmoClassManagementPage } from "../features/classroom/TmoClassManagementPage";
import { TmoPaymentManagementPage } from "../features/payment/TmoPaymentManagementPage";
import { ROLES } from "@/shared/constants/roles";

// Class Flow: TMO
import { TmoCreateClassPage } from "../features/classroom/TmoCreateClassPage";
import { TmoClassDetailPage } from "../features/classroom/TmoClassDetailPage";
// Class Flow: Trainer Workspace
import { TrainerClassOverview } from "../features/classroom/trainer/TrainerClassOverview";
import { TrainerAssignments } from "../features/classroom/trainer/TrainerAssignments";
import { TrainerTests } from "../features/classroom/trainer/TrainerTests";
import { TrainerFlashcards } from "../features/classroom/trainer/TrainerFlashcards";
import { TrainerDiscussions } from "../features/classroom/trainer/TrainerDiscussions";
import { TrainerTrainees } from "../features/classroom/trainer/TrainerTrainees";
import { TrainerAnalytics } from "../features/classroom/trainer/TrainerAnalytics";
// Class Flow: Trainee Workspace
import { TraineeClassOverview } from "../features/classroom/trainee/TraineeClassOverview";
import { TraineeAssignments } from "../features/classroom/trainee/TraineeAssignments";
import { TraineeTests } from "../features/classroom/trainee/TraineeTests";
import { TraineeFlashcards } from "../features/classroom/trainee/TraineeFlashcards";
import { TraineeDiscussions } from "../features/classroom/trainee/TraineeDiscussions";
import { TraineeProgress } from "../features/classroom/trainee/TraineeProgress";

function PlaceholderPage({ title }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">
        This is a placeholder page for <strong>{title}</strong>. Content will be
        added in future sprints.
      </p>
    </section>
  );
}

function RegisterPage() {
  return <PlaceholderPage title="Register" />;
}

function ForbiddenPage() {
  return <PlaceholderPage title="403 - Bạn không có quyền truy cập" />;
}

function NotFoundPage() {
  return <PlaceholderPage title="404 - Trang không tồn tại" />;
}

export function AppShell() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicLayout>
              <HomePage />
            </PublicLayout>
          }
        />

        <Route
          path="/login"
          element={
            <PublicLayout>
              <LoginPage />
            </PublicLayout>
          }
        />

        <Route
          path="/register"
          element={
            <PublicLayout>
              <RegisterPage />
            </PublicLayout>
          }
        />

        <Route
          path="/courses"
          element={
            <PublicLayout>
              <CourseCatalogPage />
            </PublicLayout>
          }
        />

        <Route
          path="/courses/:courseId"
          element={
            <PublicLayout>
              <CourseDetailPage />
            </PublicLayout>
          }
        />

        <Route element={<ProtectedRoute />}>
          {/* ── Workspace Layout (existing) ────────────────── */}
          <Route element={<WorkspaceLayout />}>
            <Route element={<RoleGuard allowedRoles={[ROLES.TRAINEE]} />}>
              <Route path="/learning" element={<LearningWorkspacePage />} />
              <Route
                path="/learning/:courseId"
                element={<LearningWorkspacePage />}
              />
              <Route
                path="/learning/:courseId/lessons/:lessonId"
                element={<LearningWorkspacePage />}
              />
            </Route>

            <Route
              element={<RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.SME]} />}
            >
              <Route
                path="/sme/courses/:courseId/edit"
                element={<SmeCourseEditorPage />}
              />
            </Route>
          </Route>

          {/* ── App Layout (with global sidebar) ───────────── */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route
              path="/profile"
              element={<PlaceholderPage title="Profile" />}
            />

            <Route element={<RoleGuard allowedRoles={[ROLES.TRAINEE]} />}>
              <Route path="/checkout/:courseId" element={<CheckoutPage />} />
              <Route
                path="/payment/simulation/:courseId"
                element={<PaymentSimulationPage />}
              />
              <Route path="/my-courses" element={<MyCoursesPage />} />
              <Route path="/my-classes" element={<TraineeMyClassesPage />} />
              <Route
                path="/my-classes/:classId"
                element={<Navigate to="workspace" replace />}
              />
              <Route path="/payments" element={<PaymentHistoryPage />} />
              <Route path="/flashcards" element={<FlashcardsPage />} />
              <Route path="/tests" element={<TestListPage />} />
              <Route path="/tests/:testId" element={<TestDetailPage />} />
              <Route path="/tests/:testId/take" element={<TakeTestPage />} />
              <Route path="/tests/:testId/attempts/:attemptId" element={<TakeTestPage />} />
              <Route
                path="/tests/:testId/result/:attemptId"
                element={<TestResultPage />}
              />
              <Route path="/tests/:testId/results" element={<TestResultPage />} />
              <Route path="/tests/:testId/results/:attemptId" element={<TestResultPage />} />
              <Route path="/analytics/me" element={<MyAnalyticsPage />} />
            </Route>

            <Route
              element={<RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.SME]} />}
            >
              <Route path="/sme/courses" element={<SmeAssignedCoursesPage />} />
              <Route path="/sme/content" element={<CourseContentPage />} />
              <Route path="/sme/questions" element={<QuestionBankPage />} />
            </Route>

            <Route
              element={<RoleGuard allowedRoles={[ROLES.TMO, ROLES.ADMIN]} />}
            >
              <Route
                path="/tmo/courses"
                element={<TmoCourseManagementPage />}
              />
              <Route
                path="/tmo/courses/create"
                element={<TmoCreateCoursePage />}
              />
              <Route
                path="/tmo/courses/:courseId"
                element={<TmoCourseDetailPage />}
              />
              <Route
                path="/tmo/courses/:courseId/review"
                element={<TmoCourseReviewPage />}
              />
              <Route path="/tmo/classes" element={<TmoClassManagementPage />} />
              <Route path="/tmo/classes/create" element={<TmoCreateClassPage />} />
              <Route
                path="/tmo/payments"
                element={<TmoPaymentManagementPage />}
              />
            </Route>

            <Route element={<RoleGuard allowedRoles={[ROLES.ADMIN]} />}>
              <Route
                path="/admin/courses"
                element={<TmoCourseManagementPage />}
              />
              <Route path="/admin/users" element={<UsersRolesPage />} />
              <Route path="/settings" element={<SystemSettingsPage />} />
            </Route>

            <Route
              element={<RoleGuard allowedRoles={[ROLES.TMO, ROLES.ADMIN]} />}
            >
              <Route path="/reports" element={<ReportsPage />} />
            </Route>

            <Route
              element={
                <RoleGuard
                  allowedRoles={[ROLES.TRAINER, ROLES.TMO, ROLES.ADMIN]}
                />
              }
            >
              <Route path="/trainer/classes" element={<TrainerClassesPage />} />
              {/* Old route → redirect to new workspace (ClassDetailPage kept in codebase) */}
              <Route
                path="/trainer/classes/:classId"
                element={<Navigate to="workspace" replace />}
              />
            </Route>
          </Route>

          {/* ── Class Workspace Layout (full-screen, no global sidebar) ── */}
          <Route element={<ClassWorkspaceLayout />}>
            {/* TMO Class Workspace */}
            <Route element={<RoleGuard allowedRoles={[ROLES.TMO, ROLES.ADMIN]} />}>
              <Route path="/tmo/classes/:classId" element={<TmoClassDetailPage />} />
              <Route path="/tmo/classes/:classId/manage" element={<TmoClassDetailPage />} />
            </Route>

            {/* Trainer Class Workspace */}
            <Route element={<RoleGuard allowedRoles={[ROLES.TRAINER, ROLES.TMO, ROLES.ADMIN]} />}>
              <Route path="/trainer/classes/:classId/workspace" element={<TrainerClassOverview />} />
              <Route path="/trainer/classes/:classId/assignments" element={<TrainerAssignments />} />
              <Route path="/trainer/classes/:classId/tests" element={<TrainerTests />} />
              <Route path="/trainer/classes/:classId/flashcards" element={<TrainerFlashcards />} />
              <Route path="/trainer/classes/:classId/discussions" element={<TrainerDiscussions />} />
              <Route path="/trainer/classes/:classId/trainees" element={<TrainerTrainees />} />
              <Route path="/trainer/classes/:classId/analytics" element={<TrainerAnalytics />} />
            </Route>

            {/* Trainee Class Workspace */}
            <Route element={<RoleGuard allowedRoles={[ROLES.TRAINEE]} />}>
              <Route path="/my-classes/:classId/workspace" element={<TraineeClassOverview />} />
              <Route path="/my-classes/:classId/assignments" element={<TraineeAssignments />} />
              <Route path="/my-classes/:classId/tests" element={<TraineeTests />} />
              <Route path="/my-classes/:classId/tests/:testId/take" element={<TakeTestPage />} />
              <Route path="/my-classes/:classId/tests/:testId/attempts/:attemptId" element={<TakeTestPage />} />
              <Route path="/my-classes/:classId/tests/:testId/results" element={<TestResultPage />} />
              <Route path="/my-classes/:classId/tests/:testId/results/:attemptId" element={<TestResultPage />} />
              <Route path="/my-classes/:classId/flashcards" element={<TraineeFlashcards />} />
              <Route path="/my-classes/:classId/discussions" element={<TraineeDiscussions />} />
              <Route path="/my-classes/:classId/progress" element={<TraineeProgress />} />
            </Route>
          </Route>
        </Route>

        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
