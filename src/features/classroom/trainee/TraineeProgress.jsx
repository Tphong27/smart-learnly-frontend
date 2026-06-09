import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { BookOpen, ClipboardCheck, FileText, Layers3, Lightbulb } from 'lucide-react'
import { KpiCard } from '@/shared/components/ui/KpiCard'
import { getCurrentUser } from '@/services/api-client'
import { getTraineeClassProgress } from '@/data/demo/classFlowRuntime'

export function TraineeProgress() {
  const { classId } = useOutletContext()
  const user = getCurrentUser()
  const traineeId = user?.id || 'trainee-minh'
  const progress = useMemo(() => getTraineeClassProgress(classId, traineeId), [classId, traineeId])

  return (
    <div>
      {/* KPI */}
      <div className="grid gap-4 md:grid-cols-4" style={{ marginBottom: '1.25rem' }}>
        <KpiCard title="Course Progress" value={`${progress.courseProgress}%`} icon={BookOpen} />
        <KpiCard title="Assignments Done" value={`${progress.assignmentCompleted}/${progress.assignmentTotal}`} icon={ClipboardCheck} />
        <KpiCard title="Test Avg Score" value={`${progress.testAvgScore}%`} icon={FileText} />
        <KpiCard title="Avg Assignment Grade" value={progress.assignmentAvgGrade ? `${progress.assignmentAvgGrade}%` : 'N/A'} icon={Layers3} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Progress Bars */}
        <section className="classflow-section">
          <h2 className="classflow-section__title">Progress Breakdown</h2>
          <div style={{ marginTop: '0.75rem' }}>
            <div className="classflow-progress-stat">
              <div className="classflow-progress-stat__label">
                <span>Course Progress</span>
                <span>{progress.courseProgress}%</span>
              </div>
              <div className="classflow-progress-stat__bar">
                <div className="classflow-progress-stat__fill" style={{ width: `${progress.courseProgress}%` }} />
              </div>
            </div>

            <div className="classflow-progress-stat">
              <div className="classflow-progress-stat__label">
                <span>Assignment Completion</span>
                <span>{progress.assignmentTotal > 0 ? Math.round((progress.assignmentCompleted / progress.assignmentTotal) * 100) : 0}%</span>
              </div>
              <div className="classflow-progress-stat__bar">
                <div className="classflow-progress-stat__fill" style={{ width: `${progress.assignmentTotal > 0 ? Math.round((progress.assignmentCompleted / progress.assignmentTotal) * 100) : 0}%` }} />
              </div>
            </div>

            <div className="classflow-progress-stat">
              <div className="classflow-progress-stat__label">
                <span>Test Performance</span>
                <span>{progress.testAvgScore}%</span>
              </div>
              <div className="classflow-progress-stat__bar">
                <div className="classflow-progress-stat__fill" style={{ width: `${progress.testAvgScore}%`, background: progress.testAvgScore < 70 ? '#f59e0b' : '#2563eb' }} />
              </div>
            </div>
          </div>
        </section>

        {/* Weak Areas */}
        <section className="classflow-section">
          <h2 className="classflow-section__title">Weak Areas</h2>
          {progress.weakAreas.length === 0 ? (
            <p className="demo-muted" style={{ marginTop: '0.75rem' }}>No weak areas identified yet.</p>
          ) : (
            <div className="demo-list" style={{ marginTop: '0.75rem' }}>
              {progress.weakAreas.map((area, i) => (
                <div key={i} className="demo-list-item">
                  <strong>{area}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Suggestions */}
      <section className="classflow-section">
        <h2 className="classflow-section__title">
          <Lightbulb size={18} style={{ display: 'inline', verticalAlign: '-3px', marginRight: '6px', color: '#2563eb' }} />
          Learning Suggestions
        </h2>
        {progress.suggestions.length === 0 ? (
          <p className="demo-muted">No suggestions at this time.</p>
        ) : (
          <div className="demo-list" style={{ marginTop: '0.75rem' }}>
            {progress.suggestions.map((suggestion, i) => (
              <div key={i} className="demo-list-item">
                <p style={{ fontSize: '0.875rem', color: '#334155' }}>{suggestion}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
