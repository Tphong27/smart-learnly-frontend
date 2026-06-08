import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Edit3,
  ExternalLink,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { DataState } from '@/shared/components/ui/DataState'
import { KpiCard } from '@/shared/components/ui/KpiCard'
import { Modal } from '@/shared/components/ui/Modal/Modal'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import {
  createTmoClass,
  deleteTmoClass,
  getTmoClasses,
  getTmoCourseOptions,
  getTrainerOptions,
  updateTmoClass,
} from '@/data/demo/demoTmoRuntime'

const initialClassForm = {
  name: '',
  courseId: '',
  trainerId: '',
  status: 'upcoming',
  traineeCount: 0,
  startDate: '',
  endDate: '',
  schedule: '',
  meetLink: '',
}

function formatDate(value) {
  if (!value) return 'Not scheduled'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function ClassFormModal({
  open,
  mode,
  form,
  error,
  onChange,
  onClose,
  onSubmit,
}) {
  const courseOptions = getTmoCourseOptions()
  const trainerOptions = getTrainerOptions()

  if (!open) return null

  const updateField = (name, value) => {
    onChange({
      ...form,
      [name]: value,
    })
  }

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Create Class' : 'Update Class'}
      description="Assign course, trainer, schedule, and meeting link for a class."
      footer={
        <div className="course-flow-modal-actions">
          <button type="button" className="demo-secondary-action" onClick={onClose}>
            Cancel
          </button>

          <button type="button" className="demo-primary-action" onClick={onSubmit}>
            {mode === 'create' ? 'Create Class' : 'Save Changes'}
          </button>
        </div>
      }
      onClose={onClose}
    >
      <div className="course-flow-form-grid">
        <label className="course-flow-field course-flow-field--wide">
          <span>Class name</span>
          <input
            value={form.name}
            placeholder="AWS Foundation - Evening Class"
            onChange={(event) => updateField('name', event.target.value)}
          />
        </label>

        <label className="course-flow-field course-flow-field--wide">
          <span>Course</span>
          <select
            value={form.courseId}
            onChange={(event) => updateField('courseId', event.target.value)}
          >
            <option value="">Select course</option>
            {courseOptions.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>

        <label className="course-flow-field">
          <span>Trainer</span>
          <select
            value={form.trainerId}
            onChange={(event) => updateField('trainerId', event.target.value)}
          >
            <option value="">Select trainer</option>
            {trainerOptions.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.displayName}
              </option>
            ))}
          </select>
        </label>

        <label className="course-flow-field">
          <span>Status</span>
          <select
            value={form.status}
            onChange={(event) => updateField('status', event.target.value)}
          >
            <option value="upcoming">Upcoming</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label className="course-flow-field">
          <span>Start date</span>
          <input
            type="date"
            value={form.startDate}
            onChange={(event) => updateField('startDate', event.target.value)}
          />
        </label>

        <label className="course-flow-field">
          <span>End date</span>
          <input
            type="date"
            value={form.endDate}
            onChange={(event) => updateField('endDate', event.target.value)}
          />
        </label>

        <label className="course-flow-field course-flow-field--wide">
          <span>Schedule</span>
          <input
            value={form.schedule}
            placeholder="Tuesday, Thursday - 19:30 to 21:00"
            onChange={(event) => updateField('schedule', event.target.value)}
          />
        </label>

        <label className="course-flow-field course-flow-field--wide">
          <span>Google Meet / Class link</span>
          <input
            value={form.meetLink}
            placeholder="https://meet.google.com/slp-class"
            onChange={(event) => updateField('meetLink', event.target.value)}
          />
        </label>

        <label className="course-flow-field">
          <span>Trainee capacity</span>
          <input
            type="number"
            value={form.traineeCount}
            onChange={(event) => updateField('traineeCount', event.target.value)}
          />
        </label>
      </div>

      {error ? <p className="demo-form-error">{error}</p> : null}
    </Modal>
  )
}

function ClassTable({ classes, onEdit, onDelete }) {
  if (classes.length === 0) {
    return (
      <DataState
        type="empty"
        title="No classes found"
        description="Create a class or change the filters."
      />
    )
  }

  return (
    <div className="course-flow-table-wrap">
      <table className="course-flow-table">
        <thead>
          <tr>
            <th>Class</th>
            <th>Course</th>
            <th>Trainer</th>
            <th>Schedule</th>
            <th>Dates</th>
            <th>Trainees</th>
            <th>Status</th>
            <th>Meet</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {classes.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.displayName || item.name}</strong>
              </td>

              <td>{item.courseTitle}</td>
              <td>{item.trainerName}</td>
              <td>{item.schedule || 'Not configured'}</td>
              <td>
                {formatDate(item.startDate)} - {formatDate(item.endDate)}
              </td>
              <td>{item.traineeCount}</td>
              <td>
                <StatusBadge status={item.status} />
              </td>
              <td>
                {item.meetLink ? (
                  <a href={item.meetLink} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} />
                  </a>
                ) : (
                  'N/A'
                )}
              </td>

              <td>
                <div className="course-flow-row-actions">
                  <button type="button" onClick={() => onEdit(item)}>
                    <Edit3 size={15} />
                    Edit
                  </button>

                  <button type="button" onClick={() => onDelete(item.id)}>
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TmoClassManagementPage() {
  const [classes, setClasses] = useState(() => getTmoClasses())
  const [filters, setFilters] = useState({
    keyword: '',
    status: 'all',
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [editingClassId, setEditingClassId] = useState(null)
  const [form, setForm] = useState(initialClassForm)
  const [error, setError] = useState('')

  const runningCount = classes.filter((item) => item.status === 'running').length
  const upcomingCount = classes.filter((item) => item.status === 'upcoming').length
  const completedCount = classes.filter((item) => item.status === 'completed').length

  const visibleClasses = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()

    return classes.filter((item) => {
      const matchesKeyword = [
        item.name,
        item.displayName,
        item.courseTitle,
        item.trainerName,
        item.schedule,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)

      const matchesStatus =
        filters.status === 'all' || item.status === filters.status

      return matchesKeyword && matchesStatus
    })
  }, [classes, filters])

  const refresh = () => {
    setClasses(getTmoClasses())
  }

  const updateFilter = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const openCreate = () => {
    setModalMode('create')
    setEditingClassId(null)
    setForm(initialClassForm)
    setError('')
    setModalOpen(true)
  }

  const openUpdate = (classItem) => {
    setModalMode('update')
    setEditingClassId(classItem.id)
    setForm({
      name: classItem.displayName || classItem.name,
      courseId: classItem.courseId,
      trainerId: classItem.trainerId,
      status: classItem.status,
      traineeCount: classItem.traineeCount,
      startDate: classItem.startDate,
      endDate: classItem.endDate,
      schedule: classItem.schedule,
      meetLink: classItem.meetLink,
    })
    setError('')
    setModalOpen(true)
  }

  const validate = () => {
    if (!form.name.trim()) return 'Class name is required.'
    if (!form.courseId) return 'Please select a course.'
    if (!form.trainerId) return 'Please select a trainer.'
    if (!form.startDate) return 'Start date is required.'
    if (!form.endDate) return 'End date is required.'
    if (!form.schedule.trim()) return 'Schedule is required.'
    return ''
  }

  const submit = () => {
    const validationError = validate()

    if (validationError) {
      setError(validationError)
      return
    }

    if (modalMode === 'create') {
      createTmoClass(form)
    } else {
      updateTmoClass(editingClassId, form)
    }

    refresh()
    setModalOpen(false)
  }

  const remove = (classId) => {
    const confirmed = window.confirm('Delete this class from TMO demo data?')
    if (!confirmed) return

    deleteTmoClass(classId)
    refresh()
  }

  return (
    <section>
      <PageHeader
        title="Class Management"
        description="Create, schedule, and assign training classes to trainers."
        action={
          <button type="button" className="dev2-primary-button" onClick={openCreate}>
            <Plus size={16} />
            Create Class
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Classes" value={classes.length} icon={Users} />
        <KpiCard title="Running" value={runningCount} icon={CalendarDays} />
        <KpiCard title="Upcoming" value={upcomingCount} icon={CalendarDays} />
        <KpiCard title="Completed" value={completedCount} icon={CalendarDays} />
      </div>

      <div className="course-flow-filter-card">
        <label className="course-flow-search">
          <Search size={17} />
          <input
            value={filters.keyword}
            placeholder="Search class, course, trainer"
            onChange={(event) => updateFilter('keyword', event.target.value)}
          />
        </label>

        <select
          value={filters.status}
          onChange={(event) => updateFilter('status', event.target.value)}
        >
          <option value="all">All status</option>
          <option value="running">Running</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <ClassTable
        classes={visibleClasses}
        onEdit={openUpdate}
        onDelete={remove}
      />

      <ClassFormModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        error={error}
        onChange={setForm}
        onClose={() => setModalOpen(false)}
        onSubmit={submit}
      />
    </section>
  )
}