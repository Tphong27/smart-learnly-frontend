import { CreditCard, FileText, Receipt } from 'lucide-react'
import { useState } from 'react'
import { getTraineePayments } from '@/data/demo/demoTraineeRuntime'
import { StatusBadge } from '@/shared/components/StatusBadge'
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

  const payments = getTraineePayments()
  const [selectedPaymentId, setSelectedPaymentId] = useState(payments[0]?.id)
  const selectedPayment = payments.find((item) => item.id === selectedPaymentId)

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

            <div className="demo-list">
              {payments.map((payment) => (
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