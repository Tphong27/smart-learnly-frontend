import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Loader } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { courseService } from "@/services";
import { useActiveTrainers } from "../hooks/useActiveTrainers";
import { useClassForm } from "../hooks/useClassForm";
import { todayString } from "../utils/classValidator";
import { WeeklySchedulePicker } from "../components/WeeklySchedulePicker";

export function TmoCreateClassPage() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const { trainers, loadingTrainers, reloadTrainers } = useActiveTrainers();

  const form = useClassForm(null, () => {
    navigate("/staff/classrooms");
  });

  const minDate = todayString();
  const selectedStartDate = form.watch("startDate");

  useEffect(() => {
    let mounted = true;

    async function fetchCourses() {
      try {
        setLoadingCourses(true);

        const data = await courseService.listAdmin({
          page: 0,
          size: 100,
        });

        if (mounted) {
          const rawCourses = data.items || data.content || [];

          const publishedCourses = rawCourses.filter((course) => {
            return String(course.status || "").toLowerCase() === "published";
          });

          setCourses(publishedCourses);
        }
      } catch (error) {
        console.error("Error loading courses:", error);
        if (mounted) {
          setCourses([]);
        }
      } finally {
        if (mounted) {
          setLoadingCourses(false);
        }
      }
    }

    fetchCourses();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    reloadTrainers();
  }, [reloadTrainers]);

  return (
    <section className="tmo-create-class">
      <div className="section-header">
        <div>
          <h1>Create Class</h1>
          <p>Set up a new class by providing the details below.</p>
        </div>
      </div>

      <div className="form-container">
        <form onSubmit={form.onSubmit} className="class-form">
          {form.submitError && (
            <div className="form-error">
              <AlertCircle size={20} />
              <span>{form.submitError}</span>
            </div>
          )}

          <div className="form-section">
            <h3>Basic Information</h3>

            <div className="form-group">
              <label htmlFor="className">Class Name *</label>
              <input
                id="className"
                type="text"
                placeholder="Example: Java Advanced - Evening Class"
                {...form.register("className")}
                className={form.errors.className ? "input-error" : ""}
              />
              {form.errors.className && (
                <span className="form-error-text">
                  {form.errors.className.message}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="courseId">Course *</label>
              <select
                id="courseId"
                {...form.register("courseId")}
                disabled={loadingCourses}
                className={form.errors.courseId ? "input-error" : ""}
              >
                <option value="">Select Course</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title || course.name}
                  </option>
                ))}
              </select>
              {form.errors.courseId && (
                <span className="form-error-text">
                  {form.errors.courseId.message}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="trainerId">Trainer</label>

              <select
                id="trainerId"
                {...form.register("trainerId")}
                disabled={loadingTrainers}
                className={form.errors.trainerId ? "input-error" : ""}
              >
                <option value="">Select Trainer</option>

                {!loadingTrainers && trainers.length === 0 && (
                  <option value="" disabled>
                    No active trainers available
                  </option>
                )}

                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.fullName || trainer.email} ({trainer.email})
                  </option>
                ))}
              </select>

              {form.errors.trainerId && (
                <span className="form-error-text">
                  {form.errors.trainerId.message}
                </span>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3>Schedule and Configuration</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate">Start Date</label>
                <input
                  id="startDate"
                  type="date"
                  min={minDate}
                  {...form.register("startDate")}
                  className={form.errors.startDate ? "input-error" : ""}
                />
                {form.errors.startDate && (
                  <span className="form-error-text">
                    {form.errors.startDate.message}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="endDate">End Date</label>
                <input
                  id="endDate"
                  type="date"
                  min={selectedStartDate || minDate}
                  {...form.register("endDate")}
                  className={form.errors.endDate ? "input-error" : ""}
                />
                {form.errors.endDate && (
                  <span className="form-error-text">
                    {form.errors.endDate.message}
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Schedule</label>
              <WeeklySchedulePicker
                control={form.control}
                name="scheduleDescription"
                error={form.errors.scheduleDescription}
              />
            </div>

            <div className="form-group">
              <label htmlFor="price">Class price (VND) *</label>

              <input
                id="price"
                type="number"
                min="0"
                step="1000"
                placeholder="Example: 2500000"
                {...form.register("price", {
                  valueAsNumber: true,
                })}
                className={form.errors.price ? "input-error" : ""}
              />

              {form.errors.price && (
                <span className="form-error-text">
                  {form.errors.price.message}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="maxStudents">Capacity *</label>
              <input
                id="maxStudents"
                type="number"
                min="1"
                max="500"
                {...form.register("maxStudents", {
                  valueAsNumber: true,
                })}
                className={form.errors.maxStudents ? "input-error" : ""}
              />
              {form.errors.maxStudents && (
                <span className="form-error-text">
                  {form.errors.maxStudents.message}
                </span>
              )}
            </div>
          </div>

          <div className="form-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/staff/classrooms")}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={form.isSubmitting}>
              {form.isSubmitting ? (
                <>
                  <Loader size={16} className="spinner" />
                  <span>Creating...</span>
                </>
              ) : (
                "Create Class"
              )}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
