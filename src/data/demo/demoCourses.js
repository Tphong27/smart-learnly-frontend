export const demoCourses = [
  {
    id: 'course-aws',
    title: 'AWS Cloud Practitioner Foundation',
    category: 'Cloud Computing',
    status: 'published',
    modules: 4,
    lessons: 18,
    progress: 68,
    owner: 'Lan Pham',
    updatedAt: '2026-06-06',
  },
  {
    id: 'course-data',
    title: 'Data Modeling for Business Systems',
    category: 'Information Systems',
    status: 'draft',
    modules: 3,
    lessons: 10,
    progress: 35,
    owner: 'Lan Pham',
    updatedAt: '2026-06-04',
  },
]

export const demoModules = [
  {
    id: 'module-1',
    title: 'Module 1: Cloud Concepts',
    status: 'published',
    lessons: [
      {
        id: 'lesson-1',
        title: 'What is Cloud Computing?',
        type: 'Video',
        status: 'published',
      },
      {
        id: 'lesson-2',
        title: 'Cloud Deployment Models',
        type: 'PDF',
        status: 'published',
      },
    ],
  },
  {
    id: 'module-2',
    title: 'Module 2: Security & Compliance',
    status: 'draft',
    lessons: [
      {
        id: 'lesson-3',
        title: 'Shared Responsibility Model',
        type: 'Rich Text',
        status: 'draft',
      },
      {
        id: 'lesson-4',
        title: 'IAM Overview',
        type: 'Video',
        status: 'review',
      },
    ],
  },
]