export const routeGroups = [
  {
    title: 'Public',
    routes: [
      { path: '/', label: 'Home' },
      { path: '/courses', label: 'Course Catalog' },
      { path: '/login', label: 'Login' },
    ],
  },
  {
    title: 'Trainee',
    routes: [
      { path: '/learning', label: 'Learning Workspace' },
      { path: '/my-courses', label: 'My Courses' },
      { path: '/flashcards', label: 'Flashcards' },
      { path: '/tests', label: 'Tests & Practice' },
      { path: '/analytics/me', label: 'My Analytics' },
    ],
  },
  {
    title: 'Staff',
    routes: [
      { path: '/dashboard', label: 'Dashboard' },
      { path: '/tmo/courses', label: 'TMO Course Management' },
      { path: '/tmo/courses/create', label: 'Create Course' },
      { path: '/sme/courses', label: 'Assigned Courses' },
      { path: '/sme/courses/:courseId/edit', label: 'Course Content Editor' },
      { path: '/sme/content', label: 'Content Workspace' },
      { path: '/sme/questions', label: 'Question Bank' },
      { path: '/trainer/classes', label: 'Class Operations' },
      { path: '/reports', label: 'Reports' },
    ],
  },
  {
    title: 'Admin',
    routes: [
      { path: '/admin/users', label: 'Users & Roles' },
      { path: '/tmo/courses', label: 'Course Management' },
      { path: '/settings', label: 'System Settings' },
    ],
  },
]
