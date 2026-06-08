import { ArrowRight, BrainCircuit, Flame, GraduationCap, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { demoCourses, demoTraineeMetrics, demoTraineeWeaknessAnalysis } from '@/data/demo'
import { PageState } from '@/shared/components/PageState'
import { ProgressBar } from '@/shared/components/ProgressBar'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useDemoPageState } from '@/shared/hooks/useDemoPageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'

export function MyAnalyticsPage() {
  useDocumentTitle('My analytics')

  const { loading, error } = useDemoPageState()

  if (loading) {
    return <PageState state="loading" title="Loading analytics" description="Preparing trainee metrics and weakness recommendations." />
  }

  if (error) {
    return <PageState state="error" title="Analytics unavailable" description={error.message} />
  }

  return (
    <main className="demo-page">
      <section className="demo-hero-band">
        <div>
          <span className="demo-kicker">Weakness analysis</span>
          <h1>Know what to review next</h1>
          <p>Draft recommendations are based on mock test performance and remain separate from official trainer feedback.</p>
        </div>
      </section>

      <section className="kpi-grid">
        <article className="demo-card kpi-card">
          <GraduationCap size={22} />
          <strong>{demoTraineeMetrics.enrolledCourses}</strong>
          <span>Enrolled course</span>
        </article>
        <article className="demo-card kpi-card">
          <Target size={22} />
          <strong>{demoTraineeMetrics.averageScore}%</strong>
          <span>Average score</span>
        </article>
        <article className="demo-card kpi-card">
          <Flame size={22} />
          <strong>{demoTraineeMetrics.studyStreakDays} days</strong>
          <span>Study streak</span>
        </article>
      </section>

      <section className="demo-card">
        <div className="demo-row demo-row--between">
          <div>
            <h2>Focus topics</h2>
            <p className="demo-muted">These draft suggestions help the trainee choose review actions after a test.</p>
          </div>
          <BrainCircuit size={24} />
        </div>

        {demoTraineeWeaknessAnalysis.length === 0 ? (
          <PageState state="empty" title="No weakness analysis yet" description="Complete a published test to generate review suggestions." />
        ) : (
          <div className="weakness-grid">
            {demoTraineeWeaknessAnalysis.map((item) => {
              const course = demoCourses.find((courseItem) => courseItem.id === item.courseId)

              return (
                <article className="weakness-card" key={item.id}>
                  <StatusBadge status={item.severity} tone={item.severity === 'high' ? 'at-risk' : 'review'} />
                  <h3>{item.topic}</h3>
                  <small>{course?.title}</small>
                  <ProgressBar value={item.score} label={`${item.topic} score`} />
                  <p>{item.recommendation}</p>
                  <div className="demo-row demo-row--between">
                    <StatusBadge status={item.recommendationStatus} />
                    <Link className="demo-text-link" to={`/learning/${item.courseId}`}>
                      Review lessons <ArrowRight size={14} />
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
