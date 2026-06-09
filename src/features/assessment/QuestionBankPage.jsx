import {
  Brain,
  CheckCircle2,
  Edit3,
  Save,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { DataState } from '@/shared/components/ui/DataState'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'
import {
  approveSmeQuestion,
  createAiDraftQuestion,
  getSmeQuestionBank,
  rejectSmeQuestion,
  updateSmeQuestion,
} from '@/data/demo/demoSmeRuntime'
import {
  getAllLifecycleCourses,
  getLifecycleCourseById,
  getLifecycleModules,
} from '@/data/demo/courseLifecycleRuntime'

const emptyEditForm = {
  question: '',
  answer: '',
  explanation: '',
  type: 'single_choice',
  clo: 'CLO-AI',
  bloom: 'Understand',
  difficulty: 'medium',
  status: 'review',
  source: '',
}

function toForm(question) {
  if (!question) return emptyEditForm

  return {
    question: question.question || '',
    answer: question.answer || '',
    explanation: question.explanation || '',
    type: question.type || 'single_choice',
    clo: question.clo || 'CLO-AI',
    bloom: question.bloom || 'Understand',
    difficulty: question.difficulty || 'medium',
    status: question.status || 'review',
    source: question.source || '',
  }
}

function getCourseTitle(courseId) {
  return getLifecycleCourseById(courseId)?.title || courseId || 'Unassigned course'
}

function getLessonTitle(courseId, lessonId) {
  if (!lessonId) return 'Course level'

  return (
    getLifecycleModules(courseId)
      .flatMap((module) => module.lessons || [])
      .find((lesson) => lesson.id === lessonId)?.title ||
    lessonId
  )
}

function QuestionDetailPanel({
  question,
  form,
  editing,
  onEdit,
  onChange,
  onSave,
  onApprove,
  onReject,
}) {
  if (!question) {
    return (
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <DataState
          type="empty"
          title="No question selected"
          description="Select a question from the table to review its detail."
        />
      </aside>
    )
  }

  if (editing) {
    return (
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="demo-row demo-row--between">
          <div>
            <span className="demo-kicker">Edit Question</span>
            <h2 className="text-lg font-bold text-slate-900">SME Review Form</h2>
          </div>
          <Edit3 size={20} />
        </div>

        <div className="course-flow-form-section mt-4">
          <label className="course-flow-field">
            <span>Question</span>
            <textarea
              rows="5"
              value={form.question}
              onChange={(event) =>
                onChange({ ...form, question: event.target.value })
              }
            />
          </label>

          <label className="course-flow-field">
            <span>Answer</span>
            <textarea
              rows="3"
              value={form.answer}
              onChange={(event) =>
                onChange({ ...form, answer: event.target.value })
              }
            />
          </label>

          <label className="course-flow-field">
            <span>Explanation</span>
            <textarea
              rows="3"
              value={form.explanation}
              onChange={(event) =>
                onChange({ ...form, explanation: event.target.value })
              }
            />
          </label>

          <div className="course-flow-form-grid course-flow-form-grid--compact">
            <label className="course-flow-field">
              <span>Type</span>
              <select
                value={form.type}
                onChange={(event) =>
                  onChange({ ...form, type: event.target.value })
                }
              >
                <option value="single_choice">Single choice</option>
                <option value="multiple_choice">Multiple choice</option>
                <option value="true_false">True / False</option>
                <option value="short_answer">Short answer</option>
              </select>
            </label>

            <label className="course-flow-field">
              <span>CLO</span>
              <input
                value={form.clo}
                onChange={(event) =>
                  onChange({ ...form, clo: event.target.value })
                }
              />
            </label>

            <label className="course-flow-field">
              <span>Bloom</span>
              <select
                value={form.bloom}
                onChange={(event) =>
                  onChange({ ...form, bloom: event.target.value })
                }
              >
                <option>Remember</option>
                <option>Understand</option>
                <option>Apply</option>
                <option>Analyze</option>
                <option>Evaluate</option>
                <option>Create</option>
              </select>
            </label>

            <label className="course-flow-field">
              <span>Difficulty</span>
              <select
                value={form.difficulty}
                onChange={(event) =>
                  onChange({ ...form, difficulty: event.target.value })
                }
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4 demo-actions">
          <button type="button" className="demo-primary-action" onClick={onSave}>
            <Save size={16} />
            Save question
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="demo-row demo-row--between">
        <div>
          <span className="demo-kicker">Question Detail</span>
          <h2 className="text-lg font-bold text-slate-900">SME review</h2>
        </div>
        <StatusBadge status={question.status} />
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Question</p>
          <p className="mt-1 font-medium text-slate-900">{question.question}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Answer</p>
          <p className="mt-1 text-sm text-slate-700">
            {question.answer || 'No answer provided.'}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            Explanation
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {question.explanation || 'No explanation provided.'}
          </p>
        </div>

        <dl className="course-flow-mini-grid">
          <div>
            <dt>Type</dt>
            <dd>{question.type}</dd>
          </div>
          <div>
            <dt>CLO</dt>
            <dd>{question.clo}</dd>
          </div>
          <div>
            <dt>Bloom</dt>
            <dd>{question.bloom}</dd>
          </div>
          <div>
            <dt>Difficulty</dt>
            <dd>{question.difficulty}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{question.source}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-5 demo-actions">
        <button type="button" className="demo-secondary-action" onClick={onEdit}>
          <Edit3 size={16} />
          Edit
        </button>

        <button type="button" className="demo-primary-action" onClick={onApprove}>
          <CheckCircle2 size={16} />
          Approve
        </button>

        <button type="button" className="demo-secondary-action" onClick={onReject}>
          <XCircle size={16} />
          Reject
        </button>
      </div>
    </aside>
  )
}

export function QuestionBankPage() {
  const [questions, setQuestions] = useState(() => getSmeQuestionBank())
  const [filters, setFilters] = useState({
    keyword: '',
    status: 'all',
    course: 'all',
    lesson: 'all',
    type: 'all',
    difficulty: 'all',
    source: 'all',
    sort: 'updated-desc',
  })
  const [selectedQuestionId, setSelectedQuestionId] = useState(
    questions[0]?.id || null,
  )
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(emptyEditForm)

  const selectedQuestion = questions.find(
    (question) => question.id === selectedQuestionId,
  )

  const courseOptions = useMemo(() => {
    const courseIds = new Set(questions.map((question) => question.courseId).filter(Boolean))
    const lifecycleCourses = getAllLifecycleCourses()
      .filter((course) => courseIds.has(course.id))
      .map((course) => ({ value: course.id, label: course.title }))
    const knownCourseIds = new Set(lifecycleCourses.map((course) => course.value))
    const localOnlyCourses = Array.from(courseIds)
      .filter((courseId) => !knownCourseIds.has(courseId))
      .map((courseId) => ({ value: courseId, label: courseId }))

    return [{ value: 'all', label: 'All courses' }, ...lifecycleCourses, ...localOnlyCourses]
  }, [questions])

  const lessonOptions = useMemo(() => {
    const questionLessons = questions
      .filter((question) => filters.course === 'all' || question.courseId === filters.course)
      .map((question) => ({
        value: question.lessonId || 'course-level',
        label: getLessonTitle(question.courseId, question.lessonId),
      }))
    const deduped = new Map(questionLessons.map((lesson) => [lesson.value, lesson]))

    return [{ value: 'all', label: 'All lessons' }, ...deduped.values()]
  }, [filters.course, questions])

  const typeOptions = useMemo(() => {
    return ['all', ...new Set(questions.map((question) => question.type).filter(Boolean))]
  }, [questions])

  const difficultyOptions = useMemo(() => {
    return ['all', ...new Set(questions.map((question) => question.difficulty).filter(Boolean))]
  }, [questions])

  const sourceOptions = useMemo(() => {
    return ['all', ...new Set(questions.map((question) => question.source).filter(Boolean))]
  }, [questions])

  const refresh = () => {
    const nextQuestions = getSmeQuestionBank()
    setQuestions(nextQuestions)

    if (!selectedQuestionId && nextQuestions[0]) {
      setSelectedQuestionId(nextQuestions[0].id)
    }
  }

  const filteredQuestions = useMemo(() => {
    const normalizedKeyword = filters.keyword.trim().toLowerCase()

    return questions
      .filter((question) => {
      const matchesKeyword = [
        question.question,
        question.type,
        getCourseTitle(question.courseId),
        getLessonTitle(question.courseId, question.lessonId),
        question.clo,
        question.bloom,
        question.difficulty,
        question.source,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedKeyword)

      const matchesStatus =
        filters.status === 'all' || question.status === filters.status
      const matchesCourse =
        filters.course === 'all' || question.courseId === filters.course
      const normalizedLessonId = question.lessonId || 'course-level'
      const matchesLesson =
        filters.lesson === 'all' || normalizedLessonId === filters.lesson
      const matchesType = filters.type === 'all' || question.type === filters.type
      const matchesDifficulty =
        filters.difficulty === 'all' || question.difficulty === filters.difficulty
      const matchesSource =
        filters.source === 'all' || question.source === filters.source

      return (
        matchesKeyword &&
        matchesStatus &&
        matchesCourse &&
        matchesLesson &&
        matchesType &&
        matchesDifficulty &&
        matchesSource
      )
    })
      .sort((a, b) => {
        if (filters.sort === 'created-desc') {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        }
        if (filters.sort === 'created-asc') {
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
        }
        if (filters.sort === 'difficulty') {
          return String(a.difficulty).localeCompare(String(b.difficulty))
        }
        return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
      })
  }, [filters, questions])

  const updateFilter = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
      ...(name === 'course' ? { lesson: 'all' } : {}),
    }))
  }

  const resetFilters = () => {
    setFilters({
      keyword: '',
      status: 'all',
      course: 'all',
      lesson: 'all',
      type: 'all',
      difficulty: 'all',
      source: 'all',
      sort: 'updated-desc',
    })
  }

  const hasActiveFilters =
    filters.keyword ||
    filters.status !== 'all' ||
    filters.course !== 'all' ||
    filters.lesson !== 'all' ||
    filters.type !== 'all' ||
    filters.difficulty !== 'all' ||
    filters.source !== 'all' ||
    filters.sort !== 'updated-desc'

  const handleGenerateAiDraft = () => {
    const created = createAiDraftQuestion()
    refresh()
    setSelectedQuestionId(created.id)
    setEditing(false)
  }

  const handleEdit = () => {
    setForm(toForm(selectedQuestion))
    setEditing(true)
  }

  const handleSave = () => {
    if (!selectedQuestion) return

    updateSmeQuestion(selectedQuestion.id, form)
    refresh()
    setEditing(false)
  }

  const handleApprove = () => {
    if (!selectedQuestion) return

    approveSmeQuestion(selectedQuestion.id)
    refresh()
    setEditing(false)
  }

  const handleReject = () => {
    if (!selectedQuestion) return

    rejectSmeQuestion(selectedQuestion.id)
    refresh()
    setEditing(false)
  }

  const header = (
    <PageHeader
      title="Question Bank"
      description="Review, edit, approve, or reject official and AI-generated questions before publishing tests."
      action={
        <button className="dev2-primary-button" onClick={handleGenerateAiDraft}>
          <Brain size={16} />
          Generate AI Draft
        </button>
      }
    />
  )

  if (questions.length === 0) {
    return (
      <section>
        {header}
        <DataState
          type="empty"
          title="No questions found"
          description="Create or generate a draft question before publishing tests."
        />
      </section>
    )
  }

  return (
    <section>
      {header}

      <FilterToolbar>
        <SearchBox
          value={filters.keyword}
          placeholder="Search question, course, lesson"
          ariaLabel="Search question bank"
          onChange={(value) => updateFilter('keyword', value)}
        />

        <SelectFilter
          value={filters.status}
          onChange={(value) => updateFilter('status', value)}
          ariaLabel="Filter questions by status"
          options={[
            { value: 'all', label: 'All status' },
            { value: 'review', label: 'Review' },
            { value: 'draft', label: 'Draft' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]}
        />

        <SelectFilter
          value={filters.course}
          onChange={(value) => updateFilter('course', value)}
          ariaLabel="Filter questions by course"
          options={courseOptions}
        />

        <SelectFilter
          value={filters.lesson}
          onChange={(value) => updateFilter('lesson', value)}
          ariaLabel="Filter questions by lesson"
          options={lessonOptions}
        />

        <SelectFilter
          value={filters.type}
          onChange={(value) => updateFilter('type', value)}
          ariaLabel="Filter questions by type"
          options={typeOptions.map((type) => ({
            value: type,
            label: type === 'all' ? 'All types' : type,
          }))}
        />

        <SelectFilter
          value={filters.difficulty}
          onChange={(value) => updateFilter('difficulty', value)}
          ariaLabel="Filter questions by difficulty"
          options={difficultyOptions.map((difficulty) => ({
            value: difficulty,
            label: difficulty === 'all' ? 'All difficulty' : difficulty,
          }))}
        />

        <SelectFilter
          value={filters.source}
          onChange={(value) => updateFilter('source', value)}
          ariaLabel="Filter questions by source"
          options={sourceOptions.map((source) => ({
            value: source,
            label: source === 'all' ? 'All sources' : source,
          }))}
        />

        <SelectFilter
          value={filters.sort}
          onChange={(value) => updateFilter('sort', value)}
          ariaLabel="Sort questions"
          options={[
            { value: 'updated-desc', label: 'Last updated' },
            { value: 'created-desc', label: 'Newest created' },
            { value: 'created-asc', label: 'Oldest created' },
            { value: 'difficulty', label: 'Difficulty A-Z' },
          ]}
        />

        <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
      </FilterToolbar>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {filteredQuestions.length === 0 ? (
          <DataState
            type="empty"
            title="No questions match"
            description="Adjust the question filters or clear them to see the full bank."
            action={
              <button type="button" className="demo-primary-action" onClick={resetFilters}>
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Question</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">CLO</th>
                  <th className="px-4 py-3">Bloom</th>
                  <th className="px-4 py-3">Difficulty</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredQuestions.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      item.id === selectedQuestionId
                        ? 'align-top bg-blue-50'
                        : 'align-top hover:bg-slate-50'
                    }
                    onClick={() => {
                      setSelectedQuestionId(item.id)
                      setEditing(false)
                    }}
                  >
                    <td className="max-w-md px-4 py-4">
                      <p className="font-medium text-slate-900">{item.question}</p>
                      {item.isAiGenerated ? (
                        <p className="mt-1 text-xs font-medium text-purple-600">
                          AI-generated draft - SME review required
                        </p>
                      ) : null}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      <strong>{getCourseTitle(item.courseId)}</strong>
                      <br />
                      <small>{getLessonTitle(item.courseId, item.lessonId)}</small>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{item.type}</td>
                    <td className="px-4 py-4 text-slate-600">{item.clo}</td>
                    <td className="px-4 py-4 text-slate-600">{item.bloom}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {item.difficulty}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-4 text-slate-500">{item.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        <QuestionDetailPanel
          question={selectedQuestion}
          form={form}
          editing={editing}
          onEdit={handleEdit}
          onChange={setForm}
          onSave={handleSave}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>
    </section>
  )
}
