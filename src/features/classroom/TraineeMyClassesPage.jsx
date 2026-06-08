import { CalendarDays, ExternalLink, GraduationCap, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  enrollTraineeClass,
  getTraineeClasses,
} from '@/data/demo/demoTraineeRuntime'
import { useState } from 'react'
import { PageState } from '@/shared/components/PageState'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

function formatDate(value) {
  if (!value) return 'Not scheduled'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function ClassCard({ classItem, enrolled, onEnroll }) {
  return (
    <article className="demo-card">
      <div className="demo-row demo-row--between">
        <div>
          <span className="demo-kicker">
            {enrolled ? 'Registered class' : 'Available class'}
          </span>
          <h2>
            {classItem.displayName || classItem.name} - {classItem.courseTitle}
          </h2>
        </div>

        <StatusBadge status={classItem.status} />
      </div>

      <p className="demo-muted">
        Trainer: {classItem.trainerName} · {classItem.traineeCount} trainees
      </p>

      <div className="demo-meta-grid demo-meta-grid--wide">
        <span>
          <CalendarDays size={15} />
          {formatDate(classItem.startDate)} - {formatDate(classItem.endDate)}
        </span>
        <span>
          <Users size={15} />
          {classItem.schedule || 'Schedule not configured'}
        </span>
        <span>
          <GraduationCap size={15} />
          {classItem.courseTitle}
        </span>
      </div>

      {enrolled && (
        <>
          <section className="demo-card">
            <span className="demo-kicker">Class learning access</span>
            <h3>Meet link</h3>

            {classItem.meetLink ? (
              <a
                className="demo-primary-action"
                href={classItem.meetLink}
                target="_blank"
                rel="noreferrer"
              >
                Join class meet <ExternalLink size={16} />
              </a>
            ) : (
              <p className="demo-muted">Meet link is not available yet.</p>
            )}
          </section>

          <section>
            <span className="demo-kicker">Assignments</span>
            {(classItem.assignments || []).length === 0 ? (
              <p className="demo-muted">No assignments have been assigned yet.</p>
            ) : (
              <div className="demo-list">
                {classItem.assignments.map((assignment) => (
                  <article className="demo-list-item" key={assignment.id}>
                    <div>
                      <strong>{assignment.title}</strong>
                      <small>Due date: {formatDate(assignment.dueDate)}</small>
                    </div>
                    <StatusBadge status={assignment.status} />
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="demo-actions">
            <Link
              className="demo-secondary-action"
              to={`/courses/${classItem.courseId}`}
            >
              View course
            </Link>
            <Link
              className="demo-primary-action"
              to={`/learning/${classItem.courseId}`}
            >
              Open learning workspace
            </Link>
          </div>
        </>
      )}

      {!enrolled && (
        <button
          type="button"
          className="demo-primary-action"
          onClick={() => onEnroll(classItem.id)}
        >
          Enroll class
        </button>
      )}
    </article>
  )
}

export function TraineeMyClassesPage() {
  useDocumentTitle('My Classes')

  const [version, setVersion] = useState(0)
  const { enrolledClasses, availableClasses } = getTraineeClasses()

  const handleEnroll = (classId) => {
    enrollTraineeClass(classId)
    setVersion((current) => current + 1)
  }

  return (
    <main className="demo-page" data-version={version}>
      <section className="demo-hero-band">
        <div>
          <span className="demo-kicker">Trainee class workspace</span>
          <h1>My Classes</h1>
          <p>
            View registered classes, class schedule, meet link, assignments, and
            other active classes available for enrollment.
          </p>
        </div>
      </section>

      <section className="my-courses-section">
        <div className="demo-row demo-row--between my-courses-section__heading">
          <div>
            <span className="demo-kicker">Registered classes</span>
            <h2>Classes you joined</h2>
          </div>

          <span className="course-result-count">
            {enrolledClasses.length} enrolled
          </span>
        </div>

        {enrolledClasses.length === 0 ? (
          <PageState
            state="empty"
            title="No registered classes"
            description="Enroll in an available class to see schedule, meet link, and assignments."
          />
        ) : (
          <section className="demo-card-grid">
            {enrolledClasses.map((classItem) => (
              <ClassCard
                key={classItem.id}
                classItem={classItem}
                enrolled
                onEnroll={handleEnroll}
              />
            ))}
          </section>
        )}
      </section>

      <section className="my-courses-section">
        <div className="demo-row demo-row--between my-courses-section__heading">
          <div>
            <span className="demo-kicker">Available classes</span>
            <h2>Other active classes</h2>
          </div>

          <span className="course-result-count">
            {availableClasses.length} available
          </span>
        </div>

        <section className="demo-card-grid">
          {availableClasses.map((classItem) => (
            <ClassCard
              key={classItem.id}
              classItem={classItem}
              enrolled={false}
              onEnroll={handleEnroll}
            />
          ))}
        </section>
      </section>
    </main>
  )
}