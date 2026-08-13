# Bản đồ mã nguồn Frontend

Tài liệu này trả lời câu hỏi: **muốn sửa một nghiệp vụ thì mở file nào trước?**

## Cách đọc nhanh

- `services/`: gọi API backend
- `pages/`: trang chính của feature
- `components/`: UI components dùng trong feature
- `hooks/`: custom React hooks
- `utils/`: hàm tiện ích

## Cấu trúc thư mục

```
src/
├── app/                    # App shell, routes, providers
├── features/               # Feature modules
│   ├── auth/              # Đăng nhập, đăng ký, profile
│   ├── checkout/          # Thanh toán
│   ├── course/            # Khóa học, catalog
│   ├── classroom/         # Lớp học
│   ├── enrollment/        # Ghi danh
│   ├── learning/          # Học tập
│   ├── flashcard/         # Flashcard authoring
│   ├── test/              # Bài kiểm tra
│   ├── assignment/        # Bài tập
│   ├── notification/      # Thông báo
│   ├── admin/             # Trang admin
│   ├── dashboard/         # Dashboard trainee
│   ├── progress/          # Tiến độ học tập
│   └── opening-schedule/  # Lịch khai giảng
└── shared/                # Code dùng chung
    ├── components/        # UI components
    ├── hooks/            # Shared hooks
    ├── utils/            # Formatters, helpers
    └── constants/        # Constants
```

## Bản đồ nghiệp vụ

### Xác thực và người dùng

| Muốn sửa nghiệp vụ | File nên mở đầu tiên | File liên quan |
| --- | --- | --- |
| Đăng nhập/đăng ký | `features/auth/pages/LoginPage.jsx` | `features/auth/services/authService.js` |
| Quên/đặt lại mật khẩu | `features/auth/pages/ForgotPasswordPage.jsx` | `authService.js` |
| Xác thực email OTP | `features/auth/pages/VerifyEmailPage.jsx` | `authService.js` |
| Trang profile | `features/auth/pages/ProfilePage.jsx` | `authService.js` |
| Cấu hình hệ thống | `features/admin/settings/` | `admin/settings/services/systemSettingsService.js` |

### Khóa học và Catalog

| Muốn sửa nghiệp vụ | File nên mở đầu tiên | File liên quan |
| --- | --- | --- |
| Danh sách khóa học | `features/course/pages/CourseListPage.jsx` | `course/services/courseCatalogService.js` |
| Chi tiết khóa học | `features/course/pages/CourseDetailPage.jsx` | `course/services/courseContentService.js` |
| Quản trị khóa học | `features/course/pages/AdminCourseFormPage.jsx` | `course/services/courseAdminService.js` |
| Nội dung khóa học | `features/course/components/lesson-editor/LessonDetailEditor.jsx` | `course/services/courseContentService.js` |
| Quiz/ câu hỏi | `features/course/components/QuizQuestionManager.jsx` | `features/admin/question-bank/services/questionBankService.js` |
| Flashcard | `features/course/components/flashcards/FlashcardLessonEditor.jsx` | `flashcard/services/flashcardAuthoringService.js` |

### Lớp học

| Muốn sửa nghiệp vụ | File nên mở đầu tiên | File liên quan |
| --- | --- | --- |
| Danh sách lớp (admin) | `features/classroom/pages/StaffClassListPage.jsx` | `classroom/services/classroomService.js` |
| Chi tiết lớp | `features/classroom/pages/ClassDetailPage.jsx` | `classroomService.js` |
| Trang trainer | `features/classroom/pages/TrainerLessonDetailPage.jsx` | `classroom/services/trainerLessonService.js` |
| Analytics | `features/classroom/components/ClassAnalyticsTab.jsx` | `classroom/services/classAnalyticsService.js` |
| Chọn lớp khi checkout | `features/course/components/ClassSelectionPopup.jsx` | `features/checkout/services/checkoutService.js` |

### Ghi danh và học tập

| Muốn sửa nghiệp vụ | File nên mở đầu tiên | File liên quan |
| --- | --- | --- |
| Ghi danh | `features/enrollment/components/FreeEnrollButton.jsx` | `enrollment/services/enrollmentService.js` |
| Trang học tập | `features/learning/pages/LearningWorkspacePage.jsx` | `learning/services/learningService.js` |
| Dashboard học viên | `features/dashboard/pages/TraineeDashboardPage.jsx` | `features/progress/services/traineeProgressService.js` |
| Tiến độ học tập | `features/progress/services/traineeProgressService.js` | - |

### Bài kiểm tra và Flashcard

| Muốn sửa nghiệp vụ | File nên mở đầu tiên | File liên quan |
| --- | --- | --- |
| Làm bài kiểm tra | `features/test/pages/StudentTakeTestPage.jsx` | `test/services/testService.js`, `attemptService.js` |
| Giám sát bài kiểm tra | `features/test/pages/TeacherMonitorPage.jsx` | `test/services/attemptService.js` |
| Tạo/sửa flashcard | `features/flashcard/pages/FlashcardAuthoringPage.jsx` | `flashcard/services/flashcardAuthoringService.js` |
| Học flashcard | `features/personal-flashcards/pages/PersonalFlashcardStudyPage.jsx` | `flashcard/services/flashcardLearningService.js` |

### Thanh toán

| Muốn sửa nghiệp vụ | File nên mở đầu tiên | File liên quan |
| --- | --- | --- |
| Checkout | `features/checkout/hooks/useCheckoutPayment.js` | `checkout/services/checkoutService.js` |
| Kết quả thanh toán | `features/checkout/pages/PaymentResultPage.jsx` | `checkoutService.js` |
| Đơn hàng của tôi | `features/checkout/pages/MyTransactionsPage.jsx` | `checkoutService.js` |
| Quản trị đơn hàng | `features/checkout/pages/AdminOrdersPage.jsx` | `checkoutService.js` |

### Thông báo

| Muốn sửa nghiệp vụ | File nên mở đầu tiên | File liên quan |
| --- | --- | --- |
| Trung tâm thông báo | `features/notification/pages/NotificationCenterPage.jsx` | `notification/services/notificationService.js` |
| Chi tiết thông báo | `features/notification/pages/NotificationDetailPage.jsx` | `notificationService.js` |

### Admin

| Muốn sửa nghiệp vụ | File nên mở đầu tiên | File liên quan |
| --- | --- | --- |
| Dashboard admin | `features/admin/dashboard/pages/AdminDashboardPage.jsx` | `src/services/admin-dashboard.service.js` |
| Audit log | `features/admin/audit/pages/AdminAuditLogPage.jsx` | `src/services/audit-log.service.js` |
| Quản trị người dùng | `features/admin/users/pages/AdminUsersPage.jsx` | `admin/users/services/adminUserService.js` |
| Question bank | `features/admin/question-bank/pages/AdminQuestionBankDetailPage.jsx` | `admin/question-bank/services/questionBankService.js` |
| Cấu hình | `features/admin/settings/components/` | `admin/settings/services/systemSettingsService.js` |

## API Services

| Service | Đường dẫn | Mục đích |
| --- | --- | --- |
| apiClient | `src/services/api-client.js` | Axios instance dùng chung |
| authService | `features/auth/services/authService.js` | Auth endpoints |
| checkoutService | `features/checkout/services/checkoutService.js` | Checkout, orders |
| courseCatalogService | `features/course/services/courseCatalogService.js` | Course listing |
| courseAdminService | `features/course/services/courseAdminService.js` | Course CRUD |
| courseContentService | `features/course/services/courseContentService.js` | Course content |
| classroomService | `features/classroom/services/classroomService.js` | Class management |
| enrollmentService | `features/enrollment/services/enrollmentService.js` | Enrollment |
| learningService | `features/learning/services/learningService.js` | Learning progress |
| notificationService | `features/notification/services/notificationService.js` | Notifications |
| adminDashboardService | `src/services/admin-dashboard.service.js` | Admin dashboard |
| auditLogService | `src/services/audit-log.service.js` | Audit logs |
| questionBankService | `features/admin/question-bank/services/questionBankService.js` | Question bank |
| testService | `features/test/services/testService.js` | Test definitions |
| attemptService | `features/test/services/attemptService.js` | Test attempts |
| flashcardLearningService | `features/flashcard/services/flashcardLearningService.js` | Flashcard learning |

## Cập nhật

- Batch 7: Tạo document này
