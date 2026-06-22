import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Eye,
  Loader,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/shared/components/ui";
import { classService } from "@/services";
import { ROLES } from "@/shared/constants/roles";
import { ClassCard } from "../components/ClassCard";
import { ClassListFilters } from "../components/ClassListFilters";

function getCurrentRole() {
  try {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    return typeof user?.role === "string" ? user.role.toUpperCase() : "";
  } catch {
    return "";
  }
}

export function StaffClassListPage() {
  const navigate = useNavigate();

  const userRole = getCurrentRole();
  const isTmo = userRole === ROLES.TMO;

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(isTmo);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    page: 0,
    size: 15,
    keyword: "",
    status: "",
  });

  const [pageInfo, setPageInfo] = useState({
    page: 0,
    totalPages: 1,
    totalElements: 0,
  });

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function fetchClasses() {
      if (!isTmo) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await classService.listAdmin(filters);

        if (!mounted) return;

        setClasses(data.content);
        setPageInfo({
          page: data.page,
          totalPages: data.totalPages,
          totalElements: data.totalElements,
        });
      } catch (err) {
        if (!mounted) return;

        setError(err.message || "Error loading classes");
        setClasses([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchClasses();

    return () => {
      mounted = false;
    };
  }, [filters, refreshKey, isTmo]);

  function reloadClasses() {
    setRefreshKey((current) => current + 1);
  }

  const handleFilterChange = useCallback((nextFilters) => {
    setFilters((current) => {
      const next = {
        ...current,
        page: 0,
        keyword: nextFilters.keyword ?? "",
        status: nextFilters.status ?? "",
      };

      const isSameFilter =
        current.page === next.page &&
        current.keyword === next.keyword &&
        current.status === next.status;

      if (isSameFilter) {
        return current;
      }

      return next;
    });
  }, []);

  async function handleDeleteClass(classId) {
    const confirmed = window.confirm(
      "Are you sure you want to soft delete this class? Backend will soft delete the class.",
    );
    if (!confirmed) return;

    try {
      await classService.delete(classId);
      reloadClasses();
    } catch (err) {
      window.alert(err.message || "Error deleting class");
    }
  }

  function goToPage(page) {
    setFilters((current) => ({
      ...current,
      page,
    }));
  }

  if (!isTmo) {
    return (
      <section className="staff-class-router">
        <div className="section-header">
          <div>
            <h1>My Classes</h1>
            <p className="section-header__subtitle">
              The backend does not yet have an API for listing classes assigned
              to Trainers.
            </p>
          </div>
        </div>

        <div className="page-empty">
          <p>
            Trainer classroom functionality will be connected once the API is
            available.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="staff-class-router">
      <div className="section-header">
        <div>
          <h1>Class Management</h1>
        </div>

        <Button onClick={() => navigate("/staff/classrooms/create")}>
          <Plus size={18} />
          New Class
        </Button>
      </div>

      <ClassListFilters onFilterChange={handleFilterChange} />

      {loading && (
        <div className="page-loading">
          <Loader className="spinner" size={40} />
          <p>Loading class list...</p>
        </div>
      )}

      {!loading && error && (
        <div className="page-error">
          <AlertCircle size={24} />
          <p>{error}</p>
          <Button variant="secondary" onClick={reloadClasses}>
            Try Again
          </Button>
        </div>
      )}

      {!loading && !error && classes.length === 0 && (
        <div className="page-empty">
          <h2>No classes available</h2>
          <p>Create a new class or adjust the filters.</p>
        </div>
      )}

      {!loading && !error && classes.length > 0 && (
        <>
          <p className="class-result-count">
            Total classes: {pageInfo.totalElements}
          </p>

          <div className="classes-grid">
            {classes.map((classItem) => (
              <ClassCard
                key={classItem.id}
                {...classItem}
                onClick={() =>
                  navigate(`/staff/classrooms/${classItem.id}/workspace`)
                }
                actionButtons={
                  <>
                    <button
                      type="button"
                      className="btn-icon"
                      title="View Details"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/staff/classrooms/${classItem.id}/workspace`);
                      }}
                    >
                      <Eye size={18} />
                    </button>

                    <button
                      type="button"
                      className="btn-icon btn-icon--danger"
                      title="Soft Delete"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteClass(classItem.id);
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                }
              />
            ))}
          </div>

          {pageInfo.totalPages > 1 && (
            <div className="class-pagination">
              {Array.from({ length: pageInfo.totalPages }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  className={
                    index === pageInfo.page
                      ? "class-pagination__item is-active"
                      : "class-pagination__item"
                  }
                  onClick={() => goToPage(index)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
