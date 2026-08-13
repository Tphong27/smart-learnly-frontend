import { useEffect, useState } from 'react'
import { Button, DataTable, EmptyState, ErrorState, LoadingState, useToast } from '@/shared/components/ui'
import Pagination from '@/shared/components/Pagination'
import { enrollmentService } from '../services/enrollmentService'
import { StatusBadge } from '@/shared/components/status'
import { formatDate } from '@/shared/utils/formatters'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/pagination'
import './history-page.css'

/** Hiển thị lịch sử ghi danh với trạng thái, bảng responsive và phân trang dùng chung. */
export function MyEnrollmentsPage() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pageRequest, setPageRequest] = useState(0)
  const columns = [
    {
      key: 'course',
      header: 'Course',
      render: (row) => (
        <div className="history-course-cell">
          <strong>{row.courseTitle}</strong>
          {row.courseSlug ? <span>/{row.courseSlug}</span> : null}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'enrolledAt',
      header: 'Enrolled at',
      render: (row) => formatDate(row.enrollmentDate),
    },
    {
      key: 'updatedAt',
      header: 'Last update',
      render: (row) => formatDate(row.updatedAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      cellClassName: 'history-table__actions',
      render: (row) => row.courseSlug ? (
        <Button to={`/courses/${row.courseSlug}`} variant="link" size="sm">
          View course
        </Button>
      ) : null,
    },
  ]

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await enrollmentService.getHistory({ page: pageRequest, size: DEFAULT_PAGE_SIZE })
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
          <LoadingState label="Loading enrollment history..." />
        ) : error ? (
          <ErrorState title="Could not load enrollment history" description={error} />
        ) : items.length === 0 ? (
          <EmptyState title="No enrollment history" description="You have not enrolled in any course yet." />
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            rowKey="enrollmentId"
            ariaLabel="Enrollment history"
          />
        )}

        <Pagination
          page={page + 1}
          totalPages={totalPages}
          totalItems={totalItems}
          size={DEFAULT_PAGE_SIZE}
          onPageChange={(nextPage) => setPageRequest(nextPage - 1)}
          ariaLabel="Enrollment history pagination"
        />
      </section>
    </div>
  )
}
