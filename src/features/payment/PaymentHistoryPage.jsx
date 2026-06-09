import { CreditCard, FileText, Receipt } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getTraineePayments } from '@/data/demo/demoTraineeRuntime'
import { getCurrentUser } from '@/services'
import { PageState } from '@/shared/components/PageState'
import { StatusBadge } from '@/shared/components/StatusBadge'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ' + currency
}

function formatDate(value) {
  if (!value) return 'Not paid'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

export function PaymentHistoryPage() {
  useDocumentTitle('Payment History')

  const traineeId = getCurrentUser()?.id || 'trainee-minh'
  const payments = useMemo(() => getTraineePayments(traineeId), [traineeId])
  const [filters, setFilters] = useState({
    keyword: '',
    status: 'all',
    method: 'all',
    startDate: '',
    endDate: '',
    sort: 'newest',
  })
  const [selectedPaymentId, setSelectedPaymentId] = useState(payments[0]?.id)
  const selectedPayment = payments.find((item) => item.id === selectedPaymentId)
  const methodOptions = useMemo(() => {
    return ['all', ...new Set(payments.map((payment) => payment.method).filter(Boolean))]
  }, [payments])

  const statusOptions = useMemo(() => {
    return ['all', ...new Set(payments.map((payment) => payment.status).filter(Boolean))]
  }, [payments])

  const visiblePayments = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase()
    const startTime = filters.startDate ? new Date(filters.startDate).getTime() : null
    const endTime = filters.endDate ? new Date(filters.endDate).getTime() : null

    return payments
      .filter((payment) => {
        const matchesKeyword = [
          payment.id,
          payment.invoiceNo,
          payment.title,
          payment.method,
          payment.type,
        ]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
        const matchesStatus = filters.status === 'all' || payment.status === filters.status
        const matchesMethod = filters.method === 'all' || payment.method === filters.method
        const paidTime = payment.paidAt ? new Date(payment.paidAt).getTime() : null
        const matchesStart = !startTime || (paidTime && paidTime >= startTime)
        const matchesEnd = !endTime || (paidTime && paidTime <= endTime)

        return matchesKeyword && matchesStatus && matchesMethod && matchesStart && matchesEnd
      })
      .sort((a, b) => {
        if (filters.sort === 'oldest') return new Date(a.paidAt || 0) - new Date(b.paidAt || 0)
        if (filters.sort === 'amount-high') return Number(b.amount || 0) - Number(a.amount || 0)
        if (filters.sort === 'amount-low') return Number(a.amount || 0) - Number(b.amount || 0)
        return new Date(b.paidAt || b.createdAt || 0) - new Date(a.paidAt || a.createdAt || 0)
      })
  }, [filters, payments])

  const updateFilter = (name, value) => {
    setFilters((current) => ({ ...current, [name]: value }))
  }

  const resetFilters = () => {
    setFilters({
      keyword: '',
      status: 'all',
      method: 'all',
      startDate: '',
      endDate: '',
      sort: 'newest',
    })
  }

  const hasActiveFilters =
    filters.keyword ||
    filters.status !== 'all' ||
    filters.method !== 'all' ||
    filters.startDate ||
    filters.endDate ||
    filters.sort !== 'newest'

  return (
    <main className="demo-page">
      <section className="demo-hero-band">
        <div>
          <span className="demo-kicker">Trainee payment</span>
          <h1>Payment History</h1>
          <p>
            Review course/class transactions and invoice details for your
            enrolled learning activities.
          </p>
        </div>
      </section>

      <section className="course-detail-layout">
        <div className="course-detail-main">
          <section className="demo-card">
            <div className="demo-row demo-row--between">
              <div>
                <span className="demo-kicker">Transactions</span>
                <h2>Your payment records</h2>
              </div>

              <Receipt size={24} />
            </div>

            <FilterToolbar>
              <SearchBox
                value={filters.keyword}
                placeholder="Search invoice, item, method"
                ariaLabel="Search payment history"
                onChange={(value) => updateFilter('keyword', value)}
              />
              <SelectFilter
                value={filters.status}
                onChange={(value) => updateFilter('status', value)}
                ariaLabel="Filter payments by status"
                options={statusOptions.map((status) => ({
                  value: status,
                  label: status === 'all' ? 'All status' : status,
                }))}
              />
              <SelectFilter
                value={filters.method}
                onChange={(value) => updateFilter('method', value)}
                ariaLabel="Filter payments by method"
                options={methodOptions.map((method) => ({
                  value: method,
                  label: method === 'all' ? 'All methods' : method,
                }))}
              />
              <label className="course-flow-field">
                <span>From</span>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(event) => updateFilter('startDate', event.target.value)}
                />
              </label>
              <label className="course-flow-field">
                <span>To</span>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(event) => updateFilter('endDate', event.target.value)}
                />
              </label>
              <SelectFilter
                value={filters.sort}
                onChange={(value) => updateFilter('sort', value)}
                ariaLabel="Sort payment history"
                options={[
                  { value: 'newest', label: 'Newest' },
                  { value: 'oldest', label: 'Oldest' },
                  { value: 'amount-high', label: 'Amount high to low' },
                  { value: 'amount-low', label: 'Amount low to high' },
                ]}
              />
              <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
            </FilterToolbar>

            {visiblePayments.length === 0 ? (
              <PageState
                state="empty"
                title="No payments match"
                description="Adjust payment filters or clear them."
                action={
                  <button type="button" className="demo-primary-action" onClick={resetFilters}>
                    Clear filters
                  </button>
                }
              />
            ) : (
              <div className="demo-list">
              {visiblePayments.map((payment) => (
                <button
                  key={payment.id}
                  type="button"
                  className="demo-list-item"
                  onClick={() => setSelectedPaymentId(payment.id)}
                >
                  <div>
                    <strong>{payment.title}</strong>
                    <small>
                      {payment.invoiceNo} · {formatDate(payment.paidAt)}
                    </small>
                    <small>
                      {payment.method} · {payment.type}
                    </small>
                  </div>

                  <div>
                    <StatusBadge status={payment.status} />
                    <strong>
                      {formatCurrency(payment.amount, payment.currency)}
                    </strong>
                  </div>
                </button>
              ))}
            </div>
            )}
          </section>
        </div>

        <aside className="demo-card course-detail-side-panel">
          <div className="demo-row demo-row--between">
            <div>
              <span className="demo-kicker">Invoice detail</span>
              <h2>Receipt</h2>
            </div>

            <FileText size={24} />
          </div>

          {selectedPayment ? (
            <>
              <dl className="checkout-summary">
                <div>
                  <dt>Invoice No.</dt>
                  <dd>{selectedPayment.invoiceNo}</dd>
                </div>
                <div>
                  <dt>Item</dt>
                  <dd>{selectedPayment.title}</dd>
                </div>
                <div>
                  <dt>Payment type</dt>
                  <dd>{selectedPayment.type}</dd>
                </div>
                <div>
                  <dt>Method</dt>
                  <dd>{selectedPayment.method}</dd>
                </div>
                <div>
                  <dt>Paid at</dt>
                  <dd>{formatDate(selectedPayment.paidAt)}</dd>
                </div>
                <div>
                  <dt>Amount</dt>
                  <dd>
                    {formatCurrency(
                      selectedPayment.amount,
                      selectedPayment.currency,
                    )}
                  </dd>
                </div>
              </dl>

              <button type="button" className="demo-primary-action">
                <CreditCard size={16} />
                Download invoice mock
              </button>
            </>
          ) : (
            <p className="demo-muted">Select a payment to view invoice detail.</p>
          )}
        </aside>
      </section>
    </main>
  )
}
