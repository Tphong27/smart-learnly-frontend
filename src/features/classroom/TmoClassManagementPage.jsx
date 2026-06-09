import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  CheckCircle2,
  Edit3,
  Eye,
  Plus,
  Settings,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react'
import { DataState } from '@/shared/components/ui/DataState'
import { KpiCard } from '@/shared/components/ui/KpiCard'
import { Modal } from '@/shared/components/ui/Modal/Modal'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
  StatusTabs,
} from '@/shared/components/ui/ListControls'
import {
  createClassFlowClass,
  getAvailableCourses,
  getAvailableTrainers,
  getClassFlowClasses,
  updateClassFlowClass,
} from '@/data/demo/classFlowRuntime'

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
  const courseOptions = getAvailableCourses()
  const trainerOptions = getAvailableTrainers()

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

function ClassTable({ classes, onEdit, onDelete, onStatusChange }) {
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
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {classes.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.className || item.displayName || item.name}</strong>
              </td>

              <td>{item.courseTitle}</td>
              <td>{item.trainerName}</td>
              <td>{item.schedule || 'Not configured'}</td>
              <td>
                {formatDate(item.startDate)} - {formatDate(item.endDate)}
              </td>
              <td>{item.maxTrainees || item.traineeCount}</td>
              <td>
                <StatusBadge status={item.status} />
              </td>

              <td>
                <div className="course-flow-row-actions">
                  <Link to={`/tmo/classes/${item.id}`}>
                    <Eye size={15} />
                    Detail
                  </Link>

                  <Link to={`/tmo/classes/${item.id}/manage`}>
                    <Settings size={15} />
                    Manage
                  </Link>

                  <button type="button" onClick={() => onEdit(item)}>
                    <Edit3 size={15} />
                    Edit
                  </button>

                  {item.status !== 'running' && item.status !== 'completed' ? (
                    <button type="button" onClick={() => onStatusChange(item.id, 'running')}>
                      <CheckCircle2 size={15} />
                      Activate
                    </button>
                  ) : null}

                  {item.status === 'running' ? (
                    <button type="button" onClick={() => onStatusChange(item.id, 'completed')}>
                      <XCircle size={15} />
                      Close
                    </button>
                  ) : null}

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
  const navigate = useNavigate()
  const [classes, setClasses] = useState(() => getClassFlowClasses())
  const [filters, setFilters] = useState({
    keyword: '',
    status: 'all',
    course: 'all',
    trainer: 'all',
    mode: 'all',
    sort: 'start-date',
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [editingClassId, setEditingClassId] = useState(null)
  const [form, setForm] = useState(initialClassForm)
  const [error, setError] = useState('')

  const runningCount = classes.filter((item) => item.status === 'running').length
  const upcomingCount = classes.filter((item) => item.status === 'upcoming').length
  const completedCount = classes.filter((item) => item.status === 'completed').length

  const courseOptions = useMemo(() => {
    return ['all', ...new Set(classes.map((item) => item.courseTitle).filter(Boolean))]
  }, [classes])

  const trainerOptions = useMemo(() => {
    return ['all', ...new Set(classes.map((item) => item.trainerName).filter(Boolean))]
  }, [classes])

  const modeOptions = useMemo(() => {
    return ['all', ...new Set(classes.map((item) => item.learningMode).filter(Boolean))]
  }, [classes])

  const statusTabs = useMemo(() => {
    const statuses = ['all', 'running', 'upcoming', 'completed', 'cancelled']
    return statuses.map((status) => ({
      key: status,
      label: status === 'all' ? 'All' : status,
      count: status === 'all' ? classes.length : classes.filter((item) => item.status === status).length,
    }))
  }, [classes])

  const visibleClasses = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()

    return classes
      .filter((item) => {
      const matchesKeyword = [
        item.className,
        item.displayName,
        item.name,
        item.courseTitle,
        item.trainerName,
        item.schedule,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)

      const matchesStatus =
        filters.status === 'all' || item.status === filters.status
      const matchesCourse =
        filters.course === 'all' || item.courseTitle === filters.course
      const matchesTrainer =
        filters.trainer === 'all' || item.trainerName === filters.trainer
      const matchesMode =
        filters.mode === 'all' || item.learningMode === filters.mode

      return matchesKeyword && matchesStatus && matchesCourse && matchesTrainer && matchesMode
    })
      .sort((a, b) => {
        if (filters.sort === 'start-desc') return new Date(b.startDate || 0) - new Date(a.startDate || 0)
        if (filters.sort === 'name') {
          return (a.className || a.displayName || a.name || '').localeCompare(
            b.className || b.displayName || b.name || '',
          )
        }
        if (filters.sort === 'progress') return Number(b.averageProgress || 0) - Number(a.averageProgress || 0)
        return new Date(a.startDate || 0) - new Date(b.startDate || 0)
      })
  }, [classes, filters])

  const refresh = () => {
    setClasses(getClassFlowClasses())
  }

  const updateFilter = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const resetFilters = () => {
    setFilters({
      keyword: '',
      status: 'all',
      course: 'all',
      trainer: 'all',
      mode: 'all',
      sort: 'start-date',
    })
  }

  const hasActiveFilters =
    filters.keyword ||
    filters.status !== 'all' ||
    filters.course !== 'all' ||
    filters.trainer !== 'all' ||
    filters.mode !== 'all' ||
    filters.sort !== 'start-date'

  const openCreate = () => {
    navigate('/tmo/classes/create')
  }

  const openUpdate = (classItem) => {
    setModalMode('update')
    setEditingClassId(classItem.id)
    setForm({
      name: classItem.className || classItem.displayName || classItem.name,
      courseId: classItem.courseId,
      trainerId: classItem.trainerId,
      status: classItem.status,
      traineeCount: classItem.maxTrainees || classItem.traineeCount || 0,
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
      createClassFlowClass({
        className: form.name,
        courseId: form.courseId,
        trainerId: form.trainerId,
        status: form.status,
        maxTrainees: form.traineeCount,
        startDate: form.startDate,
        endDate: form.endDate,
        schedule: form.schedule,
        meetLink: form.meetLink,
      })
    } else {
      updateClassFlowClass(editingClassId, {
        className: form.name,
        courseId: form.courseId,
        trainerId: form.trainerId,
        status: form.status,
        maxTrainees: form.traineeCount,
        startDate: form.startDate,
        endDate: form.endDate,
        schedule: form.schedule,
        meetLink: form.meetLink,
      })
    }

    refresh()
    setModalOpen(false)
  }

  const remove = (classId) => {
    const confirmed = window.confirm('Delete this class from TMO demo data?')
    if (!confirmed) return

    updateClassFlowClass(classId, { status: 'cancelled' })
    refresh()
  }

  const handleStatusChange = (classId, newStatus) => {
    updateClassFlowClass(classId, { status: newStatus })
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

      <StatusTabs
        tabs={statusTabs}
        activeKey={filters.status}
        onChange={(value) => updateFilter('status', value)}
        ariaLabel="Class status tabs"
      />

      <FilterToolbar>
        <SearchBox
          value={filters.keyword}
          placeholder="Search class, course, trainer"
          ariaLabel="Search classes"
          onChange={(value) => updateFilter('keyword', value)}
        />

        <SelectFilter
          value={filters.course}
          onChange={(value) => updateFilter('course', value)}
          ariaLabel="Filter classes by course"
          options={courseOptions.map((course) => ({
            value: course,
            label: course === 'all' ? 'All courses' : course,
          }))}
        />

        <SelectFilter
          value={filters.trainer}
          onChange={(value) => updateFilter('trainer', value)}
          ariaLabel="Filter classes by trainer"
          options={trainerOptions.map((trainer) => ({
            value: trainer,
            label: trainer === 'all' ? 'All trainers' : trainer,
          }))}
        />

        <SelectFilter
          value={filters.mode}
          onChange={(value) => updateFilter('mode', value)}
          ariaLabel="Filter classes by learning mode"
          options={modeOptions.map((mode) => ({
            value: mode,
            label: mode === 'all' ? 'All modes' : mode,
          }))}
        />

        <SelectFilter
          value={filters.sort}
          onChange={(value) => updateFilter('sort', value)}
          ariaLabel="Sort classes"
          options={[
            { value: 'start-date', label: 'Start date' },
            { value: 'start-desc', label: 'Latest start' },
            { value: 'name', label: 'Name A-Z' },
            { value: 'progress', label: 'Average progress' },
          ]}
        />

        <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
      </FilterToolbar>

      <ClassTable
        classes={visibleClasses}
        onEdit={openUpdate}
        onDelete={remove}
        onStatusChange={handleStatusChange}
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
