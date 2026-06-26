import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, Eye, Plus, Search } from 'lucide-react'
import { Button, FormField, Modal, useToast } from '@/shared/components/ui'
import { courseService, getCurrentUser, questionBankService } from '@/services'
import '../../admin-shared.css'

function canWriteQuestionBank() {
  const role = getCurrentUser()?.role
  return role === 'ADMIN' || role === 'SME'
}

function formatDate(value) {
  if (!value) return '--'
  try {
    return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return '--'
  }
}

function BankModal({ open, courses, onClose, onSaved }) {
  const toast = useToast()
  const [values, setValues] = useState({ courseId: '', name: '', description: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)


  async function handleSubmit(event) {
    event.preventDefault()
    const name = values.name.trim()
    if (!values.courseId) {
      setError('Course is required.')
      return
    }
    if (!name) {
      setError('Bank name is required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await questionBankService.createBank({
        courseId: values.courseId,
        name,
        description: values.description.trim() || null,
      })
      toast.success('Question bank created')
      onSaved()
    } catch (err) {
      setError(err?.message || 'Could not create question bank.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} title="Create question bank" size="md" onClose={submitting ? undefined : onClose}>
      {error && <div className="auth-card__alert" style={{ marginBottom: 14 }}>{error}</div>}
      <form className="form" onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <div className="input-field admin-form-grid__full">
            <label className="input-field__label" htmlFor="bank-course">Course <span aria-hidden="true">*</span></label>
            <select
              id="bank-course"
              className="admin-toolbar__select"
              value={values.courseId}
              onChange={(event) => setValues((current) => ({ ...current, courseId: event.target.value }))}
            >
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>
          <div className="admin-form-grid__full">
            <FormField
              label="Bank name"
              required
              value={values.name}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            />
          </div>
          <div className="input-field admin-form-grid__full">
            <label className="input-field__label" htmlFor="bank-description">Description</label>
            <textarea
              id="bank-description"
              className="admin-textarea"
              rows={3}
              value={values.description}
              onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" loading={submitting}>Create</Button>
        </div>
      </form>
    </Modal>
  )
}

export function AdminQuestionBanksPage() {
  const toast = useToast()
  const writable = canWriteQuestionBank()
  const [items, setItems] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('active')
  const [courseId, setCourseId] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [archivingId, setArchivingId] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await courseService.listAdmin({ page: 0, size: 100 })
        if (!cancelled) setCourses(data.items || [])
      } catch {
        if (!cancelled) setCourses([])
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const params = {}
        if (search.trim()) params.search = search.trim()
        if (status !== 'all') params.status = status
        if (courseId) params.courseId = courseId
        const data = await questionBankService.listBanks(params)
        if (!cancelled) setItems(data)
      } catch (err) {
        if (!cancelled) {
          const message = err?.message || 'Could not load question banks.'
          setError(message)
          toast.error(message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [courseId, refreshKey, search, status, toast])

  const courseNameById = useMemo(() => {
    return new Map(courses.map((course) => [course.id, course.title]))
  }, [courses])

  async function handleArchive(bank) {
    if (!writable || !bank?.bankId) return
    const confirmed = window.confirm(`Archive question bank "${bank.name}"?`)
    if (!confirmed) return
    setArchivingId(bank.bankId)
    try {
      await questionBankService.archiveBank(bank.bankId)
      toast.success('Question bank archived')
      setRefreshKey((key) => key + 1)
    } catch (err) {
      toast.error(err?.message || 'Could not archive question bank.')
    } finally {
      setArchivingId(null)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1 className="admin-page__title">Question Bank</h1>
          <p className="admin-page__subtitle">Manage course-scoped question banks for quiz and test authoring.</p>
        </div>
        {writable && (
          <Button leftIcon={<Plus size={16} />} onClick={() => setModalOpen(true)}>Create bank</Button>
        )}
      </header>

      <section className="admin-card admin-card--flush">
        <div className="admin-toolbar">
          <div className="admin-toolbar__filters">
            <div className="admin-toolbar__search">
              <FormField placeholder="Search banks..." value={search} onChange={(event) => setSearch(event.target.value)} leftIcon={<Search size={16} />} />
            </div>
            <select className="admin-toolbar__select" value={courseId} onChange={(event) => setCourseId(event.target.value)}>
              <option value="">All courses</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
            <select className="admin-toolbar__select" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All statuses</option>
            </select>
          </div>
          <span style={{ color: '#64748b', fontSize: 13 }}>{items.length} banks</span>
        </div>

        <div className="admin-table-wrap">
          {loading ? (
            <div className="admin-loading">Loading question banks...</div>
          ) : error ? (
            <div className="admin-error">{error}</div>
          ) : items.length === 0 ? (
            <div className="admin-empty">No question banks match the current filters.</div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Questions</th>
                  <th>Updated</th>
                  <th style={{ width: 120, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((bank) => (
                  <tr key={bank.bankId || bank.id}>
                    <td><strong>{bank.name}</strong><div style={{ color: '#64748b', fontSize: 12 }}>{bank.description || '--'}</div></td>
                    <td>{courseNameById.get(bank.courseId) || bank.courseId}</td>
                    <td><span className={`admin-status admin-status--${bank.status}`}>{bank.status}</span></td>
                    <td>{bank.questionCount ?? 0}</td>
                    <td>{formatDate(bank.updatedAt || bank.createdAt)}</td>
                    <td>
                      <div className="admin-table__actions" style={{ justifyContent: 'flex-end' }}>
                        <Link className="admin-table__icon-btn" title="Open" to={`/admin/question-banks/${bank.bankId || bank.id}`}><Eye size={15} /></Link>
                        {writable && bank.status !== 'archived' && (
                          <button type="button" className="admin-table__icon-btn admin-table__icon-btn--danger" title="Archive" disabled={archivingId === bank.bankId} onClick={() => handleArchive(bank)}>
                            <Archive size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <BankModal
        open={modalOpen}
        courses={courses}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false)
          setRefreshKey((key) => key + 1)
        }}
      />
    </div>
  )
}

