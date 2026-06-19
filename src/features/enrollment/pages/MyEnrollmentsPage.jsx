import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '@/shared/components/ui'
import { enrollmentService } from '@/services'
import { formatDate } from '@/shared/utils/formatDate'
import './history-page.css'

const PAGE_SIZE = 20

function StatusBadge({ status }) {
  const normalized = (status || '').toLowerCase()
  return (
    <span className={`history-status history-status--${normalized || 'pending'}`}>
      {status || 'Pending'}
    </span>
  )
}

export function MyEnrollmentsPage() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pageRequest, setPageRequest] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await enrollmentService.getHistory({ page: pageRequest, size: PAGE_SIZE })
        if (cancelled) return
        setItems(data.items || [])
        setTotalPages(data.totalPages || 0)
        setTotalItems(data.totalItems || 0)
        setPage(data.page ?? pageRequest)
      } catch (err) {
        if (cancelled) return
        const message = err?.message || 'Could not load enrollment history.'
        setError(message)
        toast.error(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [pageRequest, toast])

  return (
    <div className="history-page">
      <header className="history-page__header">
        <h1>Enrollment history</h1>
        <p>All courses you have enrolled in, including active, completed, and cancelled records.</p>
      </header>

      <section className="history-card">
        <div className="history-toolbar">
          <strong style={{ fontSize: 14 }}>Course enrollments</strong>
          <span className="history-toolbar__count">{totalItems} record{totalItems === 1 ? '' : 's'}</span>
        </div>

        {loading ? (
          <div className="history-loading">Loading enrollment history...</div>
        ) : error ? (
          <div className="history-error">{error}</div>
        ) : items.length === 0 ? (
          <div className="history-empty">You have not enrolled in any course yet.</div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Status</th>
                <th>Enrolled at</th>
                <th>Last update</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.enrollmentId}>
                  <td>
                    <strong>{row.courseTitle}</strong>
                    {row.courseSlug && (
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>/{row.courseSlug}</div>
                    )}
                  </td>
                  <td><StatusBadge status={row.status} /></td>
                  <td>{formatDate(row.enrollmentDate)}</td>
                  <td>{formatDate(row.updatedAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {row.courseSlug && (
                      <Link to={`/courses/${row.courseSlug}`} className="history-table__link">
                        View course
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
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
    </div>
  )
}
