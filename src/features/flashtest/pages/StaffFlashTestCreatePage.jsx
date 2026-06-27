import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckSquare, FileText, Save } from "lucide-react";
import { courseService } from "@/services/course.service";
import {
  assignmentService,
  testService,
} from "@/services/flashtest.service.js";
import { QuestionSelector } from "../components/QuestionSelector";
import "../flashtest.css";

function getCourseId(course) {
  return course?.id || course?.courseId || course?.uuid || "";
}

function getCourseTitle(course) {
  return course?.title || course?.courseTitle || course?.name || "Untitled course";
}

function getQuestionId(question) {
  return question?.id || question?.questionId || "";
}

export function StaffFlashTestCreatePage() {
  const navigate = useNavigate();
  const [testType, setTestType] = useState("essay");
  const [formData, setFormData] = useState({
    title: "",
    duration: "",
    description: "",
    courseId: "",
  });
  const [courses, setCourses] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = async () => {
    const duration = Number(formData.duration);
    if (!formData.title.trim() || !duration || duration <= 0) {
      alert("Please enter a title and a valid duration.");
      return;
    }
    if (testType === "mcq" && !formData.courseId) {
      alert("Please choose a course before selecting MCQ questions.");
      return;
    }
    if (testType === "mcq" && selectedQuestions.length === 0) {
      alert("Please select at least one question for the MCQ test.");
      return;
    }

    setIsSaving(true);
    try {
      if (testType === "essay") {
        await assignmentService.create({
          title: formData.title.trim(),
          description: formData.description,
          dueDate: new Date(Date.now() + duration * 60 * 1000).toISOString(),
          allowLateSubmission: false,
          isFlashtest: true,
        });
      } else {
        const newTest = await testService.create({
          title: formData.title.trim(),
          durationMinutes: duration,
          description: formData.description,
          courseId: formData.courseId,
          testType: "practice",
          maxAttempts: 1,
          showAnswersAfter: true,
          isFlashtest: true,
        });

        for (let index = 0; index < selectedQuestions.length; index += 1) {
          const question = selectedQuestions[index];
          await testService.addQuestion({
            testId: newTest.id,
            questionId: getQuestionId(question),
            marks: question.marks || 1,
            orderIndex: index + 1,
          });
        }
      }

      alert("Flash test created successfully.");
      navigate("/staff/flashtests");
    } catch (error) {
      console.error(error);
      alert(error.message || "Could not create flash test.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="ft-page">
      <header className="ft-page-header">
        <div>
          <span className="ft-page-kicker">Flash Tests</span>
          <h1 className="ft-page-title">Create Flash Test</h1>
          <p className="ft-page-subtitle">
            Create a timed essay assignment or a practice MCQ test for trainees.
          </p>
        </div>
        <div className="ft-toolbar">
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
            disabled={isSaving}
            onClick={handleSave}
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Save Test"}
          </button>
        </div>
      </header>

      <div className="ft-panel">
        <div className="ft-form">
          <label className="ft-field">
            <span className="ft-label">Title</span>
            <input
              className="ft-input"
              type="text"
              placeholder="Midterm quick practice"
              value={formData.title}
              onChange={(event) =>
                setFormData({ ...formData, title: event.target.value })
              }
            />
          </label>

          <label className="ft-field">
            <span className="ft-label">Duration (minutes)</span>
            <input
              className="ft-input"
              type="number"
              min="1"
              placeholder="15"
              value={formData.duration}
              onChange={(event) =>
                setFormData({ ...formData, duration: event.target.value })
              }
            />
          </label>

          <div className="ft-field">
            <span className="ft-label">Assessment type</span>
            <div className="ft-tabs">
              <button
                className={`ft-tab ${testType === "essay" ? "is-active" : ""}`}
                type="button"
                onClick={() => setTestType("essay")}
              >
                <FileText size={16} /> Essay assignment
              </button>
              <button
                className={`ft-tab ${testType === "mcq" ? "is-active" : ""}`}
                type="button"
                onClick={() => setTestType("mcq")}
              >
                <CheckSquare size={16} /> MCQ practice
              </button>
            </div>
          </div>

          {testType === "essay" ? (
            <label className="ft-field">
              <span className="ft-label">Prompt / instructions</span>
              <textarea
                className="ft-textarea"
                placeholder="Write the essay prompt and submission instructions."
                value={formData.description}
                onChange={(event) =>
                  setFormData({ ...formData, description: event.target.value })
                }
              />
            </label>
          ) : (
            <>
              <label className="ft-field">
                <span className="ft-label">Course</span>
                <select
                  className="ft-input"
                  value={formData.courseId}
                  onChange={(event) => {
                    setFormData({ ...formData, courseId: event.target.value });
                    setSelectedQuestions([]);
                  }}
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={getCourseId(course)} value={getCourseId(course)}>
                      {getCourseTitle(course)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="ft-field">
                <span className="ft-label">Question pool</span>
                <QuestionSelector
                  courseId={formData.courseId}
                  selectedQuestions={selectedQuestions}
                  onQuestionsChange={setSelectedQuestions}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
