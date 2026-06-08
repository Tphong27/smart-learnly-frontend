export const traineeRoutes = [
  { path: '/checkout/:courseId', label: 'Checkout Mock' },
  { path: '/payment/simulation/:courseId', label: 'Payment Simulation' },
  { path: '/my-courses', label: 'My Courses' },
  { path: '/learning', label: 'Learning Workspace' },
  { path: '/learning/:courseId', label: 'Course Learning Workspace' },
  { path: '/learning/:courseId/lessons/:lessonId', label: 'Lesson Detail' },
  { path: '/flashcards', label: 'Flashcards' },
  { path: '/tests', label: 'Tests & Practice' },
  { path: '/tests/:testId', label: 'Test Detail' },
  { path: '/tests/:testId/take', label: 'Take Test' },
  { path: '/tests/:testId/result/:attemptId', label: 'Test Result' },
  { path: '/analytics/me', label: 'My Analytics' },
]
