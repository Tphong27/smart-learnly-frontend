import { useMemo, useState } from "react";
import {
    ArrowRight,
    ClipboardCheck,
    Clock3,
    Edit3,
    Grid2X2,
    List as ListIcon,
    Plus,
    Sparkles,
    Target,
    Trash2,
    Upload,
    X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getEnrollmentsByUser } from "@/data/demo/demoRuntime";
import {
    getAllLifecycleTests,
    getLifecycleCourseById,
} from "@/data/demo/courseLifecycleRuntime";
import {
    createTraineeTest,
    deleteTraineeTest,
    getModulesForTraineeTest,
    getTraineeCourseOptions,
    getTraineeCreatedTests,
    updateTraineeTest,
} from "@/data/demo/demoTraineeRuntime";
import { PageState } from "@/shared/components/PageState";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { useDemoPageState } from "@/shared/hooks/useDemoPageState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { getCurrentUser } from "@/services";

const emptyForm = {
    title: "",
    description: "",
    courseId: "",
    sourceType: "modules",
    selectedModuleIds: [],
    uploadedFileName: "",
    totalQuestions: 10,
    durationMinutes: 20,
    passingScore: 70,
};

function getInitialForm() {
    const firstCourse = getTraineeCourseOptions()[0];

    return {
        ...emptyForm,
        courseId: firstCourse?.id || "",
    };
}

function getSourceSummary(test) {
    if (test.sourceType === "upload") {
        return test.uploadedFileName || "Uploaded document mock";
    }

    const selectedCount = Array.isArray(test.selectedModuleIds)
        ? test.selectedModuleIds.length
        : 0;

    if (selectedCount === 0) return "Course module source";

    return `${selectedCount} selected module${selectedCount > 1 ? "s" : ""}`;
}

function TestFormModal({
    open,
    mode,
    form,
    formError,
    onChange,
    onClose,
    onSubmit,
}) {
    const modules = form.courseId
        ? getModulesForTraineeTest(form.courseId)
        : [];

    if (!open) return null;

    const updateField = (name, value) => {
        onChange({
            ...form,
            [name]: value,
        });
    };

    const toggleModule = (moduleId) => {
        const selected = new Set(form.selectedModuleIds);

        if (selected.has(moduleId)) {
            selected.delete(moduleId);
        } else {
            selected.add(moduleId);
        }

        updateField("selectedModuleIds", Array.from(selected));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <section className="demo-card w-full max-w-4xl max-h-[92vh] overflow-y-auto">
                <div className="demo-row demo-row--between">
                    <div>
                        <span className="demo-kicker">
                            {mode === "create" ? "Create test" : "Update test"}
                        </span>
                        <h2>
                            {mode === "create"
                                ? "Generate personal practice test"
                                : "Update your personal test"}
                        </h2>
                        <p className="demo-muted">
                            Choose an enrolled course, then generate a test from
                            selected modules or an uploaded document mock.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="demo-secondary-action"
                        onClick={onClose}
                    >
                        <X size={16} />
                        Close
                    </button>
                </div>

                <div className="course-flow-form-section">
                    <label className="course-flow-field">
                        <span>Test title</span>
                        <input
                            value={form.title}
                            placeholder="AWS pricing practice test"
                            onChange={(event) =>
                                updateField("title", event.target.value)
                            }
                        />
                    </label>

                    <label className="course-flow-field">
                        <span>Description</span>
                        <textarea
                            rows="3"
                            value={form.description}
                            placeholder="Practice test generated from selected course modules."
                            onChange={(event) =>
                                updateField("description", event.target.value)
                            }
                        />
                    </label>

                    <label className="course-flow-field">
                        <span>Course</span>
                        <select
                            value={form.courseId}
                            onChange={(event) => {
                                onChange({
                                    ...form,
                                    courseId: event.target.value,
                                    selectedModuleIds: [],
                                });
                            }}
                        >
                            <option value="">Select enrolled course</option>
                            {getTraineeCourseOptions().map((course) => (
                                <option key={course.id} value={course.id}>
                                    {course.title}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="course-flow-form-grid course-flow-form-grid--compact">
                        <label className="course-flow-field">
                            <span>Questions</span>
                            <input
                                type="number"
                                min="1"
                                value={form.totalQuestions}
                                onChange={(event) =>
                                    updateField(
                                        "totalQuestions",
                                        event.target.value,
                                    )
                                }
                            />
                        </label>

                        <label className="course-flow-field">
                            <span>Duration minutes</span>
                            <input
                                type="number"
                                min="1"
                                value={form.durationMinutes}
                                onChange={(event) =>
                                    updateField(
                                        "durationMinutes",
                                        event.target.value,
                                    )
                                }
                            />
                        </label>

                        <label className="course-flow-field">
                            <span>Passing score</span>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={form.passingScore}
                                onChange={(event) =>
                                    updateField(
                                        "passingScore",
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>

                    <section className="demo-card">
                        <span className="demo-kicker">AI source</span>
                        <h3>Choose how the test is generated</h3>

                        <div className="demo-actions">
                            <button
                                type="button"
                                className={
                                    form.sourceType === "modules"
                                        ? "demo-primary-action"
                                        : "demo-secondary-action"
                                }
                                onClick={() =>
                                    updateField("sourceType", "modules")
                                }
                            >
                                <ClipboardCheck size={16} />
                                Select course modules
                            </button>

                            <button
                                type="button"
                                className={
                                    form.sourceType === "upload"
                                        ? "demo-primary-action"
                                        : "demo-secondary-action"
                                }
                                onClick={() =>
                                    updateField("sourceType", "upload")
                                }
                            >
                                <Upload size={16} />
                                Upload document mock
                            </button>
                        </div>

                        {form.sourceType === "modules" ? (
                            <div className="demo-list">
                                {modules.length === 0 ? (
                                    <p className="demo-muted">
                                        Select a course to show available
                                        modules.
                                    </p>
                                ) : (
                                    modules.map((module) => (
                                        <label
                                            key={module.id}
                                            className="demo-list-item"
                                        >
                                            <div>
                                                <strong>{module.title}</strong>
                                                <small>
                                                    {module.lessons.length}{" "}
                                                    lessons
                                                </small>
                                            </div>

                                            <input
                                                type="checkbox"
                                                checked={form.selectedModuleIds.includes(
                                                    module.id,
                                                )}
                                                onChange={() =>
                                                    toggleModule(module.id)
                                                }
                                            />
                                        </label>
                                    ))
                                )}
                            </div>
                        ) : (
                            <label className="course-flow-field">
                                <span>Uploaded file name mock</span>
                                <input
                                    value={form.uploadedFileName}
                                    placeholder="aws-practice-material.pdf"
                                    onChange={(event) =>
                                        updateField(
                                            "uploadedFileName",
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                        )}
                    </section>
                </div>

                {formError ? (
                    <p className="demo-form-error">{formError}</p>
                ) : null}

                <div className="demo-actions">
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
                        <Sparkles size={16} />
                        {mode === "create" ? "Create AI test" : "Save changes"}
                    </button>
                </div>
            </section>
        </div>
    );
}

function TestCard({ test, personal = false, onEdit, onDelete }) {
    const course = getLifecycleCourseById(test.courseId);

    return (
        <article className="demo-card test-card">
            <div className="demo-row demo-row--between">
                <StatusBadge status={test.status} />
                <span className="test-card__course">
                    {test.courseTitle || course?.title}
                </span>
            </div>

            <div className="demo-chip-list">
                <span>{test.type || "Module Test"}</span>
                <span>{test.testStatus || "Not Started"}</span>
                <span>{getSourceSummary(test)}</span>
                {personal ? <span>Created by me</span> : null}
            </div>

            <h2>{test.title}</h2>
            <p>{test.description}</p>

            <div className="demo-meta-grid">
                <span>
                    <ClipboardCheck size={15} /> {test.totalQuestions} questions
                </span>
                <span>
                    <Clock3 size={15} /> {test.durationMinutes} min
                </span>
                <span>
                    <Target size={15} /> {test.passingScore}% pass
                </span>
            </div>

            <div className="demo-actions">
                {!personal ? (
                    <Link
                        className="demo-primary-action"
                        to={`/tests/${test.id}`}
                    >
                        View test <ArrowRight size={16} />
                    </Link>
                ) : null}

                {personal ? (
                    <>
                        <button
                            type="button"
                            className="demo-secondary-action"
                            onClick={() => onEdit(test)}
                        >
                            <Edit3 size={16} />
                            Update
                        </button>

                        <button
                            type="button"
                            className="demo-secondary-action"
                            onClick={() => onDelete(test.id)}
                        >
                            <Trash2 size={16} />
                            Delete
                        </button>
                    </>
                ) : null}
            </div>
        </article>
    );
}

function TestListRow({ test, personal = false, onEdit, onDelete }) {
    const course = getLifecycleCourseById(test.courseId);

    return (
        <article className="demo-list-item">
            <div>
                <div className="demo-row">
                    <StatusBadge status={test.status} />
                    {personal ? (
                        <span className="demo-count-badge">Created by me</span>
                    ) : null}
                </div>

                <strong>{test.title}</strong>
                <small>{test.courseTitle || course?.title}</small>
                <small>
                    {test.type || "Module Test"} ·{" "}
                    {test.testStatus || "Not Started"} ·{" "}
                    {getSourceSummary(test)}
                </small>
                <p>{test.description}</p>
            </div>

            <div className="demo-actions">
                <span className="demo-muted">
                    {test.totalQuestions} questions · {test.durationMinutes} min
                    · {test.passingScore}% pass
                </span>

                {!personal ? (
                    <Link
                        className="demo-primary-action"
                        to={`/tests/${test.id}`}
                    >
                        View test <ArrowRight size={16} />
                    </Link>
                ) : null}

                {personal ? (
                    <>
                        <button
                            type="button"
                            className="demo-secondary-action"
                            onClick={() => onEdit(test)}
                        >
                            <Edit3 size={16} />
                            Update
                        </button>

                        <button
                            type="button"
                            className="demo-secondary-action"
                            onClick={() => onDelete(test.id)}
                        >
                            <Trash2 size={16} />
                            Delete
                        </button>
                    </>
                ) : null}
            </div>
        </article>
    );
}

function TestCollection({
    tests,
    viewMode,
    personal = false,
    onEdit,
    onDelete,
}) {
    if (tests.length === 0) return null;

    if (viewMode === "list") {
        return (
            <section className="demo-list">
                {tests.map((test) => (
                    <TestListRow
                        key={test.id}
                        test={test}
                        personal={personal}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                ))}
            </section>
        );
    }

    return (
        <section className="demo-card-grid">
            {tests.map((test) => (
                <TestCard
                    key={test.id}
                    test={test}
                    personal={personal}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </section>
    );
}

export function TestListPage() {
    useDocumentTitle("Tests and practice");

    const { loading, error } = useDemoPageState();
    const [activeTab, setActiveTab] = useState("available");
    const [viewMode, setViewMode] = useState("grid");
    const [personalTests, setPersonalTests] = useState(() =>
        getTraineeCreatedTests(),
    );
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState("create");
    const [editingTestId, setEditingTestId] = useState(null);
    const [form, setForm] = useState(getInitialForm);
    const [formError, setFormError] = useState("");

    const enrolledCourseIds = useMemo(
        () =>
            new Set(
                getAllDemoEnrollments().map(
                    (enrollment) => enrollment.courseId,
                ),
            ),
        [],
    );

    const availableTests = useMemo(() => {
        return getAllLifecycleTests().filter(
            (test) =>
                test.status === "published" &&
                enrolledCourseIds.has(test.courseId),
        );
    }, [enrolledCourseIds]);

    const completedTests = availableTests.filter(
        (test) => test.testStatus === "Completed" || test.bestScore,
    );

    const currentTests =
        activeTab === "personal"
            ? personalTests
            : activeTab === "completed"
              ? completedTests
              : availableTests;

    const openCreateModal = () => {
        setModalMode("create");
        setEditingTestId(null);
        setForm(getInitialForm());
        setFormError("");
        setModalOpen(true);
    };

    const openUpdateModal = (test) => {
        setModalMode("update");
        setEditingTestId(test.id);
        setForm({
            title: test.title,
            description: test.description,
            courseId: test.courseId,
            sourceType: test.sourceType || "modules",
            selectedModuleIds: test.selectedModuleIds || [],
            uploadedFileName: test.uploadedFileName || "",
            totalQuestions: test.totalQuestions,
            durationMinutes: test.durationMinutes,
            passingScore: test.passingScore,
        });
        setFormError("");
        setModalOpen(true);
    };

    const validateForm = () => {
        if (!form.title.trim()) return "Please enter a test title.";
        if (!form.courseId) return "Please select an enrolled course.";

        if (
            form.sourceType === "modules" &&
            form.selectedModuleIds.length === 0
        ) {
            return "Please select at least one module for AI generation.";
        }

        if (form.sourceType === "upload" && !form.uploadedFileName.trim()) {
            return "Please enter an uploaded file name mock.";
        }

        if (Number(form.totalQuestions) <= 0) {
            return "Questions must be greater than 0.";
        }

        if (Number(form.durationMinutes) <= 0) {
            return "Duration must be greater than 0.";
        }

        if (Number(form.passingScore) <= 0 || Number(form.passingScore) > 100) {
            return "Passing score must be between 1 and 100.";
        }

        return "";
    };

    const handleSubmit = () => {
        const validationError = validateForm();

        if (validationError) {
            setFormError(validationError);
            return;
        }

        if (modalMode === "create") {
            createTraineeTest(form);
            setActiveTab("personal");
        } else {
            updateTraineeTest(editingTestId, form);
        }

        setPersonalTests(getTraineeCreatedTests());
        setModalOpen(false);
        setFormError("");
    };

    const handleDelete = (testId) => {
        deleteTraineeTest(testId);
        setPersonalTests(getTraineeCreatedTests());
    };

    if (loading) {
        return (
            <PageState
                state="loading"
                title="Loading tests"
                description="Checking published tests and your personal tests."
            />
        );
    }

    if (error) {
        return (
            <PageState
                state="error"
                title="Tests unavailable"
                description={error.message}
            />
        );
    }

    return (
        <main className="demo-page">
            <section className="demo-hero-band">
                <div>
                    <span className="demo-kicker">Tests and practice</span>
                    <h1>Practice from your enrolled courses</h1>
                    <p>
                        View assigned tests, create AI-generated personal tests,
                        update your own tests, delete tests created by you, and
                        switch between grid/list presentation.
                    </p>
                </div>

                <button
                    type="button"
                    className="demo-primary-action"
                    onClick={openCreateModal}
                >
                    <Plus size={16} />
                    Create AI Test
                </button>
            </section>

            <section className="demo-toolbar">
                <div className="demo-actions">
                    <button
                        type="button"
                        className={
                            activeTab === "available"
                                ? "demo-primary-action"
                                : "demo-secondary-action"
                        }
                        onClick={() => setActiveTab("available")}
                    >
                        Assigned tests ({availableTests.length})
                    </button>

                    <button
                        type="button"
                        className={
                            activeTab === "personal"
                                ? "demo-primary-action"
                                : "demo-secondary-action"
                        }
                        onClick={() => setActiveTab("personal")}
                    >
                        My generated tests ({personalTests.length})
                    </button>

                    <button
                        type="button"
                        className={
                            activeTab === "completed"
                                ? "demo-primary-action"
                                : "demo-secondary-action"
                        }
                        onClick={() => setActiveTab("completed")}
                    >
                        Completed ({completedTests.length})
                    </button>
                </div>

                <div className="demo-actions">
                    <button
                        type="button"
                        className={
                            viewMode === "grid"
                                ? "demo-primary-action"
                                : "demo-secondary-action"
                        }
                        onClick={() => setViewMode("grid")}
                        aria-label="Show tests as grid"
                    >
                        <Grid2X2 size={16} />
                        Grid
                    </button>

                    <button
                        type="button"
                        className={
                            viewMode === "list"
                                ? "demo-primary-action"
                                : "demo-secondary-action"
                        }
                        onClick={() => setViewMode("list")}
                        aria-label="Show tests as list"
                    >
                        <ListIcon size={16} />
                        List
                    </button>
                </div>
            </section>

            <div className="demo-result-summary">
                Showing <strong>{currentTests.length}</strong> test
                {currentTests.length === 1 ? "" : "s"} in{" "}
                <strong>{viewMode}</strong> view
            </div>

            {activeTab === "available" &&
                (availableTests.length === 0 ? (
                    <PageState
                        state="empty"
                        title="No assigned tests available"
                        description="Enroll in a course with a published test to start practice."
                        action={
                            <Link className="demo-primary-action" to="/courses">
                                Explore courses <ArrowRight size={16} />
                            </Link>
                        }
                    />
                ) : (
                    <TestCollection
                        tests={availableTests}
                        viewMode={viewMode}
                    />
                ))}

            {activeTab === "personal" &&
                (personalTests.length === 0 ? (
                    <PageState
                        state="empty"
                        title="No personal tests yet"
                        description="Create an AI-generated test from uploaded material or selected modules."
                        action={
                            <button
                                type="button"
                                className="demo-primary-action"
                                onClick={openCreateModal}
                            >
                                <Plus size={16} />
                                Create test
                            </button>
                        }
                    />
                ) : (
                    <TestCollection
                        tests={personalTests}
                        viewMode={viewMode}
                        personal
                        onEdit={openUpdateModal}
                        onDelete={handleDelete}
                    />
                ))}

            {activeTab === "completed" &&
                (completedTests.length === 0 ? (
                    <PageState
                        state="empty"
                        title="No completed tests"
                        description="Completed test attempts will appear here after practice."
                    />
                ) : (
                    <TestCollection
                        tests={completedTests}
                        viewMode={viewMode}
                    />
                ))}

            <TestFormModal
                open={modalOpen}
                mode={modalMode}
                form={form}
                formError={formError}
                onChange={setForm}
                onClose={() => setModalOpen(false)}
                onSubmit={handleSubmit}
            />
        </main>
    );
}
