import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  Users,
} from 'lucide-react'
import { KpiCard } from '@/shared/components/ui/KpiCard'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import {
  getClassAnalytics,
  getClassAnnouncements,
  getClassAssignments,
  getClassTests,
  getClassTrainees,
  getSubmissionsByClass,
} from '@/data/demo/classFlowRuntime'

function formatDate(value) {
  if (!value) return 'Not set'
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))
}

export function TrainerClassOverview() {
  const { classData, classId } = useOutletContext()
  const analytics = useMemo(() => getClassAnalytics(classId), [classId])
  const trainees = useMemo(() => getClassTrainees(classId), [classId])
  const assignments = useMemo(() => getClassAssignments(classId), [classId])
  const tests = useMemo(() => getClassTests(classId), [classId])
  const announcements = useMemo(() => getClassAnnouncements(classId), [classId])
  const submissions = useMemo(() => getSubmissionsByClass(classId), [classId])

  const atRiskTrainees = trainees.filter((t) => t.risk === 'high' || t.risk === 'medium')
  const recentSubmissions = submissions.slice(0, 5)
  const upcomingAssignments = assignments.filter((a) => a.status === 'published')
  const upcomingTests = tests.filter((t) => t.status === 'published')

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
            <div className="classflow-info-item__label">Schedule</div>
            <div className="classflow-info-item__value">{classData?.schedule || 'Not set'}</div>
          </div>
          <div className="classflow-info-item">
            <div className="classflow-info-item__label">Dates</div>
            <div className="classflow-info-item__value">{formatDate(classData?.startDate)} – {formatDate(classData?.endDate)}</div>
          </div>
          <div className="classflow-info-item">
            <div className="classflow-info-item__label">Learning Mode</div>
            <div className="classflow-info-item__value" style={{ textTransform: 'capitalize' }}>{classData?.learningMode}</div>
          </div>
        </div>
      </section>

      {/* KPI */}
      <div className="grid gap-4 md:grid-cols-4" style={{ marginBottom: '1.25rem' }}>
        <KpiCard title="Trainees" value={analytics.totalTrainees} icon={Users} />
        <KpiCard title="Avg Progress" value={`${analytics.averageProgress}%`} icon={BarChart3} />
        <KpiCard title="Assignments" value={analytics.totalAssignments} icon={ClipboardCheck} />
        <KpiCard title="At Risk" value={atRiskTrainees.length} icon={AlertTriangle} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Recent Announcements */}
        <section className="classflow-section">
          <h2 className="classflow-section__title">Recent Announcements</h2>
          {announcements.length === 0 ? (
            <p className="demo-muted">No announcements yet.</p>
          ) : (
            <div className="demo-list" style={{ marginTop: '0.75rem' }}>
              {announcements.slice(0, 3).map((a) => (
                <div key={a.id} className="demo-list-item">
                  <div>
                    <strong>{a.title}</strong>
                    <small>{formatDate(a.createdAt)}</small>
                  </div>
                  {a.pinned ? <span className="classflow-pin-badge">Pinned</span> : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Assignments */}
        <section className="classflow-section">
          <h2 className="classflow-section__title">Upcoming Assignments</h2>
          {upcomingAssignments.length === 0 ? (
            <p className="demo-muted">No published assignments.</p>
          ) : (
            <div className="demo-list" style={{ marginTop: '0.75rem' }}>
              {upcomingAssignments.slice(0, 3).map((a) => (
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
          {upcomingTests.length === 0 ? (
            <p className="demo-muted">No published tests.</p>
          ) : (
            <div className="demo-list" style={{ marginTop: '0.75rem' }}>
              {upcomingTests.slice(0, 3).map((t) => (
                <div key={t.id} className="demo-list-item">
                  <div>
                    <strong>{t.title}</strong>
                    <small>{t.type} · Due: {formatDate(t.dueDate)}</small>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* At-Risk Trainees */}
        <section className="classflow-section">
          <h2 className="classflow-section__title">At-Risk Trainees</h2>
          {atRiskTrainees.length === 0 ? (
            <p className="demo-muted">No at-risk trainees.</p>
          ) : (
            <div className="demo-list" style={{ marginTop: '0.75rem' }}>
              {atRiskTrainees.map((t) => (
                <div key={t.id} className="demo-list-item">
                  <div>
                    <strong>{t.name}</strong>
                    <small>Progress: {t.progress}% · Weak: {t.weakTopic}</small>
                  </div>
                  <StatusBadge status={t.risk} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Recent Submissions */}
      <section className="classflow-section">
        <h2 className="classflow-section__title">Recent Submissions</h2>
        {recentSubmissions.length === 0 ? (
          <p className="demo-muted">No submissions yet.</p>
        ) : (
          <div className="demo-list" style={{ marginTop: '0.75rem' }}>
            {recentSubmissions.map((s) => (
              <div key={s.id} className="demo-list-item">
                <div>
                  <strong>{s.traineeName}</strong>
                  <small>
                    Submitted: {formatDate(s.submittedAt)} ·
                    Grade: {s.finalGrade != null ? `${s.finalGrade}/100` : 'Pending'}
                  </small>
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
