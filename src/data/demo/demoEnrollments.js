export const demoEnrollments = [
  {
    id: 'enrollment-aws-minh',
    traineeId: 'trainee-minh',
    courseId: 'course-aws',
    classId: 'class-aws-01',
    status: 'enrolled',
    paymentStatus: 'paid',
    paymentId: 'payment-aws-minh',
    progress: 68,
    completedLessonIds: [
      'lesson-aws-1',
      'lesson-aws-2',
      'lesson-aws-3',
      'lesson-aws-4',
    ],
    nextLessonId: 'lesson-aws-5',
    enrolledAt: '2026-05-12',
    lastActivityAt: '2026-06-07T20:15:00+07:00',
  },
]

export const demoPayments = [
  {
    id: 'payment-aws-minh',
    traineeId: 'trainee-minh',
    courseId: 'course-aws',
    amount: 2490000,
    currency: 'VND',
    method: 'bank_transfer',
    status: 'paid',
    paidAt: '2026-05-12T09:30:00+07:00',
  },
  {
    id: 'payment-checkout-pending',
    traineeId: 'trainee-minh',
    courseId: 'course-data',
    amount: 1890000,
    currency: 'VND',
    method: 'bank_transfer',
    status: 'pending',
    paidAt: null,
  },
]
