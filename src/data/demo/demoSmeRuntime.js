import {
  demoQuestionBankQuestions,
  QUESTION_TYPES,
} from "./demoQuestionBanks";
import {
  getGeneratedResources,
  getLifecycleCourseById,
  getLifecycleModules,
  getSavedQuestionBankEntries,
} from "./courseLifecycleRuntime";
import { ROLES } from "@/shared/constants/roles";

const STORAGE_KEYS = {
  questions: "slp.demo.sme.questions",
  questionBanks: "slp.demo.sme.questionBanks",
};

function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createOptionId(questionId, label) {
  return `${questionId}-${String(label).toLowerCase()}`;
}

function getDefaultOptions(questionId, type) {
  if (type === QUESTION_TYPES.TRUE_FALSE) {
    return [
      { id: createOptionId(questionId, "true"), label: "True", text: "True" },
      {
        id: createOptionId(questionId, "false"),
        label: "False",
        text: "False",
      },
    ];
  }

  if (type === QUESTION_TYPES.MATCHING) {
    return [];
  }

  return ["A", "B", "C", "D"].map((label) => ({
    id: createOptionId(questionId, label),
    label,
    text: "",
  }));
}

function normalizeOptions(question) {
  const type = question.type || QUESTION_TYPES.SINGLE_CHOICE;

  if (type === QUESTION_TYPES.MATCHING) return [];

  const fallbackOptions = getDefaultOptions(question.id, type);
  const sourceOptions =
    Array.isArray(question.options) && question.options.length > 0
      ? question.options
      : fallbackOptions;

  return sourceOptions.map((option, index) => {
    const fallback = fallbackOptions[index];

    return {
      id: option.id || fallback?.id || createOptionId(question.id, index + 1),
      label: option.label || fallback?.label || String.fromCharCode(65 + index),
      text: option.text || "",
    };
  });
}

function normalizePairs(question) {
  if (question.type !== QUESTION_TYPES.MATCHING) return [];

  const pairs = Array.isArray(question.pairs) ? question.pairs : [];

  return pairs.length > 0
    ? pairs.map((pair, index) => ({
        id: pair.id || `${question.id}-pair-${index + 1}`,
        prompt: pair.prompt || "",
        answer: pair.answer || "",
      }))
    : [
        { id: `${question.id}-pair-1`, prompt: "", answer: "" },
        { id: `${question.id}-pair-2`, prompt: "", answer: "" },
        { id: `${question.id}-pair-3`, prompt: "", answer: "" },
        { id: `${question.id}-pair-4`, prompt: "", answer: "" },
      ];
}

function getAnswerText(question) {
  if (question.type === QUESTION_TYPES.MATCHING) {
    return (question.pairs || [])
      .map((pair) => `${pair.prompt} → ${pair.answer}`)
      .join("; ");
  }

  return (question.options || [])
    .filter((option) => (question.correctOptionIds || []).includes(option.id))
    .map((option) => option.text)
    .join("; ");
}

function buildOptionsFromPayload(questionId, payload) {
  if (payload.type === QUESTION_TYPES.TRUE_FALSE) {
    return getDefaultOptions(questionId, QUESTION_TYPES.TRUE_FALSE);
  }

  if (payload.type === QUESTION_TYPES.MATCHING) return [];

  return ["A", "B", "C", "D"].map((label) => ({
    id: createOptionId(questionId, label),
    label,
    text: payload[`option${label}`] || "",
  }));
}

function buildCorrectOptionIds(questionId, payload, options) {
  if (payload.type === QUESTION_TYPES.MATCHING) return [];

  if (payload.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
    const correctLabels = Array.isArray(payload.correctAnswers)
      ? payload.correctAnswers
      : [];

    return options
      .filter((option) => correctLabels.includes(option.label))
      .map((option) => option.id);
  }

  const correctAnswer = payload.correctAnswer || "A";

  return options
    .filter((option) => option.label === correctAnswer)
    .map((option) => option.id);
}

function buildPairsFromPayload(questionId, payload) {
  if (payload.type !== QUESTION_TYPES.MATCHING) return [];

  return [1, 2, 3, 4].map((index) => ({
    id: `${questionId}-pair-${index}`,
    prompt: payload[`matchPrompt${index}`] || "",
    answer: payload[`matchAnswer${index}`] || "",
  }));
}

function normalizeQuestion(question) {
  const type = question.type || QUESTION_TYPES.SINGLE_CHOICE;
  const options = normalizeOptions({
    ...question,
    type,
  });
  const pairs = normalizePairs({
    ...question,
    type,
  });

  const normalizedQuestion = {
    id: question.id,
    courseId: question.courseId || "course-aws",
    moduleId: question.moduleId || "",
    lessonId: question.lessonId || "",
    question: question.question || "",
    type,
    clo: question.clo || "CLO-AI",
    bloom: question.bloom || "Understand",
    difficulty: question.difficulty || "medium",
    status: question.status || "review",
    source: question.source || "Question bank",
    isAiGenerated: Boolean(question.isAiGenerated),
    options,
    pairs,
    correctOptionIds: question.correctOptionIds || [],
    createdByRole: question.createdByRole || ROLES.SME,
    createdAt: question.createdAt || new Date().toISOString(),
    updatedAt: question.updatedAt || "",
  };

  return {
    ...normalizedQuestion,
    answer: question.answer || getAnswerText(normalizedQuestion),
    explanation: question.explanation || "",
  };
}

function getStoredQuestions() {
  return readJson(STORAGE_KEYS.questions, []);
}

function setStoredQuestions(questions) {
  writeJson(STORAGE_KEYS.questions, questions);
}

function getStoredQuestionBanks() {
  return readJson(STORAGE_KEYS.questionBanks, []);
}

function setStoredQuestionBanks(questionBanks) {
  writeJson(STORAGE_KEYS.questionBanks, questionBanks);
}

function getQuestionBankTitle(courseId) {
  const course = getLifecycleCourseById(courseId);

  return course?.title ? `${course.title} Question Bank` : "Untitled Question Bank";
}

export function getSmeQuestionBankMetas() {
  const storedBanks = getStoredQuestionBanks();

  const questionCourseIds = new Set(
    getSmeQuestionBank()
      .map((question) => question.courseId)
      .filter(Boolean),
  );

  const derivedBanks = Array.from(questionCourseIds).map((courseId) => {
    const course = getLifecycleCourseById(courseId);

    return {
      id: `question-bank-${courseId}`,
      courseId,
      title: getQuestionBankTitle(courseId),
      description: `Question bank generated from existing questions of ${course?.title || courseId}.`,
      status: "active",
      createdAt: course?.createdAt || new Date().toISOString(),
      updatedAt: course?.updatedAt || new Date().toISOString(),
      source: "derived",
    };
  });

  const storedByCourseId = new Map(storedBanks.map((bank) => [bank.courseId, bank]));

  return [
    ...derivedBanks.map((bank) => ({
      ...bank,
      ...(storedByCourseId.get(bank.courseId) || {}),
    })),
    ...storedBanks.filter((bank) => !questionCourseIds.has(bank.courseId)),
  ];
}

export function createSmeQuestionBank(payload = {}) {
  const course = getLifecycleCourseById(payload.courseId);
  const current = getStoredQuestionBanks();

  const duplicated = current.find((bank) => bank.courseId === payload.courseId);

  if (duplicated) {
    return updateSmeQuestionBank(duplicated.id, payload);
  }

  const questionBank = {
    id: createId("sme-question-bank"),
    courseId: payload.courseId,
    title: payload.title || getQuestionBankTitle(payload.courseId),
    description:
      payload.description ||
      `Question bank for ${course?.title || payload.courseId}.`,
    status: payload.status || "active",
    source: "manual",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  setStoredQuestionBanks([questionBank, ...current]);

  return questionBank;
}

export function updateSmeQuestionBank(questionBankId, payload = {}) {
  const current = getStoredQuestionBanks();

  const existing =
    current.find((bank) => bank.id === questionBankId) ||
    getSmeQuestionBankMetas().find((bank) => bank.id === questionBankId);

  if (!existing) return null;

  const updatedBank = {
    ...existing,
    ...payload,
    title: payload.title || existing.title,
    description: payload.description ?? existing.description,
    status: payload.status || existing.status,
    updatedAt: new Date().toISOString(),
  };

  const existsInStored = current.some((bank) => bank.id === questionBankId);

  if (existsInStored) {
    setStoredQuestionBanks(
      current.map((bank) => (bank.id === questionBankId ? updatedBank : bank)),
    );
  } else {
    setStoredQuestionBanks([updatedBank, ...current]);
  }

  return updatedBank;
}

function getGeneratedQuestionDrafts() {
  return getGeneratedResources({ type: "questions" })
    .filter((resource) => resource.createdByRole === ROLES.SME)
    .flatMap((resource) =>
      (resource.content || []).map((item, index) =>
        normalizeQuestion({
          id: `${resource.id}-question-${index}`,
          courseId: resource.courseId,
          lessonId: resource.lessonId,
          question: item.question,
          answer: item.answer,
          explanation: item.answer,
          type: "short_answer",
          clo: "CLO-AI",
          bloom: "Understand",
          difficulty: "medium",
          status: "review",
          source: "AI-generated from SME Course Builder",
          isAiGenerated: true,
          createdAt: resource.createdAt,
        }),
      ),
    );
}

function getSavedCourseBuilderQuestions() {
  return getSavedQuestionBankEntries().map((item) =>
    normalizeQuestion({
      ...item,
      type: item.type || "short_answer",
      clo: item.clo || "CLO-AI",
      bloom: item.bloom || "Understand",
      difficulty: item.difficulty || "medium",
      status: item.status || "review",
      source: item.source || "Saved from SME Course Builder",
      isAiGenerated: item.isAiGenerated ?? true,
      createdAt: item.savedAt || item.createdAt,
    }),
  );
}

function getQuestionSignature(question) {
  return [
    question.courseId,
    question.lessonId,
    String(question.question || "")
      .trim()
      .toLowerCase(),
  ].join(":");
}

function dedupeQuestions(questions) {
  const seenIds = new Set();
  const seenSignatures = new Set();

  return questions.filter((question) => {
    const signature = getQuestionSignature(question);

    if (seenIds.has(question.id) || seenSignatures.has(signature)) {
      return false;
    }

    seenIds.add(question.id);
    seenSignatures.add(signature);
    return true;
  });
}

export function getSmeQuestionBank() {
  const stored = getStoredQuestions();
  const storedById = new Map(stored.map((item) => [item.id, item]));

  const baseQuestions = demoQuestionBankQuestions.map((question) => ({
    ...normalizeQuestion(question),
    ...(storedById.get(question.id) || {}),
  }));

  const generatedQuestions = getGeneratedQuestionDrafts().map((question) => ({
    ...question,
    ...(storedById.get(question.id) || {}),
  }));

  const savedCourseBuilderQuestions = getSavedCourseBuilderQuestions().map(
    (question) => ({
      ...question,
      ...(storedById.get(question.id) || {}),
    }),
  );

  const baseIds = new Set([
    ...baseQuestions.map((item) => item.id),
    ...generatedQuestions.map((item) => item.id),
    ...savedCourseBuilderQuestions.map((item) => item.id),
  ]);

  const localOnly = stored.filter((item) => !baseIds.has(item.id));

  return dedupeQuestions([
    ...baseQuestions,
    ...generatedQuestions,
    ...savedCourseBuilderQuestions,
    ...localOnly.map(normalizeQuestion),
  ]).filter((question) => !question.deleted && question.status !== "deleted");
}

export function getSmeQuestionById(questionId) {
  return getSmeQuestionBank().find((item) => item.id === questionId);
}

export function updateSmeQuestion(questionId, payload) {
  const current = getStoredQuestions();
  const existing =
    getSmeQuestionById(questionId) ||
    current.find((item) => item.id === questionId);

  if (!existing) return null;

  const nextQuestion = {
    ...existing,
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  const updatedQuestion = normalizeQuestion({
    ...nextQuestion,
    answer: payload.answer || getAnswerText(nextQuestion),
  });

  const existsInStored = current.some((item) => item.id === questionId);

  if (existsInStored) {
    setStoredQuestions(
      current.map((item) => (item.id === questionId ? updatedQuestion : item)),
    );
  } else {
    setStoredQuestions([updatedQuestion, ...current]);
  }

  return updatedQuestion;
}

export function createSmeQuestion(payload = {}) {
  const questionId = createId("sme-manual-question");
  const type = payload.type || QUESTION_TYPES.SINGLE_CHOICE;
  const options = buildOptionsFromPayload(questionId, {
    ...payload,
    type,
  });
  const pairs = buildPairsFromPayload(questionId, {
    ...payload,
    type,
  });
  const correctOptionIds = buildCorrectOptionIds(
    questionId,
    {
      ...payload,
      type,
    },
    options,
  );

  const question = normalizeQuestion({
    id: questionId,
    courseId: payload.courseId,
    moduleId: payload.moduleId || "",
    lessonId: payload.lessonId || "",
    question: payload.question,
    type,
    clo: payload.clo || "CLO-AI",
    bloom: payload.bloom || "Understand",
    difficulty: payload.difficulty || "medium",
    status: payload.status || "draft",
    source: "Manual SME question",
    isAiGenerated: false,
    options,
    pairs,
    correctOptionIds,
    explanation: payload.explanation || "",
    createdByRole: ROLES.SME,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  setStoredQuestions([question, ...getStoredQuestions()]);

  return question;
}

export function deleteSmeQuestion(questionId) {
  const current = getStoredQuestions();
  const existing = getSmeQuestionById(questionId);

  if (!existing) return null;

  const existsInStored = current.some((item) => item.id === questionId);

  if (existsInStored) {
    setStoredQuestions(current.filter((item) => item.id !== questionId));
    return existing;
  }

  const deletedQuestion = {
    ...existing,
    status: "deleted",
    deleted: true,
    updatedAt: new Date().toISOString(),
  };

  setStoredQuestions([deletedQuestion, ...current]);

  return deletedQuestion;
}

export function approveSmeQuestion(questionId) {
  return updateSmeQuestion(questionId, { status: "approved" });
}

export function rejectSmeQuestion(questionId) {
  return updateSmeQuestion(questionId, { status: "rejected" });
}

export function createAiDraftQuestion(payload = {}) {
  const course = getLifecycleCourseById(payload.courseId || 'course-aws')
  const modules = getLifecycleModules(payload.courseId || course?.id || 'course-aws')
  const module = modules.find((item) => item.id === payload.moduleId)
  const lesson = module?.lessons?.find((item) => item.id === payload.lessonId)

  const questionId = createId('sme-ai-question')
  const type = payload.type || QUESTION_TYPES.SINGLE_CHOICE

  const options = buildOptionsFromPayload(questionId, {
    type,
    optionA: `Correct concept from ${lesson?.title || module?.title || course?.title || 'selected content'}`,
    optionB: 'A related but incomplete explanation',
    optionC: 'A distractor from another topic',
    optionD: 'An incorrect interpretation of the lesson',
    correctAnswer: 'A',
    correctAnswers: ['A', 'B'],
  })

  const pairs = type === QUESTION_TYPES.MATCHING
    ? [
      {
        id: `${questionId}-pair-1`,
        prompt: 'Core concept',
        answer: lesson?.title || module?.title || course?.title || 'Selected learning content',
      },
      {
        id: `${questionId}-pair-2`,
        prompt: 'Learning outcome',
        answer: payload.clo || 'CLO-AI',
      },
      {
        id: `${questionId}-pair-3`,
        prompt: 'Cognitive level',
        answer: payload.bloom || 'Understand',
      },
      {
        id: `${questionId}-pair-4`,
        prompt: 'Difficulty',
        answer: payload.difficulty || 'medium',
      },
    ]
    : []

  const correctOptionIds =
    type === QUESTION_TYPES.MULTIPLE_CHOICE
      ? options.slice(0, 2).map((option) => option.id)
      : type === QUESTION_TYPES.TRUE_FALSE
        ? [createOptionId(questionId, 'true')]
        : type === QUESTION_TYPES.SINGLE_CHOICE
          ? [createOptionId(questionId, 'A')]
          : []

  const question = normalizeQuestion({
    id: questionId,
    courseId: payload.courseId || course?.id || 'course-aws',
    moduleId: payload.moduleId || module?.id || '',
    lessonId: payload.lessonId || lesson?.id || '',
    question:
      payload.question ||
      `Which option best matches ${lesson?.title || module?.title || course?.title || 'the selected learning content'}?`,
    type,
    clo: payload.clo || 'CLO-AI',
    bloom: payload.bloom || 'Understand',
    difficulty: payload.difficulty || 'medium',
    status: 'review',
    source: 'AI-generated draft',
    isAiGenerated: true,
    options,
    pairs,
    correctOptionIds,
    explanation:
      payload.explanation ||
      `AI-generated draft based on ${lesson?.title || module?.title || course?.title || 'the selected learning content'}. SME must review before approval.`,
    createdByRole: ROLES.SME,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  setStoredQuestions([question, ...getStoredQuestions()])

  return question
}

export function getSmeContentQualityReport(courseId) {
  const course = getLifecycleCourseById(courseId);
  const modules = getLifecycleModules(courseId);
  const lessons = modules.flatMap((module) => module.lessons || []);
  const questions = getSmeQuestionBank().filter(
    (question) => question.courseId === courseId,
  );

  const missingObjectives = lessons.filter(
    (lesson) =>
      !Array.isArray(lesson.learningObjectives) ||
      lesson.learningObjectives.length === 0,
  );

  const lessonsWithoutMaterials = lessons.filter(
    (lesson) =>
      !Array.isArray(lesson.materials) || lesson.materials.length === 0,
  );

  const reviewQuestions = questions.filter(
    (question) => question.status === "review" || question.status === "draft",
  );

  const approvedQuestions = questions.filter(
    (question) => question.status === "approved",
  );

  const issues = [
    {
      id: "missing-objectives",
      title: "Lessons missing learning objectives",
      value: missingObjectives.length,
      severity: missingObjectives.length > 0 ? "warning" : "good",
      description:
        missingObjectives.length > 0
          ? "Some lessons do not have clear learning objectives."
          : "All lessons have learning objectives.",
    },
    {
      id: "missing-materials",
      title: "Lessons without uploaded material",
      value: lessonsWithoutMaterials.length,
      severity: lessonsWithoutMaterials.length > 0 ? "warning" : "good",
      description:
        lessonsWithoutMaterials.length > 0
          ? "Some lessons do not have supporting documents or references."
          : "Lesson materials are available.",
    },
    {
      id: "question-review",
      title: "AI questions waiting for SME review",
      value: reviewQuestions.length,
      severity: reviewQuestions.length > 0 ? "warning" : "good",
      description:
        reviewQuestions.length > 0
          ? "AI-generated questions need approve/reject/edit decision."
          : "No pending AI question review.",
    },
    {
      id: "approved-questions",
      title: "Approved question coverage",
      value: approvedQuestions.length,
      severity: approvedQuestions.length >= modules.length ? "good" : "warning",
      description:
        approvedQuestions.length >= modules.length
          ? "Question coverage is acceptable for demo."
          : "Approved question count is lower than module count.",
    },
  ];

  const warningCount = issues.filter(
    (item) => item.severity === "warning",
  ).length;
  const score = Math.max(0, 100 - warningCount * 20);

  return {
    courseTitle: course?.title || "Selected course",
    moduleCount: modules.length,
    lessonCount: lessons.length,
    questionCount: questions.length,
    approvedQuestionCount: approvedQuestions.length,
    pendingQuestionCount: reviewQuestions.length,
    score,
    issues,
  };
}
