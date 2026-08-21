import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
    ArrowLeft,
    BookOpen,
    CheckSquare,
    Clock,
    FileText,
    Paperclip,
    Save,
    X,
} from "lucide-react";
import { classroomService } from "@/features/classroom";
import { courseContentService } from "@/features/course";
import { assignmentService } from "@/features/assignment";
import { testService } from "../services/testService";
import {
    Alert,
    Button,
    IconButton,
    Input,
    RadioGroup,
    Select,
    Textarea,
    useToast,
} from "@/shared/components/ui";
import RichTextEditor from "@/shared/components/rich-text/RichTextEditor";
import { AssignmentAiDraftPanel } from "@/features/assignment/components/AssignmentAiDraftPanel";
import { QuestionSelector } from "../components/QuestionSelector";
import "../test.css";

/** Lấy ID class từ các response shape hiện có. */
function getClassId(classItem) {
    return classItem?.id || classItem?.classId || "";
}

/** Lấy ID module từ curriculum response. */
function getModuleId(module) {
    return module?.id || module?.moduleId || module?.sectionId || "";
}

/** Lấy tiêu đề module với fallback an toàn. */
function getModuleTitle(module) {
    return (
        module?.title ||
        module?.name ||
        module?.moduleTitle ||
        "Untitled module"
    );
}

/** Lấy ID question từ question-bank response. */
function getQuestionId(question) {
    return question?.id || question?.questionId || "";
}

/** Chuyển tổng phút sang giá trị và đơn vị phù hợp với form. */
function splitDuration(minutes) {
    const safeMinutes = Math.max(1, Number(minutes || 15));
    if (safeMinutes % 60 === 0) {
        return { value: String(safeMinutes / 60), unit: "hours" };
    }
    return { value: String(safeMinutes), unit: "minutes" };
}

/** Suy ra thời lượng essay từ thời điểm tạo và hạn nộp. */
function durationFromEssay(item) {
    const dueDate = item?.dueDate || item?.due_date;
    const baseTime =
        item?.updatedAt ||
        item?.updated_at ||
        item?.createdAt ||
        item?.created_at;
    if (!dueDate || !baseTime) return 15;
    const diff = new Date(dueDate).getTime() - new Date(baseTime).getTime();
    return Number.isFinite(diff) ? Math.max(1, Math.round(diff / 60000)) : 15;
}

/** Chuẩn hóa input duration thành số nguyên dương dạng chuỗi. */
function onlyPositiveInteger(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) return "";
    return String(Math.max(1, Number(digits)));
}

/** Chuyển ISO datetime thành giá trị datetime-local. */
function toDateTimeLocal(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
}

/** Chuyển datetime-local thành ISO hoặc null khi không hợp lệ. */
function toIsoDateTime(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const DURATION_UNITS = {
    minutes: 1,
    hours: 60,
};

const DURATION_PRESETS = [
    { label: "15 min", value: "15", unit: "minutes" },
    { label: "30 min", value: "30", unit: "minutes" },
    { label: "45 min", value: "45", unit: "minutes" },
];

/** Điều phối form tạo/sửa assignment. */
export function StaffAssessmentCreatePage({ variant = "assignment" }) {
    const navigate = useNavigate();
    const toast = useToast();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const isEdit = Boolean(id);
    const isAssignmentMode = variant !== "test";
    const routeCourseId = searchParams.get("courseId") || "";
    const routeClassId = searchParams.get("classId") || "";
    const returnParams = new URLSearchParams();
    if (routeCourseId) returnParams.set("courseId", routeCourseId);
    if (routeClassId) returnParams.set("classId", routeClassId);
    const basePath = isAssignmentMode ? "/staff/assignments" : "/staff/tests";
    const returnPath = `${basePath}${returnParams.toString() ? `?${returnParams.toString()}` : ""}`;
    const pageName = isAssignmentMode ? "Assignment" : "Test";
    const testType = isAssignmentMode ? "essay" : "mcq";
    const [formData, setFormData] = useState({
        title: "",
        durationValue: "15",
        durationUnit: "minutes",
        description: "",
        rubric: "",
        courseId: routeCourseId,
        moduleId: "all",
        isPublished: true,
        classId: routeClassId,
        opensAt: "",
        closesAt: "",
        accessCode: "",
    });
    const [modules, setModules] = useState([]);
    const [classes, setClasses] = useState([]);
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [instructionFile, setInstructionFile] = useState(null);
    const [existingInstructionFile, setExistingInstructionFile] =
        useState(null);
    const [loadingExisting, setLoadingExisting] = useState(Boolean(id));
    const [isSaving, setIsSaving] = useState(false);
    const [customDurationOpen, setCustomDurationOpen] = useState(false);
    const [customDurationValue, setCustomDurationValue] = useState("");
    const [validationErrors, setValidationErrors] = useState({});
    const [hasActiveAttempts, setHasActiveAttempts] = useState(false);

    const selectedDurationMinutes = Math.round(
        Number(formData.durationValue) *
            (DURATION_UNITS[formData.durationUnit] || 1),
    );
    const selectedPreset = DURATION_PRESETS.find(
        (preset) =>
            Number(preset.value) * (DURATION_UNITS[preset.unit] || 1) ===
            selectedDurationMinutes,
    );

    /** Ghép patch vào form và xóa validation errors liên quan. */
    const updateFormData = (patch) => {
        setFormData((current) => ({ ...current, ...patch }));
        setValidationErrors((current) => {
            const next = { ...current };
            Object.keys(patch).forEach((key) => delete next[key]);
            if (patch.durationValue || patch.durationUnit) delete next.duration;
            if (patch.opensAt !== undefined || patch.closesAt !== undefined) {
                delete next.schedule;
            }
            return next;
        });
    };

    useEffect(() => {
        if (testType !== "mcq" || !formData.courseId) {
            return undefined;
        }
        let cancelled = false;
        courseContentService
            .getCourseContent(formData.courseId)
            .then((items) => {
                if (!cancelled) {
                    setModules(
                        (Array.isArray(items) ? items : []).filter(getModuleId),
                    );
                }
            })
            .catch(() => {
                if (!cancelled) setModules([]);
            });
        return () => {
            cancelled = true;
        };
    }, [formData.courseId, testType]);

    useEffect(() => {
        let cancelled = false;
        /** Tải và hợp nhất danh sách class theo course đang chọn. */
        async function loadClasses() {
            try {
                const [trainerClassesResult, assignmentClassesResult] =
                    await Promise.allSettled([
                        classroomService.listTrainer({ page: 0, size: 100 }),
                        assignmentService.getClasses({
                            ...(formData.courseId && {
                                courseId: formData.courseId,
                            }),
                        }),
                    ]);
                const trainerClasses =
                    trainerClassesResult.status === "fulfilled"
                        ? trainerClassesResult.value?.content || []
                        : [];
                const assignmentClasses =
                    assignmentClassesResult.status === "fulfilled"
                        ? assignmentClassesResult.value || []
                        : [];
                const sourceClasses = Array.from(
                    new Map(
                        [...trainerClasses, ...assignmentClasses]
                            .filter((classItem) => getClassId(classItem))
                            .map((classItem) => [
                                getClassId(classItem),
                                classItem,
                            ]),
                    ).values(),
                );
                const data = sourceClasses.filter((classItem) => {
                    const classId = getClassId(classItem);
                    const classCourseId =
                        classItem.courseId || classItem.course_id || "";
                    return (
                        classId &&
                        (!formData.courseId ||
                            !classCourseId ||
                            String(classCourseId) === String(formData.courseId))
                    );
                });
                if (!cancelled) {
                    setClasses(data);
                    setFormData((current) => ({
                        ...current,
                        classId:
                            current.classId &&
                            data.some(
                                (item) => getClassId(item) === current.classId,
                            )
                                ? current.classId
                                : "",
                    }));
                }
            } catch (error) {
                console.error("Failed to load assignable classes", error);
                if (!cancelled) setClasses([]);
            }
        }
        loadClasses();
        return () => {
            cancelled = true;
        };
    }, [formData.courseId]);

    useEffect(() => {
        if (!id) return undefined;
        let cancelled = false;
        /** Tải assessment hiện tại và hydrate form khi ở chế độ edit. */
        async function loadExistingAssessment() {
            setLoadingExisting(true);
            try {
                const normalizedType = isAssignmentMode ? "essay" : "mcq";

                if (normalizedType === "essay") {
                    const assignment = await assignmentService.getById(id);
                    const duration = splitDuration(
                        durationFromEssay(assignment),
                    );
                    if (cancelled) return;
                    setFormData({
                        title: assignment.title || assignment.name || "",
                        durationValue: duration.value,
                        durationUnit: duration.unit,
                        description: assignment.description || "",
                        rubric: assignment.rubric || "",
                        moduleId: "all",
                        isPublished: true,
                        courseId: assignment.courseId || routeCourseId || "",
                        classId: assignment.classId || routeClassId || "",
                        opensAt: "",
                        closesAt: "",
                        accessCode: "",
                    });
                    setExistingInstructionFile(
                        assignment.instructionFileUrl
                            ? {
                                  fileUrl: assignment.instructionFileUrl,
                                  fileName:
                                      assignment.instructionFileName ||
                                      "Instruction file",
                              }
                            : null,
                    );
                } else {
                    const [test, mappings] = await Promise.all([
                        testService.getById(id),
                        testService.getStaffQuestions(id),
                    ]);
                    const duration = splitDuration(
                        test.durationMinutes ??
                            test.duration_minutes ??
                            test.duration,
                    );
                    if (cancelled) return;
                    setFormData({
                        title: test.title || test.name || "",
                        durationValue: duration.value,
                        durationUnit: duration.unit,
                        description: test.description || "",
                        rubric: "",
                        moduleId:
                            test.curriculumSectionId ||
                            test.curriculum_section_id ||
                            "all",
                        isPublished: test.isPublished !== false,
                        courseId: test.courseId || test.course_id || "",
                        classId: test.classId || test.class_id || routeClassId,
                        opensAt: toDateTimeLocal(test.opensAt),
                        closesAt: toDateTimeLocal(test.closesAt),
                        accessCode: test.accessCode || "",
                    });
                    setSelectedQuestions(
                        (mappings || []).map((mapping) => ({
                            ...mapping,
                            id: mapping.questionId || mapping.id,
                        })),
                    );
                    setHasActiveAttempts(
                        Boolean(
                            test.hasActiveAttempts ?? test.has_active_attempts,
                        ),
                    );
                }
            } catch (error) {
                console.error("Failed to load assessment", error);
                alert(error.message || "Could not load this assessment.");
            } finally {
                if (!cancelled) setLoadingExisting(false);
            }
        }
        loadExistingAssessment();
        return () => {
            cancelled = true;
        };
    }, [id, isAssignmentMode, routeClassId, routeCourseId]);

    /** Validate và lưu đúng payload theo loại assessment hiện tại. */
    const handleSave = async () => {
        const duration = Math.round(
            Number(formData.durationValue) *
                (DURATION_UNITS[formData.durationUnit] || 1),
        );
        const isAdjustingActiveDuration =
            testType === "mcq" && isEdit && hasActiveAttempts;
        const nextErrors = {};
        if (!isAdjustingActiveDuration && !formData.title.trim()) {
            nextErrors.title = `Please enter the ${pageName.toLowerCase()} title.`;
        }
        if (!duration || duration <= 0) {
            nextErrors.duration = "Please enter a valid duration.";
        }
        if (
            !isAdjustingActiveDuration &&
            testType === "mcq" &&
            !formData.courseId
        ) {
            nextErrors.courseId = "Please choose a course.";
        }
        if (!isAdjustingActiveDuration && !formData.classId) {
            nextErrors.classId = "Please choose a class.";
        }
        if (
            !isAdjustingActiveDuration &&
            testType === "mcq" &&
            selectedQuestions.length === 0
        ) {
            nextErrors.questions = "Please select at least one MCQ question.";
        }
        if (
            !isAdjustingActiveDuration &&
            testType === "mcq" &&
            formData.opensAt &&
            formData.closesAt &&
            new Date(formData.opensAt).getTime() >=
                new Date(formData.closesAt).getTime()
        ) {
            nextErrors.schedule = "Closing time must be after opening time.";
        }
        setValidationErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            return;
        }

        setIsSaving(true);
        try {
            if (isAdjustingActiveDuration) {
                await testService.updateDuration(id, duration);
            } else if (testType === "essay") {
                const uploadedInstruction = instructionFile
                    ? await assignmentService.uploadFile(instructionFile)
                    : null;
                const payload = {
                    title: formData.title.trim(),
                    description: formData.description,
                    rubric: formData.rubric,
                    dueDate: new Date(
                        Date.now() + duration * 60 * 1000,
                    ).toISOString(),
                    allowLateSubmission: false,
                    instructionFileUrl:
                        uploadedInstruction?.fileUrl ||
                        existingInstructionFile?.fileUrl,
                    instructionFileName:
                        uploadedInstruction?.fileName ||
                        instructionFile?.name ||
                        existingInstructionFile?.fileName,
                    courseId: formData.courseId || routeCourseId || undefined,
                    classId: formData.classId || undefined,
                };
                if (isEdit) {
                    await assignmentService.update(id, payload);
                } else {
                    await assignmentService.create(payload);
                }
            } else {
                const testPayload = {
                    title: formData.title.trim(),
                    durationMinutes: duration,
                    description: formData.description,
                    courseId: formData.courseId,
                    classId: formData.classId,
                    curriculumSectionId:
                        formData.moduleId === "all"
                            ? undefined
                            : formData.moduleId || undefined,
                    isPublished: formData.isPublished,
                    testType: "practice",
                    maxAttempts: 1,
                    showAnswersAfter: true,
                    opensAt: toIsoDateTime(formData.opensAt),
                    closesAt: toIsoDateTime(formData.closesAt),
                };
                const savedTest = isEdit
                    ? await testService.update(id, testPayload)
                    : await testService.create(testPayload);
                const testId = savedTest?.id || id;

                const existingMappings = isEdit
                    ? await testService.getStaffQuestions(testId)
                    : [];
                const existingIds = new Set(
                    (existingMappings || []).map((item) => getQuestionId(item)),
                );
                const selectedIds = new Set(
                    selectedQuestions.map((question) =>
                        getQuestionId(question),
                    ),
                );

                for (const mapping of existingMappings) {
                    const questionId = getQuestionId(mapping);
                    if (questionId && !selectedIds.has(questionId)) {
                        await testService.removeQuestion(testId, questionId);
                    }
                }

                for (
                    let index = 0;
                    index < selectedQuestions.length;
                    index += 1
                ) {
                    const question = selectedQuestions[index];
                    const questionId = getQuestionId(question);
                    const payload = {
                        testId,
                        questionId,
                        marks: question.marks || 1,
                        orderIndex: index + 1,
                    };
                    if (existingIds.has(questionId)) {
                        await testService.updateQuestionMarks(
                            testId,
                            questionId,
                            payload,
                        );
                    } else {
                        await testService.addQuestion(payload);
                    }
                }
            }

            toast.success(
                isAdjustingActiveDuration
                    ? `Active attempts now have ${duration} minute(s) remaining.`
                    : `${pageName} ${isEdit ? "updated" : "created"} successfully.`,
            );
            navigate(returnPath);
        } catch (error) {
            console.error(error);
            toast.error(
                error.message || `Could not save ${pageName.toLowerCase()}.`,
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="ft-page ft-page--builder">
            <header className="ft-builder-hero">
                <div className="ft-builder-hero__content">
                    <span className="ft-page-kicker">
                        {isAssignmentMode ? "" : "Tests"}
                    </span>
                    <h1 className="ft-page-title">
                        {isEdit ? `Edit ${pageName}` : `Create ${pageName}`}
                    </h1>
                    <p className="ft-page-subtitle" />
                </div>
                <div className="ft-toolbar ft-builder-hero__actions">
                    <IconButton
                        icon={<ArrowLeft size={18} />}
                        label="Back"
                        onClick={() => navigate(returnPath)}
                    />
                    <Button
                        leftIcon={<Save size={16} />}
                        loading={isSaving}
                        loadingLabel="Saving..."
                        disabled={loadingExisting}
                        onClick={handleSave}
                    >
                        {hasActiveAttempts
                            ? "Update remaining time"
                            : isEdit
                              ? `Update ${pageName}`
                              : `Save ${pageName}`}
                    </Button>
                </div>
            </header>

            <div
                className={`ft-panel ft-builder-shell ${
                    isAssignmentMode ? "ft-builder-shell--assignment" : ""
                }`}
            >
                {!isAssignmentMode && (
                    <div
                        className="ft-ribbon"
                        aria-label={`${pageName} setup summary`}
                    >
                        <div className="ft-ribbon__item">
                            <FileText size={18} />
                            <div>
                                <strong>Content</strong>
                            </div>
                        </div>
                        <div className="ft-ribbon__item">
                            <Clock size={18} />
                            <div>
                                <strong>Duration</strong>
                                <span>
                                    {formData.durationValue || "Custom"}{" "}
                                    {formData.durationUnit === "hours"
                                        ? "hour(s)"
                                        : "minute(s)"}
                                </span>
                            </div>
                        </div>
                        <div className="ft-ribbon__item">
                            <BookOpen size={18} />
                            <div>
                                <strong>Class</strong>
                                <span>
                                    {classes.find(
                                        (item) =>
                                            getClassId(item) ===
                                            formData.classId,
                                    )?.className || "Select class"}
                                </span>
                            </div>
                        </div>
                        <div className="ft-ribbon__item">
                            <CheckSquare size={18} />
                            <div>
                                <strong>
                                    {testType === "mcq"
                                        ? "Questions"
                                        : "Instructions"}
                                </strong>
                                <span>
                                    {testType === "mcq"
                                        ? `${selectedQuestions.length} selected`
                                        : instructionFile ||
                                            existingInstructionFile
                                          ? "File attached"
                                          : "Text prompt"}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <fieldset
                    className="ft-form ft-form-fieldset"
                    disabled={loadingExisting}
                    aria-busy={loadingExisting}
                >
                    {hasActiveAttempts && (
                        <Alert tone="warning" title="Test in progress">
                            Only duration can be changed right now. Active
                            attempts will receive the selected time starting
                            when you update.
                        </Alert>
                    )}

                    {!hasActiveAttempts && (
                        <div className="ft-field">
                            <Input
                                label="Title"
                                required
                                placeholder="Midterm quick practice"
                                value={formData.title}
                                onChange={(event) =>
                                    updateFormData({ title: event.target.value })
                                }
                                error={validationErrors.title}
                            />
                        </div>
                    )}

                    <label className="ft-field">
                        <span className="ft-label">
                            Duration{" "}
                            <span className="input-field__required">*</span>
                        </span>
                        <div className="ft-duration-control">
                            <div className="ft-duration-presets">
                                {DURATION_PRESETS.map((preset) => (
                                    <button
                                        key={`${preset.value}-${preset.unit}`}
                                        className={`ft-chip ${
                                            selectedPreset?.value ===
                                                preset.value &&
                                            selectedPreset?.unit === preset.unit
                                                ? "is-active"
                                                : ""
                                        }`}
                                        type="button"
                                        onClick={() => {
                                            updateFormData({
                                                durationValue: preset.value,
                                                durationUnit: preset.unit,
                                            });
                                            setCustomDurationOpen(false);
                                        }}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                                <button
                                    className={`ft-chip ft-chip--custom ${
                                        selectedPreset ? "" : "is-active"
                                    }`}
                                    type="button"
                                    onClick={() => {
                                        setCustomDurationValue(
                                            formData.durationValue,
                                        );
                                        setCustomDurationOpen((open) => !open);
                                    }}
                                >
                                    Custom
                                </button>
                                <span className="ft-duration-selected">
                                    ({selectedDurationMinutes || "--"}) minutes
                                </span>
                            </div>
                            {customDurationOpen && (
                                <div className="ft-duration-popover">
                                    <label>
                                        <span>Custom minutes</span>
                                        <Input
                                            label="Custom minutes"
                                            inputMode="numeric"
                                            placeholder="Enter minutes"
                                            value={customDurationValue}
                                            onChange={(event) =>
                                                setCustomDurationValue(
                                                    onlyPositiveInteger(
                                                        event.target.value,
                                                    ),
                                                )
                                            }
                                        />
                                    </label>
                                    <div className="ft-duration-popover__actions">
                                        <Button
                                            variant="secondary"
                                            onClick={() =>
                                                setCustomDurationOpen(false)
                                            }
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                if (!customDurationValue)
                                                    return;
                                                updateFormData({
                                                    durationValue:
                                                        customDurationValue,
                                                    durationUnit: "minutes",
                                                });
                                                setCustomDurationOpen(false);
                                            }}
                                        >
                                            Apply
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {validationErrors.duration && (
                                <span className="ft-field-error">
                                    {validationErrors.duration}
                                </span>
                            )}
                        </div>
                    </label>

                    {!hasActiveAttempts && <div className="ft-field">
                        <Select
                            label="Class"
                            required
                            value={formData.classId}
                            onChange={(event) => {
                                const nextClassId = event.target.value;
                                const selectedClass = classes.find(
                                    (item) => getClassId(item) === nextClassId,
                                );
                                const selectedCourseId =
                                    selectedClass?.courseId ||
                                    selectedClass?.course_id ||
                                    "";
                                updateFormData({
                                    classId: nextClassId,
                                    ...(!formData.courseId && selectedCourseId
                                        ? { courseId: selectedCourseId }
                                        : {}),
                                });
                            }}
                            disabled={testType === "mcq" && !formData.courseId}
                        >
                            <option value="">Select a class</option>
                            {classes.map((item) => (
                                <option
                                    key={getClassId(item)}
                                    value={getClassId(item)}
                                >
                                    {item.className ||
                                        item.name ||
                                        "Untitled class"}
                                </option>
                            ))}
                            error={validationErrors.classId}
                        </Select>
                    </div>}

                    {!hasActiveAttempts && (testType === "essay" ? (
                        <>
                            <label className="ft-field">
                                <span className="ft-label">Instructions</span>
                                <RichTextEditor
                                    value={formData.description}
                                    minHeight={180}
                                    placeholder="Write the essay description and submission instructions."
                                    onChange={(value) =>
                                        setFormData({
                                            ...formData,
                                            description: value,
                                        })
                                    }
                                />
                            </label>

                            <div className="ft-field">
                                <span className="ft-label">
                                    Instruction file
                                </span>
                                {instructionFile || existingInstructionFile ? (
                                    <div className="ft-file-pill">
                                        <Paperclip size={16} />
                                        <span>
                                            {instructionFile?.name ||
                                                existingInstructionFile?.fileName}
                                        </span>
                                        <IconButton
                                            icon={<X size={16} />}
                                            label="Remove file"
                                            onClick={() => {
                                                setInstructionFile(null);
                                                setExistingInstructionFile(
                                                    null,
                                                );
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <label className="ft-upload-zone ft-upload-zone--compact">
                                        <Paperclip size={24} />
                                        <strong>
                                            Attach an instruction file
                                        </strong>
                                        <span className="ft-muted">
                                            PDF, Word, PowerPoint, image, or
                                            ZIP.
                                        </span>
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
                                            hidden
                                            onChange={(event) =>
                                                setInstructionFile(
                                                    event.target.files?.[0] ||
                                                        null,
                                                )
                                            }
                                        />
                                    </label>
                                )}
                            </div>

                            <AssignmentAiDraftPanel
                                mode="assignment"
                                currentTitle={formData.title}
                                currentDescription={formData.description}
                                onDraftGenerated={({ rubric }) =>
                                    updateFormData({ rubric })
                                }
                            />

                            <div className="ft-field">
                                <Textarea
                                    label="Assignment rubrics"
                                    helperText="AI lists a separate, clearly labelled rubric for each generated assignment."
                                    rows={6}
                                    value={formData.rubric}
                                    placeholder="Rubric for assignment 1, rubric for assignment 2, and so on."
                                    onChange={(event) =>
                                        updateFormData({
                                            rubric: event.target.value,
                                        })
                                    }
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="ft-field">
                                <Select
                                    label="Module"
                                    value={formData.moduleId}
                                    onChange={(event) => {
                                        updateFormData({
                                            moduleId: event.target.value,
                                        });
                                        setSelectedQuestions([]);
                                    }}
                                    disabled={!formData.courseId}
                                >
                                    <option value="all">All modules</option>
                                    {modules.map((module) => (
                                        <option
                                            key={getModuleId(module)}
                                            value={getModuleId(module)}
                                        >
                                            {getModuleTitle(module)}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div className="ft-field">
                                <span className="ft-label">Status</span>
                                <RadioGroup
                                    name="test-status"
                                    value={
                                        formData.isPublished
                                            ? "active"
                                            : "inactive"
                                    }
                                    options={[
                                        { value: "active", label: "Active" },
                                        {
                                            value: "inactive",
                                            label: "Inactive",
                                        },
                                    ]}
                                    onChange={(value) =>
                                        updateFormData({
                                            isPublished: value === "active",
                                        })
                                    }
                                />
                            </div>

                            <div className="ft-field">
                                <Textarea
                                    label="Description"
                                    rows={5}
                                    value={formData.description}
                                    onChange={(event) =>
                                        updateFormData({
                                            description: event.target.value,
                                        })
                                    }
                                    placeholder="Describe this test."
                                />
                            </div>

                            <div className="ft-field">
                                <span className="ft-label">
                                    Question pool ({selectedQuestions.length}{" "}
                                    selected){" "}
                                    <span className="input-field__required">
                                        *
                                    </span>
                                </span>
                                <QuestionSelector
                                    courseId={formData.courseId}
                                    moduleId={formData.moduleId}
                                    selectedQuestions={selectedQuestions}
                                    onQuestionsChange={(nextQuestions) => {
                                        setSelectedQuestions(nextQuestions);
                                        setValidationErrors((current) => {
                                            const next = { ...current };
                                            delete next.questions;
                                            return next;
                                        });
                                    }}
                                />
                                {validationErrors.questions && (
                                    <span className="ft-field-error">
                                        {validationErrors.questions}
                                    </span>
                                )}
                            </div>
                        </>
                    ))}
                </fieldset>
            </div>
        </section>
    );
}
