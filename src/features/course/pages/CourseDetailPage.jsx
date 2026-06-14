import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  Layers3,
} from 'lucide-react'
import { courseService } from '../services'
import { CourseCurriculum } from '../components/CourseCurriculum'
import '../course.css'

function formatPrice(course) {
  if (course?.isFree || course?.is_free || Number(course?.price) === 0) {
    return 'Free'
  }

  const price = course.discountedPrice ?? course.discounted_price ?? course.price

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(price || 0))
}

function splitText(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  return String(value)
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function CourseDetailPage() {
  const { slug } = useParams()

  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadCourse() {
      setLoading(true)
      setError('')

      try {
        const data = await courseService.getCourseDetail(slug)
        if (mounted) {
          setCourse(data)
        }
      } catch (err) {
        if (mounted) {
          setError(err?.message || 'Can not load course detail right now.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadCourse()

    return () => {
      mounted = false
    }
  }, [slug])

  if (loading) {
    return (
      <main className="course-page">
        <div className="course-state">
          <p>Loading course detail...</p>
        </div>
      </main>
    )
  }

  if (error || !course) {
    return (
      <main className="course-page">
        <div className="course-state course-state--error">
          <h1>Course unavailable</h1>
          <p>{error || 'This course does not exist or is not published.'}</p>
          <Link to="/courses">Back to courses</Link>
        </div>
      </main>
    )
  }

  const thumbnailUrl = course.thumbnailUrl || course.thumbnail_url
  const categoryName = course.category?.name || course.categoryName || 'Course'
  const sections = course.sections || course.courseSections || []
  const outcomes = splitText(course.outcomes)
  const requirements = splitText(course.requirements)

  return (
    <main className="course-page">
      <Link to="/courses" className="course-back-link">
        <ArrowLeft size={16} />
        Back to courses
      </Link>

      <section className="course-detail-hero">
        <div className="course-detail-hero__copy">
          <span className="course-hero__eyebrow">{categoryName}</span>
          <h1>{course.title}</h1>
          <p>
            {course.shortDescription ||
              course.short_description ||
              course.description ||
              'No description available.'}
          </p>

          <div className="course-detail-hero__meta">
            {course.level && (
              <span>
                <BookOpen size={16} />
                {course.level}
              </span>
            )}
            <span>
              <Layers3 size={16} />
              {course.lessonCount ?? course.totalLessons ?? 0} lessons
            </span>
            <span>
              <Clock3 size={16} />
              {course.durationText || course.duration || 'Self-paced'}
            </span>
          </div>
        </div>

        <aside className="course-detail-card">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={course.title} />
          ) : (
            <div className="course-detail-card__placeholder">
              <BookOpen size={40} />
            </div>
          )}

          <div className="course-detail-card__body">
            <strong>{formatPrice(course)}</strong>
            <button type="button" className="course-primary-button">
              Enroll / Continue
            </button>
            <small>
              Payment and enrollment actions will be connected in Sprint 3.
            </small>
          </div>
        </aside>
      </section>

      <section className="course-detail-grid">
        <div className="course-detail-main">
          <article className="course-detail-section">
            <h2>About this course</h2>
            <p>{course.description || course.shortDescription || course.short_description}</p>
          </article>

          {outcomes.length > 0 && (
            <article className="course-detail-section">
              <h2>What you will learn</h2>
              <ul className="course-check-list">
                {outcomes.map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={18} />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          )}

          <article className="course-detail-section">
            <h2>Course curriculum</h2>
            <CourseCurriculum sections={sections} />
          </article>
        </div>

        <aside className="course-detail-side">
          <h2>Requirements</h2>
          {requirements.length > 0 ? (
            <ul>
              {requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No special requirements.</p>
          )}
        </aside>
      </section>
    </main>
  )
}