import { useEffect, useState } from 'react'
import { Modal, Button, useToast } from '@/shared/components/ui'
import { transactionService, orderService } from '@/services'
import { formatDate } from '@/shared/utils/formatDate'
import '../../enrollment/pages/history-page.css'

const PAGE_SIZE = 20

function formatAmount(value, currency = 'VND') {
  if (value == null) return '--'
  const num = Number(value)
  if (Number.isNaN(num)) return '--'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'VND',
      maximumFractionDigits: 0,
    }).format(num)
  } catch {
    return `${num} ${currency}`
  }
}

function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase()
  return (
    <span className={`history-status history-status--${normalized || 'pending'}`}>
      {status || 'Pending'}
    </span>
  )
}

function InvoiceModal({ open, transactionId, onClose }) {
  const toast = useToast()
  const [invoice, setInvoice] = useState(null)
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !transactionId) {
      return undefined
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await transactionService.getInvoice(transactionId)
        if (cancelled) return
        setInvoice(data)
        if (data?.orderId) {
          try {
            const orderData = await orderService.get(data.orderId)
            if (!cancelled) setOrder(orderData)
          } catch {
            if (!cancelled) setOrder(null)
          }
        }
      } catch (err) {
        if (cancelled) return
        const message = err?.message || 'Could not load invoice.'
        setError(message)
        toast.error(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, transactionId, toast])

  return (
    <Modal open={open} title="Invoice details" size="md" onClose={onClose}>
      {loading ? (
        <div className="history-loading">Loading invoice...</div>
      ) : error ? (
        <div className="history-error">{error}</div>
      ) : !invoice ? null : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Invoice number</div>
              <strong style={{ fontSize: 16 }}>{invoice.invoiceNumber || '--'}</strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>Status</div>
              <StatusBadge status={invoice.status} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Amount</div>
              <strong>{formatAmount(invoice.amount, invoice.currency)}</strong>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Paid at</div>
              <strong>{invoice.paidAt ? formatDate(invoice.paidAt) : '--'}</strong>
            </div>
          </div>

          {order?.items?.length ? (
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Order items</div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {order.items.map((item) => (
                  <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 6 }}>
                    <span>{item.itemTitle}</span>
                    <strong>{formatAmount(item.finalAmount, invoice.currency)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function CancelOrderModal({ open, target, onClose, onConfirmed }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleConfirm() {
    if (!target?.orderId) return
    setError(null)
    setLoading(true)
    try {
      await orderService.cancel(target.orderId)
      toast.success('Order cancelled successfully')
      onConfirmed(target)
    } catch (err) {
      setError(err?.message || 'Could not cancel this order.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      title='Confirm order cancellation'
      size='sm'
      onClose={loading ? undefined : onClose}
    >
      <p style={{ margin: 0, color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
        Are you sure you want to cancel order
        {' '}<strong>{target?.invoiceNumber || target?.orderId?.slice(0, 8)}</strong>?
        This will release any pending payment session and cannot be undone.
      </p>
      {error && <div className='auth-card__alert' style={{ marginTop: 14 }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
        <Button type='button' variant='ghost' onClick={onClose} disabled={loading}>Keep order</Button>
        <Button type='button' variant='danger' onClick={handleConfirm} loading={loading}>Cancel order</Button>
      </div>
    </Modal>
  )
}

export function MyTransactionsPage() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pageRequest, setPageRequest] = useState(0)
  const [invoiceTarget, setInvoiceTarget] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await transactionService.list({ page: pageRequest, size: PAGE_SIZE })
        if (cancelled) return
        setItems(data.items || [])
        setTotalPages(data.totalPages || 0)
        setTotalItems(data.totalItems || 0)
        setPage(data.page ?? pageRequest)
      } catch (err) {
        if (cancelled) return
        const message = err?.message || 'Could not load transactions.'
        setError(message)
        toast.error(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pageRequest, toast, refreshKey])

  return (
    <div className="history-page">
      <header className="history-page__header">
        <h1>Transaction history</h1>
        <p>Review your payments and download invoices for successful transactions.</p>
      </header>

      <section className="history-card">
        <div className="history-toolbar">
          <strong style={{ fontSize: 14 }}>Payment records</strong>
          <span className="history-toolbar__count">{totalItems} record{totalItems === 1 ? '' : 's'}</span>
        </div>

        {loading ? (
          <div className="history-loading">Loading transactions...</div>
        ) : error ? (
          <div className="history-error">{error}</div>
        ) : items.length === 0 ? (
          <div className="history-empty">You have no payment records yet.</div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Invoice / Order</th>
                <th>Gateway</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th>Paid at</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((tx) => {
                const isPaid = (tx.status || '').toUpperCase() === 'SUCCESS'
                const isPending = (tx.status || '').toUpperCase() === 'PENDING'
                return (
                  <tr key={tx.id}>
                    <td>
                      <strong>{tx.invoiceNumber || '--'}</strong>
                      {tx.orderId && (
                        <div style={{ color: '#94a3b8', fontSize: 12 }}>order: {tx.orderId.slice(0, 8)}...</div>
                      )}
                    </td>
                    <td>{tx.paymentGateway || '--'}</td>
                    <td>{formatAmount(tx.amount, tx.currency)}</td>
                    <td><StatusBadge status={tx.status} /></td>
                    <td>{formatDate(tx.createdAt)}</td>
                    <td>{tx.paidAt ? formatDate(tx.paidAt) : '--'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {isPaid && (
                        <button
                          type="button"
                          className="history-table__link"
                          style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
                          onClick={() => setInvoiceTarget(tx.id)}
                        >
                          View invoice
                        </button>
                      )}
                      {isPending && tx.orderId && (
                        <button
                          type="button"
                          className="history-table__link"
                          style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, color: '#dc2626' }}
                          onClick={() => setCancelTarget(tx)}
                        >
                          Cancel order
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="history-pagination">
            <span style={{ color: '#64748b', fontSize: 13 }}>Page {page + 1} / {totalPages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="history-pagination__btn"
                onClick={() => setPageRequest(page - 1)}
                disabled={page === 0}
              >
                Previous
              </button>
              <button
                type="button"
                className="history-pagination__btn"
                onClick={() => setPageRequest(page + 1)}
                disabled={page + 1 >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      <InvoiceModal
        open={Boolean(invoiceTarget)}
        transactionId={invoiceTarget}
        onClose={() => setInvoiceTarget(null)}
      />

      <CancelOrderModal
        open={Boolean(cancelTarget)}
        target={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirmed={() => {
          setCancelTarget(null)
          setRefreshKey((k) => k + 1)
        }}
      />
    </div>
  )
}
