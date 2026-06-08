import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Send } from 'lucide-react'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import {
  createLifecycleCourse,
  getSmeOptions,
} from '@/data/demo/courseLifecycleRuntime'
import { COURSE_STATUSES } from '@/data/demo/courseLifecycle'
import { CourseStatusBadge } from './CourseStatusBadge'

const initialForm = {
  title: '',
  shortDescription: '',
  fullDescription: '',
  category: 'Cloud Computing',
  level: 'Beginner',
  price: '',
  thumbnail: '',
  targetLearners: '',
  requirements: '',
  learningOutcomes: '',
  assignedSmeId: '',
  expectedCompletionDate: '',
}

function splitLines(value) {
  return String(value || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function CourseBasicInfoForm({ form, onChange }) {
  return (
    <section className="course-flow-form-section">
      <h2>Basic Information</h2>
      <div className="course-flow-form-grid">
        <label className="course-flow-field course-flow-field--wide">
          <span>Course title</span>
          <input value={form.title} onChange={(event) => onChange('title', event.target.value)} required />
        </label>
        <label className="course-flow-field">
          <span>Category</span>
          <input value={form.category} onChange={(event) => onChange('category', event.target.value)} />
        </label>
        <label className="course-flow-field">
          <span>Level</span>
          <select value={form.level} onChange={(event) => onChange('level', event.target.value)}>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
            <option>All levels</option>
          </select>
        </label>
        <label className="course-flow-field">
          <span>Price</span>
          <input type="number" value={form.price} onChange={(event) => onChange('price', event.target.value)} />
        </label>
        <label className="course-flow-field">
          <span>Thumbnail URL</span>
          <input value={form.thumbnail} onChange={(event) => onChange('thumbnail', event.target.value)} />
        </label>
        <label className="course-flow-field course-flow-field--wide">
          <span>Short description</span>
          <textarea rows="3" value={form.shortDescription} onChange={(event) => onChange('shortDescription', event.target.value)} />
        </label>
        <label className="course-flow-field course-flow-field--wide">
          <span>Full description</span>
          <textarea rows="5" value={form.fullDescription} onChange={(event) => onChange('fullDescription', event.target.value)} />
        </label>
      </div>
    </section>
  )
}

function LearningInfoForm({ form, onChange }) {
  return (
    <section className="course-flow-form-section">
      <h2>Learning Information</h2>
      <div className="course-flow-form-grid">
        <label className="course-flow-field course-flow-field--wide">
          <span>Target learners</span>
          <textarea rows="3" value={form.targetLearners} onChange={(event) => onChange('targetLearners', event.target.value)} />
        </label>
        <label className="course-flow-field course-flow-field--wide">
          <span>Requirements</span>
          <textarea rows="3" value={form.requirements} onChange={(event) => onChange('requirements', event.target.value)} />
        </label>
        <label className="course-flow-field course-flow-field--wide">
          <span>Learning outcomes</span>
          <textarea
            rows="4"
            value={form.learningOutcomes}
            placeholder="One outcome per line"
            onChange={(event) => onChange('learningOutcomes', event.target.value)}
          />
        </label>
      </div>
    </section>
  )
}

function SmeAssignmentSelect({ form, onChange }) {
  const smeOptions = getSmeOptions()

  return (
    <section className="course-flow-form-section">
      <h2>Assignment</h2>
      <div className="course-flow-form-grid">
        <label className="course-flow-field">
          <span>Assigned SME</span>
          <select value={form.assignedSmeId} onChange={(event) => onChange('assignedSmeId', event.target.value)}>
            <option value="">Unassigned</option>
            {smeOptions.map((sme) => (
              <option key={sme.id} value={sme.id}>{sme.displayName}</option>
            ))}
          </select>
        </label>
        <label className="course-flow-field">
          <span>Expected completion date</span>
          <input type="date" value={form.expectedCompletionDate} onChange={(event) => onChange('expectedCompletionDate', event.target.value)} />
        </label>
      </div>
    </section>
  )
}

function CoursePreviewCard({ form, previewStatus }) {
  const outcomes = useMemo(() => splitLines(form.learningOutcomes), [form.learningOutcomes])

  return (
    <aside className="course-flow-preview-card">
      <div className="course-flow-preview-thumb">
        {form.thumbnail ? <img src={form.thumbnail} alt="" /> : <span>SLP Course</span>}
      </div>
      <CourseStatusBadge status={previewStatus} />
      <h2>{form.title || 'Course title preview'}</h2>
      <p>{form.shortDescription || 'Short course description will appear here.'}</p>
      <dl>
        <div><dt>Category</dt><dd>{form.category}</dd></div>
        <div><dt>Level</dt><dd>{form.level}</dd></div>
        <div><dt>Price</dt><dd>{form.price ? `${Number(form.price).toLocaleString('vi-VN')} VND` : 'Free'}</dd></div>
      </dl>
      <div className="course-flow-preview-list">
        <strong>Learning outcomes</strong>
        {outcomes.length ? outcomes.map((item) => <span key={item}>{item}</span>) : <span>Add outcomes for preview.</span>}
      </div>
    </aside>
  )
}

export function TmoCreateCoursePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [formError, setFormError] = useState('')

  const updateForm = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
  }

  const buildPayload = () => ({
    ...form,
    learningOutcomes: splitLines(form.learningOutcomes),
  })

  const handleSave = (status) => {
    setFormError('')

    if (!form.title.trim() || !form.shortDescription.trim()) {
      setFormError('Course title and short description are required.')
      return
    }

    createLifecycleCourse(buildPayload(), status)
    navigate('/tmo/courses')
  }

  return (
    <section>
      <PageHeader
        title="Create Course"
        description="TMO creates the basic course structure before assigning SME content ownership."
        action={
          <button type="button" className="dev2-secondary-button" onClick={() => navigate('/tmo/courses')}>
            <ArrowLeft size={16} />
            Back to Courses
          </button>
        }
      />

      <div className="course-flow-create-layout">
        <form className="course-flow-form-card" onSubmit={(event) => event.preventDefault()}>
          <CourseBasicInfoForm form={form} onChange={updateForm} />
          <LearningInfoForm form={form} onChange={updateForm} />
          <SmeAssignmentSelect form={form} onChange={updateForm} />

          {formError && <p className="demo-form-error">{formError}</p>}

          <div className="course-flow-form-actions">
            <button
              type="button"
              className="demo-secondary-action"
              onClick={() => handleSave(COURSE_STATUSES.DRAFT)}
            >
              <Save size={16} />
              Save as Draft
            </button>
            <button
              type="button"
              className="demo-primary-action"
              onClick={() => handleSave(COURSE_STATUSES.ASSIGNED_TO_SME)}
            >
              <Send size={16} />
              Save and Assign to SME
            </button>
            <button type="button" className="demo-link-button" onClick={() => navigate('/tmo/courses')}>
              Cancel
            </button>
          </div>
        </form>

        <CoursePreviewCard
          form={form}
          previewStatus={form.assignedSmeId ? COURSE_STATUSES.ASSIGNED_TO_SME : COURSE_STATUSES.DRAFT}
        />
      </div>
    </section>
  )
}

