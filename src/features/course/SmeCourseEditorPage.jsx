import { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
    BookOpen,
    Brain,
    ClipboardCheck,
    Edit3,
    FileText,
    Eye,
    Layers3,
    Plus,
    Save,
    Send,
    Sparkles,
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
    deleteCourseModule,
    deleteGeneratedResource,
    generateExplanationForLesson,
    generateFlashcardsForLesson,
    generatePracticeTestForLesson,
    generateQuizQuestionsForLesson,
    generateSummaryForLesson,
    getGeneratedResources,
    getLifecycleCourseById,
    getLifecycleModules,
    saveLessonDraft,
    saveGeneratedQuestionsToQuestionBank,
    saveGeneratedResource,
    submitCourseForTmoReview,
    updateCourseModule,
    updateCourseStatus,
} from "@/data/demo/courseLifecycleRuntime";
import { COURSE_STATUSES } from "@/data/demo/courseLifecycle";
import { ROLES } from "@/shared/constants/roles";
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

const LESSON_TYPES = ["Video", "Reading", "Quiz", "Assignment"];

function LessonTypeBadge({ type }) {
    const normalizedType = LESSON_TYPES.includes(type) ? type : "Reading";

    return (
        <span
            className={`lesson-type-badge lesson-type-badge--${normalizedType.toLowerCase()}`}
        >
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
                    onChange={(event) =>
                        updateForm("title", event.target.value)
                    }
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
    selectedLessonId,
    onSelectLesson,
    onAddModule,
    onAddLesson,
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
                                    <small>
                                        {module.lessons.length} lessons
                                    </small>
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
                                    <p className="demo-muted">
                                        No lessons in this module.
                                    </p>
                                ) : (
                                    module.lessons.map(
                                        (lesson, lessonIndex) => (
                                            <button
                                                key={lesson.id}
                                                type="button"
                                                className={`course-builder-lesson-row ${lesson.id === selectedLessonId ? "is-active" : ""}`}
                                                onClick={() =>
                                                    onSelectLesson(lesson.id)
                                                }
                                            >
                                                <strong>
                                                    Lesson {lessonIndex + 1}:{" "}
                                                    {lesson.title}
                                                </strong>
                                                <div>
                                                    <LessonTypeBadge
                                                        type={lesson.type}
                                                    />
                                                    <small>
                                                        {lesson.durationMinutes ||
                                                            lesson.duration ||
                                                            0}{" "}
                                                        min
                                                    </small>
                                                    <LessonStatusBadge
                                                        status={lesson.status}
                                                    />
                                                </div>
                                            </button>
                                        ),
                                    )
                                )}

                                {lessonFormModuleId === module.id ? (
                                    <InlineAddLessonForm
                                        moduleId={module.id}
                                        onSubmit={handleAddLesson}
                                        onCancel={() =>
                                            setLessonFormModuleId("")
                                        }
                                    />
                                ) : (
                                    <button
                                        type="button"
                                        className="course-builder-add-row"
                                        onClick={() =>
                                            setLessonFormModuleId(module.id)
                                        }
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

            {moduleFormOpen ? (
                <div className="course-builder-inline-form">
                    <label className="course-flow-field">
                        <span>Module name</span>
                        <input
                            value={moduleTitle}
                            placeholder={`Module ${modules.length + 1}`}
                            onChange={(event) =>
                                setModuleTitle(event.target.value)
                            }
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
                <button
                    type="button"
                    className="course-builder-add-module-button"
                    onClick={() => setModuleFormOpen(true)}
                >
                    <Layers3 size={16} />
                    Add Module
                </button>
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
                                {new Date(video.uploadedAt).toLocaleString(
                                    "vi-VN",
                                )}
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
                                {new Date(material.uploadedAt).toLocaleString(
                                    "vi-VN",
                                )}
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
    const lessonType = LESSON_TYPES.includes(lesson?.type)
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

function LessonBuilderPanel({ courseId, modules, lesson, onSave, onRefresh }) {
    const [activeTab, setActiveTab] = useState("Content");
    const [localSaveStatus, setLocalSaveStatus] = useState(
        "Last saved 2 minutes ago",
    );
    const [form, setForm] = useState(() => getInitialLessonForm(lesson));

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
                form.visibility === "Hidden"
                    ? LESSON_STATUSES.DRAFT
                    : form.visibility,
            keyPoints: fromLines(form.keyPoints),
            learningObjectives: fromLines(form.learningObjectives),
        });
        setLocalSaveStatus("Last saved just now");
    };

    const addQuestion = () => {
        if (!form.questionText.trim()) return;

        setForm((current) => ({
            ...current,
            questions: [
                ...current.questions,
                {
                    id: `question-${lesson.id}-${Date.now()}`,
                    text: current.questionText,
                    type: current.questionType,
                    correctAnswer: current.correctAnswer,
                    explanation: current.explanation,
                },
            ],
            questionText: "",
            correctAnswer: "",
            explanation: "",
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
                            onChange={(event) =>
                                updateForm("title", event.target.value)
                            }
                        />
                    </label>
                    <label className="course-flow-field">
                        <span>Short description</span>
                        <input
                            value={form.shortDescription}
                            placeholder="Brief overview of this video lesson"
                            onChange={(event) =>
                                updateForm(
                                    "shortDescription",
                                    event.target.value,
                                )
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
                            onChange={(event) =>
                                updateForm("keyPoints", event.target.value)
                            }
                        />
                    </label>
                </div>
            );
        }

        if (form.type === "Quiz") {
            return (
                <div className="course-builder-tab-body">
                    <label className="course-flow-field">
                        <span>Quiz title</span>
                        <input
                            value={form.title}
                            onChange={(event) =>
                                updateForm("title", event.target.value)
                            }
                        />
                    </label>

                    <section className="course-builder-compact-card">
                        <div className="course-builder-section-header">
                            <span className="demo-kicker">Question List</span>
                            <h3>{form.questions.length} questions</h3>
                        </div>
                        {form.questions.length === 0 ? (
                            <p className="demo-muted">
                                No questions added yet.
                            </p>
                        ) : (
                            form.questions.map((question, index) => (
                                <article key={question.id}>
                                    <strong>
                                        {index + 1}. {question.text}
                                    </strong>
                                    <small>
                                        {question.type} | Answer:{" "}
                                        {question.correctAnswer || "Not set"}
                                    </small>
                                </article>
                            ))
                        )}
                    </section>

                    <div className="course-flow-form-grid">
                        <label className="course-flow-field course-flow-field--wide">
                            <span>Question text</span>
                            <input
                                value={form.questionText}
                                placeholder="Write a quiz question"
                                onChange={(event) =>
                                    updateForm(
                                        "questionText",
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label className="course-flow-field">
                            <span>Question type</span>
                            <select
                                value={form.questionType}
                                onChange={(event) =>
                                    updateForm(
                                        "questionType",
                                        event.target.value,
                                    )
                                }
                            >
                                <option>Multiple Choice</option>
                                <option>True/False</option>
                                <option>Short Answer</option>
                            </select>
                        </label>
                        <label className="course-flow-field">
                            <span>Correct answer</span>
                            <input
                                value={form.correctAnswer}
                                onChange={(event) =>
                                    updateForm(
                                        "correctAnswer",
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label className="course-flow-field course-flow-field--wide">
                            <span>Explanation</span>
                            <textarea
                                rows="4"
                                value={form.explanation}
                                onChange={(event) =>
                                    updateForm(
                                        "explanation",
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>

                    <button
                        type="button"
                        className="demo-secondary-action"
                        onClick={addQuestion}
                    >
                        <Plus size={16} />
                        Add Question
                    </button>
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
                            onChange={(event) =>
                                updateForm("title", event.target.value)
                            }
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
                                    updateForm(
                                        "submissionType",
                                        event.target.value,
                                    )
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
                                onChange={(event) =>
                                    updateForm("dueDate", event.target.value)
                                }
                            />
                        </label>
                    </div>
                    <label className="course-flow-field">
                        <span>Rubric / grading criteria</span>
                        <textarea
                            rows="5"
                            value={form.rubric}
                            onChange={(event) =>
                                updateForm("rubric", event.target.value)
                            }
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
                        onChange={(event) =>
                            updateForm("title", event.target.value)
                        }
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
                        onChange={(event) =>
                            updateForm("keyPoints", event.target.value)
                        }
                    />
                </label>
                <label className="course-flow-field">
                    <span>Suggested reading time</span>
                    <input
                        type="number"
                        min="1"
                        value={form.suggestedReadingTime}
                        onChange={(event) =>
                            updateForm(
                                "suggestedReadingTime",
                                event.target.value,
                            )
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
                            onChange={(event) =>
                                updateForm("videoUrl", event.target.value)
                            }
                        />
                    </label>
                    <section className="course-builder-video-preview">
                        <Video size={34} />
                        <span>Video preview placeholder</span>
                        <small>
                            {form.videoUrl ||
                                "Upload a video or add a URL to preview."}
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

        if (form.type === "Quiz") {
            return (
                <div className="course-builder-tab-body">
                    <div className="course-builder-resource-actions">
                        <button
                            type="button"
                            className="demo-secondary-action"
                            onClick={() => attachMaterial("question-import")}
                        >
                            <Upload size={16} />
                            Import Questions
                        </button>
                        <button
                            type="button"
                            className="demo-secondary-action"
                            onClick={() =>
                                generateQuizQuestionsForLesson(
                                    courseId,
                                    lesson.id,
                                    ROLES.SME,
                                )
                            }
                        >
                            <Save size={16} />
                            Save Questions to Question Bank
                        </button>
                        <button
                            type="button"
                            className="demo-secondary-action"
                            onClick={() =>
                                attachMaterial("supporting-material")
                            }
                        >
                            <FileText size={16} />
                            Attach supporting material
                        </button>
                    </div>
                    <small className="course-builder-helper-text">
                        Demo upload only. No real file is uploaded.
                    </small>
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
                        onChange={(event) =>
                            updateForm("type", event.target.value)
                        }
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
                        onChange={(event) =>
                            updateForm("visibility", event.target.value)
                        }
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
                        onChange={(event) =>
                            updateForm("difficulty", event.target.value)
                        }
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
                    onChange={(event) =>
                        updateForm("internalNotes", event.target.value)
                    }
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
                    {Object.keys(tabContent).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            className={tab === activeTab ? "is-active" : ""}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {tabContent[activeTab]()}
            </section>
        </main>
    );
}

function getResourceLabel(type) {
    const labels = {
        explanation: "Improved Suggestions",
        summary: "Summary",
        flashcard: "Flashcards",
        questions: "Test / Questions",
        test: "Test / Questions",
        key_points: "Key Points",
    };

    return labels[type] || type;
}

function getResourceGroup(type) {
    if (type === "summary") return "Summary";
    if (type === "flashcard") return "Flashcards";
    if (type === "test" || type === "questions") return "Test / Questions";
    if (type === "explanation") return "Improved Suggestions";
    return "Other Resources";
}

function getResourcePreview(resource) {
    if (resource.type === "flashcard") {
        return `${resource.content?.length || 0} flashcards generated`;
    }

    if (resource.type === "questions") {
        return `${resource.content?.length || 0} quiz questions generated`;
    }

    if (resource.type === "test") {
        return resource.content?.title || "Practice test generated";
    }

    if (resource.type === "summary" || resource.type === "explanation") {
        return resource.content?.title || "Draft text generated";
    }

    if (resource.type === "key_points") {
        return `${resource.content?.length || 0} key points generated`;
    }

    return "Generated mock resource";
}

function GeneratedResourcesList({
    resources,
    lesson,
    onView,
    onSave,
    onDelete,
}) {
    if (resources.length === 0) {
        return (
            <p className="demo-muted">
                Generated summaries, flashcards, tests, questions, and improved
                suggestions will appear here.
            </p>
        );
    }

    const groups = resources.reduce((result, resource) => {
        const group = getResourceGroup(resource.type);

        return {
            ...result,
            [group]: [...(result[group] || []), resource],
        };
    }, {});

    return (
        <div className="course-builder-generated-groups">
            {Object.entries(groups).map(([group, groupResources]) => (
                <section key={group}>
                    <h4>{group}</h4>
                    <div className="course-builder-generated-list">
                        {groupResources.map((resource) => (
                            <article key={resource.id}>
                                <strong>
                                    {getResourceLabel(resource.type)}
                                </strong>
                                <span>{getResourcePreview(resource)}</span>
                                <small>
                                    Source: {lesson?.title || "Current lesson"}
                                </small>
                                <small>
                                    {new Date(
                                        resource.createdAt,
                                    ).toLocaleString("vi-VN")}
                                </small>
                                <div className="course-builder-resource-card-actions">
                                    <button type="button" onClick={() => onView(resource)}>View</button>
                                    <button type="button" onClick={() => onSave(resource)}>Save</button>
                                    <button type="button" onClick={() => onDelete(resource)}>Delete</button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

function CourseBuilderToolsPanel({
    course,
    courseId,
    lesson,
    resources,
    onGenerated,
    onSubmitReview,
}) {
    const isSubmittedForReview =
        course.status === COURSE_STATUSES.SUBMITTED_FOR_REVIEW;
    const hasRevisionReason = Boolean(course.revisionReason);
    const lessonId = lesson?.id;
    const hasGeneratedQuestions = resources.some((resource) =>
        ["test", "questions"].includes(resource.type),
    );
    const handleViewResource = (resource) => {
        window.alert(`${getResourceLabel(resource.type)}\n\n${getResourcePreview(resource)}`);
    };
    const handleSaveResource = (resource) => {
        saveGeneratedResource(resource);
        onGenerated();
    };
    const handleDeleteResource = (resource) => {
        deleteGeneratedResource(resource.id);
        onGenerated();
    };
    const aiActions = [
        {
            label: "Improve Content",
            icon: Brain,
            action: () =>
                generateExplanationForLesson(courseId, lessonId, ROLES.SME),
        },
        {
            label: "Generate Summary",
            icon: BookOpen,
            action: () =>
                generateSummaryForLesson(courseId, lessonId, ROLES.SME),
        },
        {
            label: "Generate Flashcards",
            icon: Sparkles,
            action: () =>
                generateFlashcardsForLesson(courseId, lessonId, ROLES.SME),
        },
        {
            label: "Generate Test",
            icon: ClipboardCheck,
            action: () =>
                generatePracticeTestForLesson(courseId, lessonId, ROLES.SME),
        },
    ];

    return (
        <aside className="course-editor-panel course-editor-tools">
            <section className="course-builder-tools-section">
                <div className="course-builder-section-header">
                    <span className="demo-kicker">AI Tools</span>
                    <h2>Generate content support</h2>
                </div>

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
            </section>

            <section className="course-builder-tools-section">
                <div className="course-builder-section-header">
                    <span className="demo-kicker">Generated Resources</span>
                    <h3>Lesson assets</h3>
                </div>
                <GeneratedResourcesList
                    resources={resources}
                    lesson={lesson}
                    onView={handleViewResource}
                    onSave={handleSaveResource}
                    onDelete={handleDeleteResource}
                />

                <button
                    type="button"
                    className="demo-secondary-action"
                    disabled={!hasGeneratedQuestions}
                    onClick={() => {
                        saveGeneratedQuestionsToQuestionBank(courseId, lessonId);
                        onGenerated();
                    }}
                >
                    <Save size={16} />
                    Save to Question Bank
                </button>
            </section>

            <section className="course-builder-tools-section">
                <div className="course-builder-section-header">
                    <span className="demo-kicker">Review Submission</span>
                    <h3>TMO workflow</h3>
                </div>

                <div className="course-builder-status-card">
                    <span>Course workflow status</span>
                    <CourseStatusBadge status={course.status} />
                </div>

                {isSubmittedForReview ? (
                    <div className="course-flow-submitted-note">
                        <span>This course is waiting for TMO review.</span>
                    </div>
                ) : null}

                {hasRevisionReason ? (
                    <div className="course-flow-revision-note">
                        <strong>TMO revision reason</strong>
                        <span>{course.revisionReason}</span>
                    </div>
                ) : null}

                <button
                    type="button"
                    className="demo-primary-action"
                    disabled={isSubmittedForReview}
                    onClick={onSubmitReview}
                >
                    <Send size={16} />
                    {isSubmittedForReview
                        ? "Submitted to TMO"
                        : "Submit Course for TMO Review"}
                </button>
            </section>
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
    const [selectedLessonId, setSelectedLessonId] = useState(() =>
        getFirstLessonId(getLifecycleModules(courseId)),
    );
    const [resources, setResources] = useState(() =>
        getGeneratedResources({ courseId }),
    );
    const [saveStatus, setSaveStatus] = useState("Saved 2 minutes ago");

    const selectedLesson = useMemo(() => {
        return modules
            .flatMap((module) => module.lessons)
            .find((lesson) => lesson.id === selectedLessonId);
    }, [modules, selectedLessonId]);

    const refresh = useCallback(() => {
        setCourse(getLifecycleCourseById(courseId));
        setModules(getLifecycleModules(courseId));
        setResources(getGeneratedResources({ courseId }));
    }, [courseId]);

    const refreshResources = () =>
        setResources(getGeneratedResources({ courseId }));

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

    const handleEditModule = (module) => {
        const nextTitle = window.prompt("Edit module title", module.title);
        if (!nextTitle?.trim()) return;

        updateCourseModule(courseId, module.id, { title: nextTitle.trim() });
        setSaveStatus("Saved just now");
        refresh();
    };

    const handleDeleteModule = (module) => {
        const confirmed = window.confirm(`Delete ${module.title}? This is a mock delete and can be reset by clearing localStorage.`);
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
                        <button
                            type="button"
                            className="demo-primary-action"
                            disabled
                        >
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
                    selectedLessonId={selectedLessonId}
                    onSelectLesson={setSelectedLessonId}
                    onAddModule={handleAddModule}
                    onAddLesson={handleAddLesson}
                    onEditModule={handleEditModule}
                    onDeleteModule={handleDeleteModule}
                />

                <LessonBuilderPanel
                    key={selectedLesson?.id || "no-lesson"}
                    courseId={courseId}
                    modules={modules}
                    lesson={selectedLesson}
                    onSave={handleSaveLesson}
                    onRefresh={refresh}
                />

                <CourseBuilderToolsPanel
                    course={course}
                    courseId={courseId}
                    lesson={selectedLesson}
                    resources={resources.filter(
                        (resource) =>
                            !selectedLessonId ||
                            resource.lessonId === selectedLessonId,
                    )}
                    onGenerated={refreshResources}
                    onSubmitReview={handleSubmitReview}
                />
            </div>
        </section>
    );
}
