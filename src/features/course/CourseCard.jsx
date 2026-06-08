import {
  ArrowRight,
  BookOpen,
  Clock3,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'

function formatPrice(course) {
  if (!course?.price) return 'Free'

  return new Intl.NumberFormat('vi-VN').format(course.price) + ' ' + course.currency
}

function RatingValue({ rating }) {
  if (!rating) {
    return <span className="course-rating-muted">New</span>
  }

  return (
    <>
      <Star size={13} fill="currentColor" />
      {rating}
    </>
  )
}

export function CourseCard({ course }) {
  return (
    <article className="course-card">
      <div className={`course-cover ${course.accent || 'blue'}`}>
        <span className="course-category">{course.category}</span>

        <div className="course-cover-art">
          <span>
            <BookOpen size={28} />
          </span>
          <span>
            <Sparkles size={18} />
          </span>
        </div>
      </div>

      <div className="course-card-body">
        <div className="course-meta">
          <span>{course.level}</span>
          <span>
            <RatingValue rating={course.rating} />
          </span>
        </div>

        <h3>{course.title}</h3>
        <p>{course.shortDescription}</p>

        <div className="course-details">
          <span>
            <BookOpen size={14} />
            {course.lessonCount || course.lessons || 0} lessons
          </span>

          <span>
            <Clock3 size={14} />
            {course.duration}
          </span>

          <span>
            <Users size={14} />
            {course.enrolledCount || 0}
          </span>
        </div>

        <div className="course-card-footer">
          <strong>{formatPrice(course)}</strong>

          <Link to={`/courses/${course.id}`}>
            View detail <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  )
}