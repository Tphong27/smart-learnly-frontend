import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Loader, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { classService } from "@/services";
import { normalizeRole, ROLES } from "@/shared/constants/roles";
import { ClassCard } from "../components/ClassCard";
import { ClassListFilters } from "../components/ClassListFilters";

function getCurrentRole() {
  try {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    return normalizeRole(user?.role) || "";
  } catch {
    return "";
  }
}

export function StaffClassListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const courseIdFilter = searchParams.get("courseId") || "";

  const userRole = getCurrentRole();
  const isTmo = userRole === ROLES.TMO;
  const isTrainer = userRole === ROLES.TRAINER;

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    page: 0,
    size: 15,
    keyword: "",
    status: "",
    courseId: courseIdFilter,
  });

  const [pageInfo, setPageInfo] = useState({
    page: 0,
    totalPages: 1,
    totalElements: 0,
  });

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setFilters((current) => {
      if (current.courseId === courseIdFilter) {
        return current;
      }

      return {
        ...current,
        page: 0,
        courseId: courseIdFilter,
      };
    });
  }, [courseIdFilter]);

  useEffect(() => {
    let mounted = true;

    async function fetchClasses() {
      try {
        setLoading(true);
        setError("");

        const data = isTrainer
          ? await classService.listTrainer(filters)
          : await classService.listAdmin(filters);

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
  }, [filters, refreshKey, isTrainer]);

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
        courseId: nextFilters.courseId ?? "",
      };

      const isSameFilter =
        current.page === next.page &&
        current.keyword === next.keyword &&
        current.status === next.status &&
        current.courseId === next.courseId;

      if (isSameFilter) {
        return current;
      }

      return next;
    });
  }, []);

  const handleClearCourseFilter = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("courseId");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

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

  const pageTitle = isTrainer ? "My Assigned Classes" : "Class Management";
  const emptyTitle = isTrainer ? "No assigned classes" : "No classes available";
  const emptyDescription = isTrainer
    ? "You do not have any assigned classes yet."
    : "Create a new class or adjust the filters.";

  return (
    <section className="staff-class-router">
      <div className="section-header">
        <div>
          <h1>{pageTitle}</h1>
          {isTrainer && (
            <p className="section-header__subtitle">
              View the classes assigned to your trainer account.
            </p>
          )}
        </div>

        {isTmo && (
          <Button
            type="button"
            variant="create"
            size="sm"
            leftIcon={<Plus size={16} strokeWidth={2.4} />}
            onClick={() => navigate("/staff/classrooms/create")}
          >
            New Class
          </Button>
        )}
      </div>

      <ClassListFilters
        initialCourseId={courseIdFilter}
        onClearCourseFilter={handleClearCourseFilter}
        onFilterChange={handleFilterChange}
      />

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
          <h2>{emptyTitle}</h2>
          <p>{emptyDescription}</p>
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
                  isTmo ? (
                    <Button
                      type="button"
                      variant="delete"
                      size="xs-icon"
                      title="Soft Delete"
                      aria-label="Soft Delete class"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteClass(classItem.id);
                      }}
                    >
                      <Trash2 size={16} strokeWidth={2.2} />
                    </Button>
                  ) : null
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