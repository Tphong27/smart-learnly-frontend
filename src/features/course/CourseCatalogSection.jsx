import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { getPublishedLifecycleCourses } from '@/data/demo/courseLifecycleRuntime'
import { CourseCard } from './CourseCard'

const PAGE_SIZE = 3

export function CourseCatalogSection({
  id = 'courses',
  title = 'Find the next course for your learning path',
  description = 'Search and filter published SLP courses. Draft courses remain hidden from the public catalog.',
  eyebrow = 'Course catalog',
  excludeCourseIds = [],
  className = '',
  embedded = false,
}) {
  const [courseQuery, setCourseQuery] = useState('')
  const [courseCategory, setCourseCategory] = useState('all')
  const [courseLevel, setCourseLevel] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const excludedIds = useMemo(() => {
    return new Set(excludeCourseIds)
  }, [excludeCourseIds])

  const publishedCourses = useMemo(() => {
    return getPublishedLifecycleCourses().filter((course) => {
      return !excludedIds.has(course.id)
    })
  }, [excludedIds])

  const courseCategories = useMemo(() => {
    return ['all', ...new Set(publishedCourses.map((course) => course.category))]
  }, [publishedCourses])

  const courseLevels = useMemo(() => {
    return ['all', ...new Set(publishedCourses.map((course) => course.level))]
  }, [publishedCourses])

  const filteredCourses = useMemo(() => {
    const normalizedQuery = courseQuery.trim().toLowerCase()

    return publishedCourses.filter((course) => {
      const searchableText = [
        course.title,
        course.category,
        course.level,
        course.shortDescription,
        ...(course.learningOutcomes || course.outcomes || []),
      ]
        .join(' ')
        .toLowerCase()

      const matchesQuery = searchableText.includes(normalizedQuery)

      const matchesCategory =
        courseCategory === 'all' || course.category === courseCategory

      const matchesLevel =
        courseLevel === 'all' || course.level === courseLevel

      return matchesQuery && matchesCategory && matchesLevel
    })
  }, [courseCategory, courseLevel, courseQuery, publishedCourses])

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE))

  const paginatedCourses = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE
    return filteredCourses.slice(startIndex, startIndex + PAGE_SIZE)
  }, [currentPage, filteredCourses])

  const handleSearchChange = (value) => {
    setCourseQuery(value)
    setCurrentPage(1)
  }

  const handleCategoryChange = (value) => {
    setCourseCategory(value)
    setCurrentPage(1)
  }

  const handleLevelChange = (value) => {
    setCourseLevel(value)
    setCurrentPage(1)
  }

  const goToPreviousPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1))
  }

  const goToNextPage = () => {
    setCurrentPage((page) => Math.min(totalPages, page + 1))
  }

  const sectionClassName = embedded
    ? `courses-section courses-section--embedded ${className}`.trim()
    : `courses-section section ${className}`.trim()

  return (
    <section className={sectionClassName} id={id}>
      <div className={embedded ? undefined : 'container'}>
        <div className="courses-heading">
          <div className="section-heading align-left">
            <span className="eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>

          <span className="course-result-count">
            Showing {paginatedCourses.length} of {filteredCourses.length} course(s)
          </span>
        </div>

        <div className="course-catalog-controls" aria-label="Course catalog filters">
          <label className="course-search">
            <Search size={18} />
            <input
              value={courseQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search by title, topic, or outcome"
            />
          </label>

          <label className="course-filter">
            <span>Category</span>
            <select
              value={courseCategory}
              onChange={(event) => handleCategoryChange(event.target.value)}
            >
              {courseCategories.map((category) => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All categories' : category}
                </option>
              ))}
            </select>
          </label>

          <label className="course-filter">
            <span>Level</span>
            <select
              value={courseLevel}
              onChange={(event) => handleLevelChange(event.target.value)}
            >
              {courseLevels.map((level) => (
                <option key={level} value={level}>
                  {level === 'all' ? 'All levels' : level}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="course-empty-state">
            <SlidersHorizontal size={28} />
            <h3>No available courses found</h3>
            <p>Try another keyword, category, or level.</p>
          </div>
        ) : (
          <>
            <div className="course-grid">
              {paginatedCourses.map((course) => (
                <CourseCard course={course} key={course.id} />
              ))}
            </div>

            {totalPages > 1 && (
              <nav
                className="course-pagination"
                aria-label="Course catalog pagination"
              >
                <button
                  type="button"
                  className="course-pagination-button"
                  disabled={currentPage === 1}
                  onClick={goToPreviousPage}
                >
                  Previous
                </button>

                <div className="course-pagination-pages">
                  {Array.from({ length: totalPages }, (_, index) => {
                    const page = index + 1

                    return (
                      <button
                        type="button"
                        key={page}
                        className={
                          page === currentPage
                            ? 'course-pagination-page active'
                            : 'course-pagination-page'
                        }
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    )
                  })}
                </div>

                <button
                  type="button"
                  className="course-pagination-button"
                  disabled={currentPage === totalPages}
                  onClick={goToNextPage}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  )
}
