import { ShieldCheck, UserCheck, UserX } from 'lucide-react'
import { KpiCard } from '@/shared/components/ui/KpiCard'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { DataState } from '@/shared/components/ui/DataState'

const users = [
  { id: 1, name: 'Linh Do', email: 'linh.admin@slp.vn', role: 'admin', status: 'active' },
  { id: 2, name: 'Lan Pham', email: 'lan.sme@slp.vn', role: 'sme', status: 'active' },
  { id: 3, name: 'An Tran', email: 'an.trainer@slp.vn', role: 'trainer', status: 'active' },
  { id: 4, name: 'Minh Nguyen', email: 'minh.trainee@slp.vn', role: 'trainee', status: 'inactive' },
]

export function UsersRolesPage() {
  const isLoading = false
  const error = null

  const header = (
    <PageHeader
      title="Users & Roles"
      description="Admin mock screen for account status and role assignment management."
    />
  )

  if (isLoading) {
    return (
      <section>
        {header}
        <DataState type="loading" title="Loading users" description="Fetching accounts and role assignments." />
      </section>
    )
  }

  if (error) {
    return (
      <section>
        {header}
        <DataState type="error" title="Users unavailable" description={error} />
      </section>
    )
  }

  if (users.length === 0) {
    return (
      <section>
        {header}
        <DataState type="empty" title="No users found" description="No accounts are available for role assignment." />
      </section>
    )
  }

  return (
    <section>
      {header}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <KpiCard title="Total Users" value={users.length} icon={ShieldCheck} />
        <KpiCard title="Active Users" value="3" icon={UserCheck} />
        <KpiCard title="Inactive Users" value="1" icon={UserX} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-4 font-medium text-slate-900">{user.name}</td>
                <td className="px-4 py-4 text-slate-600">{user.email}</td>
                <td className="px-4 py-4 capitalize text-slate-600">{user.role}</td>
                <td className="px-4 py-4">
                  <StatusBadge status={user.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
