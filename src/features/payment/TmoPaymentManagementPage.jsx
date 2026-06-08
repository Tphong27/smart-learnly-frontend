import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  CreditCard,
  FileText,
  RefreshCcw,
  Search,
} from 'lucide-react'
import { DataState } from '@/shared/components/ui/DataState'
import { KpiCard } from '@/shared/components/ui/KpiCard'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import {
  getTmoPaymentSummary,
  getTmoPayments,
  updateTmoPaymentStatus,
} from '@/data/demo/demoTmoRuntime'

function formatCurrency(amount, currency = 'VND') {
  return `${new Intl.NumberFormat('vi-VN').format(amount)} ${currency}`
}

function formatDate(value) {
  if (!value) return 'Not paid'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function PaymentDetailPanel({ payment }) {
  if (!payment) {
    return (
      <aside className="demo-card">
        <DataState
          type="empty"
          title="No payment selected"
          description="Select a payment to view invoice detail."
        />
      </aside>
    )
  }

  return (
    <aside className="demo-card">
      <div className="demo-row demo-row--between">
        <div>
          <span className="demo-kicker">Invoice Detail</span>
          <h2>{payment.invoiceNo}</h2>
        </div>

        <FileText size={22} />
      </div>

      <dl className="course-flow-mini-grid">
        <div>
          <dt>Trainee</dt>
          <dd>{payment.traineeName}</dd>
        </div>

        <div>
          <dt>Email</dt>
          <dd>{payment.traineeEmail}</dd>
        </div>

        <div>
          <dt>Course</dt>
          <dd>{payment.courseTitle}</dd>
        </div>

        <div>
          <dt>Class</dt>
          <dd>{payment.className}</dd>
        </div>

        <div>
          <dt>Method</dt>
          <dd>{payment.method}</dd>
        </div>

        <div>
          <dt>Paid at</dt>
          <dd>{formatDate(payment.paidAt)}</dd>
        </div>

        <div>
          <dt>Amount</dt>
          <dd>{formatCurrency(payment.amount, payment.currency)}</dd>
        </div>

        <div>
          <dt>Status</dt>
          <dd>
            <StatusBadge status={payment.status} />
          </dd>
        </div>
      </dl>

      <div className="course-flow-note-card">
        <strong>Operational note</strong>
        <span>{payment.note}</span>
      </div>
    </aside>
  )
}

function PaymentTable({ payments, selectedPaymentId, onSelect, onVerify, onRefund }) {
  if (payments.length === 0) {
    return (
      <DataState
        type="empty"
        title="No payments found"
        description="Try changing keyword or status filter."
      />
    )
  }

  return (
    <div className="course-flow-table-wrap">
      <table className="course-flow-table">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Trainee</th>
            <th>Course</th>
            <th>Method</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Paid At</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {payments.map((payment) => (
            <tr
              key={payment.id}
              className={payment.id === selectedPaymentId ? 'bg-blue-50' : ''}
              onClick={() => onSelect(payment.id)}
            >
              <td>
                <strong>{payment.invoiceNo}</strong>
              </td>

              <td>
                <strong>{payment.traineeName}</strong>
                <br />
                <small>{payment.traineeEmail}</small>
              </td>

              <td>{payment.courseTitle}</td>
              <td>{payment.method}</td>
              <td>{formatCurrency(payment.amount, payment.currency)}</td>
              <td>
                <StatusBadge status={payment.status} />
              </td>
              <td>{formatDate(payment.paidAt)}</td>

              <td>
                <div className="course-flow-row-actions">
                  {payment.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onVerify(payment.id)
                      }}
                    >
                      <CheckCircle2 size={15} />
                      Verify
                    </button>
                  ) : null}

                  {payment.status === 'refund_requested' ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onRefund(payment.id)
                      }}
                    >
                      <RefreshCcw size={15} />
                      Refund
                    </button>
                  ) : null}

                  {payment.status !== 'pending' &&
                  payment.status !== 'refund_requested' ? (
                    <span className="text-xs text-slate-400">No action</span>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TmoPaymentManagementPage() {
  const [payments, setPayments] = useState(() => getTmoPayments())
  const [filters, setFilters] = useState({
    keyword: '',
    status: 'all',
  })
  const [selectedPaymentId, setSelectedPaymentId] = useState(payments[0]?.id || null)

  const summary = getTmoPaymentSummary()

  const visiblePayments = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()

    return payments.filter((payment) => {
      const matchesKeyword = [
        payment.invoiceNo,
        payment.traineeName,
        payment.traineeEmail,
        payment.courseTitle,
        payment.className,
        payment.method,
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)

      const matchesStatus =
        filters.status === 'all' || payment.status === filters.status

      return matchesKeyword && matchesStatus
    })
  }, [payments, filters])

  const selectedPayment = payments.find((item) => item.id === selectedPaymentId)

  const refresh = () => {
    const nextPayments = getTmoPayments()
    setPayments(nextPayments)

    if (!selectedPaymentId && nextPayments[0]) {
      setSelectedPaymentId(nextPayments[0].id)
    }
  }

  const updateFilter = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleVerify = (paymentId) => {
    updateTmoPaymentStatus(paymentId, 'paid')
    refresh()
  }

  const handleRefund = (paymentId) => {
    updateTmoPaymentStatus(paymentId, 'refunded')
    refresh()
  }

  return (
    <section>
      <PageHeader
        title="Payment Management"
        description="Verify trainee payments, track invoices, and process refund requests."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total Payments" value={summary.total} icon={CreditCard} />
        <KpiCard title="Paid" value={summary.paid} icon={CheckCircle2} />
        <KpiCard title="Pending" value={summary.pending} icon={CreditCard} />
        <KpiCard title="Refund / Requested" value={summary.refund} icon={RefreshCcw} />
      </div>

      <div className="course-flow-note-card">
        <strong>Revenue</strong>
        <span>{formatCurrency(summary.revenue, 'VND')}</span>
      </div>

      <div className="course-flow-filter-card">
        <label className="course-flow-search">
          <Search size={17} />
          <input
            value={filters.keyword}
            placeholder="Search invoice, trainee, course"
            onChange={(event) => updateFilter('keyword', event.target.value)}
          />
        </label>

        <select
          value={filters.status}
          onChange={(event) => updateFilter('status', event.target.value)}
        >
          <option value="all">All status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="refund_requested">Refund Requested</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <PaymentTable
          payments={visiblePayments}
          selectedPaymentId={selectedPaymentId}
          onSelect={setSelectedPaymentId}
          onVerify={handleVerify}
          onRefund={handleRefund}
        />

        <PaymentDetailPanel payment={selectedPayment} />
      </div>
    </section>
  )
}