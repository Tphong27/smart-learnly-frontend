import { useMemo } from 'react'
import { useOutletContext, Link } from 'react-router-dom'
import { BookOpen, ClipboardCheck, FileText, Layers3 } from 'lucide-react'
import { KpiCard } from '@/shared/components/ui/KpiCard'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { getCurrentUser } from '@/services/api-client'
import {
  getClassAnnouncements,
  getClassAssignments,
  getClassTests,
  getSharedFlashcardSets,
  getTraineeClassProgress,
} from '@/data/demo/classFlowRuntime'

function formatDate(v) {
  if (!v) return 'Not set'
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(v))
}

export function TraineeClassOverview() {
  const { classData, classId } = useOutletContext()
  const user = getCurrentUser()
  const traineeId = user?.id || 'trainee-minh'

  const progress = useMemo(() => getTraineeClassProgress(classId, traineeId), [classId, traineeId])
  const announcements = useMemo(() => getClassAnnouncements(classId), [classId])
  const assignments = useMemo(() => getClassAssignments(classId).filter((a) => a.status === 'published'), [classId])
  const tests = useMemo(() => getClassTests(classId).filter((t) => t.status === 'published'), [classId])
  const flashcardSets = useMemo(() => getSharedFlashcardSets(classId), [classId])

  return (
    <div>
      {/* Class Info */}
      <section className="classflow-section">
        <h2 className="classflow-section__title">Class Information</h2>
        <div className="classflow-info-grid" style={{ marginTop: '0.75rem' }}>
          <div className="classflow-info-item">
            <div className="classflow-info-item__label">Course</div>
            <div className="classflow-info-item__value">{classData?.courseTitle}</div>
          </div>
          <div className="classflow-info-item">
            <div className="classflow-info-item__label">Trainer</div>
            <div className="classflow-info-item__value">{classData?.trainerName}</div>
          </div>
          <div className="classflow-info-item">
            <div className="classflow-info-item__label">Schedule</div>
            <div className="classflow-info-item__value">{classData?.schedule || 'Not set'}</div>
          </div>
          <div className="classflow-info-item">
            <div className="classflow-info-item__label">Dates</div>
            <div className="classflow-info-item__value">{formatDate(classData?.startDate)} – {formatDate(classData?.endDate)}</div>
          </div>
        </div>

        {classData?.courseId ? (
          <Link
            to={`/courses/${classData.courseId}`}
            className="demo-primary-action"
            style={{ marginTop: '1rem', display: 'inline-flex' }}
          >
            <BookOpen size={15} /> Continue Learning
          </Link>
        ) : null}
      </section>

      {/* My Progress KPI */}
      <div className="grid gap-4 md:grid-cols-4" style={{ marginBottom: '1.25rem' }}>
        <KpiCard title="Course Progress" value={`${progress.courseProgress}%`} icon={BookOpen} />
        <KpiCard title="Assignments Done" value={`${progress.assignmentCompleted}/${progress.assignmentTotal}`} icon={ClipboardCheck} />
        <KpiCard title="Test Avg Score" value={`${progress.testAvgScore}%`} icon={FileText} />
        <KpiCard title="Flashcard Sets" value={flashcardSets.length} icon={Layers3} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Latest Announcements */}
        <section className="classflow-section">
          <h2 className="classflow-section__title">Latest Announcements</h2>
          {announcements.length === 0 ? (
            <p className="demo-muted">No announcements.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
              {announcements.slice(0, 3).map((a) => (
                <article key={a.id} className={`classflow-announcement${a.pinned ? ' is-pinned' : ''}`}>
                  <div className="classflow-announcement__header">
                    <span className="classflow-announcement__title">{a.title}</span>
                    {a.pinned ? <span className="classflow-pin-badge">Pinned</span> : null}
                  </div>
                  <p className="classflow-announcement__body" style={{ WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.content}</p>
                  <span className="classflow-announcement__meta">{a.createdByName} · {formatDate(a.createdAt)}</span>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Assignments */}
        <section className="classflow-section">
          <h2 className="classflow-section__title">Upcoming Assignments</h2>
          {assignments.length === 0 ? (
            <p className="demo-muted">No upcoming assignments.</p>
          ) : (
            <div className="demo-list" style={{ marginTop: '0.75rem' }}>
              {assignments.slice(0, 3).map((a) => (
                <div key={a.id} className="demo-list-item">
                  <div>
                    <strong>{a.title}</strong>
                    <small>Due: {formatDate(a.dueDate)} · {a.points} pts</small>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Tests */}
        <section className="classflow-section">
          <h2 className="classflow-section__title">Upcoming Tests</h2>
          {tests.length === 0 ? (
            <p className="demo-muted">No upcoming tests.</p>
          ) : (
            <div className="demo-list" style={{ marginTop: '0.75rem' }}>
              {tests.slice(0, 3).map((t) => (
                <div key={t.id} className="demo-list-item">
                  <div>
                    <strong>{t.title}</strong>
                    <small>{t.type} · {t.timeLimit} min</small>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Shared Flashcards */}
        <section className="classflow-section">
          <h2 className="classflow-section__title">Shared Flashcards</h2>
          {flashcardSets.length === 0 ? (
            <p className="demo-muted">No shared flashcard sets.</p>
          ) : (
            <div className="demo-list" style={{ marginTop: '0.75rem' }}>
              {flashcardSets.slice(0, 3).map((s) => (
                <div key={s.id} className="demo-list-item">
                  <div>
                    <strong>{s.title}</strong>
                    <small>{s.cards.length} cards · {s.source}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
