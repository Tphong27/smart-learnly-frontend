import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Clock3, Search, Star, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { demoCourses } from '@/data/demo'
import { PageState } from '@/shared/components/PageState'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useDemoPageState } from '@/shared/hooks/useDemoPageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

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
          <span className="demo-rating"><Star size={14} /> {course.rating || 'New'}</span>
        </div>
        <h2>{course.title}</h2>
        <p>{course.shortDescription}</p>
        <div className="demo-meta-grid">
          <span><BookOpen size={15} /> {course.lessonCount} lessons</span>
          <span><Clock3 size={15} /> {course.duration}</span>
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

export function CourseCatalogPage() {
  useDocumentTitle('Course catalog')

  const { loading, error } = useDemoPageState()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')

  const publishedCourses = demoCourses.filter((course) => course.status === 'published')
  const categories = ['all', ...new Set(publishedCourses.map((course) => course.category))]

  const filteredCourses = useMemo(() => {
    return publishedCourses.filter((course) => {
      const matchesQuery = [course.title, course.category, course.shortDescription]
        .join(' ')
        .toLowerCase()
        .includes(query.trim().toLowerCase())
      const matchesCategory = category === 'all' || course.category === category

      return matchesQuery && matchesCategory
    })
  }, [category, publishedCourses, query])

  if (loading) {
    return <PageState state="loading" title="Loading courses" description="Preparing the public course catalog." />
  }

  if (error) {
    return <PageState state="error" title="Catalog unavailable" description={error.message} />
  }

  return (
    <main className="demo-page">
      <section className="demo-hero-band">
        <div>
          <span className="demo-kicker">Course discovery</span>
          <h1>Find the next course for your learning path</h1>
          <p>Browse published SLP courses. Draft courses remain hidden from the public catalog.</p>
        </div>
      </section>

      <section className="demo-toolbar" aria-label="Course filters">
        <label className="demo-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, topic, or outcome"
          />
        </label>
        <label className="demo-select">
          <SlidersHorizontal size={17} />
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => (
              <option key={item} value={item}>{item === 'all' ? 'All categories' : item}</option>
            ))}
          </select>
        </label>
      </section>

      {filteredCourses.length === 0 ? (
        <PageState state="empty" title="No courses found" description="Try a different keyword or category." />
      ) : (
        <section className="demo-card-grid">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </section>
      )}
    </main>
  )
}
