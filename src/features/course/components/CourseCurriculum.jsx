import { BookOpen, FileText, PlayCircle } from "lucide-react";

function getLessonIcon(type) {
  if (type === "video") return PlayCircle;
  if (type === "pdf") return FileText;
  return BookOpen;
}

function formatDuration(seconds) {
  if (!seconds) return "";
  const minutes = Math.ceil(Number(seconds) / 60);
  return `${minutes} min`;
}

export function CourseCurriculum({ sections = [] }) {
  if (!sections.length) {
    return (
      <div className="course-state">
        <p>No curriculum has been published for this course yet.</p>
      </div>
    );
  }

  return (
    <div className="course-curriculum">
      {sections.map((section, sectionIndex) => (
        <article key={section.id || sectionIndex} className="course-section">
          <h3>
            Module {sectionIndex + 1}: {section.title}
          </h3>

          <div className="course-lessons">
            {(section.lessons || []).map((lesson, lessonIndex) => {
              const Icon = getLessonIcon(
                lesson.lessonType || lesson.lesson_type,
              );

              return (
                <div key={lesson.id || lessonIndex} className="course-lesson">
                  <span>
                    <Icon size={18} />
                    {lesson.title}
                  </span>

                  <small>
                    {lesson.preview || lesson.isPreview || lesson.is_preview
                      ? "Preview"
                      : "Locked"}
                    {formatDuration(
                      lesson.durationSeconds || lesson.duration_seconds,
                    )
                      ? ` · ${formatDuration(lesson.durationSeconds || lesson.duration_seconds)}`
                      : ""}
                  </small>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}
