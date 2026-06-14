import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { courseService } from '../services'
import { CourseCard } from '../components/CourseCard'
import { CourseFilters } from '../components/CourseFilters'
import { CourseListToolbar } from '../components/CourseListToolbar'
import '../course.css'

const DEFAULT_PAGE_SIZE = 3

export function CourseListPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [courses, setCourses] = useState([])
  const [categories, setCategories] = useState([])
  const [pageInfo, setPageInfo] = useState({
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    totalElements: 0,
    totalPages: 1,
  })
  const [viewMode, setViewMode] = useState(
    localStorage.getItem('courseViewMode') || 'grid',
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const keyword = searchParams.get('keyword') || ''
  const categoryId = searchParams.get('categoryId') || ''
  const page = Number(searchParams.get('page') || 0)

  useEffect(() => {
    let mounted = true

    async function loadCategories() {
      try {
        const data = await courseService.getCategories()
        if (mounted) {
          setCategories(Array.isArray(data) ? data : [])
        }
      } catch {
        if (mounted) {
          setCategories([])
        }
      }
    }

    loadCategories()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function loadCourses() {
      setLoading(true)
      setError('')

      try {
        const data = await courseService.getPublicCourses({
          page,
          size: DEFAULT_PAGE_SIZE,
          keyword,
          categoryId,
        })

        if (mounted) {
          setCourses(data.items)
          setPageInfo(data)
        }
      } catch (err) {
        if (mounted) {
          setError(err?.message || 'Can not load courses right now.')
          setCourses([])
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadCourses()

    return () => {
      mounted = false
    }
  }, [keyword, categoryId, page])

  function updateQuery(nextValues) {
    const next = {
      keyword,
      categoryId,
      page: String(page),
      ...nextValues,
    }

    Object.keys(next).forEach((key) => {
      if (!next[key] || next[key] === '0') {
        delete next[key]
      }
    })

    setSearchParams(next)
  }

  function handleKeywordChange(value) {
    updateQuery({
      keyword: value,
      page: '0',
    })
  }

  function handleCategoryChange(value) {
    updateQuery({
      categoryId: value,
      page: '0',
    })
  }

  function handleViewModeChange(mode) {
    setViewMode(mode)
    localStorage.setItem('courseViewMode', mode)
  }

  const pageNumbers = useMemo(() => {
    return Array.from({ length: pageInfo.totalPages }, (_, index) => index)
  }, [pageInfo.totalPages])

  return (
    <main className="course-page">
      <section className="course-hero">
        <span className="course-hero__eyebrow">Course catalog</span>
        <h1>Explore courses that match your learning goals</h1>
        <p>
          Browse published courses, filter by category, and open course details
          before enrollment.
        </p>
      </section>

      <section className="course-panel">
        <CourseFilters
          keyword={keyword}
          categoryId={categoryId}
          categories={categories}
          onKeywordChange={handleKeywordChange}
          onCategoryChange={handleCategoryChange}
        />

        <CourseListToolbar
          totalElements={pageInfo.totalElements}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
        />

        {loading && (
          <div className="course-state">
            <p>Loading courses...</p>
          </div>
        )}

        {!loading && error && (
          <div className="course-state course-state--error">
            <p>{error}</p>
            <button type="button" onClick={() => updateQuery({ page: String(page) })}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="course-state">
            <h2>No courses found</h2>
            <p>Try another keyword or category.</p>
          </div>
        )}

        {!loading && !error && courses.length > 0 && (
          <>
            <div className={`course-list course-list--${viewMode}`}>
              {courses.map((course) => (
                <CourseCard
                  key={course.id || course.slug}
                  course={course}
                  viewMode={viewMode}
                />
              ))}
            </div>

            {pageInfo.totalPages > 1 && (
              <nav className="course-pagination" aria-label="Course pagination">
                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={pageNumber === page ? 'is-active' : ''}
                    onClick={() => updateQuery({ page: String(pageNumber) })}
                  >
                    {pageNumber + 1}
                  </button>
                ))}
              </nav>
            )}
          </>
        )}
      </section>
    </main>
  )
}