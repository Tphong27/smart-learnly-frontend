export const routeGroups = [
  {
    title: "Public",
    routes: [
      { path: "/", label: "Home" },
      { path: "/courses", label: "Course Catalog" },
      { path: "/classes", label: "Class Catalog" },
    ],
  },
  {
    title: "Trainee",
    routes: [
      { path: "/learning", label: "Learning Workspace" },
      { path: "/tests", label: "Tests & Practice" },
      { path: "/flashcards", label: "Flashcards" },
      { path: "/analytics/me", label: "My Analytics" },
    ],
  },
  {
    title: "Staff",
    routes: [
      { path: "/staff/courses", label: "Content Workspace" },
      { path: "/staff/classes", label: "Class Operations" },
      { path: "/staff/assignments", label: "Assignment Review" },
      { path: "/staff/questions", label: "Question Bank" },
    ],
  },
  {
    title: "Admin",
    routes: [
      { path: "/admin/users", label: "Users & Roles" },
      { path: "/admin/configuration", label: "System Configuration" },
      { path: "/admin/audit", label: "Audit Logs" },
    ],
  },
];
