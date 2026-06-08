import { useMemo, useState } from 'react'
import {
  Edit3,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
} from 'lucide-react'
import { KpiCard } from '@/shared/components/ui/KpiCard'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { DataState } from '@/shared/components/ui/DataState'
import { Modal } from '@/shared/components/ui/Modal/Modal'
import {
  createAdminUser,
  getAdminUsers,
  updateAdminUser,
} from '@/data/demo/demoAdminRuntime'
import { ROLES } from '@/shared/constants/roles'

const roleOptions = [
  ROLES.ADMIN,
  ROLES.TMO,
  ROLES.SME,
  ROLES.TRAINER,
  ROLES.TRAINEE,
]

const emptyForm = {
  name: '',
  email: '',
  role: ROLES.TRAINEE,
  status: 'active',
}

function formatDateTime(value) {
  if (!value) return 'Never'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function UserFormModal({
  open,
  mode,
  form,
  error,
  onChange,
  onClose,
  onSubmit,
}) {
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
      title={mode === 'create' ? 'Create User' : 'Update User'}
      description="Manage account role and active status in Admin demo."
      footer={
        <div className="course-flow-modal-actions">
          <button type="button" className="demo-secondary-action" onClick={onClose}>
            Cancel
          </button>

          <button type="button" className="demo-primary-action" onClick={onSubmit}>
            {mode === 'create' ? 'Create User' : 'Save Changes'}
          </button>
        </div>
      }
      onClose={onClose}
    >
      <div className="course-flow-form-grid">
        <label className="course-flow-field course-flow-field--wide">
          <span>Full name</span>
          <input
            value={form.name}
            placeholder="Nguyen Van A"
            onChange={(event) => updateField('name', event.target.value)}
          />
        </label>

        <label className="course-flow-field course-flow-field--wide">
          <span>Email</span>
          <input
            value={form.email}
            placeholder="user@slp.vn"
            onChange={(event) => updateField('email', event.target.value)}
          />
        </label>

        <label className="course-flow-field">
          <span>Role</span>
          <select
            value={form.role}
            onChange={(event) => updateField('role', event.target.value)}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role.toUpperCase()}
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="locked">Locked</option>
          </select>
        </label>
      </div>

      {error ? <p className="demo-form-error">{error}</p> : null}
    </Modal>
  )
}

export function UsersRolesPage() {
  const [users, setUsers] = useState(() => getAdminUsers())
  const [filters, setFilters] = useState({
    keyword: '',
    role: 'all',
    status: 'all',
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [editingUserId, setEditingUserId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')

  const activeCount = users.filter((user) => user.status === 'active').length
  const inactiveCount = users.filter((user) => user.status !== 'active').length

  const visibleUsers = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()

    return users.filter((user) => {
      const matchesKeyword = [user.name, user.email, user.role, user.status]
        .join(' ')
        .toLowerCase()
        .includes(keyword)

      const matchesRole = filters.role === 'all' || user.role === filters.role

      const matchesStatus =
        filters.status === 'all' || user.status === filters.status

      return matchesKeyword && matchesRole && matchesStatus
    })
  }, [users, filters])

  const refresh = () => {
    setUsers(getAdminUsers())
  }

  const updateFilter = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const openCreate = () => {
    setModalMode('create')
    setEditingUserId(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  const openUpdate = (user) => {
    setModalMode('update')
    setEditingUserId(user.id)
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    })
    setError('')
    setModalOpen(true)
  }

  const validate = () => {
    if (!form.name.trim()) return 'User name is required.'
    if (!form.email.trim()) return 'Email is required.'
    if (!form.email.includes('@')) return 'Email format is invalid.'
    if (!form.role) return 'Role is required.'
    return ''
  }

  const submit = () => {
    const validationError = validate()

    if (validationError) {
      setError(validationError)
      return
    }

    if (modalMode === 'create') {
      createAdminUser(form)
    } else {
      updateAdminUser(editingUserId, form)
    }

    refresh()
    setModalOpen(false)
  }

  return (
    <section>
      <PageHeader
        title="Users & Roles"
        description="Manage SLP user accounts, roles, and account status."
        action={
          <button type="button" className="dev2-primary-button" onClick={openCreate}>
            <Plus size={16} />
            Add User
          </button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <KpiCard title="Total Users" value={users.length} icon={ShieldCheck} />
        <KpiCard title="Active Users" value={activeCount} icon={UserCheck} />
        <KpiCard title="Inactive / Locked" value={inactiveCount} icon={UserX} />
      </div>

      <div className="course-flow-filter-card">
        <label className="course-flow-search">
          <Search size={17} />
          <input
            value={filters.keyword}
            placeholder="Search name, email, role"
            onChange={(event) => updateFilter('keyword', event.target.value)}
          />
        </label>

        <select
          value={filters.role}
          onChange={(event) => updateFilter('role', event.target.value)}
        >
          <option value="all">All roles</option>
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {role.toUpperCase()}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(event) => updateFilter('status', event.target.value)}
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="locked">Locked</option>
        </select>
      </div>

      {visibleUsers.length === 0 ? (
        <DataState
          type="empty"
          title="No users found"
          description="Try changing keyword, role, or status filter."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visibleUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">
                      {user.name}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{user.email}</td>
                    <td className="px-4 py-4 uppercase text-slate-600">
                      {user.role}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {formatDateTime(user.lastLoginAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="demo-secondary-action"
                          onClick={() => openUpdate(user)}
                        >
                          <Edit3 size={15} />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UserFormModal
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