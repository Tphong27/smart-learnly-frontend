import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Archive, Edit2, Eye, Plus, RotateCcw, Search } from 'lucide-react'
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

function BankModal({ bank, open, courses, onClose, onSaved }) {
  const toast = useToast()
  const editing = Boolean(bank?.bankId || bank?.id)
  const [values, setValues] = useState(() => ({
    courseId: bank?.courseId || '',
    name: bank?.name || '',
    description: bank?.description || '',
    status: bank?.status || 'draft',
  }))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    const name = values.name.trim()
    const description = values.description.trim() || null
    if (!editing && !values.courseId) {
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
      if (editing) {
        await questionBankService.updateBank(bank.bankId || bank.id, {
          name,
          description,
          status: values.status || 'draft',
        })
        toast.success('Question bank updated')
      } else {
        await questionBankService.createBank({
          courseId: values.courseId,
          name,
          description,
          status: values.status || 'draft',
        })
        toast.success('Question bank created')
      }
      onSaved()
    } catch (err) {
      setError(err?.message || `Could not ${editing ? 'update' : 'create'} question bank.`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} title={editing ? 'Edit question bank' : 'Create question bank'} size="md" onClose={submitting ? undefined : onClose}>
      {error && <div className="auth-card__alert" style={{ marginBottom: 14 }}>{error}</div>}
      <form className="form" onSubmit={handleSubmit}>
        <div className="admin-form-grid">
          <div className="input-field admin-form-grid__full">
            <label className="input-field__label" htmlFor="bank-course">Course <span aria-hidden="true">*</span></label>
            <select
              id="bank-course"
              className="admin-toolbar__select"
              value={values.courseId}
              disabled={editing}
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
            <label className="input-field__label" htmlFor="bank-status">Status</label>
            <select
              id="bank-status"
              className="admin-toolbar__select"
              value={values.status}
              onChange={(event) => setValues((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
            </select>
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
          <Button type="submit" loading={submitting}>{editing ? 'Save changes' : 'Create'}</Button>
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
  const [status, setStatus] = useState('all')
  const [courseId, setCourseId] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBank, setEditingBank] = useState(null)
  const [archivingId, setArchivingId] = useState(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restoringBank, setRestoringBank] = useState(null)

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

  function openCreateModal() {
    setEditingBank(null)
    setModalOpen(true)
  }

  function openEditModal(bank) {
    setEditingBank(bank)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingBank(null)
  }

  async function handleArchive(bank) {
    const bankId = bank?.bankId || bank?.id
    if (!writable || !bankId) return
    const confirmed = window.confirm(`Archive question bank "${bank.name}"?`)
    if (!confirmed) return
    setArchivingId(bankId)
    try {
      await questionBankService.archiveBank(bankId)
      toast.success('Question bank archived')
      setRefreshKey((key) => key + 1)
    } catch (err) {
      toast.error(err?.message || 'Could not archive question bank.')
    } finally {
      setArchivingId(null)
    }
  }

  function openRestoreModal(bank) {
    setRestoringBank(bank)
    setRestoreModalOpen(true)
  }

  function closeRestoreModal() {
    setRestoreModalOpen(false)
    setRestoringBank(null)
  }

  async function handleRestore(targetStatus) {
    if (!writable || !restoringBank) return
    const bankId = restoringBank.bankId || restoringBank.id
    try {
      await questionBankService.restoreBank(bankId, targetStatus)
      toast.success(
        targetStatus === 'approved'
          ? 'Question bank restored and approved'
          : 'Question bank restored to draft'
      )
      closeRestoreModal()
      setRefreshKey((key) => key + 1)
    } catch (err) {
      toast.error(err?.message || 'Could not restore question bank.')
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
          <Button leftIcon={<Plus size={16} />} onClick={openCreateModal}>Create bank</Button>
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
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="archived">Archived</option>
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
                  <th style={{ width: 140, textAlign: 'right' }}>Actions</th>
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
                          <button type="button" className="admin-table__icon-btn" title="Edit" onClick={() => openEditModal(bank)}>
                            <Edit2 size={15} />
                          </button>
                        )}
                        {writable && bank.status !== 'archived' && (
                          <button type="button" className="admin-table__icon-btn admin-table__icon-btn--danger" title="Archive" disabled={archivingId === (bank.bankId || bank.id)} onClick={() => handleArchive(bank)}>
                            <Archive size={15} />
                          </button>
                        )}
                        {writable && bank.status === 'archived' && (
                          <button type="button" className="admin-table__icon-btn" title="Restore" onClick={() => openRestoreModal(bank)}>
                            <RotateCcw size={15} />
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

      {modalOpen && (
        <BankModal
          bank={editingBank}
          open={modalOpen}
          courses={courses}
          onClose={closeModal}
          onSaved={() => {
            closeModal()
            setRefreshKey((key) => key + 1)
          }}
        />
      )}

      <RestoreBankModal
        open={restoreModalOpen}
        bank={restoringBank}
        onClose={closeRestoreModal}
        onConfirm={handleRestore}
      />
    </div>
  )
}

function RestoreBankModal({ open, bank, onClose, onConfirm }) {
  return (
    <RestoreBankModalContent key={open ? "open" : "closed"} open={open} bank={bank} onClose={onClose} onConfirm={onConfirm} />
  );
}

function RestoreBankModalContent({ open, bank, onClose, onConfirm }) {
  const [targetStatus, setTargetStatus] = useState('draft')
  return (
    <Modal open={open} title="Restore question bank" size="sm" onClose={onClose}>
      <p style={{ marginTop: 0, color: '#475569' }}>
        Restore <strong>{bank?.name || 'this question bank'}</strong> so it can be edited again. Choose the status to apply after restoring.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="radio"
            name="restore-target-list"
            value="draft"
            checked={targetStatus === 'draft'}
            onChange={() => setTargetStatus('draft')}
          />
          <span>Restore as <strong>Draft</strong> (still needs review)</span>
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="radio"
            name="restore-target-list"
            value="approved"
            checked={targetStatus === 'approved'}
            onChange={() => setTargetStatus('approved')}
          />
          <span>Restore as <strong>Approved</strong> (ready to use)</span>
        </label>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="button" leftIcon={<RotateCcw size={15} />} onClick={() => onConfirm(targetStatus)}>
          Restore
        </Button>
      </div>
    </Modal>
  )
}
