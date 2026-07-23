import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  AlertCircle,
  Loader,
} from "lucide-react";
import { Button } from "@/shared/components/ui";
import {
  classService,
  courseService,
} from "@/services";
import { useActiveTrainers } from "../hooks/useActiveTrainers";
import { useClassForm } from "../hooks/useClassForm";
import { getTodayDateKey } from "@/shared/utils/date";
import { WeeklySchedulePicker } from "../components/WeeklySchedulePicker";

function statusLabel(value) {
  if (!value) return "Upcoming";

  return String(value)
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1),
    )
    .join(" ");
}

function EditionClassForm({
  mode,
  initialData,
  classId,
}) {
  const navigate = useNavigate();
  const isEditMode = mode === "edit";

  const [courseResource, setCourseResource] =
    useState({
      loading: true,
      items: [],
      error: "",
    });

  const [statusResource, setStatusResource] =
    useState({
      loading: isEditMode,
      items: [],
      error: "",
    });

  const {
    trainers,
    loadingTrainers,
    trainerError,
  } = useActiveTrainers({
    autoLoad: true,
  });

  useEffect(() => {
    let cancelled = false;

    courseService
      .listAdmin({
        page: 0,
        size: 100,
      })
      .then((data) => {
        if (cancelled) return;

        const rawCourses =
          data?.items || data?.content || [];

        const publishedCourses =
          rawCourses.filter(
            (course) =>
              String(
                course.status || "",
              ).toLowerCase() === "published",
          );

        setCourseResource({
          loading: false,
          items: publishedCourses,
          error: "",
        });
      })
      .catch((error) => {
        if (cancelled) return;

        console.error(
          "Error loading courses:",
          error,
        );

        setCourseResource({
          loading: false,
          items: [],
          error:
            error?.message ||
            "Can not load courses",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isEditMode) {
      return undefined;
    }

    let cancelled = false;

    classService
      .listStatusOptions()
      .then((data) => {
        if (cancelled) return;

        setStatusResource({
          loading: false,
          items: Array.isArray(data) ? data : [],
          error: "",
        });
      })
      .catch((error) => {
        if (cancelled) return;

        console.error(
          "Error loading class statuses:",
          error,
        );

        setStatusResource({
          loading: false,
          items: [],
          error:
            error?.message ||
            "Can not load class statuses",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [isEditMode]);

  const displayedCourses = useMemo(() => {
    const courses = courseResource.items;

    if (
      !initialData?.courseId ||
      courses.some(
        (course) =>
          course.id === initialData.courseId,
      )
    ) {
      return courses;
    }

    return [
      {
        id: initialData.courseId,
        title:
          initialData.courseTitle ||
          "Current course",
      },
      ...courses,
    ];
  }, [courseResource.items, initialData]);

  const displayedTrainers = useMemo(() => {
    if (
      !initialData?.trainerId ||
      trainers.some(
        (trainer) =>
          trainer.id === initialData.trainerId,
      )
    ) {
      return trainers;
    }

    return [
      {
        id: initialData.trainerId,
        fullName:
          initialData.trainerName ||
          "Current trainer",
        email: "",
      },
      ...trainers,
    ];
  }, [initialData, trainers]);

  const displayedStatuses = useMemo(() => {
    if (!isEditMode) {
      return [
        {
          value: "upcoming",
          label: "Upcoming",
        },
      ];
    }

    const statuses = statusResource.items;
    const currentStatus = String(
      initialData?.status || "upcoming",
    ).toLowerCase();

    if (
      statuses.some(
        (status) =>
          status.value === currentStatus,
      )
    ) {
      return statuses;
    }

    return [
      {
        value: currentStatus,
        label: statusLabel(currentStatus),
      },
      ...statuses,
    ];
  }, [
    initialData,
    isEditMode,
    statusResource.items,
  ]);

  const handleSuccess = useCallback(
    (savedClass) => {
      if (isEditMode) {
        navigate(
          `/staff/classrooms/${
            savedClass?.id || classId
          }/workspace`,
          { replace: true },
        );
        return;
      }

      navigate("/staff/classrooms", {
        replace: true,
      });
    },
    [classId, isEditMode, navigate],
  );

  const form = useClassForm({
    mode,
    initialData,
    onSuccess: handleSuccess,
  });

  const minDate = isEditMode ? undefined : getTodayDateKey();

  const selectedStartDate =
    form.watch("startDate");

  const referenceDataLoading =
    courseResource.loading ||
    loadingTrainers ||
    (isEditMode && statusResource.loading);

  const referenceDataError =
    courseResource.error ||
    trainerError ||
    statusResource.error;

  const cancelPath = isEditMode
    ? `/staff/classrooms/${classId}/workspace`
    : "/staff/classrooms";

  return (
    <section className="tmo-create-class">
      <div className="section-header">
        <div>
          <h1>
            {isEditMode
              ? "Edit Class"
              : "Create Class"}
          </h1>
        </div>
      </div>

      <form
        onSubmit={form.onSubmit}
        className="class-form class-form--page"
      >
        {(form.submitError ||
          referenceDataError) && (
          <div className="form-error">
            <AlertCircle size={20} />

            <span>
              {form.submitError ||
                referenceDataError}
            </span>
          </div>
        )}

        <div className="form-section">
          <h3>Basic Information</h3>

          <div className="form-group">
            <label htmlFor="className">
              Class Name *
            </label>

            <input
              id="className"
              type="text"
              placeholder="Example: Java Advanced - Evening Class"
              {...form.register("className")}
              className={
                form.errors.className
                  ? "input-error"
                  : ""
              }
            />

            {form.errors.className && (
              <span className="form-error-text">
                {form.errors.className.message}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="courseId">
              Course *
            </label>

            <select
              id="courseId"
              {...form.register("courseId")}
              disabled={courseResource.loading}
              className={
                form.errors.courseId
                  ? "input-error"
                  : ""
              }
            >
              <option value="">
                Select Course
              </option>

              {displayedCourses.map((course) => (
                <option
                  key={course.id}
                  value={course.id}
                >
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
            <label htmlFor="trainerId">
              Trainer *
            </label>

            <select
              id="trainerId"
              {...form.register("trainerId")}
              disabled={loadingTrainers}
              className={
                form.errors.trainerId
                  ? "input-error"
                  : ""
              }
              aria-invalid={Boolean(
                form.errors.trainerId,
              )}
            >
              <option value="" disabled>
                Select Trainer
              </option>

              {!loadingTrainers &&
                displayedTrainers.length === 0 && (
                  <option value="" disabled>
                    No active trainers available
                  </option>
                )}

              {displayedTrainers.map(
                (trainer) => (
                  <option
                    key={trainer.id}
                    value={trainer.id}
                  >
                    {trainer.fullName ||
                      trainer.email}
                    {trainer.email
                      ? ` (${trainer.email})`
                      : ""}
                  </option>
                ),
              )}
            </select>

            {form.errors.trainerId && (
              <span className="form-error-text">
                {form.errors.trainerId.message}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="meetingUrl">
              Google Meet URL *
            </label>

            <input
              id="meetingUrl"
              type="url"
              placeholder="https://meet.google.com/abc-defg-hij"
              {...form.register("meetingUrl")}
              className={
                form.errors.meetingUrl
                  ? "input-error"
                  : ""
              }
            />

            {form.errors.meetingUrl && (
              <span className="form-error-text">
                {form.errors.meetingUrl.message}
              </span>
            )}

            <small>
              Create or copy a meeting link from{" "}
              <a
                href="https://meet.google.com/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Meet
              </a>
              .
            </small>
          </div>
        </div>

        <div className="form-section">
          <h3>Schedule and Configuration</h3>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">
                Start Date
              </label>

              <input
                id="startDate"
                type="date"
                min={minDate}
                {...form.register("startDate")}
                className={
                  form.errors.startDate
                    ? "input-error"
                    : ""
                }
              />

              {form.errors.startDate && (
                <span className="form-error-text">
                  {form.errors.startDate.message}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="endDate">
                End Date
              </label>

              <input
                id="endDate"
                type="date"
                min={
                  selectedStartDate ||
                  minDate
                }
                {...form.register("endDate")}
                className={
                  form.errors.endDate
                    ? "input-error"
                    : ""
                }
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
              <label htmlFor="price">
                Class price (VND) *
              </label>

              <input
                id="price"
                type="number"
                min="0"
                step="1000"
                placeholder="2500000"
                {...form.register("price", {
                  valueAsNumber: true,
                })}
                className={
                  form.errors.price
                    ? "input-error"
                    : ""
                }
              />

              {form.errors.price && (
                <span className="form-error-text">
                  {form.errors.price.message}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="maxStudents">
                Capacity *
              </label>

              <input
                id="maxStudents"
                type="number"
                min="1"
                max="500"
                {...form.register("maxStudents", {
                  valueAsNumber: true,
                })}
                className={
                  form.errors.maxStudents
                    ? "input-error"
                    : ""
                }
              />

              {form.errors.maxStudents && (
                <span className="form-error-text">
                  {
                    form.errors.maxStudents
                      .message
                  }
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="classStatus">
                Status
              </label>

              <select
                id="classStatus"
                {...form.register("status")}
                disabled={
                  !isEditMode ||
                  statusResource.loading
                }
              >
                {displayedStatuses.map(
                  (status) => (
                    <option
                      key={status.value}
                      value={status.value}
                    >
                      {status.label}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Schedule</label>

            <WeeklySchedulePicker
              control={form.control}
              name="scheduleDescription"
              error={
                form.errors.scheduleDescription
              }
            />
          </div>
        </div>

        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              navigate(cancelPath)
            }
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={
              form.isSubmitting ||
              referenceDataLoading
            }
          >
            {form.isSubmitting ? (
              <>
                <Loader
                  size={16}
                  className="spinner"
                />

                <span>
                  {isEditMode
                    ? "Saving..."
                    : "Creating..."}
                </span>
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

export function EditionClassPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(classId);

  const [classResource, setClassResource] =
    useState(() => ({
      classId: classId || null,
      status: isEditMode
        ? "loading"
        : "ready",
      data: null,
      error: "",
    }));

  useEffect(() => {
    if (!classId) {
      return undefined;
    }

    let cancelled = false;

    classService
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
          error:
            error?.message ||
            "Can not load class information",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [classId]);

  if (
    isEditMode &&
    (classResource.classId !== classId ||
      classResource.status === "loading")
  ) {
    return (
      <div className="page-loading">
        <Loader
          className="spinner"
          size={40}
        />
        <p>Loading class information...</p>
      </div>
    );
  }

  if (
    isEditMode &&
    classResource.status === "error"
  ) {
    return (
      <div className="page-error">
        <AlertCircle size={40} />
        <p>{classResource.error}</p>

        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            navigate(
              `/staff/classrooms/${classId}/workspace`,
            )
          }
        >
          Back to class
        </Button>
      </div>
    );
  }

  return (
    <EditionClassForm
      key={
        isEditMode
          ? `edit-${classId}`
          : "create"
      }
      mode={isEditMode ? "edit" : "create"}
      initialData={
        isEditMode
          ? classResource.data
          : null
      }
      classId={classId}
    />
  );
}