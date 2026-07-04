import { useState } from "react";
import { Edit3, Save, X } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { classService } from "@/services";
import { useActiveTrainers } from "../hooks/useActiveTrainers";
import { formatCapacity, formatDate } from "../utils/classFormatter";
import { ClassStatusBadge } from "./ClassStatusBadge";
import { ScheduleCalendar } from "./ScheduleCalendar";
import { WeeklyScheduleEditor } from "./WeeklySchedulePicker";

function toInputDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function toEditForm(classData) {
  return {
    className: classData.className || "",
    trainerId: classData.trainerId || "",
    scheduleDescription: classData.scheduleDescription || "",
    startDate: toInputDate(classData.startDate),
    endDate: toInputDate(classData.endDate),
    maxStudents: Number(classData.maxStudents || 30),
  };
}

function emptyToUndefined(value) {
  if (value === null || value === undefined) return undefined;

  const normalized = String(value).trim();
  return normalized === "" ? undefined : normalized;
}

function numberOrUndefined(value) {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return undefined;
  }

  return numericValue;
}

function toUpdatePayload(form, originalClassData) {
  const payload = {};

  const className = emptyToUndefined(form.className);
  if (className && className !== originalClassData.className) {
    payload.className = className;
  }

  const trainerId = emptyToUndefined(form.trainerId);
  const originalTrainerId = originalClassData.trainerId || undefined;
  if (trainerId !== originalTrainerId) {
    payload.trainerId = trainerId ?? null;
  }

  const scheduleDescription = emptyToUndefined(form.scheduleDescription);
  const originalScheduleDescription = emptyToUndefined(
    originalClassData.scheduleDescription,
  );
  if (scheduleDescription !== originalScheduleDescription) {
    payload.scheduleDescription = scheduleDescription ?? null;
  }

  const startDate = emptyToUndefined(form.startDate);
  const originalStartDate = emptyToUndefined(
    toInputDate(originalClassData.startDate),
  );
  if (startDate !== originalStartDate) {
    payload.startDate = startDate ?? null;
  }

  const endDate = emptyToUndefined(form.endDate);
  const originalEndDate = emptyToUndefined(
    toInputDate(originalClassData.endDate),
  );
  if (endDate !== originalEndDate) {
    payload.endDate = endDate ?? null;
  }

  const maxStudents = numberOrUndefined(form.maxStudents);
  if (
    maxStudents !== undefined &&
    maxStudents !== Number(originalClassData.maxStudents)
  ) {
    payload.maxStudents = maxStudents;
  }

  return payload;
}

function buildTrainerOptions(trainers, classData) {
  const safeTrainers = Array.isArray(trainers) ? trainers : [];

  if (!classData?.trainerId) {
    return safeTrainers;
  }

  const hasCurrentTrainer = safeTrainers.some(
    (trainer) => trainer.id === classData.trainerId,
  );

  if (hasCurrentTrainer) {
    return safeTrainers;
  }

  return [
    {
      id: classData.trainerId,
      fullName: classData.trainerName || "Current trainer",
      email: "",
      isCurrentTrainer: true,
    },
    ...safeTrainers,
  ];
}

export function ClassOverviewTab({ classData, classId, onClassUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(() => toEditForm(classData));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { trainers, loadingTrainers, reloadTrainers } = useActiveTrainers({
    autoLoad: false,
  });
  const trainerOptions = buildTrainerOptions(trainers, classData);

  function updateField(key, value) {
    setEditForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function startEdit() {
    setEditForm(toEditForm(classData));
    setError("");
    setIsEditing(true);
    reloadTrainers();
  }

  function cancelEdit() {
    setEditForm(toEditForm(classData));
    setError("");
    setIsEditing(false);
  }

  async function saveChanges() {
    try {
      setSaving(true);
      setError("");

      const payload = toUpdatePayload(editForm, classData);

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const updatedClass = await classService.update(classId, payload);

      onClassUpdated?.(updatedClass);
      setEditForm(toEditForm(updatedClass));
      setIsEditing(false);
    } catch (err) {
      console.error("Update class failed:", err);

      setError(err?.message || err?.error || "Can not save class changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="class-overview-tab">
      <section className="class-detail-card class-overview-tab__section">
        <div className="class-overview-card-header">
          <h3>Class Information</h3>

          {!isEditing ? (
            <Button
              type="button"
              variant="edit"
              size="sm"
              leftIcon={<Edit3 size={16} strokeWidth={2.2} />}
              onClick={startEdit}
            >
              Edit
            </Button>
          ) : (
            <div className="class-overview-card-header__actions">
              <Button
                type="button"
                variant="save"
                size="sm"
                loading={saving}
                loadingText="Saving..."
                leftIcon={<Save size={16} strokeWidth={2.2} />}
                onClick={saveChanges}
              >
                Save
              </Button>

              <Button
                type="button"
                variant="cancel"
                size="sm"
                leftIcon={<X size={16} strokeWidth={2.2} />}
                onClick={cancelEdit}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {error && <p className="form-error-text">{error}</p>}

        {!isEditing ? (
          <>
            <div className="class-detail-list class-overview-info">
              <p>
                <strong>Course:</strong> {classData.courseTitle}
              </p>

              <p>
                <strong>Trainer:</strong>{" "}
                {classData.trainerName || "Trainer not assigned"}
              </p>

              <p>
                <strong>Time:</strong> {formatDate(classData.startDate)} -{" "}
                {formatDate(classData.endDate)}
              </p>

              <p>
                <strong>Capacity:</strong>{" "}
                {formatCapacity(
                  classData.activeEnrollmentCount,
                  classData.maxStudents,
                )}
              </p>

              <p>
                <strong>Available Seats:</strong> {classData.availableSeats}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                <ClassStatusBadge status={classData.status} />
              </p>
            </div>

            <div className="class-overview-schedule">
              <h3>Schedule</h3>
              <ScheduleCalendar
                scheduleDescription={classData.scheduleDescription}
              />
            </div>
          </>
        ) : (
          <div className="class-form class-form--compact class-overview-edit-form">
            <div className="form-group">
              <label htmlFor="overviewClassName">Class Name</label>
              <input
                id="overviewClassName"
                value={editForm.className}
                onChange={(event) =>
                  updateField("className", event.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="overviewTrainerId">Trainer</label>

              <select
                id="overviewTrainerId"
                value={editForm.trainerId}
                disabled={loadingTrainers}
                onChange={(event) =>
                  updateField("trainerId", event.target.value)
                }
              >
                <option value="">Select Trainer</option>

                {!loadingTrainers && trainerOptions.length === 0 && (
                  <option value="" disabled>
                    No active trainers available
                  </option>
                )}

                {trainerOptions.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.fullName || trainer.email}
                    {trainer.email ? ` (${trainer.email})` : ""}
                    {trainer.isCurrentTrainer ? " - current" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="overviewStartDate">Start Date</label>
                <input
                  id="overviewStartDate"
                  type="date"
                  value={editForm.startDate}
                  onChange={(event) =>
                    updateField("startDate", event.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="overviewEndDate">End Date</label>
                <input
                  id="overviewEndDate"
                  type="date"
                  value={editForm.endDate}
                  onChange={(event) =>
                    updateField("endDate", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="overviewMaxStudents">Capacity</label>
              <input
                id="overviewMaxStudents"
                type="number"
                min="1"
                value={editForm.maxStudents}
                onChange={(event) =>
                  updateField("maxStudents", event.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label>Schedule</label>

              <WeeklyScheduleEditor
                value={editForm.scheduleDescription}
                onChange={(value) => updateField("scheduleDescription", value)}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
