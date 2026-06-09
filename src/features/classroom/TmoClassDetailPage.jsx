import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  CalendarDays,
  Edit3,
  MapPin,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { Modal } from '@/shared/components/ui/Modal/Modal'
import {
  getAvailableTrainees,
  getAvailableTrainers,
  getClassAnnouncements,
  getClassAssignments,
  getClassFlowClassById,
  getClassTrainees,
  updateClassFlowClass,
} from '@/data/demo/classFlowRuntime'

function formatDate(value) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function InfoCard({ label, value, icon: Icon }) {
  return (
    <div className="classflow-info-item">
      <div className="classflow-info-item__label">
        {Icon ? <Icon size={12} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} /> : null}
        {label}
      </div>
      <div className="classflow-info-item__value">{value}</div>
    </div>
  )
}

export function TmoClassDetailPage() {
  const { classData: initialClass, classId } = useOutletContext()
  const [classData, setClassData] = useState(initialClass)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [traineeModalOpen, setTraineeModalOpen] = useState(false)

  const trainees = useMemo(() => getClassTrainees(classId), [classId])
  const assignments = useMemo(() => getClassAssignments(classId), [classId])
  const announcements = useMemo(() => getClassAnnouncements(classId), [classId])
  const allTrainers = getAvailableTrainers()
  const allTrainees = getAvailableTrainees()

  const refresh = () => {
    setClassData(getClassFlowClassById(classId))
  }

  const handleStatusChange = (newStatus) => {
    updateClassFlowClass(classId, { status: newStatus })
    refresh()
  }

  const handleChangeTrainer = (trainerId) => {
    updateClassFlowClass(classId, { trainerId })
    refresh()
  }

  const handleAddTrainee = (traineeId) => {
    const current = classData?.traineeIds || []
    if (current.includes(traineeId)) return
    updateClassFlowClass(classId, { traineeIds: [...current, traineeId] })
    refresh()
  }

  const handleRemoveTrainee = (traineeId) => {
    const current = classData?.traineeIds || []
    updateClassFlowClass(classId, { traineeIds: current.filter((id) => id !== traineeId) })
    refresh()
  }

  if (!classData) {
    return (
      <section className="classflow-section">
        <h2>Class not found</h2>
        <p className="demo-muted">The class you are looking for does not exist.</p>
      </section>
    )
  }

  return (
    <div>
      {/* Class Overview */}
      <section className="classflow-section">
        <div className="classflow-section__header">
          <h2 className="classflow-section__title">Class Overview</h2>
          <div className="demo-actions">
            <button type="button" className="demo-secondary-action" onClick={() => setEditModalOpen(true)}>
              <Edit3 size={15} /> Edit Info
            </button>
            {classData.status !== 'running' && classData.status !== 'completed' ? (
              <button type="button" className="demo-primary-action" onClick={() => handleStatusChange('running')}>
                Activate Class
              </button>
            ) : null}
            {classData.status === 'running' ? (
              <button type="button" className="demo-secondary-action" onClick={() => handleStatusChange('completed')}>
                Close Class
              </button>
            ) : null}
          </div>
        </div>

        <p style={{ marginBottom: '1rem', color: '#475569', fontSize: '0.875rem' }}>
          {classData.description || 'No description provided.'}
        </p>

        <div className="classflow-info-grid">
          <InfoCard label="Course" value={classData.courseTitle} />
          <InfoCard label="Trainer" value={classData.trainerName} icon={Users} />
          <InfoCard label="Status" value={<StatusBadge status={classData.status} />} />
          <InfoCard label="Start Date" value={formatDate(classData.startDate)} icon={CalendarDays} />
          <InfoCard label="End Date" value={formatDate(classData.endDate)} icon={CalendarDays} />
          <InfoCard label="Schedule" value={classData.schedule || 'Not set'} />
          <InfoCard label="Learning Mode" value={classData.learningMode} icon={MapPin} />
          <InfoCard label="Max Trainees" value={classData.maxTrainees} />
          <InfoCard label="Invite Code" value={classData.inviteCode || 'N/A'} />
        </div>
      </section>

      {/* Trainer Card */}
      <section className="classflow-section">
        <div className="classflow-section__header">
          <h2 className="classflow-section__title">Trainer</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: '#2563eb',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.875rem', fontWeight: 600,
          }}>
            {(classData.trainerName || 'U')[0]}
          </div>
          <div>
            <strong style={{ color: '#0f172a' }}>{classData.trainerName}</strong>
            <p className="demo-muted" style={{ margin: 0 }}>Assigned trainer</p>
          </div>
          <select
            style={{ marginLeft: 'auto', maxWidth: '200px' }}
            value={classData.trainerId}
            onChange={(e) => handleChangeTrainer(e.target.value)}
          >
            {allTrainers.map((t) => (
              <option key={t.id} value={t.id}>{t.displayName}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Trainee List */}
      <section className="classflow-section">
        <div className="classflow-section__header">
          <h2 className="classflow-section__title">
            Trainees ({trainees.length})
          </h2>
          <button type="button" className="demo-primary-action" onClick={() => setTraineeModalOpen(true)}>
            <UserPlus size={15} /> Add Trainee
          </button>
        </div>

        {trainees.length === 0 ? (
          <p className="demo-muted">No trainees enrolled yet.</p>
        ) : (
          <div className="demo-list">
            {trainees.map((t) => (
              <div key={t.id} className="demo-list-item">
                <div>
                  <strong>{t.name}</strong>
                  <small>Progress: {t.progress}% · Risk: {t.risk}</small>
                </div>
                <button
                  type="button"
                  className="demo-secondary-action"
                  onClick={() => handleRemoveTrainee(t.traineeId)}
                >
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Activities */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <section className="classflow-section">
          <h2 className="classflow-section__title">Recent Assignments</h2>
          {assignments.length === 0 ? (
            <p className="demo-muted">No assignments yet.</p>
          ) : (
            <div className="demo-list" style={{ marginTop: '0.75rem' }}>
              {assignments.slice(0, 3).map((a) => (
                <div key={a.id} className="demo-list-item">
                  <div>
                    <strong>{a.title}</strong>
                    <small>Due: {formatDate(a.dueDate)}</small>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="classflow-section">
          <h2 className="classflow-section__title">Recent Announcements</h2>
          {announcements.length === 0 ? (
            <p className="demo-muted">No announcements yet.</p>
          ) : (
            <div className="demo-list" style={{ marginTop: '0.75rem' }}>
              {announcements.slice(0, 3).map((a) => (
                <div key={a.id} className="demo-list-item">
                  <div>
                    <strong>{a.title}</strong>
                    <small>{a.createdByName} · {formatDate(a.createdAt)}</small>
                  </div>
                  {a.pinned ? <span className="classflow-pin-badge">Pinned</span> : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Add Trainee Modal */}
      {traineeModalOpen ? (
        <Modal
          open={traineeModalOpen}
          title="Add Trainee to Class"
          description="Select trainees to add to this class."
          onClose={() => setTraineeModalOpen(false)}
          footer={
            <button type="button" className="demo-secondary-action" onClick={() => setTraineeModalOpen(false)}>
              Done
            </button>
          }
        >
          <div className="demo-list">
            {allTrainees.map((t) => {
              const enrolled = (classData.traineeIds || []).includes(t.id)
              return (
                <div key={t.id} className="demo-list-item">
                  <div>
                    <strong>{t.displayName}</strong>
                    <small>{t.email}</small>
                  </div>
                  {enrolled ? (
                    <span className="demo-muted">Enrolled</span>
                  ) : (
                    <button type="button" className="demo-primary-action" onClick={() => handleAddTrainee(t.id)}>
                      <Plus size={14} /> Add
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </Modal>
      ) : null}

      {/* Edit modal placeholder */}
      {editModalOpen ? (
        <Modal
          open={editModalOpen}
          title="Edit Class Information"
          description="Update class details."
          onClose={() => setEditModalOpen(false)}
          footer={
            <button type="button" className="demo-secondary-action" onClick={() => setEditModalOpen(false)}>
              Close
            </button>
          }
        >
          <p className="demo-muted">
            Edit functionality uses the same form as Create Class. For the demo, use
            the TMO Class Management table edit action.
          </p>
        </Modal>
      ) : null}
    </div>
  )
}
