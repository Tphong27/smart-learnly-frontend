import { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Bot,
  Edit3,
  FileText,
  Eye,
  Layers3,
  MessageCircle,
  Plus,
  Save,
  Send,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { DataState } from "@/shared/components/ui/DataState";
import { WorkspaceHeaderController } from "@/app/layouts/WorkspaceLayout";
import {
  addMockCourseLesson,
  addMockCourseModule,
  addMockLessonMaterial,
  addMockLessonVideo,
  createCourseMockTest,
  deleteCourseModule,
  getCourseMockTests,
  getLifecycleCourseById,
  getLifecycleModules,
  saveLessonDraft,
  submitCourseForTmoReview,
  updateCourseModule,
  updateCourseMockTest,
  updateCourseStatus,
} from "@/data/demo/courseLifecycleRuntime";
import { getSmeQuestionBank } from "@/data/demo/demoSmeRuntime";
import { COURSE_STATUSES } from "@/data/demo/courseLifecycle";
import { CourseStatusBadge } from "./CourseStatusBadge";

const LESSON_STATUSES = {
  DRAFT: "Draft",
  READY: "Ready",
  NEEDS_REVIEW: "Needs Review",
};

function normalizeLessonStatus(status) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ");

  const statusMap = {
    draft: LESSON_STATUSES.DRAFT,
    ready: LESSON_STATUSES.READY,
    "needs review": LESSON_STATUSES.NEEDS_REVIEW,
    published: LESSON_STATUSES.READY,
    hidden: LESSON_STATUSES.DRAFT,
  };

  return statusMap[normalized] || LESSON_STATUSES.DRAFT;
}

function LessonStatusBadge({ status }) {
  const normalizedStatus = normalizeLessonStatus(status);
  const toneMap = {
    [LESSON_STATUSES.DRAFT]: "gray",
    [LESSON_STATUSES.READY]: "green",
    [LESSON_STATUSES.NEEDS_REVIEW]: "amber",
  };

  return (
    <span
      className={`lesson-status-badge lesson-status-badge--${toneMap[normalizedStatus]}`}
    >
      {normalizedStatus}
    </span>
  );
}

function getFirstLessonId(modules) {
  return modules.flatMap((module) => module.lessons)[0]?.id || "";
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

const LESSON_TYPES = ["Video", "Reading", "Module Test", "Assignment"];

function isAssessmentType(type) {
  return ["Quiz", "Module Test"].includes(type);
}

function LessonTypeBadge({ type }) {
  const normalizedType =
    type === "Quiz" ? "Module Test" : LESSON_TYPES.includes(type) ? type : "Reading";
  const typeClass = normalizedType.toLowerCase().replace(/\s+/g, "-");

  return (
    <span className={`lesson-type-badge lesson-type-badge--${typeClass}`}>
      {normalizedType}
    </span>
  );
}

function InlineAddLessonForm({ moduleId, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: "",
    type: "Reading",
    durationMinutes: 15,
    shortDescription: "",
  });

  const updateForm = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = () => {
    onSubmit({
      ...form,
      moduleId,
      title: form.title || "New Lesson",
    });
    onCancel();
  };

  return (
    <div className="course-builder-inline-form course-builder-inline-form--lesson">
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
          {LESSON_TYPES.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </label>
      <label className="course-flow-field">
        <span>Duration</span>
        <input
          type="number"
          min="1"
          value={form.durationMinutes}
          onChange={(event) =>
            updateForm("durationMinutes", event.target.value)
          }
        />
      </label>
      <label className="course-flow-field course-flow-field--wide">
        <span>Short description</span>
        <input
          value={form.shortDescription}
          placeholder="Briefly describe what this lesson covers"
          onChange={(event) =>
            updateForm("shortDescription", event.target.value)
          }
        />
      </label>
      <div className="course-builder-inline-actions">
        <button
          type="button"
          className="demo-primary-action"
          onClick={handleSubmit}
        >
          <Plus size={15} />
          Add
        </button>
        <button
          type="button"
          className="demo-secondary-action"
          onClick={onCancel}
        >
          <X size={15} />
          Cancel
        </button>
      </div>
    </div>
  );
}

function CourseStructurePanel({
  course,
  modules,
  mockTests,
  selectedLessonId,
  selectedMockTestId,
  onSelectLesson,
  onSelectMockTest,
  onAddModule,
  onAddLesson,
  onAddMockTest,
  onEditModule,
  onDeleteModule,
}) {
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleFormOpen, setModuleFormOpen] = useState(false);
  const [lessonFormModuleId, setLessonFormModuleId] = useState("");

  const handleAddModule = () => {
    onAddModule(moduleTitle || undefined);
    setModuleTitle("");
    setModuleFormOpen(false);
  };

  const handleAddLesson = (payload) => {
    onAddLesson(payload);
    setLessonFormModuleId("");
  };

  return (
    <aside className="course-editor-panel course-editor-outline">
      <div className="course-builder-status-line">
        <span className="demo-kicker">Course Structure</span>
        <h2>{course.title}</h2>
        <div>
          <small>Course workflow status</small>
          <CourseStatusBadge status={course.status} />
        </div>
      </div>

      {modules.length === 0 ? (
        <DataState
          type="empty"
          title="No modules yet"
          description="Add a module to start building course content."
        />
      ) : (
        <div className="course-editor-module-list">
          {modules.map((module, moduleIndex) => (
            <article key={module.id}>
              <div className="course-builder-module-header">
                <div>
                  <strong>{module.title}</strong>
                  <small>{module.lessons.length} lessons</small>
                </div>
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
                    onClick={() => onDeleteModule(module)}
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </div>

              <div>
                {module.lessons.length === 0 ? (
                  <p className="demo-muted">No lessons in this module.</p>
                ) : (
                  module.lessons.map((lesson, lessonIndex) => (
                    <button
                      key={lesson.id}
                      type="button"
                      className={`course-builder-lesson-row ${lesson.id === selectedLessonId ? "is-active" : ""}`}
                      onClick={() => onSelectLesson(lesson.id)}
                    >
                      <strong>
                        Lesson {lessonIndex + 1}: {lesson.title}
                      </strong>
                      <div>
                        <LessonTypeBadge type={lesson.type} />
                        <small>
                          {lesson.durationMinutes || lesson.duration || 0} min
                        </small>
                        <LessonStatusBadge status={lesson.status} />
                      </div>
                    </button>
                  ))
                )}

                {lessonFormModuleId === module.id ? (
                  <InlineAddLessonForm
                    moduleId={module.id}
                    onSubmit={handleAddLesson}
                    onCancel={() => setLessonFormModuleId("")}
                  />
                ) : (
                  <button
                    type="button"
                    className="course-builder-add-row"
                    onClick={() => setLessonFormModuleId(module.id)}
                  >
                    <Plus size={14} />
                    Add Lesson
                  </button>
                )}
              </div>

              <small className="course-builder-module-index">
                Module {moduleIndex + 1}
              </small>
            </article>
          ))}
        </div>
      )}

      <section className="course-builder-assessment-section">
        <div className="course-builder-section-header">
          <span className="demo-kicker">Course Assessments</span>
          <h3>Mock Tests</h3>
        </div>
        {mockTests.length === 0 ? (
          <p className="demo-muted">No course-level Mock Test yet.</p>
        ) : (
          <div className="course-editor-module-list">
            {mockTests.map((test) => (
              <button
                key={test.id}
                type="button"
                className={`course-builder-lesson-row course-builder-assessment-row ${
                  test.id === selectedMockTestId ? "is-active" : ""
                }`}
                onClick={() => onSelectMockTest(test.id)}
              >
                <strong>{test.title}</strong>
                <div>
                  <span className="lesson-type-badge lesson-type-badge--mock-test">
                    Mock Test
                  </span>
                  <small>{test.totalQuestions || 0} questions</small>
                  <LessonStatusBadge status={test.status} />
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {moduleFormOpen ? (
        <div className="course-builder-inline-form">
          <label className="course-flow-field">
            <span>Module name</span>
            <input
              value={moduleTitle}
              placeholder={`Module ${modules.length + 1}`}
              onChange={(event) => setModuleTitle(event.target.value)}
            />
          </label>
          <div className="course-builder-inline-actions">
            <button
              type="button"
              className="demo-primary-action"
              onClick={handleAddModule}
            >
              <Plus size={15} />
              Add
            </button>
            <button
              type="button"
              className="demo-secondary-action"
              onClick={() => setModuleFormOpen(false)}
            >
              <X size={15} />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="course-builder-structure-actions">
          <button
            type="button"
            className="course-builder-add-module-button"
            onClick={() => setModuleFormOpen(true)}
          >
            <Layers3 size={16} />
            Add Module
          </button>
          <button
            type="button"
            className="course-builder-add-module-button course-builder-add-test-button"
            onClick={onAddMockTest}
          >
            <Plus size={16} />
            Add Mock Test
          </button>
        </div>
      )}
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
        Upload Video
      </button>
      <small className="course-builder-helper-text">
        Demo upload only. No real file is uploaded.
      </small>
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

function UploadMaterialBox({
  courseId,
  lesson,
  onUploaded,
  title = "Documents and references",
  buttonLabel = "Upload Material",
}) {
  const materials = Array.isArray(lesson?.materials) ? lesson.materials : [];

  const uploadMaterial = () => {
    addMockLessonMaterial(courseId, lesson.id, {
      name: `${lesson.title.replace(/\s+/g, "-").toLowerCase()}-material.pdf`,
    });
    onUploaded();
  };

  return (
    <section className="course-builder-upload-box">
      <div className="demo-row demo-row--between">
        <div>
          <span className="demo-kicker">Materials</span>
          <h3>{title}</h3>
        </div>
        <FileText size={22} />
      </div>
      <button
        type="button"
        className="demo-secondary-action"
        onClick={uploadMaterial}
      >
        <Upload size={16} />
        {buttonLabel}
      </button>
      <small className="course-builder-helper-text">
        Demo upload only. No real file is uploaded.
      </small>
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

function getInitialLessonForm(lesson) {
  const lessonType =
    lesson?.type === "Quiz"
      ? "Module Test"
      : LESSON_TYPES.includes(lesson?.type)
        ? lesson.type
        : "Reading";

  return {
    title: lesson?.title || "",
    type: lessonType,
    videoUrl: lesson?.videoUrl || "",
    durationMinutes: lesson?.durationMinutes || lesson?.duration || 15,
    shortDescription: lesson?.shortDescription || lesson?.summary || "",
    content: lesson?.content || lesson?.summary || "",
    keyPoints: toLines(lesson?.keyPoints),
    suggestedReadingTime:
      lesson?.suggestedReadingTime ||
      lesson?.durationMinutes ||
      lesson?.duration ||
      15,
    learningObjectives: toLines(lesson?.learningObjectives),
    internalNotes: lesson?.internalNotes || "",
    visibility: normalizeLessonStatus(lesson?.status),
    difficulty: lesson?.difficulty || "Medium",
    prerequisiteLessonId: lesson?.prerequisiteLessonId || "",
    questions: lesson?.questions || [],
    questionText: "",
    questionType: "Multiple Choice",
    correctAnswer: "",
    explanation: "",
    submissionType: lesson?.submissionType || "Text",
    dueDate: lesson?.dueDate || "",
    rubric: lesson?.rubric || "",
    externalReference: lesson?.externalReference || "",
  };
}

function getQuestionText(question) {
  return question.question || question.text || "Untitled question";
}

function getQuestionAnswer(question) {
  if (question.answer) return question.answer;
  if (question.pairs?.length) {
    return question.pairs.map((pair) => `${pair.prompt}: ${pair.answer}`).join(" | ");
  }

  return (question.correctOptionIds || [])
    .map(
      (optionId) =>
        question.options?.find((option) => option.id === optionId)?.text ||
        optionId,
    )
    .join(", ");
}

function QuestionBankPicker({
  open,
  courseId,
  assessmentLabel = "Module Test",
  existingQuestionIds,
  onClose,
  onAdd,
}) {
  const [keyword, setKeyword] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const questions = getSmeQuestionBank().filter(
    (question) =>
      question.courseId === courseId &&
      question.status !== "deleted" &&
      !existingQuestionIds.includes(question.id),
  );
  const visibleQuestions = questions.filter((question) =>
    [
      getQuestionText(question),
      question.type,
      question.difficulty,
      question.status,
      question.source,
    ]
      .join(" ")
      .toLowerCase()
      .includes(keyword.trim().toLowerCase()),
  );

  if (!open) return null;

  const closeModal = () => {
    setKeyword("");
    setSelectedIds([]);
    onClose();
  };

  const toggleQuestion = (questionId) => {
    setSelectedIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
  };

  return (
    <div className="course-builder-question-modal-backdrop">
      <section className="course-builder-question-modal">
        <div className="demo-row demo-row--between">
          <div>
            <span className="demo-kicker">Question Bank</span>
            <h2>Select questions for {assessmentLabel}</h2>
            <p className="demo-muted">
              Only questions belonging to this course are shown.
            </p>
          </div>
          <button type="button" className="demo-secondary-action" onClick={closeModal}>
            <X size={16} />
            Close
          </button>
        </div>

        <input
          value={keyword}
          placeholder="Search question, type, difficulty, status"
          onChange={(event) => setKeyword(event.target.value)}
        />

        <div className="course-builder-question-picker-list">
          {visibleQuestions.length === 0 ? (
            <DataState
              type="empty"
              title="No available questions"
              description="Create or approve questions in Question Bank first."
            />
          ) : (
            visibleQuestions.map((question) => (
              <label
                key={question.id}
                className={`course-builder-question-picker-item ${
                  selectedIds.includes(question.id) ? "is-selected" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(question.id)}
                  onChange={() => toggleQuestion(question.id)}
                />
                <span>
                  <strong>{getQuestionText(question)}</strong>
                  <small>
                    {question.type} | {question.difficulty} | {question.status}
                  </small>
                  <small>{question.source}</small>
                </span>
              </label>
            ))
          )}
        </div>

        <div className="demo-row demo-row--between">
          <strong>{selectedIds.length} selected</strong>
          <button
            type="button"
            className="demo-primary-action"
            disabled={selectedIds.length === 0}
            onClick={() => {
              onAdd(questions.filter((question) => selectedIds.includes(question.id)));
              closeModal();
            }}
          >
            <Plus size={16} />
            Add Selected Questions
          </button>
        </div>
      </section>
    </div>
  );
}

function MockTestBuilderPanel({ courseId, test, onSave }) {
  const [activeTab, setActiveTab] = useState("Content");
  const [form, setForm] = useState(() => ({
    title: test.title || "New Mock Test",
    description: test.description || "",
    durationMinutes: test.durationMinutes || 60,
    passingScore: test.passingScore || 70,
    status: test.status || "draft",
    questions: test.questions || [],
  }));
  const [questionBankOpen, setQuestionBankOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Draft not saved");

  const update = (name, value) =>
    setForm((current) => ({ ...current, [name]: value }));
  const addQuestions = (questions) =>
    setForm((current) => ({
      ...current,
      questions: [
        ...current.questions,
        ...questions.map((question) => ({
          ...question,
          text: getQuestionText(question),
          correctAnswer: getQuestionAnswer(question),
          questionBankId: question.id,
        })),
      ],
    }));
  const removeQuestion = (questionId) =>
    update(
      "questions",
      form.questions.filter((question) => question.id !== questionId),
    );
  const save = () => {
    onSave(test.id, {
      ...form,
      durationMinutes: Number(form.durationMinutes) || 60,
      passingScore: Number(form.passingScore) || 70,
    });
    setSaveStatus("Saved just now");
  };

  return (
    <main className="course-editor-panel course-editor-lesson">
      <section className="course-builder-lesson-shell">
        <div className="course-builder-lesson-topbar">
          <div className="course-builder-lesson-title-block">
            <span className="demo-kicker">Course Assessment Builder</span>
            <h2>{form.title}</h2>
            <div>
              <span className="lesson-type-badge lesson-type-badge--mock-test">
                Mock Test
              </span>
              <LessonStatusBadge status={form.status} />
              <small>{saveStatus}</small>
            </div>
          </div>
          <button type="button" className="demo-primary-action" onClick={save}>
            <Save size={16} />
            Save Mock Test
          </button>
        </div>

        <div className="course-builder-tabs">
          {["Content", "Settings"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? "is-active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Content" ? <div className="course-builder-tab-body">
          <label className="course-flow-field">
            <span>Mock Test title</span>
            <input value={form.title} onChange={(event) => update("title", event.target.value)} />
          </label>
          <label className="course-flow-field">
            <span>Description</span>
            <textarea rows="3" value={form.description} onChange={(event) => update("description", event.target.value)} />
          </label>

          <section className="course-builder-compact-card">
            <div className="course-builder-section-header">
              <span className="demo-kicker">Question List</span>
              <div className="demo-row demo-row--between">
                <h3>{form.questions.length} questions</h3>
                <button type="button" className="demo-primary-action" onClick={() => setQuestionBankOpen(true)}>
                  <Plus size={16} />
                  Add from Question Bank
                </button>
              </div>
            </div>
            {form.questions.length === 0 ? (
              <p className="demo-muted">No questions added yet.</p>
            ) : (
              form.questions.map((question, index) => (
                <article key={question.id}>
                  <strong>{index + 1}. {getQuestionText(question)}</strong>
                  <small>{question.type} | Answer: {getQuestionAnswer(question) || "Not set"}</small>
                  <button type="button" className="course-builder-question-remove" onClick={() => removeQuestion(question.id)}>
                    <Trash2 size={14} />
                    Remove
                  </button>
                </article>
              ))
            )}
          </section>

        </div> : <div className="course-builder-tab-body">
          <div className="course-flow-form-grid">
            <label className="course-flow-field">
              <span>Duration</span>
              <input type="number" min="1" value={form.durationMinutes} onChange={(event) => update("durationMinutes", event.target.value)} />
            </label>
            <label className="course-flow-field">
              <span>Passing score</span>
              <input type="number" min="1" max="100" value={form.passingScore} onChange={(event) => update("passingScore", event.target.value)} />
            </label>
            <label className="course-flow-field">
              <span>Status</span>
              <select value={form.status} onChange={(event) => update("status", event.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>
          <button type="button" className="demo-primary-action" onClick={save}>
            <Save size={16} />
            Save Settings
          </button>
        </div>}
      </section>
      <QuestionBankPicker
        open={questionBankOpen}
        courseId={courseId}
        assessmentLabel="Mock Test"
        existingQuestionIds={form.questions.map((question) => question.questionBankId || question.id)}
        onClose={() => setQuestionBankOpen(false)}
        onAdd={addQuestions}
      />
    </main>
  );
}

function LessonBuilderPanel({ courseId, modules, lesson, onSave, onRefresh }) {
  const [activeTab, setActiveTab] = useState("Content");
  const [localSaveStatus, setLocalSaveStatus] = useState(
    "Last saved 2 minutes ago",
  );
  const [form, setForm] = useState(() => getInitialLessonForm(lesson));
  const [questionBankOpen, setQuestionBankOpen] = useState(false);

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
      suggestedReadingTime: Number(form.suggestedReadingTime) || 0,
      summary: form.shortDescription || form.content || lesson.summary,
      status:
        form.visibility === "Hidden" ? LESSON_STATUSES.DRAFT : form.visibility,
      keyPoints: fromLines(form.keyPoints),
      learningObjectives: fromLines(form.learningObjectives),
    });
    setLocalSaveStatus("Last saved just now");
  };

  const addQuestionsFromBank = (questions) => {
    setForm((current) => ({
      ...current,
      questions: [
        ...current.questions,
        ...questions.map((question) => ({
          ...question,
          text: getQuestionText(question),
          correctAnswer: getQuestionAnswer(question),
          questionBankId: question.id,
        })),
      ],
    }));
  };

  const removeQuestion = (questionId) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.filter((question) => question.id !== questionId),
    }));
  };

  const attachMaterial = (label) => {
    addMockLessonMaterial(courseId, lesson.id, {
      name: `${lesson.title.replace(/\s+/g, "-").toLowerCase()}-${label}.pdf`,
      type: label,
    });
    onRefresh();
  };

  const renderContentTab = () => {
    if (form.type === "Video") {
      return (
        <div className="course-builder-tab-body">
          <label className="course-flow-field">
            <span>Lesson title</span>
            <input
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
            />
          </label>
          <label className="course-flow-field">
            <span>Short description</span>
            <input
              value={form.shortDescription}
              placeholder="Brief overview of this video lesson"
              onChange={(event) =>
                updateForm("shortDescription", event.target.value)
              }
            />
          </label>
          <label className="course-flow-field">
            <span>Lesson content</span>
            <RichTextEditorMock
              value={form.content}
              onChange={(value) => updateForm("content", value)}
            />
          </label>
          <label className="course-flow-field">
            <span>Key points</span>
            <textarea
              rows="5"
              value={form.keyPoints}
              placeholder="One key point per line"
              onChange={(event) => updateForm("keyPoints", event.target.value)}
            />
          </label>
        </div>
      );
    }

    if (isAssessmentType(form.type)) {
      return (
        <div className="course-builder-tab-body">
          <label className="course-flow-field">
            <span>{form.type} title</span>
            <input
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
            />
          </label>

          <section className="course-builder-compact-card">
            <div className="course-builder-section-header">
              <span className="demo-kicker">Question List</span>
              <div className="demo-row demo-row--between">
                <h3>{form.questions.length} questions</h3>
                <button
                  type="button"
                  className="demo-primary-action"
                  onClick={() => setQuestionBankOpen(true)}
                >
                  <Plus size={16} />
                  Add from Question Bank
                </button>
              </div>
            </div>
            {form.questions.length === 0 ? (
              <p className="demo-muted">No questions added yet.</p>
            ) : (
              form.questions.map((question, index) => (
                <article key={question.id}>
                  <strong>
                    {index + 1}. {question.text}
                  </strong>
                  <small>
                    {question.type} | Answer:{" "}
                    {question.correctAnswer || getQuestionAnswer(question) || "Not set"}
                  </small>
                  <button
                    type="button"
                    className="course-builder-question-remove"
                    onClick={() => removeQuestion(question.id)}
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </article>
              ))
            )}
          </section>
        </div>
      );
    }

    if (form.type === "Assignment") {
      return (
        <div className="course-builder-tab-body">
          <label className="course-flow-field">
            <span>Assignment title</span>
            <input
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
            />
          </label>
          <label className="course-flow-field">
            <span>Assignment instructions</span>
            <RichTextEditorMock
              value={form.content}
              onChange={(value) => updateForm("content", value)}
            />
          </label>
          <div className="course-flow-form-grid">
            <label className="course-flow-field">
              <span>Submission type</span>
              <select
                value={form.submissionType}
                onChange={(event) =>
                  updateForm("submissionType", event.target.value)
                }
              >
                <option>Text</option>
                <option>File Upload</option>
                <option>Link</option>
              </select>
            </label>
            <label className="course-flow-field">
              <span>Due date</span>
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => updateForm("dueDate", event.target.value)}
              />
            </label>
          </div>
          <label className="course-flow-field">
            <span>Rubric / grading criteria</span>
            <textarea
              rows="5"
              value={form.rubric}
              onChange={(event) => updateForm("rubric", event.target.value)}
            />
          </label>
        </div>
      );
    }

    return (
      <div className="course-builder-tab-body">
        <label className="course-flow-field">
          <span>Lesson title</span>
          <input
            value={form.title}
            onChange={(event) => updateForm("title", event.target.value)}
          />
        </label>
        <label className="course-flow-field">
          <span>Reading content</span>
          <RichTextEditorMock
            value={form.content}
            onChange={(value) => updateForm("content", value)}
          />
        </label>
        <label className="course-flow-field">
          <span>Key points</span>
          <textarea
            rows="5"
            value={form.keyPoints}
            placeholder="One key point per line"
            onChange={(event) => updateForm("keyPoints", event.target.value)}
          />
        </label>
        <label className="course-flow-field">
          <span>Suggested reading time</span>
          <input
            type="number"
            min="1"
            value={form.suggestedReadingTime}
            onChange={(event) =>
              updateForm("suggestedReadingTime", event.target.value)
            }
          />
        </label>
      </div>
    );
  };

  const renderResourcesTab = () => {
    if (form.type === "Video") {
      return (
        <div className="course-builder-tab-body">
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
        </div>
      );
    }

    if (form.type === "Assignment") {
      return (
        <div className="course-builder-tab-body">
          <div className="course-builder-resource-actions">
            <button
              type="button"
              className="demo-secondary-action"
              onClick={() => attachMaterial("instruction-file")}
            >
              <Upload size={16} />
              Attach instruction file
            </button>
            <button
              type="button"
              className="demo-secondary-action"
              onClick={() => attachMaterial("rubric-file")}
            >
              <FileText size={16} />
              Attach rubric file
            </button>
          </div>
          <small className="course-builder-helper-text">
            Demo upload only. No real file is uploaded.
          </small>
          <UploadMaterialBox
            courseId={courseId}
            lesson={lesson}
            onUploaded={onRefresh}
            title="Uploaded assignment materials"
            buttonLabel="Attach File"
          />
        </div>
      );
    }

    return (
      <div className="course-builder-tab-body">
        <UploadMaterialBox
          courseId={courseId}
          lesson={lesson}
          onUploaded={onRefresh}
        />
        <div className="course-builder-resource-actions">
          <button
            type="button"
            className="demo-secondary-action"
            onClick={() => attachMaterial("pdf")}
          >
            Add PDF
          </button>
          <button
            type="button"
            className="demo-secondary-action"
            onClick={() => attachMaterial("slide")}
          >
            Add Slide
          </button>
          <button
            type="button"
            className="demo-secondary-action"
            onClick={() => attachMaterial("document")}
          >
            Add Document
          </button>
        </div>
        <label className="course-flow-field">
          <span>External reference link</span>
          <input
            value={form.externalReference}
            placeholder="https://reference.example.com"
            onChange={(event) =>
              updateForm("externalReference", event.target.value)
            }
          />
        </label>
      </div>
    );
  };

  const renderSettingsTab = () => (
    <div className="course-builder-tab-body">
      <div className="course-flow-form-grid">
        <label className="course-flow-field">
          <span>Lesson type</span>
          <select
            value={form.type}
            onChange={(event) => updateForm("type", event.target.value)}
          >
            {LESSON_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="course-flow-field">
          <span>Duration</span>
          <input
            type="number"
            min="1"
            value={form.durationMinutes}
            onChange={(event) =>
              updateForm("durationMinutes", event.target.value)
            }
          />
        </label>
        <label className="course-flow-field">
          <span>Visibility</span>
          <select
            value={form.visibility}
            onChange={(event) => updateForm("visibility", event.target.value)}
          >
            <option>Draft</option>
            <option>Ready</option>
            <option>Hidden</option>
          </select>
        </label>
        <label className="course-flow-field">
          <span>Estimated difficulty</span>
          <select
            value={form.difficulty}
            onChange={(event) => updateForm("difficulty", event.target.value)}
          >
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
          </select>
        </label>
      </div>

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
          onChange={(event) => updateForm("internalNotes", event.target.value)}
        />
      </label>

      <label className="course-flow-field">
        <span>Prerequisite lesson</span>
        <select
          value={form.prerequisiteLessonId}
          onChange={(event) =>
            updateForm("prerequisiteLessonId", event.target.value)
          }
        >
          <option value="">No prerequisite</option>
          {modules
            .flatMap((module) => module.lessons)
            .filter((item) => item.id !== lesson.id)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
        </select>
      </label>

      <button
        type="button"
        className="demo-primary-action"
        onClick={handleSave}
      >
        <Save size={16} />
        Save Settings
      </button>
    </div>
  );

  const tabContent = {
    Content: renderContentTab,
    Resources: renderResourcesTab,
    Settings: renderSettingsTab,
  };
  const visibleTabs =
    isAssessmentType(form.type)
      ? ["Content", "Settings"]
      : ["Content", "Resources", "Settings"];
  const visibleActiveTab = visibleTabs.includes(activeTab) ? activeTab : "Content";

  return (
    <main className="course-editor-panel course-editor-lesson">
      <section className="course-builder-lesson-shell">
        <div className="course-builder-lesson-topbar">
          <div className="course-builder-lesson-title-block">
            <span className="demo-kicker">Lesson Builder</span>
            <h2>{form.title || lesson.title}</h2>
            <div>
              <LessonTypeBadge type={form.type} />
              <LessonStatusBadge status={form.visibility} />
              <small>{localSaveStatus}</small>
            </div>
          </div>
          <div className="course-builder-lesson-actions">
            <button
              type="button"
              className="demo-primary-action"
              onClick={handleSave}
            >
              <Save size={16} />
              Save Lesson
            </button>
            <button
              type="button"
              className="demo-secondary-action"
              onClick={() =>
                window.alert(
                  `Preview as Trainee\n\n${form.title || lesson.title}\n\n${form.shortDescription || form.content || lesson.summary || "No preview content yet."}`,
                )
              }
            >
              <Eye size={16} />
              Preview as Trainee
            </button>
          </div>
        </div>

        <div
          className="course-builder-tabs"
          role="tablist"
          aria-label="Lesson editor sections"
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={tab === visibleActiveTab ? "is-active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {tabContent[visibleActiveTab]()}
      </section>
      <QuestionBankPicker
        open={questionBankOpen}
        courseId={courseId}
        existingQuestionIds={form.questions.map(
          (question) => question.questionBankId || question.id,
        )}
        onClose={() => setQuestionBankOpen(false)}
        onAdd={addQuestionsFromBank}
      />
    </main>
  );
}

function CourseBuilderAiChatPanel({ course, lesson }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi! I can help you refine lesson content, create learning outcomes, or plan a Module Test.",
    },
  ]);

  const sendMessage = (text = message) => {
    const prompt = text.trim();
    if (!prompt) return;
    const context = lesson?.title || course.title;
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", text: prompt },
      {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: `For "${context}", I suggest clarifying the learner goal first, then adding one practical example and a short knowledge check. This is a demo AI response for SME drafting support.`,
      },
    ]);
    setMessage("");
  };

  return (
    <aside className="course-editor-panel course-editor-tools course-builder-ai-chat">
      <div className="course-builder-ai-chat__header">
        <span className="course-builder-ai-chat__icon"><Bot size={20} /></span>
        <div>
          <span className="demo-kicker">AI Assistant</span>
          <h2>Course builder chat</h2>
          <small>Context: {lesson?.title || course.title}</small>
        </div>
      </div>

      <div className="course-builder-ai-chat__prompts">
        {[
          "Suggest learning outcomes",
          "Improve this lesson",
          "Plan a Module Test",
        ].map((prompt) => (
          <button key={prompt} type="button" onClick={() => sendMessage(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <div className="course-builder-ai-chat__messages">
        {messages.map((item) => (
          <article key={item.id} className={`is-${item.role}`}>
            <span>{item.role === "assistant" ? <Bot size={15} /> : <MessageCircle size={15} />}</span>
            <p>{item.text}</p>
          </article>
        ))}
      </div>

      <div className="course-builder-ai-chat__composer">
        <textarea
          rows="3"
          value={message}
          placeholder="Ask AI about the selected lesson..."
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
        />
        <button type="button" className="demo-primary-action" onClick={() => sendMessage()}>
          <Send size={16} />
          Send
        </button>
      </div>
      <small className="demo-muted">
        Demo assistant only. Generated suggestions are not official course content until the SME saves them.
      </small>
    </aside>
  );
}

export function SmeCourseEditorPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(() => {
    const initialCourse = getLifecycleCourseById(courseId);

    if (initialCourse?.status === COURSE_STATUSES.ASSIGNED_TO_SME) {
      return (
        updateCourseStatus(courseId, COURSE_STATUSES.CONTENT_EDITING) ||
        initialCourse
      );
    }

    return initialCourse;
  });
  const [modules, setModules] = useState(() => getLifecycleModules(courseId));
  const [mockTests, setMockTests] = useState(() => getCourseMockTests(courseId));
  const [selectedLessonId, setSelectedLessonId] = useState(() =>
    getFirstLessonId(getLifecycleModules(courseId)),
  );
  const [selectedMockTestId, setSelectedMockTestId] = useState("");
  const [saveStatus, setSaveStatus] = useState("Saved 2 minutes ago");

  const selectedLesson = useMemo(() => {
    return modules
      .flatMap((module) => module.lessons)
      .find((lesson) => lesson.id === selectedLessonId);
  }, [modules, selectedLessonId]);
  const selectedMockTest = useMemo(
    () => mockTests.find((test) => test.id === selectedMockTestId),
    [mockTests, selectedMockTestId],
  );

  const refresh = useCallback(() => {
    setCourse(getLifecycleCourseById(courseId));
    setModules(getLifecycleModules(courseId));
    setMockTests(getCourseMockTests(courseId));
  }, [courseId]);

  const handleSaveLesson = (lessonId, form) => {
    saveLessonDraft(courseId, lessonId, form);
    setSaveStatus("Saved just now");
    refresh();
  };

  const handleAddModule = (title) => {
    const module = addMockCourseModule(courseId, title);
    refresh();

    if (!selectedLessonId && module.lessons[0]) {
      setSelectedLessonId(module.lessons[0].id);
    }
  };

  const handleAddLesson = (form) => {
    const lesson = addMockCourseLesson(courseId, form.moduleId, {
      ...form,
      summary: form.shortDescription,
    });
    refresh();

    if (lesson) {
      setSelectedLessonId(lesson.id);
    }
  };

  const handleAddMockTest = () => {
    const test = createCourseMockTest(courseId, {
      title: `Mock Test ${mockTests.length + 1}`,
      durationMinutes: 30,
      description: "Official course-level mock assessment draft.",
    });
    refresh();
    setSelectedLessonId("");
    setSelectedMockTestId(test.id);
  };

  const handleSaveMockTest = (testId, form) => {
    updateCourseMockTest(testId, form);
    setSaveStatus("Saved just now");
    refresh();
  };

  const handleEditModule = (module) => {
    const nextTitle = window.prompt("Edit module title", module.title);
    if (!nextTitle?.trim()) return;

    updateCourseModule(courseId, module.id, { title: nextTitle.trim() });
    setSaveStatus("Saved just now");
    refresh();
  };

  const handleDeleteModule = (module) => {
    const confirmed = window.confirm(
      `Delete ${module.title}? This is a mock delete and can be reset by clearing localStorage.`,
    );
    if (!confirmed) return;

    deleteCourseModule(courseId, module.id);
    setSaveStatus("Saved just now");
    refresh();

    if (module.lessons.some((lesson) => lesson.id === selectedLessonId)) {
      const nextLessonId = getFirstLessonId(getLifecycleModules(courseId));
      setSelectedLessonId(nextLessonId);
    }
  };

  const handleSubmitReview = useCallback(() => {
    submitCourseForTmoReview(courseId);
    setSaveStatus("Submitted just now");
    refresh();
  }, [courseId, refresh]);

  const courseTitle = course?.title || "Course Builder Workspace";
  const courseStatus = course?.status || "";
  const workspaceHeader = useMemo(() => {
    const isSubmittedForReview =
      courseStatus === COURSE_STATUSES.SUBMITTED_FOR_REVIEW;
    const editableStatuses = [
      COURSE_STATUSES.DRAFT,
      COURSE_STATUSES.ASSIGNED_TO_SME,
      COURSE_STATUSES.CONTENT_EDITING,
      COURSE_STATUSES.REVISION_REQUIRED,
    ];
    const isEditable = editableStatuses.includes(courseStatus);

    return {
      backTo: "/sme/courses",
      backLabel: "Back to Assigned Courses",
      contextLabel: "Course Builder",
      title: courseTitle,
      subtitle: "SME course creation workspace",
      statusNode: courseStatus ? (
        <CourseStatusBadge status={courseStatus} />
      ) : null,
      saveStatus,
      actions: (
        <>
          <button
            type="button"
            className="demo-secondary-action"
            onClick={() => window.alert(`Preview as Trainee\n\n${courseTitle}`)}
          >
            Preview as Trainee
          </button>
          {isSubmittedForReview ? (
            <button type="button" className="demo-primary-action" disabled>
              <Send size={16} />
              Submitted to TMO
            </button>
          ) : isEditable ? (
            <button
              type="button"
              className="demo-primary-action"
              onClick={handleSubmitReview}
            >
              <Send size={16} />
              Submit for TMO Review
            </button>
          ) : null}
        </>
      ),
    };
  }, [courseStatus, courseTitle, handleSubmitReview, saveStatus]);

  if (!course) {
    return (
      <section>
        <WorkspaceHeaderController header={workspaceHeader} />
        <DataState
          type="empty"
          title="Course not found"
          description="Open a course from Assigned Courses."
        />
      </section>
    );
  }

  return (
    <section>
      <WorkspaceHeaderController header={workspaceHeader} />

      <div className="course-editor-layout course-builder-workspace">
        <CourseStructurePanel
          course={course}
          modules={modules}
          mockTests={mockTests}
          selectedLessonId={selectedLessonId}
          selectedMockTestId={selectedMockTestId}
          onSelectLesson={(lessonId) => {
            setSelectedMockTestId("");
            setSelectedLessonId(lessonId);
          }}
          onSelectMockTest={(testId) => {
            setSelectedLessonId("");
            setSelectedMockTestId(testId);
          }}
          onAddModule={handleAddModule}
          onAddLesson={handleAddLesson}
          onAddMockTest={handleAddMockTest}
          onEditModule={handleEditModule}
          onDeleteModule={handleDeleteModule}
        />

        {selectedMockTest ? (
          <MockTestBuilderPanel
            key={selectedMockTest.id}
            courseId={courseId}
            test={selectedMockTest}
            onSave={handleSaveMockTest}
          />
        ) : (
          <LessonBuilderPanel
            key={selectedLesson?.id || "no-lesson"}
            courseId={courseId}
            modules={modules}
            lesson={selectedLesson}
            onSave={handleSaveLesson}
            onRefresh={refresh}
          />
        )}

        <CourseBuilderAiChatPanel
          course={course}
          lesson={selectedMockTest || selectedLesson}
        />
      </div>
    </section>
  );
}
