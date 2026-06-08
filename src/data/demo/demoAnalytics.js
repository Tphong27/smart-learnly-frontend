export const demoOperationalMetrics = {
  activeClasses: 8,
  activeTrainees: 246,
  averageCompletion: 64,
  revenueThisMonth: '86.4M VND',
  atRiskTrainees: 17,
  pendingPayments: 12,
}

export const demoTraineeMetrics = {
  traineeId: 'trainee-minh',
  enrolledCourses: 2,
  completedCourses: 0,
  averageScore: 75,
  learningProgress: 68,
  studyStreakDays: 7,
  nextLessonId: 'lesson-aws-5',
  latestAttemptId: 'attempt-aws-foundation-minh-01',
}

export const demoWeakTopics = [
  {
    id: 'weak-pricing',
    courseId: 'course-aws',
    topic: 'Cloud Pricing Models',
    affectedTrainees: 18,
    averageScore: 52,
    severity: 'medium',
  },
  {
    id: 'weak-security',
    courseId: 'course-aws',
    topic: 'Security & Compliance',
    affectedTrainees: 14,
    averageScore: 58,
    severity: 'medium',
  },
  {
    id: 'weak-shared-responsibility',
    courseId: 'course-aws',
    topic: 'Shared Responsibility Model',
    affectedTrainees: 11,
    averageScore: 61,
    severity: 'high',
  },
]

export const demoTraineeWeaknessAnalysis = [
  {
    id: 'analysis-minh-shared-responsibility',
    traineeId: 'trainee-minh',
    courseId: 'course-aws',
    testId: 'test-aws-foundation',
    attemptId: 'attempt-aws-foundation-minh-01',
    topic: 'Shared Responsibility Model',
    score: 0,
    severity: 'high',
    lessonIds: ['lesson-aws-4'],
    recommendation: 'Review the boundary between AWS responsibilities and customer responsibilities, then retry scenario-based questions.',
    recommendationStatus: 'draft',
  },
  {
    id: 'analysis-minh-pricing-models',
    traineeId: 'trainee-minh',
    courseId: 'course-aws',
    testId: 'test-aws-foundation',
    attemptId: 'attempt-aws-foundation-minh-01',
    topic: 'Cloud Pricing Models',
    score: 52,
    severity: 'medium',
    lessonIds: ['lesson-aws-7', 'lesson-aws-8'],
    recommendation: 'Practice matching pricing models to business constraints before taking the pricing practice test.',
    recommendationStatus: 'draft',
  },
]

export const demoClassAnalytics = [
  {
    id: 'analytics-class-aws-01',
    classId: 'class-aws-01',
    courseId: 'course-aws',
    averageProgress: 68,
    averageScore: 74,
    completionTrend: [
      { week: 'W1', value: 22 },
      { week: 'W2', value: 41 },
      { week: 'W3', value: 55 },
      { week: 'W4', value: 68 },
    ],
    riskBreakdown: {
      low: 18,
      medium: 9,
      high: 5,
    },
    weakTopicIds: [
      'weak-pricing',
      'weak-security',
      'weak-shared-responsibility',
    ],
  },
]
