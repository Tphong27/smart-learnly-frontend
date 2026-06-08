import { useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  PlayCircle,
  Save,
  Send,
  Sparkles,
} from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import {
  getAllDemoEnrollments,
  getCompletedLessonIds,
  getCourseProgress,
  getDemoEnrollmentByCourse,
  markDemoLessonCompleted,
} from '@/data/demo/demoRuntime'
import {
  generateFlashcardsForLesson,
  generateKeyPointsForLesson,
  generatePracticeTestForLesson,
  generateSummaryForLesson,
  getGeneratedResources,
  getLessonNotes,
  getLifecycleCourseById,
  getLifecycleModules,
  saveLessonNote,
} from '@/data/demo/courseLifecycleRuntime'
import { PageState } from '@/shared/components/PageState'
import { ProgressBar } from '@/shared/components/ProgressBar'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useDemoPageState } from '@/shared/hooks/useDemoPageState'
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle'
import { DiscussionPanel } from './DiscussionPanel'

function getFirstLessonId(modules) {
  return modules.flatMap((module) => module.lessons)[0]?.id || ''
}

function CourseOutlinePanel({ course, modules, completedLessonIds, currentLessonId }) {
  return (
    <aside className="learning-workspace-panel learning-outline-panel">
      <div>
        <span className="demo-kicker">Course Outline</span>
        <h2>{course.title}</h2>
        <ProgressBar value={getCourseProgress(course.id)} label="Course progress" />
      </div>

      <div className="course-editor-module-list">
        {modules.map((module) => (
          <article key={module.id}>
            <strong>{module.title}</strong>
            <div>
              {module.lessons.map((lesson) => {
                const completed = completedLessonIds.includes(lesson.id)
                const locked = module.status !== 'published' || lesson.status !== 'published'

                return (
                  <Link
                    key={lesson.id}
                    className={lesson.id === currentLessonId ? 'is-active' : ''}
                    to={locked ? '#' : `/learning/${course.id}/lessons/${lesson.id}`}
                    aria-disabled={locked}
                  >
                    <span>{lesson.title}</span>
                    <small>
                      {locked ? 'Locked' : completed ? 'Completed' : `${lesson.type} | ${lesson.durationMinutes} min`}
                    </small>
                  </Link>
                )
              })}
            </div>
          </article>
        ))}
      </div>
    </aside>
  )
}

function AIAssistantBox({ lesson }) {
  const [response, setResponse] = useState('')
  const [question, setQuestion] = useState('')
  const prompts = ['Explain simply', 'Summarize lesson', 'Give examples', 'Create study plan']

  const answer = (prompt) => {
    setResponse(`${prompt}: Here is a mock AI answer grounded in "${lesson?.title}". Review the key ideas, connect them to examples, and practice with a short quiz.`)
  }

  const submitQuestion = () => {
    if (!question.trim()) return
    setResponse(`AI answer for "${question}": Start from the lesson summary, then compare it with the examples and practice questions.`)
    setQuestion('')
  }

  return (
    <section className="course-editor-ai-box">
      <div className="demo-row demo-row--between">
        <div>
          <span className="demo-kicker">AI Assistant</span>
          <h3>Ask about this lesson</h3>
        </div>
        <Sparkles size={22} />
      </div>

      <div className="course-editor-prompt-row">
        {prompts.map((prompt) => (
          <button key={prompt} type="button" onClick={() => answer(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <div className="learning-ai-input">
        <input
          value={question}
          placeholder="Ask AI about this lesson..."
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button type="button" onClick={submitQuestion}>
          <Send size={15} />
        </button>
      </div>

      <div className="course-editor-ai-response">
        <strong>Mock AI response</strong>
        <p>{response || 'Use a prompt or ask a question to get AI-supported study help.'}</p>
      </div>
    </section>
  )
}

function LessonNotesBox({ courseId, lessonId }) {
  const [noteText, setNoteText] = useState('')
  const [notes, setNotes] = useState(() => getLessonNotes(courseId, lessonId))

  const handleSave = () => {
    if (!noteText.trim()) return
    saveLessonNote(courseId, lessonId, noteText.trim())
    setNotes(getLessonNotes(courseId, lessonId))
    setNoteText('')
  }

  return (
    <section className="course-editor-ai-box">
      <div className="demo-row demo-row--between">
        <h3>Lesson Notes</h3>
        <FileText size={20} />
      </div>
      <textarea
        rows="4"
        value={noteText}
        placeholder="Write your private notes for this lesson..."
        onChange={(event) => setNoteText(event.target.value)}
      />
      <button type="button" className="demo-secondary-action" onClick={handleSave}>
        <Save size={16} />
        Save Note
      </button>
      <div className="course-flow-resource-list">
        {notes.length === 0 ? (
          <p className="demo-muted">Saved notes for this lesson will appear here.</p>
        ) : notes.map((note) => (
          <article key={note.id}>
            <strong>{note.text}</strong>
            <small>{new Date(note.createdAt).toLocaleString('vi-VN')}</small>
          </article>
        ))}
      </div>
    </section>
  )
}

function LessonContentPanel({ course, lesson, completed, onComplete }) {
  if (!lesson) {
    return (
      <main className="learning-workspace-panel">
        <PageState state="empty" title="No lesson selected" description="Choose a lesson from the course outline." />
      </main>
    )
  }

  return (
    <main className="learning-workspace-panel learning-content-panel">
      <article className="lesson-content">
        <div className="lesson-content__media">
          {lesson.type === 'Video' ? <PlayCircle size={34} /> : <FileText size={34} />}
          <span>{lesson.type} placeholder</span>
        </div>
        <StatusBadge status={lesson.status} />
        <h1>{lesson.title}</h1>
        <p>{lesson.content || lesson.summary}</p>
        <button className="demo-primary-action" type="button" onClick={onComplete} disabled={completed}>
          <CheckCircle2 size={16} />
          {completed ? 'Completed' : 'Mark as Complete'}
        </button>
      </article>

      <AIAssistantBox lesson={lesson} />
      <LessonNotesBox courseId={course.id} lessonId={lesson.id} />
      <DiscussionPanel courseId={course.id} lessonId={lesson.id} />
    </main>
  )
}

function SavedResourcesList({ resources }) {
  if (resources.length === 0) {
    return <p className="demo-muted">Flashcards, practice tests, summaries, and key points will appear here.</p>
  }

  return (
    <div className="course-flow-resource-list">
      {resources.map((resource) => (
        <article key={resource.id}>
          <strong>{resource.type.replace('_', ' ')}</strong>
          <small>{new Date(resource.createdAt).toLocaleString('vi-VN')}</small>
        </article>
      ))}
    </div>
  )
}

function AIStudyToolsPanel({ courseId, lessonId, resources, onGenerated }) {
  const actions = [
    { label: 'Generate Flashcards', action: () => generateFlashcardsForLesson(courseId, lessonId) },
    { label: 'Generate Practice Test', action: () => generatePracticeTestForLesson(courseId, lessonId) },
    { label: 'Generate Lesson Summary', action: () => generateSummaryForLesson(courseId, lessonId) },
    { label: 'Save Key Points', action: () => generateKeyPointsForLesson(courseId, lessonId) },
  ]

  return (
    <aside className="learning-workspace-panel learning-tools-panel">
      <span className="demo-kicker">AI Study Tools</span>
      <h2>Generate resources</h2>
      <div className="course-editor-tool-actions">
        {actions.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              item.action()
              onGenerated()
            }}
            disabled={!lessonId}
          >
            <Sparkles size={16} />
            {item.label}
          </button>
        ))}
      </div>

      <div className="demo-actions">
        <Link className="demo-secondary-action" to="/flashcards">View all Flashcards</Link>
        <Link className="demo-secondary-action" to="/tests">View all Tests</Link>
      </div>

      <section>
        <h3>Saved Resources</h3>
        <SavedResourcesList resources={resources} />
      </section>
    </aside>
  )
}

export function LearningWorkspacePage() {
  const { courseId, lessonId } = useParams()
  const { loading, error } = useDemoPageState()
  const enrollments = getAllDemoEnrollments()
  const resolvedCourseId = courseId || enrollments[0]?.courseId
  const course = getLifecycleCourseById(resolvedCourseId)
  const enrollment = getDemoEnrollmentByCourse(resolvedCourseId)
  const modules = getLifecycleModules(resolvedCourseId)
  const firstLessonId = getFirstLessonId(modules)
  const resolvedLessonId = lessonId || firstLessonId
  const [completedLessonIds, setCompletedLessonIds] = useState(() => getCompletedLessonIds(resolvedCourseId))
  const [resources, setResources] = useState(() => getGeneratedResources({ courseId: resolvedCourseId }))

  const flatLessons = modules.flatMap((module) => module.lessons)
  const currentLesson = flatLessons.find((lesson) => lesson.id === resolvedLessonId)
  const isCompleted = completedLessonIds.includes(resolvedLessonId)

  useDocumentTitle(course ? `${course.title} learning` : 'Learning workspace')

  if (!courseId && resolvedCourseId) {
    return <Navigate to={`/learning/${resolvedCourseId}`} replace />
  }

  if (courseId && !lessonId && firstLessonId) {
    return <Navigate to={`/learning/${courseId}/lessons/${firstLessonId}`} replace />
  }

  if (loading) {
    return <PageState state="loading" title="Loading workspace" description="Preparing modules, lessons, AI tools, and progress." />
  }

  if (error) {
    return <PageState state="error" title="Learning workspace unavailable" description={error.message} />
  }

  if (!course) {
    return <PageState state="empty" title="No course selected" description="Choose an enrolled course to open the learning workspace." />
  }

  if (!enrollment) {
    return (
      <PageState
        state="error"
        title="Enrollment required"
        description="This trainee is not enrolled in the selected course."
        action={<Link className="demo-primary-action" to={`/checkout/${course.id}`}>Enroll now <ArrowRight size={16} /></Link>}
      />
    )
  }

  if (modules.length === 0) {
    return <PageState state="empty" title="No lessons yet" description="Published lessons will appear here after SME review." />
  }

  const handleComplete = () => {
    setCompletedLessonIds(markDemoLessonCompleted(course.id, resolvedLessonId))
  }

  const refreshResources = () => {
    setResources(getGeneratedResources({ courseId: course.id }))
  }

  return (
    <main className="demo-page learning-workspace-page">
      <section className="learning-header">
        <div>
          <span className="demo-kicker">Learning workspace</span>
          <h1>{course.title}</h1>
          <p>{course.shortDescription}</p>
        </div>
        <aside className="demo-card learning-summary">
          <StatusBadge status={enrollment.status} />
          <ProgressBar value={getCourseProgress(course.id) || enrollment.progress} label="Course progress" />
          <Link className="demo-secondary-action" to="/tests">View tests</Link>
        </aside>
      </section>

      <section className="learning-workspace-layout">
        <CourseOutlinePanel
          course={course}
          modules={modules}
          completedLessonIds={completedLessonIds}
          currentLessonId={resolvedLessonId}
        />
        <LessonContentPanel
          course={course}
          lesson={currentLesson}
          completed={isCompleted}
          onComplete={handleComplete}
        />
        <AIStudyToolsPanel
          courseId={course.id}
          lessonId={resolvedLessonId}
          resources={resources.filter((resource) => resource.lessonId === resolvedLessonId)}
          onGenerated={refreshResources}
        />
      </section>
    </main>
  )
}
