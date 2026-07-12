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
import { courseService } from "@/services/course.service";
import { classService } from "@/services/class.service";
import {
  assignmentService,
  testService,
} from "@/services/flashtest.service.js";
import { useToast } from "@/shared/components/ui";
import RichTextEditor from "@/shared/components/rich-text/RichTextEditor";
import { QuestionSelector } from "../components/QuestionSelector";
import "../flashtest.css";

function getCourseId(course) {
  return course?.id || course?.courseId || course?.uuid || "";
}

function getCourseTitle(course) {
  return (
    course?.title || course?.courseTitle || course?.name || "Untitled course"
  );
}

function getClassId(classItem) {
  return classItem?.id || classItem?.classId || "";
}

function getQuestionId(question) {
  return question?.id || question?.questionId || "";
}

function splitDuration(minutes) {
  const safeMinutes = Math.max(1, Number(minutes || 15));
  if (safeMinutes % 60 === 0) {
    return { value: String(safeMinutes / 60), unit: "hours" };
  }
  return { value: String(safeMinutes), unit: "minutes" };
}

function durationFromEssay(item) {
  const dueDate = item?.dueDate || item?.due_date;
  const baseTime =
    item?.updatedAt || item?.updated_at || item?.createdAt || item?.created_at;
  if (!dueDate || !baseTime) return 15;
  const diff = new Date(dueDate).getTime() - new Date(baseTime).getTime();
  return Number.isFinite(diff) ? Math.max(1, Math.round(diff / 60000)) : 15;
}

function onlyPositiveInteger(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return String(Math.max(1, Number(digits)));
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

export function StaffFlashTestCreatePage({ variant = "flash" }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { id, type } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const isFlashMode = variant === "flash";
  const isAssignmentMode = variant === "assignment";
  const routeCourseId = searchParams.get("courseId") || "";
  const routeClassId = searchParams.get("classId") || "";
  const returnParams = new URLSearchParams();
  if (routeCourseId) returnParams.set("courseId", routeCourseId);
  if (routeClassId) returnParams.set("classId", routeClassId);
  const basePath = isAssignmentMode
    ? "/staff/assignments"
    : isFlashMode ? "/staff/flashtests" : "/staff/tests";
  const returnPath = `${basePath}${returnParams.toString() ? `?${returnParams.toString()}` : ""}`;
  const pageName = isAssignmentMode ? "Assignment" : isFlashMode ? "Flash Test" : "Test";
  const [testType, setTestType] = useState(isFlashMode || isAssignmentMode ? "essay" : "mcq");
  const [formData, setFormData] = useState({
    title: "",
    durationValue: "15",
    durationUnit: "minutes",
    description: "",
    courseId: routeCourseId,
    classId: routeClassId,
  });
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [instructionFile, setInstructionFile] = useState(null);
  const [existingInstructionFile, setExistingInstructionFile] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(Boolean(id));
  const [isSaving, setIsSaving] = useState(false);
  const [customDurationOpen, setCustomDurationOpen] = useState(false);
  const [customDurationValue, setCustomDurationValue] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  const selectedDurationMinutes = Math.round(
    Number(formData.durationValue) *
      (DURATION_UNITS[formData.durationUnit] || 1),
  );
  const selectedPreset = DURATION_PRESETS.find(
    (preset) =>
      Number(preset.value) * (DURATION_UNITS[preset.unit] || 1) ===
      selectedDurationMinutes,
  );

  const updateFormData = (patch) => {
    setFormData((current) => ({ ...current, ...patch }));
    setValidationErrors((current) => {
      const next = { ...current };
      Object.keys(patch).forEach((key) => delete next[key]);
      if (patch.durationValue || patch.durationUnit) delete next.duration;
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    async function loadCourses() {
      try {
        const data = await courseService.listAdmin({ page: 0, size: 100 });
        const courseItems = Array.isArray(data?.items) ? data.items : [];
        if (!cancelled) {
          setCourses(courseItems.filter((course) => getCourseId(course)));
        }
      } catch (error) {
        console.error("Failed to load courses", error);
        if (!cancelled) setCourses([]);
      }
    }
    loadCourses();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAssignmentMode) {
      return undefined;
    }
    let cancelled = false;
    async function loadClasses() {
      try {
        const [trainerClassesResult, assignmentClassesResult] =
          await Promise.allSettled([
            classService.listTrainer({ page: 0, size: 100 }),
            assignmentService.getClasses({
              ...(formData.courseId && { courseId: formData.courseId }),
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
        const sourceClasses =
          trainerClasses.length > 0 ? trainerClasses : assignmentClasses;
        const data = sourceClasses.filter((classItem) => {
          const classId = getClassId(classItem);
          const classCourseId = classItem.courseId || classItem.course_id || "";
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
              current.classId && data.some((item) => getClassId(item) === current.classId)
                ? current.classId
                : getClassId(data[0]) || "",
          }));
        }
      } catch (error) {
        console.error("Failed to load assignment classes", error);
        if (!cancelled) setClasses([]);
      }
    }
    loadClasses();
    return () => {
      cancelled = true;
    };
  }, [formData.courseId, isAssignmentMode]);

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    async function loadExistingFlashTest() {
      setLoadingExisting(true);
      try {
        const normalizedType = isAssignmentMode
          ? "essay"
          : !isFlashMode
          ? "mcq"
          : type === "mcq" || type === "test" ? "mcq" : "essay";
        setTestType(normalizedType);

        if (normalizedType === "essay") {
          const assignment = await assignmentService.getById(id);
          const duration = splitDuration(durationFromEssay(assignment));
          if (cancelled) return;
          setFormData({
            title: assignment.title || assignment.name || "",
            durationValue: duration.value,
            durationUnit: duration.unit,
            description: assignment.description || "",
            courseId: assignment.courseId || routeCourseId || "",
            classId: assignment.classId || routeClassId || "",
          });
          setExistingInstructionFile(
            assignment.instructionFileUrl
              ? {
                  fileUrl: assignment.instructionFileUrl,
                  fileName:
                    assignment.instructionFileName || "Instruction file",
                }
              : null,
          );
        } else {
          const [test, mappings] = await Promise.all([
            testService.getById(id),
            testService.getStaffQuestions(id),
          ]);
          const duration = splitDuration(
            test.durationMinutes ?? test.duration_minutes ?? test.duration,
          );
          if (cancelled) return;
          setFormData({
            title: test.title || test.name || "",
            durationValue: duration.value,
            durationUnit: duration.unit,
            description: test.description || "",
            courseId: test.courseId || test.course_id || "",
            classId: routeClassId,
          });
          setSelectedQuestions(
            (mappings || []).map((mapping) => ({
              ...mapping,
              id: mapping.questionId || mapping.id,
            })),
          );
        }
      } catch (error) {
        console.error("Failed to load flash test", error);
        alert(error.message || "Could not load this flash test.");
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    }
    loadExistingFlashTest();
    return () => {
      cancelled = true;
    };
  }, [id, isAssignmentMode, isFlashMode, routeClassId, routeCourseId, type]);

  const handleSave = async () => {
    const duration = Math.round(
      Number(formData.durationValue) *
        (DURATION_UNITS[formData.durationUnit] || 1),
    );
    const nextErrors = {};
    if (!formData.title.trim()) {
      nextErrors.title = `Please enter the ${pageName.toLowerCase()} title.`;
    }
    if (!duration || duration <= 0) {
      nextErrors.duration = "Please enter a valid duration.";
    }
    if (testType === "mcq" && !formData.courseId) {
      nextErrors.courseId = "Please choose a course.";
    }
    if (isAssignmentMode && !formData.classId) {
      nextErrors.classId = "Please choose a class.";
    }
    if (testType === "mcq" && selectedQuestions.length === 0) {
      nextErrors.questions = "Please select at least one MCQ question.";
    }
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSaving(true);
    try {
      if (testType === "essay") {
        const uploadedInstruction = instructionFile
          ? await assignmentService.uploadFile(instructionFile)
          : null;
        const payload = {
          title: formData.title.trim(),
          description: formData.description,
          dueDate: new Date(Date.now() + duration * 60 * 1000).toISOString(),
          allowLateSubmission: false,
          instructionFileUrl:
            uploadedInstruction?.fileUrl || existingInstructionFile?.fileUrl,
          instructionFileName:
            uploadedInstruction?.fileName ||
            instructionFile?.name ||
            existingInstructionFile?.fileName,
          isFlashtest: isFlashMode,
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
          testType: "practice",
          maxAttempts: 1,
          showAnswersAfter: true,
        };
        if (isFlashMode) {
          testPayload.isFlashtest = true;
        }
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
          selectedQuestions.map((question) => getQuestionId(question)),
        );

        for (const mapping of existingMappings) {
          const questionId = getQuestionId(mapping);
          if (questionId && !selectedIds.has(questionId)) {
            await testService.removeQuestion(testId, questionId);
          }
        }

        for (let index = 0; index < selectedQuestions.length; index += 1) {
          const question = selectedQuestions[index];
          const questionId = getQuestionId(question);
          const payload = {
            testId,
            questionId,
            marks: question.marks || 1,
            orderIndex: index + 1,
          };
          if (existingIds.has(questionId)) {
            await testService.updateQuestionMarks(testId, questionId, payload);
          } else {
            await testService.addQuestion(payload);
          }
        }
      }

      toast.success(`${pageName} ${isEdit ? "updated" : "created"} successfully.`);
      navigate(returnPath);
    } catch (error) {
      console.error(error);
      toast.error(error.message || `Could not save ${pageName.toLowerCase()}.`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="ft-page ft-page--builder">
      <header className="ft-builder-hero">
        <div className="ft-builder-hero__content">
          <span className="ft-page-kicker">
            {isAssignmentMode ? "Assignments" : isFlashMode ? "Flash Tests" : "Tests"}
          </span>
          <h1 className="ft-page-title">
            {isEdit ? `Edit ${pageName}` : `Create ${pageName}`}
          </h1>
          <p className="ft-page-subtitle">
            {isAssignmentMode
              ? "Create an essay assignment for a class in this course."
              : isFlashMode
              ? "Create a timed essay assignment or a practice MCQ test for trainees."
              : "Create a timed MCQ test for trainees."}
          </p>
        </div>
        <div className="ft-toolbar ft-builder-hero__actions">
          <button
            className="ft-icon-button"
            type="button"
            title="Back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            className="ft-button ft-button--primary"
            type="button"
            disabled={isSaving || loadingExisting}
            onClick={handleSave}
          >
            <Save size={16} />
            {isSaving ? "Saving..." : isEdit ? `Update ${pageName}` : `Save ${pageName}`}
          </button>
        </div>
      </header>

      <div className="ft-panel ft-builder-shell">
        <div className="ft-ribbon" aria-label={`${pageName} setup summary`}>
          <div className="ft-ribbon__item is-active">
            <FileText size={18} />
            <div>
              <strong>Content</strong>
              <span>{testType === "essay" ? "Essay assignment" : "MCQ practice"}</span>
            </div>
          </div>
          <div className="ft-ribbon__item">
            <Clock size={18} />
            <div>
              <strong>Duration</strong>
              <span>
                {formData.durationValue || "Custom"}{" "}
                {formData.durationUnit === "hours" ? "hour(s)" : "minute(s)"}
              </span>
            </div>
          </div>
          <div className="ft-ribbon__item">
            <BookOpen size={18} />
            <div>
              <strong>Course</strong>
              <span>
                {isAssignmentMode
                  ? classes.find((item) => item.id === formData.classId)?.className || "Select class"
                  : testType === "mcq"
                  ? formData.courseId
                    ? getCourseTitle(
                        courses.find(
                          (course) => getCourseId(course) === formData.courseId,
                        ),
                      )
                    : "Select course"
                  : "Optional for essay"}
              </span>
            </div>
          </div>
          <div className="ft-ribbon__item">
            <CheckSquare size={18} />
            <div>
              <strong>{testType === "mcq" ? "Questions" : "Instructions"}</strong>
              <span>
                {testType === "mcq"
                  ? `${selectedQuestions.length} selected`
                  : instructionFile || existingInstructionFile
                    ? "File attached"
                    : "Text prompt"}
              </span>
            </div>
          </div>
        </div>

        <div className="ft-form">
          <label className="ft-field">
            <span className="ft-label">Title</span>
            <input
              className="ft-input"
              type="text"
              placeholder="Midterm quick practice"
              value={formData.title}
              onChange={(event) =>
                updateFormData({ title: event.target.value })
              }
            />
            {validationErrors.title && (
              <span className="ft-field-error">{validationErrors.title}</span>
            )}
          </label>

          <label className="ft-field">
            <span className="ft-label">Duration</span>
            <div className="ft-duration-control">
              <div className="ft-duration-presets">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={`${preset.value}-${preset.unit}`}
                    className={`ft-chip ${
                      selectedPreset?.value === preset.value &&
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
                    setCustomDurationValue(formData.durationValue);
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
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter minutes"
                      value={customDurationValue}
                      onChange={(event) =>
                        setCustomDurationValue(
                          onlyPositiveInteger(event.target.value),
                        )
                      }
                    />
                  </label>
                  <div className="ft-duration-popover__actions">
                    <button
                      className="ft-button ft-button--secondary"
                      type="button"
                      onClick={() => setCustomDurationOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="ft-button ft-button--primary"
                      type="button"
                      onClick={() => {
                        if (!customDurationValue) return;
                        updateFormData({
                          durationValue: customDurationValue,
                          durationUnit: "minutes",
                        });
                        setCustomDurationOpen(false);
                      }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
              {validationErrors.duration && (
                <span className="ft-field-error">{validationErrors.duration}</span>
              )}
            </div>
          </label>

          {isFlashMode && !isAssignmentMode && (
            <div className="ft-field">
              <span className="ft-label">Assessment type</span>
              <div className="ft-tabs">
                <button
                  className={`ft-tab ${testType === "essay" ? "is-active" : ""}`}
                  type="button"
                  disabled={isEdit}
                  onClick={() => setTestType("essay")}
                >
                  <FileText size={16} /> Essay assignment
                </button>
                <button
                  className={`ft-tab ${testType === "mcq" ? "is-active" : ""}`}
                  type="button"
                  disabled={isEdit}
                  onClick={() => setTestType("mcq")}
                >
                  <CheckSquare size={16} /> MCQ practice
                </button>
              </div>
            </div>
          )}

          {testType === "essay" ? (
            <>
              {isAssignmentMode && (
                <label className="ft-field">
                  <span className="ft-label">Class</span>
                  <select
                    className="ft-input"
                    value={formData.classId}
                    onChange={(event) =>
                      updateFormData({ classId: event.target.value })
                    }
                  >
                    <option value="">Select a class</option>
                    {classes.map((item) => (
                      <option key={getClassId(item)} value={getClassId(item)}>
                        {item.className || item.name || "Untitled class"}
                      </option>
                    ))}
                  </select>
                  {validationErrors.classId && (
                    <span className="ft-field-error">{validationErrors.classId}</span>
                  )}
                </label>
              )}

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
                <span className="ft-label">Instruction file</span>
                {instructionFile || existingInstructionFile ? (
                  <div className="ft-file-pill">
                    <Paperclip size={16} />
                    <span>
                      {instructionFile?.name ||
                        existingInstructionFile?.fileName}
                    </span>
                    <button
                      className="ft-icon-button"
                      type="button"
                      title="Remove file"
                      onClick={() => {
                        setInstructionFile(null);
                        setExistingInstructionFile(null);
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="ft-upload-zone ft-upload-zone--compact">
                    <Paperclip size={24} />
                    <strong>Attach an instruction file</strong>
                    <span className="ft-muted">
                      PDF, Word, PowerPoint, image, or ZIP.
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
                      hidden
                      onChange={(event) =>
                        setInstructionFile(event.target.files?.[0] || null)
                      }
                    />
                  </label>
                )}
              </div>
            </>
          ) : (
            <>
              <label className="ft-field">
                <span className="ft-label">Course</span>
                <select
                  className="ft-input"
                  value={formData.courseId}
                  onChange={(event) => {
                    updateFormData({ courseId: event.target.value });
                    setSelectedQuestions([]);
                    setValidationErrors((current) => {
                      const next = { ...current };
                      delete next.questions;
                      return next;
                    });
                  }}
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option
                      key={getCourseId(course)}
                      value={getCourseId(course)}
                    >
                      {getCourseTitle(course)}
                    </option>
                  ))}
                </select>
                {validationErrors.courseId && (
                  <span className="ft-field-error">{validationErrors.courseId}</span>
                )}
              </label>

              <div className="ft-field">
                <span className="ft-label">Question pool</span>
                <QuestionSelector
                  courseId={formData.courseId}
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
                  <span className="ft-field-error">{validationErrors.questions}</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
