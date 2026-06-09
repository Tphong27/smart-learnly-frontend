import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Save } from 'lucide-react'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import {
  createClassFlowClass,
  getAvailableCourses,
  getAvailableTrainees,
  getAvailableTrainers,
} from '@/data/demo/classFlowRuntime'

const emptyForm = {
  className: '',
  description: '',
  courseId: '',
  trainerId: '',
  maxTrainees: 30,
  startDate: '',
  endDate: '',
  schedule: '',
  timeSlot: '',
  learningMode: 'online',
  traineeIds: [],
  inviteCode: '',
}

function createInviteCode() {
  return `SLP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

export function TmoCreateClassPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    inviteCode: createInviteCode(),
  }))
  const [error, setError] = useState('')

  const courses = getAvailableCourses().filter((c) => c.status === 'Published')
  const trainers = getAvailableTrainers()
  const trainees = getAvailableTrainees()

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const toggleTrainee = (traineeId) => {
    setForm((prev) => {
      const ids = new Set(prev.traineeIds)
      if (ids.has(traineeId)) {
        ids.delete(traineeId)
      } else {
        ids.add(traineeId)
      }
      return { ...prev, traineeIds: Array.from(ids) }
    })
  }

  const validate = () => {
    if (!form.className.trim()) return 'Class name is required.'
    if (!form.courseId) return 'Please select a course.'
    if (!form.trainerId) return 'Please select a trainer.'
    if (!form.startDate) return 'Start date is required.'
    if (!form.endDate) return 'End date is required.'
    return ''
  }

  const handleSaveDraft = () => {
    if (!form.className.trim()) {
      setError('Class name is required.')
      return
    }
    createClassFlowClass({ ...form, status: 'draft' })
    navigate('/tmo/classes')
  }

  const handleCreate = () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    const startDate = new Date(form.startDate)
    const status = startDate > new Date() ? 'upcoming' : 'running'
    createClassFlowClass({ ...form, status })
    navigate('/tmo/classes')
  }

  return (
    <section>
      <PageHeader
        title="Create Class"
        description="Set up a new training class with course, trainer, schedule, and trainees."
        action={
          <button
            type="button"
            className="demo-secondary-action"
            onClick={() => navigate('/tmo/classes')}
          >
            <ArrowLeft size={16} />
            Back to Classes
          </button>
        }
      />

      {error ? <p className="demo-form-error">{error}</p> : null}

      {/* Basic Information */}
      <section className="classflow-section">
        <h2 className="classflow-section__title">Basic Information</h2>
        <div className="course-flow-form-grid" style={{ marginTop: '1rem' }}>
          <label className="course-flow-field course-flow-field--wide">
            <span>Class name</span>
            <input
              value={form.className}
              placeholder="AWS Foundation - Evening Class"
              onChange={(e) => update('className', e.target.value)}
            />
          </label>

          <label className="course-flow-field course-flow-field--wide">
            <span>Description</span>
            <textarea
              rows="3"
              value={form.description}
              placeholder="Brief description of this class..."
              onChange={(e) => update('description', e.target.value)}
            />
          </label>

          <label className="course-flow-field">
            <span>Select published course</span>
            <select value={form.courseId} onChange={(e) => update('courseId', e.target.value)}>
              <option value="">Select course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </label>

          <label className="course-flow-field">
            <span>Assign trainer</span>
            <select value={form.trainerId} onChange={(e) => update('trainerId', e.target.value)}>
              <option value="">Select trainer</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>{t.displayName}</option>
              ))}
            </select>
          </label>

          <label className="course-flow-field">
            <span>Max trainees</span>
            <input
              type="number"
              min="1"
              value={form.maxTrainees}
              onChange={(e) => update('maxTrainees', e.target.value)}
            />
          </label>
        </div>
      </section>

      {/* Schedule */}
      <section className="classflow-section">
        <h2 className="classflow-section__title">Schedule</h2>
        <div className="course-flow-form-grid" style={{ marginTop: '1rem' }}>
          <label className="course-flow-field">
            <span>Start date</span>
            <input type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)} />
          </label>

          <label className="course-flow-field">
            <span>End date</span>
            <input type="date" value={form.endDate} onChange={(e) => update('endDate', e.target.value)} />
          </label>

          <label className="course-flow-field course-flow-field--wide">
            <span>Weekly schedule</span>
            <input
              value={form.schedule}
              placeholder="Tuesday, Thursday - 19:30 to 21:00"
              onChange={(e) => update('schedule', e.target.value)}
            />
          </label>

          <label className="course-flow-field">
            <span>Time slot</span>
            <input
              value={form.timeSlot}
              placeholder="19:30 - 21:00"
              onChange={(e) => update('timeSlot', e.target.value)}
            />
          </label>

          <label className="course-flow-field">
            <span>Learning mode</span>
            <select value={form.learningMode} onChange={(e) => update('learningMode', e.target.value)}>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>
        </div>
      </section>

      {/* Enrollment */}
      <section className="classflow-section">
        <h2 className="classflow-section__title">Enrollment</h2>
        <div style={{ marginTop: '1rem' }}>
          <p className="demo-muted" style={{ marginBottom: '0.75rem' }}>
            Select trainees to add to this class:
          </p>
          <div className="demo-list">
            {trainees.map((t) => (
              <label key={t.id} className="demo-list-item">
                <div>
                  <strong>{t.displayName}</strong>
                  <small>{t.email}</small>
                </div>
                <input
                  type="checkbox"
                  checked={form.traineeIds.includes(t.id)}
                  onChange={() => toggleTrainee(t.id)}
                />
              </label>
            ))}
          </div>

          <label className="course-flow-field" style={{ marginTop: '1rem' }}>
            <span>Invite code (auto-generated)</span>
            <input
              value={form.inviteCode}
              readOnly
              style={{ background: '#f8fafc' }}
            />
          </label>
        </div>
      </section>

      {/* Actions */}
      <div className="demo-actions" style={{ marginTop: '1.5rem' }}>
        <button type="button" className="demo-secondary-action" onClick={() => navigate('/tmo/classes')}>
          Cancel
        </button>
        <button type="button" className="demo-secondary-action" onClick={handleSaveDraft}>
          <Save size={16} />
          Save Draft
        </button>
        <button type="button" className="demo-primary-action" onClick={handleCreate}>
          <Plus size={16} />
          Create Class
        </button>
      </div>
    </section>
  )
}
