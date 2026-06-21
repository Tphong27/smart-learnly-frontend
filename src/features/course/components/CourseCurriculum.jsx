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
      {sections.map((section) => (
        <article key={section.id} className="course-section">
          <h3>
            Module {section.id}: {section.title}
          </h3>

          <div className="course-lessons">
            {(section.lessons || []).map((lesson) => {
              const Icon = getLessonIcon(lesson.lessonType);

              return (
                <div key={lesson.id} className="course-lesson">
                  <span>
                    <Icon size={18} />
                    {lesson.title}
                  </span>

                  <small>
                    {lesson.isPreview ? "Preview" : "Locked"}
                    {formatDuration(lesson.durationSeconds)
                      ? ` · ${formatDuration(lesson.durationSeconds)}`
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
