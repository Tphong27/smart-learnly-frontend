import apiClient from './api-client'

function unwrap(response) {
  return response?.data ?? response
}

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined),
  )
}

function normalizeNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

function normalizeRecentActivities(items) {
  return Array.isArray(items) ? items : []
}

function normalizeOverview(data = {}) {
  const users = data.users || {}
  const courses = data.courses || {}
  const classes = data.classes || {}
  const content = data.content || {}
  const questionBanks = data.questionBanks || {}

  return {
    range: data.range || null,
    generatedAt: data.generatedAt || null,
    users: {
      total: normalizeNumber(users.total),
      active: normalizeNumber(users.active),
      pendingVerify: normalizeNumber(users.pendingVerify),
      inactive: normalizeNumber(users.inactive),
      banned: normalizeNumber(users.banned),
      newInRange: normalizeNumber(users.newInRange),
    },
    courses: {
      total: normalizeNumber(courses.total),
      published: normalizeNumber(courses.published),
      draft: normalizeNumber(courses.draft),
      inactive: normalizeNumber(courses.inactive),
      newInRange: normalizeNumber(courses.newInRange),
    },
    classes: {
      total: normalizeNumber(classes.total),
      upcoming: normalizeNumber(classes.upcoming),
      ongoing: normalizeNumber(classes.ongoing),
      completed: normalizeNumber(classes.completed),
      cancelled: normalizeNumber(classes.cancelled),
      newInRange: normalizeNumber(classes.newInRange),
    },
    content: {
      sections: normalizeNumber(content.sections),
      lessons: normalizeNumber(content.lessons),
      publishedLessons: normalizeNumber(content.publishedLessons),
      draftLessons: normalizeNumber(content.draftLessons),
      inactiveLessons: normalizeNumber(content.inactiveLessons),
      newSectionsInRange: normalizeNumber(content.newSectionsInRange),
      newLessonsInRange: normalizeNumber(content.newLessonsInRange),
    },
    questionBanks: {
      total: normalizeNumber(questionBanks.total),
      approved: normalizeNumber(questionBanks.approved),
      draft: normalizeNumber(questionBanks.draft),
      archived: normalizeNumber(questionBanks.archived),
      questions: normalizeNumber(questionBanks.questions),
      approvedQuestions: normalizeNumber(questionBanks.approvedQuestions),
      pendingReviewQuestions: normalizeNumber(questionBanks.pendingReviewQuestions),
      draftQuestions: normalizeNumber(questionBanks.draftQuestions),
      rejectedQuestions: normalizeNumber(questionBanks.rejectedQuestions),
      archivedQuestions: normalizeNumber(questionBanks.archivedQuestions),
      newBanksInRange: normalizeNumber(questionBanks.newBanksInRange),
      newQuestionsInRange: normalizeNumber(questionBanks.newQuestionsInRange),
      reviewedQuestionsInRange: normalizeNumber(questionBanks.reviewedQuestionsInRange),
      aiGeneratedQuestions: normalizeNumber(questionBanks.aiGeneratedQuestions),
      manualQuestions: normalizeNumber(questionBanks.manualQuestions),
    },
    recentActivities: normalizeRecentActivities(data.recentActivities),
  }
}

export const adminDashboardService = {
  async getOverview(params = {}) {
    const response = await apiClient.get('/admin/dashboard/overview', {
      params: cleanParams(params),
    })

    return normalizeOverview(unwrap(response))
  },
}
