import { useMemo, useState } from "react";
import {
  Brain,
  CheckCircle2,
  Eye,
  Grid2X2,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { StatusBadge } from "@/shared/components/ui/StatusBadge";
import { DataState } from "@/shared/components/ui/DataState";
import {
  approveSmeQuestion,
  createAiDraftQuestion,
  createSmeQuestion,
  deleteSmeQuestion,
  getSmeQuestionBank,
  rejectSmeQuestion,
  updateSmeQuestion,
} from "@/data/demo/demoSmeRuntime";
import {
  getAllLifecycleCourses,
  getLifecycleCourseById,
  getLifecycleModules,
} from "@/data/demo/courseLifecycleRuntime";
import { QUESTION_TYPES } from "@/data/demo/demoQuestionBanks";
const VIEW_MODE = {
  GRID: "grid",
  LIST: "list",
};

const QUESTION_TYPE_OPTIONS = [
  { value: QUESTION_TYPES.SINGLE_CHOICE, label: "Single Choice" },
  { value: QUESTION_TYPES.MULTIPLE_CHOICE, label: "Multiple Choice" },
  { value: QUESTION_TYPES.TRUE_FALSE, label: "True / False" },
  { value: QUESTION_TYPES.MATCHING, label: "Matching" },
];

const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const BLOOM_LEVELS = [
  "Remember",
  "Understand",
  "Apply",
  "Analyze",
  "Evaluate",
  "Create",
];

const emptyQuestionForm = {
  question: "",
  type: "single_choice",

  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctAnswer: "A",
  correctAnswers: [],

  trueFalseAnswer: "True",

  matchPrompt1: "",
  matchAnswer1: "",
  matchPrompt2: "",
  matchAnswer2: "",
  matchPrompt3: "",
  matchAnswer3: "",
  matchPrompt4: "",
  matchAnswer4: "",

  explanation: "",
  clo: "CLO-AI",
  bloom: "Understand",
  difficulty: "medium",
  status: "draft",
};

const emptyAiForm = {
  courseId: "",
  moduleId: "",
  lessonId: "",
  type: "single_choice",
  difficulty: "medium",
  bloom: "Understand",
  clo: "CLO-AI",
};

function getCourseTitle(courseId) {
  return (
    getLifecycleCourseById(courseId)?.title || courseId || "Unassigned course"
  );
}

function getModuleAndLesson(courseId, lessonId, moduleId = "") {
  const modules = getLifecycleModules(courseId);

  if (moduleId) {
    const module = modules.find((item) => item.id === moduleId);
    const lesson = module?.lessons?.find((item) => item.id === lessonId);

    return {
      module,
      lesson,
    };
  }

  for (const module of modules) {
    const lesson = module.lessons?.find((item) => item.id === lessonId);

    if (lesson) {
      return {
        module,
        lesson,
      };
    }
  }

  return {
    module: null,
    lesson: null,
  };
}

function enrichQuestion(question) {
  const { module, lesson } = getModuleAndLesson(
    question.courseId,
    question.lessonId,
    question.moduleId,
  );

  return {
    ...question,
    moduleId: question.moduleId || module?.id || "",
    courseTitle: getCourseTitle(question.courseId),
    moduleTitle: module?.title || "Course level",
    lessonTitle: lesson?.title || "Course level",
  };
}

function buildQuestionBanks(questions) {
  const bankMap = new Map();

  questions.forEach((question) => {
    const course = getLifecycleCourseById(question.courseId);

    if (!bankMap.has(question.courseId)) {
      bankMap.set(question.courseId, {
        id: `question-bank-${question.courseId}`,
        courseId: question.courseId,
        courseTitle: course?.title || question.courseTitle || question.courseId,
        courseStatus: course?.status || "unknown",
        category: course?.category || "General",
        level: course?.level || "Mixed",
        questions: [],
      });
    }

    bankMap.get(question.courseId).questions.push(question);
  });

  return Array.from(bankMap.values()).map((bank) => {
    const total = bank.questions.length;
    const approved = bank.questions.filter(
      (item) => item.status === "approved" || item.status === "published",
    ).length;
    const review = bank.questions.filter(
      (item) => item.status === "review" || item.status === "draft",
    ).length;
    const rejected = bank.questions.filter(
      (item) => item.status === "rejected",
    ).length;
    const aiGenerated = bank.questions.filter(
      (item) => item.isAiGenerated,
    ).length;
    const manual = total - aiGenerated;

    return {
      ...bank,
      total,
      approved,
      review,
      rejected,
      aiGenerated,
      manual,
    };
  });
}

function toQuestionForm(question) {
  if (!question) return emptyQuestionForm;

  const options = question.options || [];
  const pairs = question.pairs || [];

  const getOptionText = (label) => {
    return options.find((option) => option.label === label)?.text || "";
  };

  const correctOptions = options.filter((option) =>
    (question.correctOptionIds || []).includes(option.id),
  );

  const trueFalseCorrect = correctOptions[0]?.label || "True";

  return {
    question: question.question || "",
    type: question.type || "single_choice",

    optionA: getOptionText("A"),
    optionB: getOptionText("B"),
    optionC: getOptionText("C"),
    optionD: getOptionText("D"),
    correctAnswer: correctOptions[0]?.label || "A",
    correctAnswers: correctOptions.map((option) => option.label),

    trueFalseAnswer: trueFalseCorrect,

    matchPrompt1: pairs[0]?.prompt || "",
    matchAnswer1: pairs[0]?.answer || "",
    matchPrompt2: pairs[1]?.prompt || "",
    matchAnswer2: pairs[1]?.answer || "",
    matchPrompt3: pairs[2]?.prompt || "",
    matchAnswer3: pairs[2]?.answer || "",
    matchPrompt4: pairs[3]?.prompt || "",
    matchAnswer4: pairs[3]?.answer || "",

    explanation: question.explanation || "",
    clo: question.clo || "CLO-AI",
    bloom: question.bloom || "Understand",
    difficulty: question.difficulty || "medium",
    status: question.status || "draft",
  };
}

function QuestionBankCard({ bank, viewMode, onOpen }) {
  return (
    <article
      className={
        viewMode === VIEW_MODE.GRID
          ? "question-bank-card"
          : "question-bank-list-item"
      }
    >
      <div className="question-bank-card__header">
        <div>
          <span className="demo-kicker">Question Bank</span>
          <h2>{bank.courseTitle}</h2>
          <p>
            {bank.category} · {bank.level}
          </p>
        </div>

        <span className="question-bank-count">{bank.total} questions</span>
      </div>

      <div className="question-bank-stats">
        <span>Approved: {bank.approved}</span>
        <span>Review: {bank.review}</span>
        <span>Rejected: {bank.rejected}</span>
        <span>AI: {bank.aiGenerated}</span>
        <span>Manual: {bank.manual}</span>
      </div>

      <div className="demo-actions">
        <button
          type="button"
          className="demo-primary-action"
          onClick={() => onOpen(bank)}
        >
          <Eye size={16} />
          Open bank
        </button>
      </div>
    </article>
  );
}

function QuestionBankToolbar({
  keyword,
  courseFilter,
  viewMode,
  banks,
  onKeywordChange,
  onCourseFilterChange,
  onViewModeChange,
}) {
  return (
    <section className="course-flow-filter-card question-bank-toolbar">
      <div className="question-bank-search">
        <Search size={16} />
        <input
          value={keyword}
          placeholder="Search question bank by course name..."
          onChange={(event) => onKeywordChange(event.target.value)}
        />
      </div>

      <select
        value={courseFilter}
        onChange={(event) => onCourseFilterChange(event.target.value)}
      >
        <option value="all">All courses</option>
        {banks.map((bank) => (
          <option key={bank.courseId} value={bank.courseId}>
            {bank.courseTitle}
          </option>
        ))}
      </select>

      <div className="question-bank-view-toggle">
        <button
          type="button"
          className={viewMode === VIEW_MODE.GRID ? "is-active" : ""}
          onClick={() => onViewModeChange(VIEW_MODE.GRID)}
        >
          <Grid2X2 size={16} />
          Grid
        </button>

        <button
          type="button"
          className={viewMode === VIEW_MODE.LIST ? "is-active" : ""}
          onClick={() => onViewModeChange(VIEW_MODE.LIST)}
        >
          <List size={16} />
          List
        </button>
      </div>
    </section>
  );
}

function QuestionForm({ title, initialForm, onSubmit, onCancel }) {
  const [form, setForm] = useState(initialForm || emptyQuestionForm);

  const updateCorrectAnswers = (label, checked) => {
    const current = new Set(form.correctAnswers || []);

    if (checked) {
      current.add(label);
    } else {
      current.delete(label);
    }

    setForm({
      ...form,
      correctAnswers: Array.from(current),
    });
  };

  const handleSubmit = () => {
    if (!form.question.trim()) return;

    if (
      [QUESTION_TYPES.SINGLE_CHOICE, QUESTION_TYPES.MULTIPLE_CHOICE].includes(
        form.type,
      ) &&
      (!form.optionA.trim() ||
        !form.optionB.trim() ||
        !form.optionC.trim() ||
        !form.optionD.trim())
    ) {
      return;
    }

    if (
      form.type === QUESTION_TYPES.MULTIPLE_CHOICE &&
      form.correctAnswers.length === 0
    ) {
      return;
    }

    if (
      form.type === QUESTION_TYPES.MATCHING &&
      (!form.matchPrompt1.trim() || !form.matchAnswer1.trim())
    ) {
      return;
    }

    onSubmit({
      ...form,
      question: form.question.trim(),
      optionA: form.optionA.trim(),
      optionB: form.optionB.trim(),
      optionC: form.optionC.trim(),
      optionD: form.optionD.trim(),
      correctAnswer:
        form.type === QUESTION_TYPES.TRUE_FALSE
          ? form.trueFalseAnswer
          : form.correctAnswer,
      explanation: form.explanation.trim(),
    });
  };

  return (
    <section className="demo-card question-bank-form-card">
      <div className="demo-row demo-row--between">
        <div>
          <span className="demo-kicker">Question editor</span>
          <h2>{title}</h2>
        </div>

        {onCancel && (
          <button
            type="button"
            className="demo-secondary-action"
            onClick={onCancel}
          >
            <X size={16} />
            Cancel
          </button>
        )}
      </div>

      <div className="question-bank-form-grid question-bank-form-grid--three">
        <label className="course-flow-field">
          <span>Question Type</span>
          <select
            value={form.type}
            onChange={(event) =>
              setForm({
                ...form,
                type: event.target.value,
                correctAnswer: "A",
                correctAnswers: [],
                trueFalseAnswer: "True",
              })
            }
          >
            <option value={QUESTION_TYPES.SINGLE_CHOICE}>Single Choice</option>
            <option value={QUESTION_TYPES.MULTIPLE_CHOICE}>
              Multiple Choice
            </option>
            <option value={QUESTION_TYPES.TRUE_FALSE}>True / False</option>
            <option value={QUESTION_TYPES.MATCHING}>Matching</option>
          </select>
        </label>

        <label className="course-flow-field">
          <span>Difficulty</span>
          <select
            value={form.difficulty}
            onChange={(event) =>
              setForm({ ...form, difficulty: event.target.value })
            }
          >
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty.value} value={difficulty.value}>
                {difficulty.label}
              </option>
            ))}
          </select>
        </label>

        <label className="course-flow-field">
          <span>Status</span>
          <select
            value={form.status}
            onChange={(event) =>
              setForm({ ...form, status: event.target.value })
            }
          >
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="approved">Approved</option>
          </select>
        </label>
      </div>

      <label className="course-flow-field">
        <span>Question</span>
        <textarea
          rows="4"
          value={form.question}
          placeholder="Enter question content..."
          onChange={(event) =>
            setForm({ ...form, question: event.target.value })
          }
        />
      </label>

      {[QUESTION_TYPES.SINGLE_CHOICE, QUESTION_TYPES.MULTIPLE_CHOICE].includes(
        form.type,
      ) && (
        <div className="question-option-grid">
          {[
            ["A", "optionA"],
            ["B", "optionB"],
            ["C", "optionC"],
            ["D", "optionD"],
          ].map(([label, field]) => (
            <label key={field} className="question-option-field">
              <span className="question-option-label">{label}</span>

              <input
                value={form[field]}
                placeholder={`Answer ${label}`}
                onChange={(event) =>
                  setForm({ ...form, [field]: event.target.value })
                }
              />

              {form.type === QUESTION_TYPES.SINGLE_CHOICE ? (
                <label className="question-correct-choice">
                  <input
                    type="radio"
                    name="correctAnswer"
                    value={label}
                    checked={form.correctAnswer === label}
                    onChange={(event) =>
                      setForm({ ...form, correctAnswer: event.target.value })
                    }
                  />
                  Correct
                </label>
              ) : (
                <label className="question-correct-choice">
                  <input
                    type="checkbox"
                    checked={(form.correctAnswers || []).includes(label)}
                    onChange={(event) =>
                      updateCorrectAnswers(label, event.target.checked)
                    }
                  />
                  Correct
                </label>
              )}
            </label>
          ))}
        </div>
      )}

      {form.type === QUESTION_TYPES.TRUE_FALSE && (
        <div className="question-option-grid question-option-grid--true-false">
          {["True", "False"].map((value) => (
            <label key={value} className="question-option-field">
              <span className="question-option-label">{value}</span>

              <p>{value}</p>

              <label className="question-correct-choice">
                <input
                  type="radio"
                  name="trueFalseAnswer"
                  value={value}
                  checked={form.trueFalseAnswer === value}
                  onChange={(event) =>
                    setForm({ ...form, trueFalseAnswer: event.target.value })
                  }
                />
                Correct
              </label>
            </label>
          ))}
        </div>
      )}

      {form.type === QUESTION_TYPES.MATCHING && (
        <div className="question-matching-grid">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="question-matching-row">
              <span>{index}</span>

              <input
                value={form[`matchPrompt${index}`]}
                placeholder={`Prompt ${index}`}
                onChange={(event) =>
                  setForm({
                    ...form,
                    [`matchPrompt${index}`]: event.target.value,
                  })
                }
              />

              <input
                value={form[`matchAnswer${index}`]}
                placeholder={`Matching answer ${index}`}
                onChange={(event) =>
                  setForm({
                    ...form,
                    [`matchAnswer${index}`]: event.target.value,
                  })
                }
              />
            </div>
          ))}
        </div>
      )}

      <label className="course-flow-field">
        <span>Explanation</span>
        <textarea
          rows="3"
          value={form.explanation}
          placeholder="Explain the correct answer..."
          onChange={(event) =>
            setForm({ ...form, explanation: event.target.value })
          }
        />
      </label>

      <div className="question-bank-form-grid question-bank-form-grid--two">
        <label className="course-flow-field">
          <span>Bloom</span>
          <select
            value={form.bloom}
            onChange={(event) =>
              setForm({ ...form, bloom: event.target.value })
            }
          >
            {BLOOM_LEVELS.map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </label>

        <label className="course-flow-field">
          <span>CLO</span>
          <input
            value={form.clo}
            onChange={(event) => setForm({ ...form, clo: event.target.value })}
          />
        </label>
      </div>

      <button
        type="button"
        className="demo-primary-action"
        onClick={handleSubmit}
      >
        <Plus size={16} />
        Save question
      </button>
    </section>
  );
}

function AiQuestionForm({ bank, onGenerate }) {
  const modules = useMemo(
    () => getLifecycleModules(bank.courseId),
    [bank.courseId],
  );

  const [form, setForm] = useState({
    ...emptyAiForm,
    courseId: bank.courseId,
    moduleId: modules[0]?.id || "",
    lessonId: modules[0]?.lessons?.[0]?.id || "",
  });

  const lessons = useMemo(() => {
    return modules.find((module) => module.id === form.moduleId)?.lessons || [];
  }, [modules, form.moduleId]);

  const handleModuleChange = (moduleId) => {
    const module = modules.find((item) => item.id === moduleId);
    setForm({
      ...form,
      moduleId,
      lessonId: module?.lessons?.[0]?.id || "",
    });
  };

  const handleSubmit = () => {
    onGenerate(form);
  };

  return (
    <section className="demo-card question-bank-form-card">
      <div>
        <span className="demo-kicker">AI Generation</span>
        <h2>Generate AI draft question</h2>
        <p>
          AI will create a draft question for the selected course, module, and
          lesson.
        </p>
      </div>

      <div className="question-bank-form-grid question-bank-form-grid--three">
        <label className="course-flow-field">
          <span>Module</span>
          <select
            value={form.moduleId}
            onChange={(event) => handleModuleChange(event.target.value)}
          >
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.title}
              </option>
            ))}
          </select>
        </label>

        <label className="course-flow-field">
          <span>Lesson</span>
          <select
            value={form.lessonId}
            onChange={(event) =>
              setForm({ ...form, lessonId: event.target.value })
            }
          >
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {lesson.title}
              </option>
            ))}
          </select>
        </label>

        <label className="course-flow-field">
          <span>Type</span>
          <select
            value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value })}
          >
            <option value={QUESTION_TYPES.SINGLE_CHOICE}>Single Choice</option>
            <option value={QUESTION_TYPES.MULTIPLE_CHOICE}>
              Multiple Choice
            </option>
            <option value={QUESTION_TYPES.TRUE_FALSE}>True / False</option>
            <option value={QUESTION_TYPES.MATCHING}>Matching</option>
          </select>
        </label>
      </div>

      <div className="question-bank-form-grid question-bank-form-grid--three">
        <label className="course-flow-field">
          <span>Difficulty</span>
          <select
            value={form.difficulty}
            onChange={(event) =>
              setForm({ ...form, difficulty: event.target.value })
            }
          >
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty.value} value={difficulty.value}>
                {difficulty.label}
              </option>
            ))}
          </select>
        </label>

        <label className="course-flow-field">
          <span>Bloom</span>
          <select
            value={form.bloom}
            onChange={(event) =>
              setForm({ ...form, bloom: event.target.value })
            }
          >
            {BLOOM_LEVELS.map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </label>

        <label className="course-flow-field">
          <span>CLO</span>
          <input
            value={form.clo}
            onChange={(event) => setForm({ ...form, clo: event.target.value })}
          />
        </label>
      </div>

      <button
        type="button"
        className="demo-primary-action"
        onClick={handleSubmit}
      >
        <Brain size={16} />
        Generate AI Draft
      </button>
    </section>
  );
}

function QuestionBankDetail({
  bank,
  questions,
  onBack,
  onCreateManual,
  onGenerateAi,
  onUpdateQuestion,
  onDeleteQuestion,
  onApproveQuestion,
  onRejectQuestion,
}) {
  const [filters, setFilters] = useState({
    keyword: "",
    moduleId: "all",
    lessonId: "all",
    status: "all",
    type: "all",
    difficulty: "all",
    source: "all",
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAiForm, setShowAiForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const modules = useMemo(
    () => getLifecycleModules(bank.courseId),
    [bank.courseId],
  );

  const lessonOptions = useMemo(() => {
    if (filters.moduleId === "all") {
      return modules.flatMap((module) =>
        (module.lessons || []).map((lesson) => ({
          value: lesson.id,
          label: `${module.title} / ${lesson.title}`,
        })),
      );
    }

    const module = modules.find((item) => item.id === filters.moduleId);
    return (module?.lessons || []).map((lesson) => ({
      value: lesson.id,
      label: lesson.title,
    }));
  }, [modules, filters.moduleId]);

  const bankQuestions = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();

    return questions
      .filter((question) => question.courseId === bank.courseId)
      .filter((question) => {
        const matchesKeyword =
          !keyword ||
          [
            question.question,
            question.answer,
            question.explanation,
            question.moduleTitle,
            question.lessonTitle,
            question.clo,
            question.bloom,
            question.source,
          ]
            .join(" ")
            .toLowerCase()
            .includes(keyword);

        const matchesModule =
          filters.moduleId === "all" || question.moduleId === filters.moduleId;
        const matchesLesson =
          filters.lessonId === "all" || question.lessonId === filters.lessonId;
        const matchesStatus =
          filters.status === "all" || question.status === filters.status;
        const matchesType =
          filters.type === "all" || question.type === filters.type;
        const matchesDifficulty =
          filters.difficulty === "all" ||
          question.difficulty === filters.difficulty;
        const matchesSource =
          filters.source === "all" ||
          (filters.source === "ai" && question.isAiGenerated) ||
          (filters.source === "manual" && !question.isAiGenerated);

        return (
          matchesKeyword &&
          matchesModule &&
          matchesLesson &&
          matchesStatus &&
          matchesType &&
          matchesDifficulty &&
          matchesSource
        );
      });
  }, [questions, bank.courseId, filters]);

  const updateFilter = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name === "moduleId" ? { lessonId: "all" } : {}),
    }));
  };

  const handleCreateManual = (payload) => {
    onCreateManual({
      ...payload,
      courseId: bank.courseId,
      moduleId:
        filters.moduleId === "all" ? modules[0]?.id || "" : filters.moduleId,
      lessonId:
        filters.lessonId === "all"
          ? lessonOptions[0]?.value || ""
          : filters.lessonId,
    });
    setShowCreateForm(false);
  };

  const handleUpdate = (payload) => {
    const options = [
      {
        id: editingQuestion.options?.[0]?.id || `${editingQuestion.id}-a`,
        label: "A",
        text: payload.optionA,
      },
      {
        id: editingQuestion.options?.[1]?.id || `${editingQuestion.id}-b`,
        label: "B",
        text: payload.optionB,
      },
      {
        id: editingQuestion.options?.[2]?.id || `${editingQuestion.id}-c`,
        label: "C",
        text: payload.optionC,
      },
      {
        id: editingQuestion.options?.[3]?.id || `${editingQuestion.id}-d`,
        label: "D",
        text: payload.optionD,
      },
    ];

    const correctOption = options.find(
      (option) => option.label === payload.correctAnswer,
    );

    onUpdateQuestion(editingQuestion.id, {
      question: payload.question,
      type: "single_choice",
      difficulty: payload.difficulty,
      bloom: payload.bloom,
      clo: payload.clo,
      status: payload.status,
      explanation: payload.explanation,
      options,
      correctOptionIds: correctOption ? [correctOption.id] : [],
      answer: correctOption?.text || "",
    });

    setEditingQuestion(null);
  };

  return (
    <section className="question-bank-detail">
      <section className="demo-card">
        <div className="demo-row demo-row--between">
          <div>
            <span className="demo-kicker">Question Bank Detail</span>
            <h1>{bank.courseTitle}</h1>
            <p>Manage manual and AI-generated questions for this course.</p>
          </div>

          <div className="demo-actions">
            <button
              type="button"
              className="demo-secondary-action"
              onClick={onBack}
            >
              Back to banks
            </button>

            <button
              type="button"
              className="demo-secondary-action"
              onClick={() => setShowCreateForm((value) => !value)}
            >
              <Plus size={16} />
              Create manual
            </button>

            <button
              type="button"
              className="demo-primary-action"
              onClick={() => setShowAiForm((value) => !value)}
            >
              <Brain size={16} />
              AI Generate
            </button>
          </div>
        </div>

        <div className="question-bank-stats">
          <span>Total: {bank.total}</span>
          <span>Approved: {bank.approved}</span>
          <span>Review: {bank.review}</span>
          <span>AI: {bank.aiGenerated}</span>
          <span>Manual: {bank.manual}</span>
        </div>
      </section>

      {showCreateForm && (
        <QuestionForm
          title="Create manual question"
          initialForm={emptyQuestionForm}
          onCancel={() => setShowCreateForm(false)}
          onSubmit={handleCreateManual}
        />
      )}

      {showAiForm && (
        <AiQuestionForm
          bank={bank}
          onGenerate={(payload) => {
            onGenerateAi(payload);
            setShowAiForm(false);
          }}
        />
      )}

      {editingQuestion && (
        <QuestionForm
          key={editingQuestion.id}
          title="Update question"
          initialForm={toQuestionForm(editingQuestion)}
          onCancel={() => setEditingQuestion(null)}
          onSubmit={handleUpdate}
        />
      )}

      <section className="course-flow-filter-card question-bank-detail-toolbar">
        <div className="question-bank-search">
          <Search size={16} />
          <input
            value={filters.keyword}
            placeholder="Search question, answer, explanation..."
            onChange={(event) => updateFilter("keyword", event.target.value)}
          />
        </div>

        <select
          value={filters.moduleId}
          onChange={(event) => updateFilter("moduleId", event.target.value)}
        >
          <option value="all">All modules</option>
          {modules.map((module) => (
            <option key={module.id} value={module.id}>
              {module.title}
            </option>
          ))}
        </select>

        <select
          value={filters.lessonId}
          onChange={(event) => updateFilter("lessonId", event.target.value)}
        >
          <option value="all">All lessons</option>
          {lessonOptions.map((lesson) => (
            <option key={lesson.value} value={lesson.value}>
              {lesson.label}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(event) => updateFilter("status", event.target.value)}
        >
          <option value="all">All status</option>
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="approved">Approved</option>
          <option value="published">Published</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={filters.type}
          onChange={(event) => updateFilter("type", event.target.value)}
        >
          <option value="all">All types</option>
          {QUESTION_TYPE_OPTIONS.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <select
          value={filters.difficulty}
          onChange={(event) => updateFilter("difficulty", event.target.value)}
        >
          <option value="all">All difficulty</option>
          {DIFFICULTIES.map((difficulty) => (
            <option key={difficulty.value} value={difficulty.value}>
              {difficulty.label}
            </option>
          ))}
        </select>

        <select
          value={filters.source}
          onChange={(event) => updateFilter("source", event.target.value)}
        >
          <option value="all">All sources</option>
          <option value="ai">AI-generated</option>
          <option value="manual">Manual</option>
        </select>
      </section>

      {bankQuestions.length === 0 ? (
        <DataState
          type="empty"
          title="No questions match"
          description="Adjust module, lesson, or search filters to find questions."
        />
      ) : (
        <section className="question-bank-question-list">
          {bankQuestions.map((question) => (
            <article key={question.id} className="question-bank-question-card">
              <div className="question-bank-question-card__main">
                <div className="demo-row demo-row--between">
                  <div>
                    <span className="demo-kicker">
                      {question.moduleTitle} / {question.lessonTitle}
                    </span>
                    <h3>{question.question}</h3>
                  </div>

                  <StatusBadge status={question.status} />
                </div>

                <p>
                  <div className="question-options-preview">
                    {(question.options || []).map((option) => {
                      const isCorrect = (
                        question.correctOptionIds || []
                      ).includes(option.id);

                      return (
                        <div
                          key={option.id}
                          className={
                            isCorrect
                              ? "question-option-preview is-correct"
                              : "question-option-preview"
                          }
                        >
                          <span>{option.label || option.id}</span>
                          <p>{option.text}</p>
                          {isCorrect && <strong>Correct answer</strong>}
                        </div>
                      );
                    })}
                  </div>
                </p>

                <p>
                  <strong>Explanation:</strong>{" "}
                  {question.explanation || "No explanation provided."}
                </p>

                <div className="question-bank-tags">
                  <span>{question.type}</span>
                  <span>{question.difficulty}</span>
                  <span>{question.bloom}</span>
                  <span>{question.clo}</span>
                  <span>
                    {question.isAiGenerated ? "AI-generated" : "Manual"}
                  </span>
                </div>
              </div>

              <div className="question-bank-question-card__actions">
                <button
                  type="button"
                  className="demo-secondary-action"
                  onClick={() => setEditingQuestion(question)}
                >
                  <Pencil size={16} />
                  Edit
                </button>

                <button
                  type="button"
                  className="demo-primary-action"
                  onClick={() => onApproveQuestion(question.id)}
                >
                  <CheckCircle2 size={16} />
                  Approve
                </button>

                <button
                  type="button"
                  className="demo-secondary-action"
                  onClick={() => onRejectQuestion(question.id)}
                >
                  <XCircle size={16} />
                  Reject
                </button>

                <button
                  type="button"
                  className="demo-secondary-action"
                  onClick={() => onDeleteQuestion(question.id)}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </section>
  );
}

export function QuestionBankPage() {
  const [questions, setQuestions] = useState(() =>
    getSmeQuestionBank().map(enrichQuestion),
  );
  const [selectedBank, setSelectedBank] = useState(null);
  const [viewMode, setViewMode] = useState(VIEW_MODE.GRID);
  const [keyword, setKeyword] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");

  const refresh = () => {
    const nextQuestions = getSmeQuestionBank().map(enrichQuestion);
    setQuestions(nextQuestions);

    if (selectedBank) {
      const nextBanks = buildQuestionBanks(nextQuestions);
      setSelectedBank(
        nextBanks.find((bank) => bank.courseId === selectedBank.courseId) ||
          null,
      );
    }
  };

  const banks = useMemo(() => {
    const questionCourseIds = new Set(
      questions.map((question) => question.courseId),
    );
    const questionBanks = buildQuestionBanks(questions);

    const emptyCourseBanks = getAllLifecycleCourses()
      .filter((course) => !questionCourseIds.has(course.id))
      .map((course) => ({
        id: `question-bank-${course.id}`,
        courseId: course.id,
        courseTitle: course.title,
        courseStatus: course.status,
        category: course.category || "General",
        level: course.level || "Mixed",
        questions: [],
        total: 0,
        approved: 0,
        review: 0,
        rejected: 0,
        aiGenerated: 0,
        manual: 0,
      }));

    return [...questionBanks, ...emptyCourseBanks];
  }, [questions]);

  const visibleBanks = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return banks.filter((bank) => {
      const matchesKeyword =
        !normalizedKeyword ||
        [bank.courseTitle, bank.category, bank.level]
          .join(" ")
          .toLowerCase()
          .includes(normalizedKeyword);

      const matchesCourse =
        courseFilter === "all" || bank.courseId === courseFilter;

      return matchesKeyword && matchesCourse;
    });
  }, [banks, keyword, courseFilter]);

  const handleCreateManual = (payload) => {
    createSmeQuestion(payload);
    refresh();
  };

  const handleGenerateAi = (payload) => {
    createAiDraftQuestion(payload);
    refresh();
  };

  const handleUpdateQuestion = (questionId, payload) => {
    updateSmeQuestion(questionId, payload);
    refresh();
  };

  const handleDeleteQuestion = (questionId) => {
    const confirmed = window.confirm(
      "Delete this question from the question bank?",
    );
    if (!confirmed) return;

    deleteSmeQuestion(questionId);
    refresh();
  };

  const handleApproveQuestion = (questionId) => {
    approveSmeQuestion(questionId);
    refresh();
  };

  const handleRejectQuestion = (questionId) => {
    rejectSmeQuestion(questionId);
    refresh();
  };

  return (
    <section className="question-bank-page">
      <PageHeader
        title="Question Bank"
        description="Manage question banks by course. SME can create manual questions or generate AI draft questions for review."
      />

      {selectedBank ? (
        <QuestionBankDetail
          bank={selectedBank}
          questions={questions}
          onBack={() => setSelectedBank(null)}
          onCreateManual={handleCreateManual}
          onGenerateAi={handleGenerateAi}
          onUpdateQuestion={handleUpdateQuestion}
          onDeleteQuestion={handleDeleteQuestion}
          onApproveQuestion={handleApproveQuestion}
          onRejectQuestion={handleRejectQuestion}
        />
      ) : (
        <>
          <QuestionBankToolbar
            keyword={keyword}
            courseFilter={courseFilter}
            viewMode={viewMode}
            banks={banks}
            onKeywordChange={setKeyword}
            onCourseFilterChange={setCourseFilter}
            onViewModeChange={setViewMode}
          />

          {visibleBanks.length === 0 ? (
            <DataState
              type="empty"
              title="No question banks found"
              description="Adjust the search keyword or course filter."
            />
          ) : (
            <section
              className={
                viewMode === VIEW_MODE.GRID
                  ? "question-bank-grid"
                  : "question-bank-list"
              }
            >
              {visibleBanks.map((bank) => (
                <QuestionBankCard
                  key={bank.courseId}
                  bank={bank}
                  viewMode={viewMode}
                  onOpen={setSelectedBank}
                />
              ))}
            </section>
          )}
        </>
      )}
    </section>
  );
}
