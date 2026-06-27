import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CourseProgressCard } from "./CourseProgressCard";

export function CourseProgressSection({ title, description, courses }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <section className="progress-section">
      <div className="progress-section__header">
        <div className="progress-section__title-group">
          <button
            type="button"
            className="progress-section__toggle"
            onClick={() => setExpanded((current) => !current)}
            aria-label={expanded ? `Collapse ${title}` : `Expand ${title}`}
          >
            <h2>{title}</h2>
            {expanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
          </button>

          <p>{description}</p>
        </div>

        <span>{courses.length} courses</span>
      </div>

      {expanded && (
        <>
          {courses.length === 0 ? (
            <div className="progress-empty">No courses in this section.</div>
          ) : (
            <div className="course-progress-list">
              {courses.map((course) => (
                <CourseProgressCard
                  key={course.enrollmentId || course.courseId}
                  course={course}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}