import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Search,
  Star,
  SlidersHorizontal,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { demoCourses } from '@/data/demo'
import { PageState } from '@/shared/components/PageState'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useDemoPageState } from '@/shared/hooks/useDemoPageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

const PAGE_SIZE = 6

function formatPrice(course) {
  return new Intl.NumberFormat('vi-VN').format(course.price) + ' ' + course.currency
}

function CourseCard({ course }) {
  return (
    <article className="demo-card course-discovery-card">
      <div className="course-discovery-card__cover">
        <span>{course.category}</span>
        <BookOpen size={34} />
      </div>

      <div className="course-discovery-card__body">
        <div className="demo-row demo-row--between">
          <StatusBadge status={course.status} />
          <span className="demo-rating">
            <Star size={14} /> {course.rating || 'New'}
          </span>
        </div>

        <h2>{course.title}</h2>
        <p>{course.shortDescription}</p>

        <div className="demo-meta-grid">
          <span>
            <BookOpen size={15} /> {course.lessonCount} lessons
          </span>
          <span>
            <Clock3 size={15} /> {course.duration}
          </span>
        </div>

        <div className="course-discovery-card__footer">
          <strong>{formatPrice(course)}</strong>
          <Link className="demo-link-button" to={`/courses/${course.id}`}>
            View detail <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  )
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  return (
    <nav className="demo-pagination" aria-label="Course pagination">
      <button
        type="button"
        className="demo-pagination__button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft size={16} />
        Previous
      </button>

      <div className="demo-pagination__pages">
        {Array.from({ length: totalPages }, (_, index) => {
          const page = index + 1

          return (
            <button
              type="button"
              key={page}
              className={
                page === currentPage
                  ? 'demo-pagination__page is-active'
                  : 'demo-pagination__page'
              }
              onClick={() => onPageChange(page)}
            >
              {page}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className="demo-pagination__button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
        <ChevronRight size={16} />
      </button>
    </nav>
  )
}

export function CourseCatalogPage() {
  useDocumentTitle('Course catalog')

  const { loading, error } = useDemoPageState()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const publishedCourses = useMemo(() => {
    return demoCourses.filter((course) => course.status === 'published')
  }, [])

  const categories = useMemo(() => {
    return ['all', ...new Set(publishedCourses.map((course) => course.category))]
  }, [publishedCourses])

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return publishedCourses.filter((course) => {
      const matchesQuery = [
        course.title,
        course.category,
        course.level,
        course.shortDescription,
        course.outcomes.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)

      const matchesCategory = category === 'all' || course.category === category

      return matchesQuery && matchesCategory
    })
  }, [category, publishedCourses, query])

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE))

  const paginatedCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredCourses.slice(startIndex, startIndex + PAGE_SIZE)
  }, [currentPage, filteredCourses])

  const updateQuery = (value) => {
    setQuery(value)
    setCurrentPage(1)
  }

  const updateCategory = (value) => {
    setCategory(value)
    setCurrentPage(1)
  }

  if (loading) {
    return (
      <PageState
        state="loading"
        title="Loading courses"
        description="Preparing the public course catalog."
      />
    )
  }

  if (error) {
    return (
      <PageState
        state="error"
        title="Catalog unavailable"
        description={error.message}
      />
    )
  }

  return (
    <main className="demo-page">
      <section className="demo-hero-band">
        <div>
          <span className="demo-kicker">Course discovery</span>
          <h1>Find the next course for your learning path</h1>
          <p>
            Browse published SLP courses. Draft courses remain hidden from the
            public catalog.
          </p>
        </div>
      </section>

      <section className="demo-toolbar" aria-label="Course filters">
        <label className="demo-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Search by title, topic, or outcome"
          />
        </label>

        <label className="demo-select">
          <SlidersHorizontal size={17} />
          <select
            value={category}
            onChange={(event) => updateCategory(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === 'all' ? 'All categories' : item}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="demo-result-summary">
        Showing <strong>{paginatedCourses.length}</strong> of{' '}
        <strong>{filteredCourses.length}</strong> matched courses
      </div>

      {filteredCourses.length === 0 ? (
        <PageState
          state="empty"
          title="No courses found"
          description="Try a different keyword or category."
        />
      ) : (
        <>
          <section className="demo-card-grid">
            {paginatedCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </section>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </main>
  )
}