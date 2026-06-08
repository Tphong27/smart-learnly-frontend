import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BookOpen,
  Brain,
  ClipboardCheck,
  Edit3,
  FileQuestion,
  FileText,
  Layers3,
  Save,
  Send,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { DataState } from "@/shared/components/ui/DataState";
import { Modal } from "@/shared/components/ui/Modal/Modal";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import {
  addMockCourseLesson,
  addMockCourseModule,
  addMockLessonMaterial,
  addMockLessonVideo,
  deleteMockCourseLesson,
  deleteMockCourseModule,
  generateExplanationForLesson,
  generateFlashcardsForLesson,
  generateKeyPointsForLesson,
  generatePracticeTestForLesson,
  generateQuizQuestionsForLesson,
  generateSummaryForLesson,
  getGeneratedResources,
  getLifecycleCourseById,
  getLifecycleModules,
  saveLessonDraft,
  submitCourseForTmoReview,
  updateMockCourseModule,
} from "@/data/demo/courseLifecycleRuntime";
import { COURSE_STATUSES } from "@/data/demo/courseLifecycle";
import { ROLES } from "@/shared/constants/roles";
import { CourseStatusBadge } from "./CourseStatusBadge";
import { getSmeContentQualityReport } from "@/data/demo/demoSmeRuntime";

function getFirstLessonId(modules) {
  return modules.flatMap((module) => module.lessons)[0]?.id || "";
}

function getModuleForLesson(modules, lessonId) {
  return modules.find((module) =>
    module.lessons.some((lesson) => lesson.id === lessonId),
  );
}

function toLines(value) {
  if (Array.isArray(value)) return value.join("\n");
  return value || "";
}

function fromLines(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function AddModuleModal({ open, onClose, onSubmit }) {
  const [title, setTitle] = useState("");

  const handleSubmit = () => {
    onSubmit(title || undefined);
    setTitle("");
  };

  return (
    <Modal
      open={open}
      title="Add Module"
      description="Create a mock module in this SME course builder."
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
            onClick={handleSubmit}
          >
            Add Module
          </button>
        </div>
      }
      onClose={onClose}
    >
      <label className="course-flow-field">
        <span>Module title</span>
        <input
          value={title}
          placeholder="Module 4: Advanced Practice"
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
    </Modal>
  );
}

function EditModuleModal({ open, module, onClose, onSubmit }) {
  const [form, setForm] = useState({
    title: module?.title || "",
    status: module?.status || "draft",
  });

  if (!open || !module) return null;

  const updateForm = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = () => {
    onSubmit(module.id, form);
  };

  return (
    <Modal
      open={open}
      title="Edit Module"
      description="Update module title and status in the SME course builder."
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
            onClick={handleSubmit}
          >
            Save Module
          </button>
        </div>
      }
      onClose={onClose}
    >
      <div className="course-flow-form-grid">
        <label className="course-flow-field course-flow-field--wide">
          <span>Module title</span>
          <input
            value={form.title}
            onChange={(event) => updateForm("title", event.target.value)}
          />
        </label>

        <label className="course-flow-field">
          <span>Status</span>
          <select
            value={form.status}
            onChange={(event) => updateForm("status", event.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="review">Review</option>
          </select>
        </label>
      </div>
    </Modal>
  );
}

function AddLessonModal({
  modules,
  selectedModuleId,
  open,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState({
    moduleId: selectedModuleId || modules[0]?.id || "",
    title: "",
    type: "Reading",
    durationMinutes: 15,
  });

  const updateForm = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = () => {
    onSubmit(form);
    setForm({
      moduleId: selectedModuleId || modules[0]?.id || "",
      title: "",
      type: "Reading",
      durationMinutes: 15,
    });
  };

  return (
    <Modal
      open={open}
      title="Add Lesson"
      description="Create a mock lesson inside the selected module."
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
            onClick={handleSubmit}
          >
            Add Lesson
          </button>
        </div>
      }
      onClose={onClose}
    >
      <div className="course-flow-form-grid">
        <label className="course-flow-field course-flow-field--wide">
          <span>Module</span>
          <select
            value={form.moduleId}
            onChange={(event) => updateForm("moduleId", event.target.value)}
          >
            {modules.map((module) => (
              <option key={module.id} value={module.id}>
                {module.title}
              </option>
            ))}
          </select>
        </label>
        <label className="course-flow-field course-flow-field--wide">
          <span>Lesson title</span>
          <input
            value={form.title}
            placeholder="New lesson title"
            onChange={(event) => updateForm("title", event.target.value)}
          />
        </label>
        <label className="course-flow-field">
          <span>Type</span>
          <select
            value={form.type}
            onChange={(event) => updateForm("type", event.target.value)}
          >
            <option>Video</option>
            <option>Reading</option>
            <option>Quiz</option>
            <option>Assignment</option>
          </select>
        </label>
        <label className="course-flow-field">
          <span>Duration</span>
          <input
            type="number"
            value={form.durationMinutes}
            onChange={(event) =>
              updateForm("durationMinutes", event.target.value)
            }
          />
        </label>
      </div>
    </Modal>
  );
}

function CourseStructurePanel({
  course,
  modules,
  selectedLessonId,
  onSelectLesson,
  onAddModule,
  onAddLesson,
  onEditModule,
  onDeleteModule,
  onDeleteLesson,
}) {
  return (
    <aside className="course-editor-panel course-editor-outline">
      <div>
        <span className="demo-kicker">Course Structure</span>
        <h2>{course.title}</h2>
        <CourseStatusBadge status={course.status} />
      </div>

      {course.status === COURSE_STATUSES.REVISION_REQUIRED &&
      course.revisionReason ? (
        <div className="course-flow-revision-note">
          <span>{course.revisionReason}</span>
        </div>
      ) : null}

      {modules.length === 0 ? (
        <DataState
          type="empty"
          title="No modules yet"
          description="Add a module to start building course content."
        />
      ) : (
        <div className="course-editor-module-list">
          {modules.map((module) => (
            <article key={module.id}>
              <div className="course-builder-module-header">
                <strong>{module.title}</strong>
                <span>
                  <button
                    type="button"
                    title="Edit module"
                    onClick={() => onEditModule(module)}
                  >
                    <Edit3 size={13} />
                  </button>

                  <button
                    type="button"
                    title="Delete module"
                    onClick={() => onDeleteModule(module.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </div>

              <div>
                {module.lessons.length === 0 ? (
                  <p className="demo-muted">No lessons in this module.</p>
                ) : (
                  module.lessons.map((lesson) => (
                    <div key={lesson.id} className="demo-row demo-row--between">
                      <button
                        type="button"
                        className={
                          lesson.id === selectedLessonId ? "is-active" : ""
                        }
                        onClick={() => onSelectLesson(lesson.id)}
                      >
                        <span>{lesson.title}</span>
                        <small>
                          {lesson.type} |{" "}
                          {lesson.durationMinutes || lesson.duration || 0} min |{" "}
                          {lesson.status}
                        </small>
                      </button>

                      <button
                        type="button"
                        title="Delete lesson"
                        className="demo-secondary-action"
                        onClick={() => onDeleteLesson(module.id, lesson.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="course-editor-outline-actions">
        <button
          type="button"
          className="demo-secondary-action"
          onClick={onAddModule}
        >
          <Layers3 size={16} />
          Add Module
        </button>
        <button
          type="button"
          className="demo-secondary-action"
          onClick={onAddLesson}
        >
          <BookOpen size={16} />
          Add Lesson
        </button>
      </div>
    </aside>
  );
}

function MockVideoUploader({ courseId, lesson, onUploaded }) {
  const uploadedVideos = lesson?.uploadedVideos || [];

  const uploadVideo = () => {
    addMockLessonVideo(courseId, lesson.id, {
      name: `${lesson.title.replace(/\s+/g, "-").toLowerCase()}-video.mp4`,
    });
    onUploaded();
  };

  return (
    <section className="course-builder-upload-box">
      <div className="demo-row demo-row--between">
        <div>
          <span className="demo-kicker">Video Upload</span>
          <h3>Lesson video</h3>
        </div>
        <Video size={22} />
      </div>
      <button
        type="button"
        className="demo-secondary-action"
        onClick={uploadVideo}
      >
        <Upload size={16} />
        Upload Video Mock
      </button>
      <div className="course-flow-resource-list">
        {uploadedVideos.length === 0 ? (
          <p className="demo-muted">No uploaded video yet.</p>
        ) : (
          uploadedVideos.map((video) => (
            <article key={video.id}>
              <strong>{video.name}</strong>
              <small>
                {video.size} |{" "}
                {new Date(video.uploadedAt).toLocaleString("vi-VN")}
              </small>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function UploadMaterialBox({ courseId, lesson, onUploaded }) {
  const materials = Array.isArray(lesson?.materials) ? lesson.materials : [];

  const uploadMaterial = () => {
    addMockLessonMaterial(courseId, lesson.id, {
      name: `${lesson.title.replace(/\s+/g, "-").toLowerCase()}-handout.pdf`,
    });
    onUploaded();
  };

  return (
    <section className="course-builder-upload-box">
      <div className="demo-row demo-row--between">
        <div>
          <span className="demo-kicker">Materials</span>
          <h3>Documents and references</h3>
        </div>
        <FileText size={22} />
      </div>
      <button
        type="button"
        className="demo-secondary-action"
        onClick={uploadMaterial}
      >
        <Upload size={16} />
        Upload Document Mock
      </button>
      <div className="course-flow-resource-list">
        {materials.length === 0 ? (
          <p className="demo-muted">No uploaded material yet.</p>
        ) : (
          materials.map((material) => (
            <article key={material.id}>
              <strong>{material.name}</strong>
              <small>
                {material.type} |{" "}
                {new Date(material.uploadedAt).toLocaleString("vi-VN")}
              </small>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function RichTextEditorMock({ value, onChange }) {
  return (
    <section className="rich-text-editor-mock">
      <div className="rich-text-editor-toolbar">
        <button type="button">B</button>
        <button type="button">I</button>
        <button type="button">List</button>
        <button type="button">Quote</button>
      </div>
      <textarea
        rows="9"
        value={value}
        placeholder="Write the approved lesson content here..."
        onChange={(event) => onChange(event.target.value)}
      />
    </section>
  );
}

function LessonBuilderPanel({ courseId, lesson, onSave, onRefresh }) {
  const [form, setForm] = useState({
    title: lesson?.title || "",
    type: lesson?.type || "Reading",
    videoUrl: lesson?.videoUrl || "",
    durationMinutes: lesson?.durationMinutes || lesson?.duration || 15,
    content: lesson?.content || lesson?.summary || "",
    learningObjectives: toLines(lesson?.learningObjectives),
    internalNotes: lesson?.internalNotes || "",
  });

  if (!lesson) {
    return (
      <main className="course-editor-panel">
        <DataState
          type="empty"
          title="No lesson selected"
          description="Choose a lesson from the structure panel or add a new lesson."
        />
      </main>
    );
  }

  const updateForm = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSave = () => {
    onSave(lesson.id, {
      ...form,
      durationMinutes: Number(form.durationMinutes) || 0,
      learningObjectives: fromLines(form.learningObjectives),
    });
  };

  return (
    <main className="course-editor-panel course-editor-lesson">
      <section className="course-flow-form-section">
        <div className="demo-row demo-row--between">
          <div>
            <span className="demo-kicker">Lesson Builder</span>
            <h2>Edit selected lesson</h2>
          </div>
          <span className="course-builder-lesson-status">{lesson.status}</span>
        </div>

        <label className="course-flow-field">
          <span>Lesson title</span>
          <input
            value={form.title}
            onChange={(event) => updateForm("title", event.target.value)}
          />
        </label>

        <div className="course-flow-form-grid course-flow-form-grid--compact">
          <label className="course-flow-field">
            <span>Lesson type</span>
            <select
              value={form.type}
              onChange={(event) => updateForm("type", event.target.value)}
            >
              <option>Video</option>
              <option>Reading</option>
              <option>Quiz</option>
              <option>Assignment</option>
            </select>
          </label>
          <label className="course-flow-field">
            <span>Duration</span>
            <input
              type="number"
              value={form.durationMinutes}
              onChange={(event) =>
                updateForm("durationMinutes", event.target.value)
              }
            />
          </label>
        </div>

        <MockVideoUploader
          courseId={courseId}
          lesson={lesson}
          onUploaded={onRefresh}
        />

        <label className="course-flow-field">
          <span>Video URL</span>
          <input
            value={form.videoUrl}
            placeholder="https://video.example.com/lesson"
            onChange={(event) => updateForm("videoUrl", event.target.value)}
          />
        </label>

        <section className="course-builder-video-preview">
          <Video size={34} />
          <span>Video preview placeholder</span>
          <small>
            {form.videoUrl || "Upload a video or add a URL to preview."}
          </small>
        </section>

        <UploadMaterialBox
          courseId={courseId}
          lesson={lesson}
          onUploaded={onRefresh}
        />

        <label className="course-flow-field">
          <span>Rich text lesson content</span>
          <RichTextEditorMock
            value={form.content}
            onChange={(value) => updateForm("content", value)}
          />
        </label>

        <label className="course-flow-field">
          <span>Learning objectives</span>
          <textarea
            rows="4"
            value={form.learningObjectives}
            placeholder="One objective per line"
            onChange={(event) =>
              updateForm("learningObjectives", event.target.value)
            }
          />
        </label>

        <label className="course-flow-field">
          <span>Internal notes for SME/TMO</span>
          <textarea
            rows="4"
            value={form.internalNotes}
            placeholder="Notes visible in review context only."
            onChange={(event) =>
              updateForm("internalNotes", event.target.value)
            }
          />
        </label>

        <div className="course-flow-form-actions">
          <button
            type="button"
            className="demo-primary-action"
            onClick={handleSave}
          >
            <Save size={16} />
            Save Lesson
          </button>
          <button type="button" className="demo-secondary-action">
            Preview as Trainee
          </button>
        </div>
      </section>
    </main>
  );
}

function getResourceLabel(type) {
  const labels = {
    explanation: "Improved Explanations",
    summary: "Summaries",
    flashcard: "Flashcards",
    questions: "Questions",
    test: "Tests",
    key_points: "Key Points",
  };

  return labels[type] || type;
}

function GeneratedResourcesList({ resources }) {
  if (resources.length === 0) {
    return (
      <p className="demo-muted">
        Generated summaries, flashcards, questions, tests, and key points will
        appear here.
      </p>
    );
  }

  return (
    <div className="course-builder-generated-list">
      {resources.map((resource) => (
        <article key={resource.id}>
          <strong>{getResourceLabel(resource.type)}</strong>
          <small>{new Date(resource.createdAt).toLocaleString("vi-VN")}</small>
        </article>
      ))}
    </div>
  );
}

function ContentQualityChecker({ report }) {
  return (
    <section className="course-builder-generated-section">
      <h3>Content Quality Checker</h3>

      <div className="course-builder-status-card">
        <span>Quality score</span>
        <strong>{report.score}%</strong>
      </div>

      <div className="course-flow-resource-list">
        {report.issues.map((issue) => (
          <article key={issue.id}>
            <strong>{issue.title}</strong>
            <small>
              {issue.description} · Value: {issue.value}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}

function CourseBuilderToolsPanel({
  course,
  courseId,
  lessonId,
  resources,
  qualityReport,
  onGenerated,
  onSubmitReview,
}) {
  const aiActions = [
    {
      label: "Improve Lesson Explanation",
      icon: Brain,
      action: () => generateExplanationForLesson(courseId, lessonId, ROLES.SME),
    },
    {
      label: "Generate Lesson Summary",
      icon: BookOpen,
      action: () => generateSummaryForLesson(courseId, lessonId, ROLES.SME),
    },
    {
      label: "Generate Flashcards",
      icon: Sparkles,
      action: () => generateFlashcardsForLesson(courseId, lessonId, ROLES.SME),
    },
    {
      label: "Generate Practice Test",
      icon: ClipboardCheck,
      action: () =>
        generatePracticeTestForLesson(courseId, lessonId, ROLES.SME),
    },
    {
      label: "Generate Quiz Questions",
      icon: FileQuestion,
      action: () =>
        generateQuizQuestionsForLesson(courseId, lessonId, ROLES.SME),
    },
    {
      label: "Generate Key Points",
      icon: FileText,
      action: () => generateKeyPointsForLesson(courseId, lessonId, ROLES.SME),
    },
  ];

  return (
    <aside className="course-editor-panel course-editor-tools">
      <div>
        <span className="demo-kicker">Course Builder Tools</span>
        <h2>AI content tools</h2>
      </div>

      <div className="course-builder-status-card">
        <span>Current course status</span>
        <CourseStatusBadge status={course.status} />
      </div>

      {course.revisionReason ? (
        <div className="course-flow-revision-note">
          <span>{course.revisionReason}</span>
        </div>
      ) : null}

      <div className="course-editor-tool-actions">
        {aiActions.map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            type="button"
            disabled={!lessonId}
            onClick={() => {
              action();
              onGenerated();
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <section className="course-builder-generated-section">
        <h3>Generated resources</h3>
        <GeneratedResourcesList resources={resources} />
      </section>
      <ContentQualityChecker report={qualityReport} />
      <button
        type="button"
        className="demo-secondary-action"
        disabled={!lessonId}
        onClick={() => {
          generateQuizQuestionsForLesson(courseId, lessonId, ROLES.SME);
          onGenerated();
        }}
      >
        <Save size={16} />
        Save to Question Bank
      </button>

      <button
        type="button"
        className="demo-primary-action"
        onClick={onSubmitReview}
      >
        <Send size={16} />
        Submit Course for TMO Review
      </button>
    </aside>
  );
}

export function SmeCourseEditorPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(() => getLifecycleCourseById(courseId));
  const [modules, setModules] = useState(() => getLifecycleModules(courseId));
  const [selectedLessonId, setSelectedLessonId] = useState(() =>
    getFirstLessonId(getLifecycleModules(courseId)),
  );
  const [resources, setResources] = useState(() =>
    getGeneratedResources({ courseId }),
  );
  const [addModuleOpen, setAddModuleOpen] = useState(false);
  const [addLessonOpen, setAddLessonOpen] = useState(false);
  const [editModuleOpen, setEditModuleOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);

  const selectedLesson = useMemo(() => {
    return modules
      .flatMap((module) => module.lessons)
      .find((lesson) => lesson.id === selectedLessonId);
  }, [modules, selectedLessonId]);

  const selectedModule = useMemo(() => {
    return getModuleForLesson(modules, selectedLessonId) || modules[0];
  }, [modules, selectedLessonId]);

  const qualityReport = useMemo(() => {
    return getSmeContentQualityReport(courseId);
  }, [courseId, modules, resources]);

  if (!course) {
    return (
      <section>
        <PageHeader
          title="Course Builder Workspace"
          description="No matching course was found."
        />
        <DataState
          type="empty"
          title="Course not found"
          description="Open a course from Assigned Courses."
        />
      </section>
    );
  }

  const refresh = () => {
    setCourse(getLifecycleCourseById(courseId));
    setModules(getLifecycleModules(courseId));
    setResources(getGeneratedResources({ courseId }));
  };

  const refreshResources = () =>
    setResources(getGeneratedResources({ courseId }));

  const handleSaveLesson = (lessonId, form) => {
    saveLessonDraft(courseId, lessonId, form);
    refresh();
  };

  const handleAddModule = (title) => {
    const module = addMockCourseModule(courseId, title);
    setAddModuleOpen(false);
    refresh();

    if (!selectedLessonId && module.lessons[0]) {
      setSelectedLessonId(module.lessons[0].id);
    }
  };

  const handleAddLesson = (form) => {
    const lesson = addMockCourseLesson(courseId, form.moduleId, form);
    setAddLessonOpen(false);
    refresh();

    if (lesson) {
      setSelectedLessonId(lesson.id);
    }
  };

  const handleOpenEditModule = (module) => {
  setEditingModule(module)
  setEditModuleOpen(true)
}

const handleUpdateModule = (moduleId, form) => {
  updateMockCourseModule(courseId, moduleId, form)
  setEditModuleOpen(false)
  setEditingModule(null)
  refresh()
}

const handleDeleteModule = (moduleId) => {
  const confirmed = window.confirm(
    'Delete this module and all lessons inside it?',
  )

  if (!confirmed) return

  deleteMockCourseModule(courseId, moduleId)
  refresh()

  const nextModules = getLifecycleModules(courseId)
  setSelectedLessonId(getFirstLessonId(nextModules))
}

const handleDeleteLesson = (moduleId, lessonId) => {
  const confirmed = window.confirm('Delete this lesson?')

  if (!confirmed) return

  deleteMockCourseLesson(courseId, moduleId, lessonId)
  refresh()

  if (selectedLessonId === lessonId) {
    const nextModules = getLifecycleModules(courseId)
    setSelectedLessonId(getFirstLessonId(nextModules))
  }
}

  const handleSubmitReview = () => {
    submitCourseForTmoReview(courseId);
    navigate("/sme/courses");
  };

  return (
    <section>
      <PageHeader
        title="Course Builder Workspace"
        description="Build modules, lessons, materials, and AI-generated learning resources before submitting to TMO."
      />

      <div className="course-editor-layout course-builder-workspace">
        <CourseStructurePanel
          course={course}
          modules={modules}
          selectedLessonId={selectedLessonId}
          onSelectLesson={setSelectedLessonId}
          onAddModule={() => setAddModuleOpen(true)}
          onAddLesson={() => setAddLessonOpen(true)}
          onEditModule={handleOpenEditModule}
          onDeleteModule={handleDeleteModule}
          onDeleteLesson={handleDeleteLesson}
        />

        <LessonBuilderPanel
          key={selectedLesson?.id || "no-lesson"}
          courseId={courseId}
          lesson={selectedLesson}
          onSave={handleSaveLesson}
          onRefresh={refresh}
        />

        <CourseBuilderToolsPanel
          course={course}
          courseId={courseId}
          lessonId={selectedLessonId}
          resources={resources.filter(
            (resource) =>
              !selectedLessonId || resource.lessonId === selectedLessonId,
          )}
          qualityReport={qualityReport}
          onGenerated={refreshResources}
          onSubmitReview={handleSubmitReview}
        />
      </div>

      <AddModuleModal
        open={addModuleOpen}
        onClose={() => setAddModuleOpen(false)}
        onSubmit={handleAddModule}
      />

      <AddLessonModal
        key={selectedModule?.id || "no-module"}
        modules={modules}
        selectedModuleId={selectedModule?.id}
        open={addLessonOpen}
        onClose={() => setAddLessonOpen(false)}
        onSubmit={handleAddLesson}
      />
      <EditModuleModal
        key={editingModule?.id || "no-edit-module"}
        open={editModuleOpen}
        module={editingModule}
        onClose={() => {
          setEditModuleOpen(false);
          setEditingModule(null);
        }}
        onSubmit={handleUpdateModule}
      />
    </section>
  );
}
