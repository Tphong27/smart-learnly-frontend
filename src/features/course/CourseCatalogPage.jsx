import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Star,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getPublishedLifecycleCourses } from '@/data/demo/courseLifecycleRuntime'
import { PageState } from '@/shared/components/PageState'
import { StatusBadge } from '@/shared/components/StatusBadge'
import {
  ClearFiltersButton,
  FilterToolbar,
  SearchBox,
  SelectFilter,
} from '@/shared/components/ui/ListControls'
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
        <div className="demo-chip-list">
          <span>AI-supported</span>
          <span>{course.owner || course.assignedSmeName}</span>
        </div>

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
  const [level, setLevel] = useState('all')
  const [priceType, setPriceType] = useState('all')
  const [minRating, setMinRating] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)

  const publishedCourses = useMemo(() => {
    return getPublishedLifecycleCourses()
  }, [])

  const categories = useMemo(() => {
    return ['all', ...new Set(publishedCourses.map((course) => course.category))]
  }, [publishedCourses])

  const levels = useMemo(() => {
    return ['all', ...new Set(publishedCourses.map((course) => course.level).filter(Boolean))]
  }, [publishedCourses])

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return publishedCourses
      .filter((course) => {
      const matchesQuery = [
        course.title,
        course.category,
        course.level,
        course.shortDescription,
        course.owner,
        course.assignedSmeName,
        (course.learningOutcomes || course.outcomes || []).join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)

      const matchesCategory = category === 'all' || course.category === category
      const matchesLevel = level === 'all' || course.level === level
      const matchesPrice =
        priceType === 'all' ||
        (priceType === 'free' ? Number(course.price) === 0 : Number(course.price) > 0)
      const matchesRating =
        minRating === 'all' || Number(course.rating || 0) >= Number(minRating)

      return matchesQuery && matchesCategory && matchesLevel && matchesPrice && matchesRating
    })
      .sort((a, b) => {
        if (sortBy === 'rating') return Number(b.rating || 0) - Number(a.rating || 0)
        if (sortBy === 'learners') {
          return Number(b.learnerCount || b.enrollmentCount || 0) - Number(a.learnerCount || a.enrollmentCount || 0)
        }
        if (sortBy === 'price-low') return Number(a.price || 0) - Number(b.price || 0)
        if (sortBy === 'price-high') return Number(b.price || 0) - Number(a.price || 0)
        if (sortBy === 'title') return a.title.localeCompare(b.title)
        return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
      })
  }, [category, level, minRating, priceType, publishedCourses, query, sortBy])

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

  const updateLevel = (value) => {
    setLevel(value)
    setCurrentPage(1)
  }

  const updatePriceType = (value) => {
    setPriceType(value)
    setCurrentPage(1)
  }

  const updateMinRating = (value) => {
    setMinRating(value)
    setCurrentPage(1)
  }

  const updateSort = (value) => {
    setSortBy(value)
    setCurrentPage(1)
  }

  const resetFilters = () => {
    setQuery('')
    setCategory('all')
    setLevel('all')
    setPriceType('all')
    setMinRating('all')
    setSortBy('newest')
    setCurrentPage(1)
  }

  const hasActiveFilters =
    query || category !== 'all' || level !== 'all' || priceType !== 'all' || minRating !== 'all' || sortBy !== 'newest'

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

      <FilterToolbar>
        <SearchBox
          value={query}
          onChange={updateQuery}
          placeholder="Search title, topic, SME"
          ariaLabel="Search courses"
        />

        <SelectFilter
          value={category}
          onChange={updateCategory}
          ariaLabel="Filter by category"
          options={categories.map((item) => ({
            value: item,
            label: item === 'all' ? 'All categories' : item,
          }))}
        />

        <SelectFilter
          value={level}
          onChange={updateLevel}
          ariaLabel="Filter by level"
          options={levels.map((item) => ({
            value: item,
            label: item === 'all' ? 'All levels' : item,
          }))}
        />

        <SelectFilter
          value={priceType}
          onChange={updatePriceType}
          ariaLabel="Filter by price"
          options={[
            { value: 'all', label: 'All prices' },
            { value: 'free', label: 'Free' },
            { value: 'paid', label: 'Paid' },
          ]}
        />

        <SelectFilter
          value={minRating}
          onChange={updateMinRating}
          ariaLabel="Filter by rating"
          options={[
            { value: 'all', label: 'Any rating' },
            { value: '4.5', label: '4.5+ rating' },
            { value: '4', label: '4.0+ rating' },
            { value: '3', label: '3.0+ rating' },
          ]}
        />

        <SelectFilter
          value={sortBy}
          onChange={updateSort}
          ariaLabel="Sort courses"
          options={[
            { value: 'newest', label: 'Newest' },
            { value: 'rating', label: 'Rating' },
            { value: 'learners', label: 'Learner count' },
            { value: 'price-low', label: 'Price low to high' },
            { value: 'price-high', label: 'Price high to low' },
            { value: 'title', label: 'Name A-Z' },
          ]}
        />

        <ClearFiltersButton onClick={resetFilters} disabled={!hasActiveFilters} />
      </FilterToolbar>

      <div className="demo-result-summary">
        Showing <strong>{paginatedCourses.length}</strong> of{' '}
        <strong>{filteredCourses.length}</strong> matched courses
      </div>

      {filteredCourses.length === 0 ? (
        <PageState
          state="empty"
          title="No courses found"
          description="Try a different keyword or category."
          action={
            <button type="button" className="demo-primary-action" onClick={resetFilters}>
              Clear filters
            </button>
          }
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
