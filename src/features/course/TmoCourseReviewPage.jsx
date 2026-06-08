import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  FileQuestion,
  Layers3,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { DataState } from "@/shared/components/ui/DataState";
import { Modal } from "@/shared/components/ui/Modal/Modal";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import {
  getGeneratedResources,
  getLifecycleCourseById,
  getLifecycleModules,
  requestCourseRevision,
  verifyCourseContent,
} from "@/data/demo/courseLifecycleRuntime";
import { CourseStatusBadge } from "./CourseStatusBadge";

const checklistItems = [
  "Course information is complete",
  "Learning outcomes are clear",
  "Modules and lessons are organized",
  "Lesson content is complete",
  "Questions and tests are appropriate",
  "AI-generated resources are reviewed",
  "Materials are suitable for learners",
];

function CurriculumReviewPreview({ course, modules, resources }) {
  return (
    <section className="course-flow-review-preview">
      <div className="demo-card">
        <CourseStatusBadge status={course.status} />
        <h2>{course.title}</h2>
        <p>{course.fullDescription || course.shortDescription}</p>
        <div className="demo-chip-list">
          <span>{course.category}</span>
          <span>{course.level}</span>
          <span>{course.assignedSmeName || "Unassigned SME"}</span>
        </div>
      </div>

      <div className="demo-card">
        <div className="demo-row demo-row--between">
          <h2>Modules and Lessons</h2>
          <Layers3 size={22} />
        </div>
        {modules.length === 0 ? (
          <DataState
            type="empty"
            title="No curriculum yet"
            description="SME has not added modules and lessons."
          />
        ) : (
          <div className="course-flow-curriculum">
            {modules.map((module) => (
              <article key={module.id}>
                <strong>{module.title}</strong>
                <div>
                  {module.lessons.map((lesson) => (
                    <span key={lesson.id}>
                      {lesson.title}
                      <small>
                        {lesson.type} | {lesson.durationMinutes} min |{" "}
                        {lesson.status}
                      </small>
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="demo-card">
        <div className="demo-row demo-row--between">
          <h2>AI Resources</h2>
          <FileQuestion size={22} />
        </div>
        {resources.length === 0 ? (
          <DataState
            type="empty"
            title="No generated resources"
            description="Generated flashcards, summaries, and tests will appear here."
          />
        ) : (
          <div className="course-flow-resource-list">
            {resources.slice(0, 6).map((resource) => (
              <article key={resource.id}>
                <strong>{resource.type.replace("_", " ")}</strong>
                <small>
                  {resource.createdByRole} |{" "}
                  {new Date(resource.createdAt).toLocaleString("vi-VN")}
                </small>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ReviewChecklist({ checkedItems, onToggle }) {
  return (
    <div className="course-flow-checklist">
      {checklistItems.map((item) => (
        <label key={item}>
          <input
            type="checkbox"
            checked={checkedItems.includes(item)}
            onChange={() => onToggle(item)}
          />
          <span>{item}</span>
        </label>
      ))}
    </div>
  );
}

function RevisionReasonModal({ open, reason, onChange, onClose, onSubmit }) {
  return (
    <Modal
      open={open}
      title="Request Revision"
      description="Add a clear reason so SME knows what to fix before resubmitting."
      footer={
        <div className="course-flow-modal-actions">
          <button
            type="button"
            className="demo-secondary-action"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="demo-primary-action"
            onClick={onSubmit}
          >
            Send Revision Request
          </button>
        </div>
      }
      onClose={onClose}
    >
      <label className="course-flow-field">
        <span>Revision reason</span>
        <textarea
          rows="5"
          value={reason}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </Modal>
  );
}

function ReviewActionPanel({
  checkedItems,
  onToggle,
  comment,
  onCommentChange,
  onVerify,
  onRequestRevision,
}) {
  const completedCount = checkedItems.length;

  return (
    <aside className="demo-card course-flow-review-panel">
      <span className="demo-kicker">TMO Review Panel</span>
      <h2>Review checklist</h2>
      <p>
        {completedCount} of {checklistItems.length} checks completed.
      </p>
      <ReviewChecklist checkedItems={checkedItems} onToggle={onToggle} />

      <label className="course-flow-field">
        <span>Review comment</span>
        <textarea
          rows="5"
          value={comment}
          placeholder="Add review notes for this course."
          onChange={(event) => onCommentChange(event.target.value)}
        />
      </label>

      <button type="button" className="demo-primary-action" onClick={onVerify}>
        <CheckCircle2 size={16} />
        Approve / Verify Contents
      </button>
      <button
        type="button"
        className="demo-secondary-action"
        onClick={onRequestRevision}
      >
        <XCircle size={16} />
        Request Revision
      </button>
    </aside>
  );
}

export function TmoCourseReviewPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const course = getLifecycleCourseById(courseId);
  const modules = getLifecycleModules(courseId);
  const resources = getGeneratedResources({ courseId });
  const [checkedItems, setCheckedItems] = useState(checklistItems.slice(0, 4));
  const [comment, setComment] = useState("");
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");

  const defaultRevisionReason = useMemo(() => {
    return "Please complete missing lesson materials, review AI-generated resources, and resubmit for TMO verification.";
  }, []);

  if (!course) {
    return (
      <section>
        <PageHeader
          title="Review Course Content"
          description="No matching course was found."
        />
        <DataState
          type="empty"
          title="Course not found"
          description="Open review from TMO Course Management."
        />
      </section>
    );
  }

  const toggleChecklistItem = (item) => {
    setCheckedItems((current) =>
      current.includes(item)
        ? current.filter((value) => value !== item)
        : [...current, item],
    );
  };

  const handleVerify = () => {
    verifyCourseContent(
      course.id,
      comment ||
        "TMO verified course content and marked it ready for publication.",
    );
    navigate(`/tmo/courses/${course.id}`);
  };

  const handleRevisionSubmit = () => {
    requestCourseRevision(course.id, revisionReason || defaultRevisionReason);
    setRevisionOpen(false);
    navigate(`/tmo/courses/${course.id}`);
  };

  return (
    <section>
      <PageHeader
        title="Review Course Content"
        description="Verify submitted SME content before publishing the course to trainees."
        action={
          <button
            type="button"
            className="dev2-secondary-button"
            onClick={() => navigate("/tmo/courses")}
          >
            <ArrowLeft size={16} />
            Back to Courses
          </button>
        }
      />

      <div className="course-flow-review-layout">
        <CurriculumReviewPreview
          course={course}
          modules={modules}
          resources={resources}
        />
        <ReviewActionPanel
          checkedItems={checkedItems}
          onToggle={toggleChecklistItem}
          comment={comment}
          onCommentChange={setComment}
          onVerify={handleVerify}
          onRequestRevision={() => {
            setRevisionReason(defaultRevisionReason);
            setRevisionOpen(true);
          }}
        />
      </div>

      <div className="course-flow-note-card">
        <MessageSquare size={16} />
        <span>Revision notes become visible in the SME course editor.</span>
      </div>

      <RevisionReasonModal
        open={revisionOpen}
        reason={revisionReason}
        onChange={setRevisionReason}
        onClose={() => setRevisionOpen(false)}
        onSubmit={handleRevisionSubmit}
      />
    </section>
  );
}
