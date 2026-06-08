import { useMemo, useState } from 'react'
import {
  ArrowRight,
  ClipboardCheck,
  Clock3,
  Edit3,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Upload,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getAllDemoEnrollments } from '@/data/demo/demoRuntime'
import {
  getAllLifecycleTests,
  getLifecycleCourseById,
} from '@/data/demo/courseLifecycleRuntime'
import {
  createTraineeTest,
  deleteTraineeTest,
  getModulesForTraineeTest,
  getTraineeCourseOptions,
  getTraineeCreatedTests,
  updateTraineeTest,
} from '@/data/demo/demoTraineeRuntime'
import { PageState } from '@/shared/components/PageState'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useDemoPageState } from '@/shared/hooks/useDemoPageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

const emptyForm = {
  title: '',
  description: '',
  courseId: '',
  sourceType: 'modules',
  selectedModuleIds: [],
  uploadedFileName: '',
  totalQuestions: 10,
  durationMinutes: 20,
  passingScore: 70,
}

function TestFormModal({ open, mode, form, onChange, onClose, onSubmit }) {
  const modules = form.courseId ? getModulesForTraineeTest(form.courseId) : []

  if (!open) return null

  const updateField = (name, value) => {
    onChange({
      ...form,
      [name]: value,
    })
  }

  const toggleModule = (moduleId) => {
    const selected = new Set(form.selectedModuleIds)

    if (selected.has(moduleId)) {
      selected.delete(moduleId)
    } else {
      selected.add(moduleId)
    }

    updateField('selectedModuleIds', Array.from(selected))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <section className="demo-card w-full max-w-3xl">
        <div className="demo-row demo-row--between">
          <div>
            <span className="demo-kicker">
              {mode === 'create' ? 'Create test' : 'Update test'}
            </span>
            <h2>
              {mode === 'create'
                ? 'Generate personal practice test'
                : 'Update your personal test'}
            </h2>
          </div>

          <Sparkles size={24} />
        </div>

        <div className="course-flow-form-section">
          <label className="course-flow-field">
            <span>Test title</span>
            <input
              value={form.title}
              placeholder="AWS pricing practice test"
              onChange={(event) => updateField('title', event.target.value)}
            />
          </label>

          <label className="course-flow-field">
            <span>Description</span>
            <textarea
              rows="3"
              value={form.description}
              placeholder="Practice test generated from selected course modules."
              onChange={(event) =>
                updateField('description', event.target.value)
              }
            />
          </label>

          <label className="course-flow-field">
            <span>Course</span>
            <select
              value={form.courseId}
              onChange={(event) => {
                onChange({
                  ...form,
                  courseId: event.target.value,
                  selectedModuleIds: [],
                })
              }}
            >
              <option value="">Select enrolled course</option>
              {getTraineeCourseOptions().map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>

          <div className="course-flow-form-grid course-flow-form-grid--compact">
            <label className="course-flow-field">
              <span>Questions</span>
              <input
                type="number"
                value={form.totalQuestions}
                onChange={(event) =>
                  updateField('totalQuestions', event.target.value)
                }
              />
            </label>

            <label className="course-flow-field">
              <span>Duration minutes</span>
              <input
                type="number"
                value={form.durationMinutes}
                onChange={(event) =>
                  updateField('durationMinutes', event.target.value)
                }
              />
            </label>

            <label className="course-flow-field">
              <span>Passing score</span>
              <input
                type="number"
                value={form.passingScore}
                onChange={(event) =>
                  updateField('passingScore', event.target.value)
                }
              />
            </label>
          </div>

          <section className="demo-card">
            <span className="demo-kicker">AI source</span>
            <h3>Choose how the test is generated</h3>

            <div className="demo-actions">
              <button
                type="button"
                className={
                  form.sourceType === 'modules'
                    ? 'demo-primary-action'
                    : 'demo-secondary-action'
                }
                onClick={() => updateField('sourceType', 'modules')}
              >
                <ClipboardCheck size={16} />
                Select course modules
              </button>

              <button
                type="button"
                className={
                  form.sourceType === 'upload'
                    ? 'demo-primary-action'
                    : 'demo-secondary-action'
                }
                onClick={() => updateField('sourceType', 'upload')}
              >
                <Upload size={16} />
                Upload document mock
              </button>
            </div>

            {form.sourceType === 'modules' ? (
              <div className="demo-list">
                {modules.map((module) => (
                  <label key={module.id} className="demo-list-item">
                    <div>
                      <strong>{module.title}</strong>
                      <small>{module.lessons.length} lessons</small>
                    </div>

                    <input
                      type="checkbox"
                      checked={form.selectedModuleIds.includes(module.id)}
                      onChange={() => toggleModule(module.id)}
                    />
                  </label>
                ))}
              </div>
            ) : (
              <label className="course-flow-field">
                <span>Uploaded file name mock</span>
                <input
                  value={form.uploadedFileName}
                  placeholder="aws-practice-material.pdf"
                  onChange={(event) =>
                    updateField('uploadedFileName', event.target.value)
                  }
                />
              </label>
            )}
          </section>
        </div>

        <div className="demo-actions">
          <button type="button" className="demo-secondary-action" onClick={onClose}>
            Cancel
          </button>

          <button type="button" className="demo-primary-action" onClick={onSubmit}>
            <Sparkles size={16} />
            {mode === 'create' ? 'Create AI test' : 'Save changes'}
          </button>
        </div>
      </section>
    </div>
  )
}

function TestCard({ test, personal, onEdit, onDelete }) {
  const course = getLifecycleCourseById(test.courseId)

  return (
    <article className="demo-card test-card">
      <div className="demo-row demo-row--between">
        <StatusBadge status={test.status} />
        <span className="test-card__course">
          {test.courseTitle || course?.title}
        </span>
      </div>

      <div className="demo-chip-list">
        <span>{test.type || 'Module Test'}</span>
        <span>{test.testStatus || 'Not Started'}</span>
        {personal && <span>Created by me</span>}
      </div>

      <h2>{test.title}</h2>
      <p>{test.description}</p>

      <div className="demo-meta-grid">
        <span>
          <ClipboardCheck size={15} /> {test.totalQuestions} questions
        </span>
        <span>
          <Clock3 size={15} /> {test.durationMinutes} min
        </span>
        <span>
          <Target size={15} /> {test.passingScore}% pass
        </span>
      </div>

      <div className="demo-actions">
        {!personal && (
          <Link className="demo-primary-action" to={`/tests/${test.id}`}>
            View test <ArrowRight size={16} />
          </Link>
        )}

        {personal && (
          <>
            <button
              type="button"
              className="demo-secondary-action"
              onClick={() => onEdit(test)}
            >
              <Edit3 size={16} />
              Update
            </button>

            <button
              type="button"
              className="demo-secondary-action"
              onClick={() => onDelete(test.id)}
            >
              <Trash2 size={16} />
              Delete
            </button>
          </>
        )}
      </div>
    </article>
  )
}

export function TestListPage() {
  useDocumentTitle('Tests and practice')

  const { loading, error } = useDemoPageState()
  const [activeTab, setActiveTab] = useState('available')
  const [personalTests, setPersonalTests] = useState(() =>
    getTraineeCreatedTests(),
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [editingTestId, setEditingTestId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const enrolledCourseIds = new Set(
    getAllDemoEnrollments().map((enrollment) => enrollment.courseId),
  )

  const availableTests = useMemo(() => {
    return getAllLifecycleTests().filter(
      (test) =>
        test.status === 'published' && enrolledCourseIds.has(test.courseId),
    )
  }, [])

  const completedTests = availableTests.filter(
    (test) => test.testStatus === 'Completed' || test.bestScore,
  )

  const openCreateModal = () => {
    const firstCourse = getTraineeCourseOptions()[0]

    setModalMode('create')
    setEditingTestId(null)
    setForm({
      ...emptyForm,
      courseId: firstCourse?.id || '',
    })
    setModalOpen(true)
  }

  const openUpdateModal = (test) => {
    setModalMode('update')
    setEditingTestId(test.id)
    setForm({
      title: test.title,
      description: test.description,
      courseId: test.courseId,
      sourceType: test.sourceType || 'modules',
      selectedModuleIds: test.selectedModuleIds || [],
      uploadedFileName: test.uploadedFileName || '',
      totalQuestions: test.totalQuestions,
      durationMinutes: test.durationMinutes,
      passingScore: test.passingScore,
    })
    setModalOpen(true)
  }

  const handleSubmit = () => {
    if (!form.title.trim() || !form.courseId) return

    if (modalMode === 'create') {
      createTraineeTest(form)
    } else {
      updateTraineeTest(editingTestId, form)
    }

    setPersonalTests(getTraineeCreatedTests())
    setModalOpen(false)
  }

  const handleDelete = (testId) => {
    deleteTraineeTest(testId)
    setPersonalTests(getTraineeCreatedTests())
  }

  if (loading) {
    return (
      <PageState
        state="loading"
        title="Loading tests"
        description="Checking published tests and your personal tests."
      />
    )
  }

  if (error) {
    return (
      <PageState
        state="error"
        title="Tests unavailable"
        description={error.message}
      />
    )
  }

  return (
    <main className="demo-page">
      <section className="demo-hero-band">
        <div>
          <span className="demo-kicker">Tests and practice</span>
          <h1>Practice from your enrolled courses</h1>
          <p>
            View assigned tests, create AI-generated personal tests, update your
            own tests, and delete tests created by you.
          </p>
        </div>

        <button type="button" className="demo-primary-action" onClick={openCreateModal}>
          <Plus size={16} />
          Create AI Test
        </button>
      </section>

      <section className="demo-toolbar">
        <div className="demo-actions">
          <button
            type="button"
            className={
              activeTab === 'available'
                ? 'demo-primary-action'
                : 'demo-secondary-action'
            }
            onClick={() => setActiveTab('available')}
          >
            Assigned tests
          </button>

          <button
            type="button"
            className={
              activeTab === 'personal'
                ? 'demo-primary-action'
                : 'demo-secondary-action'
            }
            onClick={() => setActiveTab('personal')}
          >
            My generated tests
          </button>

          <button
            type="button"
            className={
              activeTab === 'completed'
                ? 'demo-primary-action'
                : 'demo-secondary-action'
            }
            onClick={() => setActiveTab('completed')}
          >
            Completed
          </button>
        </div>
      </section>

      {activeTab === 'available' && (
        <section className="demo-card-grid">
          {availableTests.map((test) => (
            <TestCard key={test.id} test={test} />
          ))}
        </section>
      )}

      {activeTab === 'personal' &&
        (personalTests.length === 0 ? (
          <PageState
            state="empty"
            title="No personal tests yet"
            description="Create an AI-generated test from uploaded material or selected modules."
            action={
              <button
                type="button"
                className="demo-primary-action"
                onClick={openCreateModal}
              >
                <Plus size={16} />
                Create test
              </button>
            }
          />
        ) : (
          <section className="demo-card-grid">
            {personalTests.map((test) => (
              <TestCard
                key={test.id}
                test={test}
                personal
                onEdit={openUpdateModal}
                onDelete={handleDelete}
              />
            ))}
          </section>
        ))}

      {activeTab === 'completed' &&
        (completedTests.length === 0 ? (
          <PageState
            state="empty"
            title="No completed tests"
            description="Completed test attempts will appear here after practice."
          />
        ) : (
          <section className="demo-card-grid">
            {completedTests.map((test) => (
              <TestCard key={test.id} test={test} />
            ))}
          </section>
        ))}

      <TestFormModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        onChange={setForm}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </main>
  )
}