import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Loader, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { classService } from "@/services";
import { ClassStatusBadge } from "../components/ClassStatusBadge";
import { ClassWorkspaceTabs } from "../components/ClassWorkspaceTabs";
import { ClassOverviewTab } from "../components/ClassOverviewTab";
import { ClassWorkspacePlaceholder } from "../components/ClassWorkspacePlaceholder";

export function TrainerClassWorkspacePage() {
  const { classId } = useParams();
  const navigate = useNavigate();

  const [classData, setClassData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [loading, setLoading] = useState(true);
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
  }, [classId, refreshKey]);

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

  function renderTabContent() {
    if (activeTab === "overview") {
      return (
        <ClassOverviewTab
          classData={classData}
          classId={classId}
          onClassUpdated={handleClassUpdated}
        />
      );
    }

    if (activeTab === "assignments") {
      return (
        <ClassWorkspacePlaceholder
          title="Assignments"
          description="Assignment management for this class will be connected when the backend classroom assignment API is available."
        />
      );
    }

    if (activeTab === "tests") {
      return (
        <ClassWorkspacePlaceholder
          title="Tests"
          description="Test management for this class will be connected when the backend classroom test API is available."
        />
      );
    }

    if (activeTab === "flashcards") {
      return (
        <ClassWorkspacePlaceholder
          title="Flashcards"
          description="Flashcard management for this class will be connected when the backend classroom flashcard API is available."
        />
      );
    }

    return null;
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

      <ClassWorkspaceTabs activeTab={activeTab} onChange={setActiveTab} />

      <div className="workspace-content">{renderTabContent()}</div>
    </section>
  );
}
