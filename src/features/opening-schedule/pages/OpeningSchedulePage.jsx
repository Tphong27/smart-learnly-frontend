import { AlertCircle, CalendarDays, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { openingScheduleService } from "@/services";
import { OpeningScheduleCard } from "../components/OpeningScheduleCard";
import { OpeningScheduleFilters } from "../components/OpeningScheduleFilters";
import "../opening-schedule.css";

const DEFAULT_FILTERS = {
  keyword: "",
  startFrom: "",
  startTo: "",
  minPrice: "",
  maxPrice: "",
};

export function OpeningSchedulePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState({
    keyword: searchParams.get("keyword") || "",
    startFrom: searchParams.get("startFrom") || "",
    startTo: searchParams.get("startTo") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
  });

  const [appliedFilters, setAppliedFilters] = useState(filters);

  const [classes, setClasses] = useState([]);

  const [page, setPage] = useState(Number(searchParams.get("page") || 0));

  const [pageInfo, setPageInfo] = useState({
    totalPages: 1,
    totalElements: 0,
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchSchedules() {
      try {
        const result = await openingScheduleService.list({
          ...appliedFilters,
          page,
          size: 12,
        });

        if (cancelled) {
          return;
        }

        setClasses(Array.isArray(result?.content) ? result.content : []);

        setPageInfo({
          totalPages: Number(result?.totalPages ?? 1),
          totalElements: Number(result?.totalElements ?? 0),
        });

        setError("");
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        setClasses([]);

        setPageInfo({
          totalPages: 1,
          totalElements: 0,
        });

        setError(requestError?.message || "Could not load opening schedule.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSchedules();

    return () => {
      cancelled = true;
    };
  }, [appliedFilters, page, refreshKey]);

  function updateUrl(nextFilters, nextPage) {
    const params = new URLSearchParams();

    Object.entries(nextFilters).forEach(([key, value]) => {
      if (value !== "") {
        params.set(key, value);
      }
    });

    if (nextPage > 0) {
      params.set("page", String(nextPage));
    }

    setSearchParams(params, {
      replace: true,
    });
  }

  function handleSearch() {

    setLoading(true);
    setError("");
    setPage(0);
    setAppliedFilters({
      ...filters,
    });
    updateUrl(filters, 0);
  }

  function handleReset() {
    setLoading(true);
    setError("");
    setFilters({
      ...DEFAULT_FILTERS,
    });
    setAppliedFilters({
      ...DEFAULT_FILTERS,
    });
    setPage(0);

    setSearchParams(
      {},
      {
        replace: true,
      },
    );
  }

  function handlePageChange(nextPage) {
    if (nextPage < 0 || nextPage >= pageInfo.totalPages || nextPage === page) {
      return;
    }

    setLoading(true);
    setError("");
    setPage(nextPage);

    updateUrl(appliedFilters, nextPage);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleRetry() {
    setLoading(true);
    setError("");

    setRefreshKey((current) => current + 1);
  }

  return (
    <main className="opening-page">
      <section className="opening-page__hero">
        <div>
          <span className="opening-page__eyebrow">Offline learning</span>

          <h1>Opening Schedule</h1>

          <p>
            Browse upcoming offline classes, compare schedules and trainers,
            then register for the class that matches your plan.
          </p>
        </div>

        <CalendarDays size={72} />
      </section>

      <OpeningScheduleFilters
        filters={filters}
        onChange={setFilters}
        onSubmit={handleSearch}
        onReset={handleReset}
      />

      {!loading && !error && (
        <div className="opening-page__result">
          <strong>{pageInfo.totalElements}</strong>

          {" upcoming classes"}
        </div>
      )}

      {loading && (
        <div className="opening-state">
          <LoaderCircle className="opening-spinner" size={38} />

          <p>Loading opening schedule...</p>
        </div>
      )}

      {!loading && error && (
        <div className="opening-state opening-state--error">
          <AlertCircle size={38} />

          <p>{error}</p>

          <button
            type="button"
            className="opening-button opening-button--primary"
            onClick={handleRetry}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && classes.length === 0 && (
        <div className="opening-state">
          <CalendarDays size={42} />

          <h2>No upcoming classes found</h2>

          <p>Change the filters or return later for new opening classes.</p>
        </div>
      )}

      {!loading && !error && classes.length > 0 && (
        <>
          <section className="opening-grid">
            {classes.map((classItem) => (
              <OpeningScheduleCard
                key={classItem.classId}
                classItem={classItem}
              />
            ))}
          </section>

          {pageInfo.totalPages > 1 && (
            <nav
              className="opening-pagination"
              aria-label="Opening schedule pages"
            >
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </button>

              {Array.from(
                {
                  length: pageInfo.totalPages,
                },
                (_, index) => (
                  <button
                    type="button"
                    key={index}
                    className={index === page ? "is-active" : ""}
                    onClick={() => handlePageChange(index)}
                  >
                    {index + 1}
                  </button>
                ),
              )}

              <button
                type="button"
                disabled={page >= pageInfo.totalPages - 1}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}