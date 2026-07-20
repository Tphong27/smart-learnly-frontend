import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  ClipboardList,
  Info,
  Loader,
  Trash2,
} from "lucide-react";
import { Button } from "@/shared/components/ui";
import { classService } from "@/services";
import { ROLES } from "@/shared/constants/roles";
import { ClassStatusBadge } from "../components/ClassStatusBadge";
import { ClassOverviewTab } from "../components/ClassOverviewTab";
import { ClassCurriculumTab } from "../components/ClassCurriculumTab";
import { getCurrentRole } from "@/shared/utils/auth";

export function ClassDetailPage() {
  const { classId } = useParams();
  const navigate = useNavigate();

  const userRole = getCurrentRole();
  const isTrainer = userRole === ROLES.TRAINER;
  const isTmo = userRole === ROLES.TMO;

  const [classData, setClassData] = useState(null);
  // Cho phép deep-link đến 1 tab qua query string ?tab=curriculum (ví dụ khi
  // trang trainer lesson detail navigate về đây sau khi save).
  const [searchParams] = useSearchParams();
  const initialTab =
    searchParams.get("tab") === "curriculum" ? "curriculum" : "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  function reloadClass() {
    setLoading(true);
    setError("");
    setRefreshKey((current) => current + 1);
  }

  function openAnalytics() {
    navigate(`/staff/classrooms/${classId}/analytics`);
  }

  useEffect(() => {
    if (!classId) {
      return undefined;
    }

    let mounted = true;

    const request = isTrainer
      ? classService.getTrainer(classId)
      : classService.getAdmin(classId);

    request
      .then((data) => {
        if (!mounted) return;

        setClassData(data);
        setError("");
      })
      .catch((err) => {
        if (!mounted) return;

        setError(err.message || "Can not load class information");
        setClassData(null);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [classId, refreshKey, isTrainer]);

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

  function handleClassUpdated(updatedClass) {
    setClassData(updatedClass);
  }

  function openAssignments() {
    const params = new URLSearchParams();
    if (classData.courseId) {
      params.set("courseId", classData.courseId);
    }
    if (classId) {
      params.set("classId", classId);
    }
    const query = params.toString();
    navigate(`/staff/assignments${query ? `?${query}` : ""}`);
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

        {(isTrainer || isTmo) && (
          <div className="workspace-header__actions">
            <button
              className="class-analytics-button"
              type="button"
              onClick={openAnalytics}
            >
              <BarChart3 size={16} strokeWidth={2.2} />
              Analytics
            </button>

            <button
              className="class-assignment-button"
              type="button"
              onClick={openAssignments}
            >
              <ClipboardList size={16} strokeWidth={2.2} />
              Assignment
            </button>

            {isTmo && (
              <Button
                type="button"
                variant="delete"
                size="icon"
                title="Soft Delete"
                aria-label="Soft Delete class"
                onClick={deleteClass}
              >
                <Trash2 size={16} strokeWidth={2.2} />
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="form-error">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div
        className="workspace-tabs"
        role="tablist"
        aria-label="Class workspace tabs"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "overview"}
          className={
            activeTab === "overview"
              ? "workspace-tabs__item is-active"
              : "workspace-tabs__item"
          }
          onClick={() => setActiveTab("overview")}
        >
          <Info size={16} />
          Overview
        </button>
        {isTrainer && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "curriculum"}
            className={
              activeTab === "curriculum"
                ? "workspace-tabs__item is-active"
                : "workspace-tabs__item"
            }
            onClick={() => setActiveTab("curriculum")}
          >
            <BookOpen size={16} />
            Curriculum
          </button>
        )}
      </div>

      <div className="class-workspace-panel">
        {activeTab === "curriculum" && isTrainer ? (
          <ClassCurriculumTab classId={classId} />
        ) : (
          <ClassOverviewTab
            classData={classData}
            classId={classId}
            onClassUpdated={handleClassUpdated}
            readOnly={isTrainer}
          />
        )}
      </div>
    </section>
  );
}
