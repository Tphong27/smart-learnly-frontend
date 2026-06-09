/**
 * classFlowData.js
 * Seed mock data for the Class Management module.
 * These constants are used as defaults by classFlowRuntime.js.
 * All IDs reference existing demoClasses / demoUsers where possible.
 */

/* ── Seed Assignments ─────────────────────────────────── */

export const seedClassAssignments = [
  {
    id: 'cf-assign-01',
    classId: 'class-aws-01',
    title: 'Explain the AWS Shared Responsibility Model',
    description:
      'Write a 500-word essay explaining the AWS Shared Responsibility Model. Include at least two real-world examples.',
    dueDate: '2026-06-18',
    submissionType: 'essay',
    points: 100,
    attachments: ['shared-responsibility-guide.pdf'],
    status: 'published',
    createdBy: 'trainer-an',
    createdAt: '2026-06-01',
  },
  {
    id: 'cf-assign-02',
    classId: 'class-aws-01',
    title: 'Compare AWS pricing models',
    description:
      'Create a comparison table for On-Demand, Reserved, and Spot instances. Submit as a document or link.',
    dueDate: '2026-06-22',
    submissionType: 'file',
    points: 80,
    attachments: [],
    status: 'published',
    createdBy: 'trainer-an',
    createdAt: '2026-06-05',
  },
  {
    id: 'cf-assign-03',
    classId: 'class-aws-01',
    title: 'Cloud Security Best Practices',
    description: 'List 10 cloud security best practices and explain each briefly.',
    dueDate: '2026-06-28',
    submissionType: 'text',
    points: 60,
    attachments: [],
    status: 'draft',
    createdBy: 'trainer-an',
    createdAt: '2026-06-08',
  },
]

/* ── Seed Submissions ─────────────────────────────────── */

export const seedClassSubmissions = [
  {
    id: 'cf-sub-01',
    assignmentId: 'cf-assign-01',
    classId: 'class-aws-01',
    traineeId: 'trainee-minh',
    traineeName: 'Minh Nguyen',
    content:
      'The AWS Shared Responsibility Model divides security responsibilities between AWS and the customer. AWS manages security OF the cloud (infrastructure), while customers manage security IN the cloud (data, access, configuration)...',
    attachment: '',
    submittedAt: '2026-06-16T14:30:00.000Z',
    status: 'submitted',
    aiGrade: null,
    aiFeedback: null,
    finalGrade: null,
    trainerFeedback: null,
  },
  {
    id: 'cf-sub-02',
    assignmentId: 'cf-assign-01',
    classId: 'class-aws-01',
    traineeId: 'trainee-huyen',
    traineeName: 'Huyen Tran',
    content:
      'AWS handles infrastructure security. Customers handle application-level security. Examples include S3 bucket policies and IAM roles.',
    attachment: '',
    submittedAt: '2026-06-17T09:00:00.000Z',
    status: 'submitted',
    aiGrade: null,
    aiFeedback: null,
    finalGrade: null,
    trainerFeedback: null,
  },
  {
    id: 'cf-sub-03',
    assignmentId: 'cf-assign-02',
    classId: 'class-aws-01',
    traineeId: 'trainee-minh',
    traineeName: 'Minh Nguyen',
    content: '',
    attachment: 'pricing-comparison-minh.xlsx',
    submittedAt: '2026-06-20T16:45:00.000Z',
    status: 'graded',
    aiGrade: 85,
    aiFeedback:
      'Good comparison table. Could include more detail on Savings Plans and Dedicated Hosts.',
    finalGrade: 88,
    trainerFeedback:
      'Great work, Minh. The table is clear. Added 3 bonus points for including cost-optimization tips.',
  },
]

/* ── Seed Class Tests ─────────────────────────────────── */

export const seedClassTests = [
  {
    id: 'cf-test-01',
    classId: 'class-aws-01',
    source: 'created_in_class',
    courseTestId: null,
    title: 'AWS Pricing Models Quiz',
    type: 'Practice Test',
    timeLimit: 20,
    dueDate: '2026-06-20',
    numberOfQuestions: 10,
    questions: [
      {
        id: 'cf-q-01',
        text: 'Which pricing model offers the lowest per-hour cost for long-term workloads?',
        options: ['On-Demand', 'Reserved Instances', 'Spot Instances', 'Dedicated Hosts'],
        correctIndex: 1,
      },
      {
        id: 'cf-q-02',
        text: 'Spot Instances can be interrupted by AWS with how much notice?',
        options: ['No notice', '2 minutes', '30 minutes', '1 hour'],
        correctIndex: 1,
      },
      {
        id: 'cf-q-03',
        text: 'Which service provides cost recommendations?',
        options: ['AWS Config', 'AWS Cost Explorer', 'AWS Shield', 'AWS WAF'],
        correctIndex: 1,
      },
    ],
    status: 'published',
    createdBy: 'trainer-an',
    createdAt: '2026-06-10',
  },
  {
    id: 'cf-test-02',
    classId: 'class-aws-01',
    source: 'imported_from_course',
    courseTestId: 'test-aws-module-1',
    title: 'Module 1 Assessment – Cloud Concepts',
    type: 'Module Test',
    timeLimit: 30,
    dueDate: '2026-06-25',
    numberOfQuestions: 15,
    questions: [],
    status: 'published',
    createdBy: 'trainer-an',
    createdAt: '2026-06-12',
  },
]

/* ── Seed Class Test Attempts ─────────────────────────── */

export const seedClassTestAttempts = [
  {
    id: 'cf-attempt-01',
    classTestId: 'cf-test-01',
    classId: 'class-aws-01',
    traineeId: 'trainee-minh',
    traineeName: 'Minh Nguyen',
    answers: [1, 1, 1],
    score: 100,
    totalQuestions: 3,
    correctCount: 3,
    startedAt: '2026-06-19T10:00:00.000Z',
    completedAt: '2026-06-19T10:15:00.000Z',
    status: 'completed',
  },
  {
    id: 'cf-attempt-02',
    classTestId: 'cf-test-01',
    classId: 'class-aws-01',
    traineeId: 'trainee-bao',
    traineeName: 'Bao Le',
    answers: [0, 1, 0],
    score: 33,
    totalQuestions: 3,
    correctCount: 1,
    startedAt: '2026-06-19T11:00:00.000Z',
    completedAt: '2026-06-19T11:18:00.000Z',
    status: 'completed',
  },
]

/* ── Seed Flashcard Sets ──────────────────────────────── */

export const seedClassFlashcardSets = [
  {
    id: 'cf-fc-set-01',
    classId: 'class-aws-01',
    title: 'AWS Pricing Key Terms',
    source: 'trainer_created',
    cards: [
      { id: 'cf-fc-01', front: 'What is On-Demand pricing?', back: 'Pay for compute capacity by the hour or second with no long-term commitments.' },
      { id: 'cf-fc-02', front: 'What are Reserved Instances?', back: 'A commitment to use a specific instance type in a specific Region for 1 or 3 years at a discounted rate.' },
      { id: 'cf-fc-03', front: 'What are Spot Instances?', back: 'Spare EC2 capacity available at up to 90% discount, but can be interrupted with 2-minute notice.' },
      { id: 'cf-fc-04', front: 'What is AWS Free Tier?', back: 'A set of free usage allowances for new AWS customers across many services for the first 12 months.' },
    ],
    shared: true,
    createdBy: 'trainer-an',
    createdAt: '2026-06-08',
  },
  {
    id: 'cf-fc-set-02',
    classId: 'class-aws-01',
    title: 'Cloud Security Concepts',
    source: 'ai_generated',
    cards: [
      { id: 'cf-fc-05', front: 'What is IAM?', back: 'Identity and Access Management — controls who can access AWS resources and what actions they can perform.' },
      { id: 'cf-fc-06', front: 'What is the principle of least privilege?', back: 'Granting only the minimum permissions needed to perform a task.' },
      { id: 'cf-fc-07', front: 'What is MFA?', back: 'Multi-Factor Authentication — adds an extra layer of security by requiring multiple verification methods.' },
    ],
    shared: true,
    createdBy: 'trainer-an',
    createdAt: '2026-06-10',
  },
  {
    id: 'cf-fc-set-03',
    classId: 'class-aws-01',
    title: 'Networking Basics',
    source: 'imported_from_course',
    cards: [
      { id: 'cf-fc-08', front: 'What is a VPC?', back: 'Virtual Private Cloud — a logically isolated section of the AWS Cloud where you can launch resources.' },
      { id: 'cf-fc-09', front: 'What is a subnet?', back: 'A range of IP addresses in your VPC where you can place groups of isolated resources.' },
    ],
    shared: false,
    createdBy: 'trainer-an',
    createdAt: '2026-06-12',
  },
]

/* ── Seed Announcements ───────────────────────────────── */

export const seedClassAnnouncements = [
  {
    id: 'cf-ann-01',
    classId: 'class-aws-01',
    title: 'Welcome to AWS Foundation Class',
    content:
      'Welcome everyone! Please review the syllabus and schedule. Our first live session is on Tuesday at 19:30. Make sure to complete Module 1 before the session.',
    attachment: '',
    pinned: true,
    createdBy: 'trainer-an',
    createdByName: 'An Tran',
    createdAt: '2026-05-12T08:00:00.000Z',
  },
  {
    id: 'cf-ann-02',
    classId: 'class-aws-01',
    title: 'Assignment 1 Released',
    content:
      'The first assignment "Explain the AWS Shared Responsibility Model" is now available. Due date: June 18. Please submit your work on time.',
    attachment: '',
    pinned: false,
    createdBy: 'trainer-an',
    createdByName: 'An Tran',
    createdAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'cf-ann-03',
    classId: 'class-aws-01',
    title: 'Practice Test Available',
    content:
      'AWS Pricing Models Quiz is now available for practice. Take it before the next session to prepare for our discussion.',
    attachment: '',
    pinned: false,
    createdBy: 'trainer-an',
    createdByName: 'An Tran',
    createdAt: '2026-06-10T14:00:00.000Z',
  },
]

/* ── Seed Discussions ─────────────────────────────────── */

export const seedClassDiscussions = [
  {
    id: 'cf-disc-01',
    classId: 'class-aws-01',
    title: 'Review session for pricing models?',
    content:
      'Can we have one more review session for pricing models before the practice test?',
    createdBy: 'trainee-minh',
    createdByName: 'Minh Nguyen',
    createdByRole: 'trainee',
    createdAt: '2026-06-08T09:20:00.000Z',
    replies: [
      {
        id: 'cf-disc-reply-01',
        content:
          'Yes. I will add a focused pricing assignment and discuss it in the next class.',
        createdBy: 'trainer-an',
        createdByName: 'An Tran',
        createdByRole: 'trainer',
        createdAt: '2026-06-08T10:10:00.000Z',
      },
      {
        id: 'cf-disc-reply-02',
        content: 'That would be really helpful! Thank you.',
        createdBy: 'trainee-huyen',
        createdByName: 'Huyen Tran',
        createdByRole: 'trainee',
        createdAt: '2026-06-08T11:30:00.000Z',
      },
    ],
  },
  {
    id: 'cf-disc-02',
    classId: 'class-aws-01',
    title: 'Study group for cloud security?',
    content:
      'Anyone interested in forming a study group for the cloud security module? We can meet online before the class session.',
    createdBy: 'trainee-bao',
    createdByName: 'Bao Le',
    createdByRole: 'trainee',
    createdAt: '2026-06-09T15:00:00.000Z',
    replies: [
      {
        id: 'cf-disc-reply-03',
        content: 'I am interested! Let me know the time.',
        createdBy: 'trainee-minh',
        createdByName: 'Minh Nguyen',
        createdByRole: 'trainee',
        createdAt: '2026-06-09T16:20:00.000Z',
      },
    ],
  },
]

/* ── Seed Trainer Notes ───────────────────────────────── */

export const seedTrainerNotes = [
  {
    id: 'cf-note-01',
    classId: 'class-aws-01',
    traineeId: 'trainee-huyen',
    note: 'Needs extra support on Security & Compliance. Consider scheduling 1:1 session.',
    createdBy: 'trainer-an',
    createdAt: '2026-06-07',
  },
  {
    id: 'cf-note-02',
    classId: 'class-aws-01',
    traineeId: 'trainee-bao',
    note: 'Improving steadily but still weak on Shared Responsibility Model.',
    createdBy: 'trainer-an',
    createdAt: '2026-06-08',
  },
]
