import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardCheck, Lightbulb, Users } from 'lucide-react'
import { KpiCard } from '@/shared/components/ui/KpiCard'
import { StatusBadge } from '@/shared/components/ui/StatusBadge'
import { getClassAnalytics } from '@/data/demo/classFlowRuntime'

export function TrainerAnalytics() {
  const { classId } = useOutletContext()
  const analytics = useMemo(() => getClassAnalytics(classId), [classId])

  return (
    <div>
      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-4" style={{ marginBottom: '1.25rem' }}>
        <KpiCard title="Total Trainees" value={analytics.totalTrainees} icon={Users} />
        <KpiCard title="Avg Progress" value={`${analytics.averageProgress}%`} icon={BarChart3} />
        <KpiCard title="Assignment Completion" value={`${analytics.assignmentCompletionRate}%`} icon={ClipboardCheck} />
        <KpiCard title="Avg Test Score" value={`${analytics.averageTestScore}%`} icon={CheckCircle2} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* At Risk Trainees */}
        <section className="classflow-section">
          <div className="classflow-section__header">
            <h2 className="classflow-section__title">
              <AlertTriangle size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: '6px', color: '#f59e0b' }} />
              At-Risk Trainees
            </h2>
          </div>
          {analytics.atRiskTrainees.length === 0 ? (
            <p className="demo-muted">No at-risk trainees. Great job!</p>
          ) : (
            <div className="demo-list">
              {analytics.atRiskTrainees.map((t) => (
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

        {/* Weak Topics */}
        <section className="classflow-section">
          <h2 className="classflow-section__title">Weak Topics</h2>
          <div style={{ marginTop: '0.75rem' }}>
            {analytics.weakTopics.map((topic, i) => (
              <div key={i} className="classflow-progress-stat">
                <div className="classflow-progress-stat__label">
                  <span>{topic.topic}</span>
                  <span>{topic.score}%</span>
                </div>
                <div className="classflow-progress-stat__bar">
                  <div className="classflow-progress-stat__fill" style={{ width: `${topic.score}%`, background: topic.score < 55 ? '#f59e0b' : '#2563eb' }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* AI Recommendations */}
      <section className="classflow-section">
        <h2 className="classflow-section__title">
          <Lightbulb size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: '6px', color: '#2563eb' }} />
          AI Recommendations
        </h2>
        {analytics.aiRecommendations.length === 0 ? (
          <p className="demo-muted">No recommendations at this time.</p>
        ) : (
          <div className="demo-list" style={{ marginTop: '0.75rem' }}>
            {analytics.aiRecommendations.map((rec, i) => (
              <div key={i} className="demo-list-item">
                <div>
                  <strong style={{ textTransform: 'capitalize' }}>{rec.type}</strong>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#334155' }}>{rec.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
