import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Loader, Save, SquarePen, Trash2, X } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { classService } from "@/services";
import {
  formatCapacity,
  formatDate,
  formatSchedule,
  formatVnd,
} from "../utils/classFormatter";
import { ClassStatusBadge } from "../components/ClassStatusBadge";

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
    maxStudents: classData.maxStudents || 30,
    price: classData.price || 100000,
  };
}

function toUpdatePayload(form) {
  return {
    className: form.className,
    trainerId: form.trainerId || null,
    scheduleDescription: form.scheduleDescription || null,
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    maxStudents: Number(form.maxStudents),
    price: Number(form.price),
  };
}

export function TrainerClassWorkspacePage() {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [classData, setClassData] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  function reloadClass() {
    setLoading(true);
    setError("");
    setRefreshKey((current) => current + 1);
  }

  useEffect(() => {
    if (!classId) {
      return undefined;
    }

    let mounted = true;

    classService
      .getAdmin(classId)
      .then((data) => {
        if (!mounted) return;

        setClassData(data);
        setEditForm(toEditForm(data));
        setError("");
      })
      .catch((err) => {
        if (!mounted) return;

        setError(err.message || "Can not load class information");
        setClassData(null);
        setEditForm(null);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [classId, refreshKey]);

  function updateField(key, value) {
    setEditForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function startEdit() {
    setEditForm(toEditForm(classData));
    setIsEditing(true);
  }

  function cancelEdit() {
    setEditForm(toEditForm(classData));
    setIsEditing(false);
  }

  async function saveChanges() {
    try {
      setSaving(true);
      setError("");

      const payload = toUpdatePayload(editForm);
      const updated = await classService.update(classId, payload);

      setClassData(updated);
      setEditForm(toEditForm(updated));
      setIsEditing(false);
    } catch (err) {
      setError(err.message || "Can not save changes");
    } finally {
      setSaving(false);
    }
  }

  async function deleteClass() {
    const confirmed = window.confirm(
      "Do you want to soft delete this class? This action cannot be undone.",
    );
    if (!confirmed) return;

    try {
      await classService.delete(classId);
      navigate("/staff/classrooms");
    } catch (err) {
      setError(err.message || "Can not delete class");
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <Loader className="spinner" size={40} />
        <p>Loading class information...</p>
      </div>
    );
  }

  if (error && !classData) {
    return (
      <div className="page-error">
        <AlertCircle size={48} />
        <p>{error}</p>
        <Button variant="secondary" onClick={reloadClass}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="page-error">
        <AlertCircle size={48} />
        <p>Class not found</p>
      </div>
    );
  }

  return (
    <section className="trainer-class-workspace">
      <div className="workspace-header">
        <div>
          <h1 className="workspace-header__title">{classData.className}</h1>

          <div className="workspace-header__info">
            <span>{classData.courseTitle}</span>
            <span>•</span>
            <ClassStatusBadge status={classData.status} />
          </div>
        </div>

        <div className="workspace-header__actions">
          {!isEditing ? (
            <Button onClick={startEdit}>
              <SquarePen size={16} />
            </Button>
          ) : (
            <>
              <Button type="button" onClick={saveChanges} disabled={saving}>
                <Save size={16} />
                {saving ? "Saving..." : "Save Changes"}
              </Button>

              <Button type="button" variant="secondary" onClick={cancelEdit}>
                <X size={16} />
                Cancel
              </Button>
            </>
          )}

          <Button type="button" variant="danger" onClick={deleteClass}>
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="form-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="workspace-content">
        <div className="class-detail-grid">
          <div className="class-detail-card">
            <h3>Class Information</h3>

            {!isEditing ? (
              <div className="class-detail-list">
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
                  <strong>Schedule:</strong>{" "}
                  {formatSchedule(classData.scheduleDescription)}
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
              <div className="class-form class-form--compact">
                <div className="form-group">
                  <label>Class Name</label>
                  <input
                    value={editForm.className}
                    onChange={(event) =>
                      updateField("className", event.target.value)
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Trainer UUID</label>
                  <input
                    value={editForm.trainerId}
                    onChange={(event) =>
                      updateField("trainerId", event.target.value)
                    }
                    placeholder="Có thể để trống"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(event) =>
                        updateField("startDate", event.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={editForm.endDate}
                      onChange={(event) =>
                        updateField("endDate", event.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Schedule</label>
                  <textarea
                    rows={3}
                    value={editForm.scheduleDescription}
                    onChange={(event) =>
                      updateField("scheduleDescription", event.target.value)
                    }
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Capacity</label>
                    <input
                      type="number"
                      min="1"
                      value={editForm.maxStudents}
                      onChange={(event) =>
                        updateField("maxStudents", event.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Price</label>
                    <input
                      type="number"
                      min="1"
                      step="1000"
                      value={editForm.price}
                      onChange={(event) =>
                        updateField("price", event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
