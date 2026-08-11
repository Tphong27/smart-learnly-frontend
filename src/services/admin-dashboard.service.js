import apiClient from './api-client'

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
  const questions = data.questions || data.questionBanks || {}

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
      modules: normalizeNumber(content.modules ?? content.sections),
      lessons: normalizeNumber(content.lessons),
      publishedLessons: normalizeNumber(content.publishedLessons),
      draftLessons: normalizeNumber(content.draftLessons),
      inactiveLessons: normalizeNumber(content.inactiveLessons),
      newModulesInRange: normalizeNumber(content.newModulesInRange ?? content.newSectionsInRange),
      newLessonsInRange: normalizeNumber(content.newLessonsInRange),
    },
    questions: {
      total: normalizeNumber(questions.total ?? questions.questions),
      approved: normalizeNumber(questions.approved ?? questions.approvedQuestions),
      pendingReview: normalizeNumber(questions.pendingReview ?? questions.pendingReviewQuestions),
      draft: normalizeNumber(questions.draft ?? questions.draftQuestions),
      rejected: normalizeNumber(questions.rejected ?? questions.rejectedQuestions),
      archived: normalizeNumber(questions.archived ?? questions.archivedQuestions),
      newInRange: normalizeNumber(questions.newInRange ?? questions.newQuestionsInRange),
      reviewedInRange: normalizeNumber(questions.reviewedInRange ?? questions.reviewedQuestionsInRange),
      aiGenerated: normalizeNumber(questions.aiGenerated ?? questions.aiGeneratedQuestions),
      manual: normalizeNumber(questions.manual ?? questions.manualQuestions),
    },
    recentActivities: normalizeRecentActivities(data.recentActivities),
  }
}

export const adminDashboardService = {
  async getOverview(params = {}) {
    const response = await apiClient.get('/admin/dashboard/overview', {
      params: cleanParams(params),
    })

    return normalizeOverview(response?.data ?? response)
  },
}
