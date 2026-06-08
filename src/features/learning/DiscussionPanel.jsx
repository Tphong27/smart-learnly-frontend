import { MessageCircle, Send } from 'lucide-react'
import { useState } from 'react'
import {
  addLessonDiscussion,
  getLessonDiscussions,
} from '@/data/demo/demoTraineeRuntime'

function formatDateTime(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function DiscussionPanel({ courseId, lessonId }) {
  const [message, setMessage] = useState('')
  const [discussions, setDiscussions] = useState(() =>
    getLessonDiscussions(courseId, lessonId),
  )

  const handleSubmit = () => {
    if (!message.trim()) return

    addLessonDiscussion({
      courseId,
      lessonId,
      message: message.trim(),
    })

    setDiscussions(getLessonDiscussions(courseId, lessonId))
    setMessage('')
  }

  return (
    <section className="course-editor-ai-box">
      <div className="demo-row demo-row--between">
        <div>
          <span className="demo-kicker">Discussion & Q&A</span>
          <h3>Lesson discussion</h3>
        </div>

        <MessageCircle size={22} />
      </div>

      <div className="course-flow-resource-list">
        {discussions.length === 0 ? (
          <p className="demo-muted">
            No discussion yet. Ask a question about this lesson.
          </p>
        ) : (
          discussions.map((item) => (
            <article key={item.id}>
              <strong>
                {item.authorName} · {item.authorRole}
              </strong>
              <p>{item.message}</p>
              <small>{formatDateTime(item.createdAt)}</small>
            </article>
          ))
        )}
      </div>

      <div className="learning-ai-input">
        <input
          value={message}
          placeholder="Write a question or discussion..."
          onChange={(event) => setMessage(event.target.value)}
        />
        <button type="button" onClick={handleSubmit}>
          <Send size={15} />
        </button>
      </div>
    </section>
  )
}