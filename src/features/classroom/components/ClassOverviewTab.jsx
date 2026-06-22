import { useEffect, useState } from "react";
import { Save, X } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { classService, userService } from "@/services";
import { formatCapacity, formatDate, formatVnd } from "../utils/classFormatter";
import { ClassStatusBadge } from "./ClassStatusBadge";
import { ScheduleCalendar } from "./ScheduleCalendar";
import { WeeklySchedulePicker } from "./WeeklySchedulePicker";

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
    price: Number(classData.price || 100000),
  };
}

function toUpdatePayload(form) {
  return {
    className: form.className?.trim(),
    trainerId: form.trainerId || null,
    scheduleDescription: form.scheduleDescription || null,
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    maxStudents: Number(form.maxStudents),
    price: Number(form.price),
  };
}

export function ClassOverviewTab({ classData, classId, onClassUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(() => toEditForm(classData));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [trainers, setTrainers] = useState([]);
  const [loadingTrainers, setLoadingTrainers] = useState(false);

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

      const payload = toUpdatePayload(editForm);
      const updatedClass = await classService.update(classId, payload);

      onClassUpdated?.(updatedClass);
      setEditForm(toEditForm(updatedClass));
      setIsEditing(false);
    } catch (err) {
      setError(err.message || "Can not save class changes");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!isEditing) {
      return undefined;
    }

    let mounted = true;

    async function fetchActiveTrainers() {
      try {
        setLoadingTrainers(true);

        const data = await userService.listActiveTrainers({
          page: 0,
          size: 100,
        });

        if (mounted) {
          setTrainers(data.content || []);
        }
      } catch (err) {
        console.error("Error loading active trainers:", err);

        if (mounted) {
          setTrainers([]);
        }
      } finally {
        if (mounted) {
          setLoadingTrainers(false);
        }
      }
    }

    fetchActiveTrainers();

    return () => {
      mounted = false;
    };
  }, [isEditing]);

  return (
    <div className="class-overview-tab">
      <section className="class-detail-card class-overview-tab__section">
        <div className="class-overview-card-header">
          <h3>Class Information</h3>

          {!isEditing ? (
            <Button type="button" onClick={startEdit}>
              Edit
            </Button>
          ) : (
            <div className="class-overview-card-header__actions">
              <Button type="button" onClick={saveChanges} disabled={saving}>
                <Save size={16} />
                {saving ? "Saving..." : "Save"}
              </Button>

              <Button type="button" variant="secondary" onClick={cancelEdit}>
                <X size={16} />
                Cancel
              </Button>
            </div>
          )}
        </div>

        {error && <p className="form-error-text">{error}</p>}

        {!isEditing ? (
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
              <strong>Price:</strong> {formatVnd(classData.price)}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              <ClassStatusBadge status={classData.status} />
            </p>
          </div>



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

            <div className="form-row">
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
                <label htmlFor="overviewPrice">Price</label>
                <input
                  id="overviewPrice"
                  type="number"
                  min="1000"
                  step="1000"
                  value={editForm.price}
                  onChange={(event) => updateField("price", event.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Schedule</label>

              <WeeklySchedulePicker
                value={editForm.scheduleDescription}
                onChange={(value) => updateField("scheduleDescription", value)}
              />
            </div>
          </div>
        )}
      </section>

      <section className="class-detail-card class-overview-tab__section">
        <h3>Schedule</h3>
        <ScheduleCalendar scheduleDescription={classData.scheduleDescription} />
      </section>
    </div>
  );
}
