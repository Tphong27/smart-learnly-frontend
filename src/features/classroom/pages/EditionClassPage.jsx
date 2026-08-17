import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Loader, Video } from "lucide-react";
import { Button, useToast } from "@/shared/components/ui";
import { courseAdminService } from "@/features/course";
import { classroomService } from "../services/classroomService";
import { useActiveTrainers } from "../hooks/useActiveTrainers";
import { useClassForm } from "../hooks/useClassForm";
// import { getTodayDateKey } from "@/shared/utils/date";
import { WeeklySchedulePicker } from "../components/WeeklySchedulePicker";
import {
  getClassEditPolicy,
  normalizeClassStatus,
} from "../constants/classLifecycle";
import { ClassStatusBadge } from "../components/ClassStatusBadge";

function EditionClassForm({ mode, initialData, classId, routeBase }) {
  const navigate = useNavigate();
  const toast = useToast();
  const isEditMode = mode === "edit";

  const currentStatus = normalizeClassStatus(initialData?.status || "upcoming");
  const editPolicy = getClassEditPolicy(currentStatus);

  const [courseResource, setCourseResource] = useState({
    loading: true,
    items: [],
    error: "",
  });

  // const [statusResource, setStatusResource] = useState({
  //   loading: isEditMode,
  //   items: [],
  //   error: "",
  // });

  const { trainers, loadingTrainers, trainerError } = useActiveTrainers({
    autoLoad: true,
  });

  useEffect(() => {
    let cancelled = false;

    courseAdminService
      .list({
        page: 0,
        size: 100,
      })
      .then((data) => {
        if (cancelled) return;

        const rawCourses = data?.items || data?.content || [];

        const publishedCourses = rawCourses.filter(
          (course) => String(course.status || "").toLowerCase() === "published",
        );

        setCourseResource({
          loading: false,
          items: publishedCourses,
          error: "",
        });
      })
      .catch((error) => {
        if (cancelled) return;

        console.error("Error loading courses:", error);

        setCourseResource({
          loading: false,
          items: [],
          error: error?.message || "Can not load courses",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const displayedCourses = useMemo(() => {
    const courses = courseResource.items;

    if (
      !initialData?.courseId ||
      courses.some((course) => course.id === initialData.courseId)
    ) {
      return courses;
    }

    return [
      {
        id: initialData.courseId,
        title: initialData.courseTitle || "Current course",
      },
      ...courses,
    ];
  }, [courseResource.items, initialData]);

  const displayedTrainers = useMemo(() => {
    if (
      !initialData?.trainerId ||
      trainers.some((trainer) => trainer.id === initialData.trainerId)
    ) {
      return trainers;
    }

    return [
      {
        id: initialData.trainerId,
        fullName: initialData.trainerName || "Current trainer",
        email: "",
      },
      ...trainers,
    ];
  }, [initialData, trainers]);

  const handleSuccess = useCallback(
    (savedClass) => {
      if (isEditMode) {
        navigate(`${routeBase}/${savedClass?.id || classId}/workspace`, {
          replace: true,
        });
        return;
      }

      navigate(routeBase, {
        replace: true,
      });
    },
    [classId, isEditMode, navigate, routeBase],
  );

  const form = useClassForm({
    mode,
    initialData,
    onSuccess: handleSuccess,
  });

  const [meetingLinkState, setMeetingLinkState] = useState({
    loading: false,
    error: "",
  });

  const meetingUrl = form.watch("meetingUrl");

  async function handleGenerateMeetingUrl() {
    if (meetingLinkState.loading) {
      return;
    }

    setMeetingLinkState({
      loading: true,
      error: "",
    });

    try {
      const generated = await classroomService.generateMeetingUrl();

      if (!generated?.meetingUrl) {
        throw new Error("The server did not return a Google Meet URL");
      }

      form.setValue("meetingUrl", generated.meetingUrl, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });

      setMeetingLinkState({
        loading: false,
        error: "",
      });

      toast.success("Google Meet link generated. Save the class to keep it.");
    } catch (error) {
      const message =
        error?.message || "Could not generate a Google Meet link.";

      setMeetingLinkState({
        loading: false,
        error: message,
      });

      toast.error(message);
    }
  }

  const referenceDataLoading = courseResource.loading || loadingTrainers;
  const referenceDataError = courseResource.error || trainerError;

  const cancelPath = isEditMode
    ? `${routeBase}/${classId}/workspace`
    : routeBase;

  return (
    <section className="tmo-create-class">
      <div className="section-header">
        <div>
          <h1>{isEditMode ? "Edit Class" : "Create Class"}</h1>
        </div>
      </div>

      <form onSubmit={form.onSubmit} className="class-form class-form--page">
        {(form.submitError || referenceDataError) && (
          <div className="form-error">
            <AlertCircle size={20} />

            <span>{form.submitError || referenceDataError}</span>
          </div>
        )}

        <div className="form-section">
          <h3>Basic Information</h3>

          <div className="form-group">
            <label htmlFor="className">Class Name <span className="input-field__required" aria-hidden="true">*</span></label>

            <input
              id="className"
              type="text"
              readOnly={editPolicy.readOnly}
              className={form.errors.className ? "input-error" : ""}
              aria-invalid={Boolean(form.errors.className)}
              aria-describedby={
                form.errors.className ? "className-error" : undefined
              }
              {...form.register("className")}
            />

            {form.errors.className && (
              <span
                id="className-error"
                className="form-error-text"
                role="alert"
              >
                {form.errors.className.message}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="courseId">Course <span className="input-field__required" aria-hidden="true">*</span></label>

            <select
              id="courseId"
              disabled={courseResource.loading || editPolicy.readOnly}
              {...form.register("courseId")}
              className={form.errors.courseId ? "input-error" : ""}
            >
              <option value="">Select Course</option>

              {displayedCourses.map((course) => (
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
            <label htmlFor="trainerId">Trainer <span className="input-field__required" aria-hidden="true">*</span></label>

            <select
              id="trainerId"
              {...form.register("trainerId")}
              disabled={loadingTrainers}
              className={form.errors.trainerId ? "input-error" : ""}
              aria-invalid={Boolean(form.errors.trainerId)}
            >
              <option value="" disabled>
                Select Trainer
              </option>

              {!loadingTrainers && displayedTrainers.length === 0 && (
                <option value="" disabled>
                  No active trainers available
                </option>
              )}

              {displayedTrainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.fullName || trainer.email}
                  {trainer.email ? ` (${trainer.email})` : ""}
                </option>
              ))}
            </select>

            {form.errors.trainerId && (
              <span className="form-error-text">
                {form.errors.trainerId.message}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="meetingUrl">Google Meet URL <span className="input-field__required" aria-hidden="true">*</span></label>

            <div className="class-form__meeting-link-control">
              <input
                id="meetingUrl"
                type="url"
                readOnly={editPolicy.lockMeetingUrl}
                {...form.register("meetingUrl")}
              />

              <Button
                type="button"
                variant="secondary"
                loading={meetingLinkState.loading}
                loadingLabel="Generating..."
                leftIcon={<Video size={17} aria-hidden="true" />}
                onClick={handleGenerateMeetingUrl}
                disabled={meetingLinkState.loading || editPolicy.lockMeetingUrl}
              >
                {meetingUrl ? "Generate New Link" : "Generate Meet Link"}
              </Button>
            </div>

            {form.errors.meetingUrl && (
              <span className="form-error-text">
                {form.errors.meetingUrl.message}
              </span>
            )}

            {meetingLinkState.error && (
              <span className="form-error-text" role="alert">
                {meetingLinkState.error}
              </span>
            )}
          </div>
        </div>

        <div className="form-section">
          <h3>Schedule and Configuration</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Start Date <span className="input-field__required" aria-hidden="true">*</span></label>

              <input
                id="startDate"
                type="date"
                disabled={editPolicy.lockStartDate}
                {...form.register("startDate")}
              />

              {form.errors.startDate && (
                <span className="form-error-text">
                  {form.errors.startDate.message}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="endDate">End Date <span className="input-field__required" aria-hidden="true">*</span></label>

              <input
                id="endDate"
                type="date"
                disabled={editPolicy.lockEndDate}
                {...form.register("endDate")}
              />

              {form.errors.endDate && (
                <span className="form-error-text">
                  {form.errors.endDate.message}
                </span>
              )}
            </div>
          </div>

          <div className="form-row form-row--three-columns">
            <div className="form-group">
              <label htmlFor="price">Class price (VND) <span className="input-field__required" aria-hidden="true">*</span></label>

              <input
                id="price"
                type="number"
                readOnly={editPolicy.lockPrice}
                {...form.register("price", {
                  valueAsNumber: true,
                })}
              />

              {form.errors.price && (
                <span className="form-error-text">
                  {form.errors.price.message}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="maxStudents">Capacity <span className="input-field__required" aria-hidden="true">*</span></label>

              <input
                id="maxStudents"
                type="number"
                readOnly={editPolicy.lockCapacity}
                {...form.register("maxStudents", {
                  valueAsNumber: true,
                })}
              />

              {form.errors.maxStudents && (
                <span className="form-error-text">
                  {form.errors.maxStudents.message}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Status</label>
              <div className="class-status-readonly">
                <ClassStatusBadge status={currentStatus} />
                <small>Status is updated automatically.</small>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Schedule <span className="input-field__required" aria-hidden="true">*</span></label>

            <WeeklySchedulePicker
              control={form.control}
              name="scheduleDescription"
              error={form.errors.scheduleDescription}
              disabled={editPolicy.lockSchedule}
            />
          </div>
        </div>

        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(cancelPath)}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={
              form.isSubmitting ||
              referenceDataLoading ||
              meetingLinkState.loading ||
              editPolicy.readOnly
            }
          >
            {form.isSubmitting ? (
              <>
                <Loader size={16} className="spinner" />
                <span>{isEditMode ? "Saving..." : "Creating..."}</span>
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Create Class"
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}

export function EditionClassPage({ routeBase = "/staff/classrooms" }) {
  const { classId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(classId);

  const [classResource, setClassResource] = useState(() => ({
    classId: classId || null,
    status: isEditMode ? "loading" : "ready",
    data: null,
    error: "",
  }));

  useEffect(() => {
    if (!classId) {
      return undefined;
    }

    let cancelled = false;

    classroomService
      .getAdmin(classId)
      .then((data) => {
        if (cancelled) return;

        setClassResource({
          classId,
          status: "ready",
          data,
          error: "",
        });
      })
      .catch((error) => {
        if (cancelled) return;

        setClassResource({
          classId,
          status: "error",
          data: null,
          error: error?.message || "Can not load class information",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [classId]);

  if (
    isEditMode &&
    (classResource.classId !== classId || classResource.status === "loading")
  ) {
    return (
      <div className="page-loading">
        <Loader className="spinner" size={40} />
        <p>Loading class information...</p>
      </div>
    );
  }

  if (isEditMode && classResource.status === "error") {
    return (
      <div className="page-error">
        <AlertCircle size={40} />
        <p>{classResource.error}</p>

        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate(`${routeBase}/${classId}/workspace`)}
        >
          Back to class
        </Button>
      </div>
    );
  }

  return (
    <EditionClassForm
      key={isEditMode ? `edit-${classId}` : "create"}
      mode={isEditMode ? "edit" : "create"}
      initialData={isEditMode ? classResource.data : null}
      classId={classId}
      routeBase={routeBase}
    />
  );
}
