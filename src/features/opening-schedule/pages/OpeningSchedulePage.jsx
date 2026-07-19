import { AlertCircle, CalendarDays, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { openingScheduleService } from "@/services";
import { toNumber } from "@/shared/utils/formatters";
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

function readFiltersFromSearchParams(searchParams) {
  return {
    keyword: searchParams.get("keyword") || "",
    startFrom: searchParams.get("startFrom") || "",
    startTo: searchParams.get("startTo") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
  };
}

function normalizePage(value) {
  const requestedPage = toNumber(value, 0);

  return Number.isInteger(requestedPage) && requestedPage >= 0
    ? requestedPage
    : 0;
}

function validateFilters(filters) {
  if (
    filters.startFrom &&
    filters.startTo &&
    filters.startFrom > filters.startTo
  ) {
    return "Opening-from date cannot be after opening-to date.";
  }

  const hasMinPrice = filters.minPrice !== "";
  const hasMaxPrice = filters.maxPrice !== "";
  const minPrice = hasMinPrice ? Number(filters.minPrice) : null;
  const maxPrice = hasMaxPrice ? Number(filters.maxPrice) : null;

  if (
    (hasMinPrice && (!Number.isFinite(minPrice) || minPrice < 0)) ||
    (hasMaxPrice && (!Number.isFinite(maxPrice) || maxPrice < 0))
  ) {
    return "Price must be a non-negative number.";
  }

  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    return "Minimum price cannot exceed maximum price.";
  }

  return "";
}

export function OpeningSchedulePage({
  embedded = false,
  showHero = true,
  pageSize = 12,
  detailState,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const syncWithUrl = !embedded;
  const initialFilters = syncWithUrl
    ? readFiltersFromSearchParams(searchParams)
    : { ...DEFAULT_FILTERS };
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

  const [page, setPage] = useState(() => {
    if (!syncWithUrl) {
      return 0;
    }

    return normalizePage(searchParams.get("page"));
  });

  const [classes, setClasses] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    totalPages: 1,
    totalElements: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const previousFiltersRef = useRef(filters);

  const updateUrl = useCallback(
    (nextFilters, nextPage) => {
      if (!syncWithUrl) {
        return;
      }

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
    },
    [setSearchParams, syncWithUrl],
  );

  useEffect(() => {
    if (previousFiltersRef.current === filters) {
      return undefined;
    }
    previousFiltersRef.current = filters;

    const timer = window.setTimeout(() => {
      const nextFilters = {
        ...filters,
        keyword: filters.keyword.trim(),
      };

      const validationMessage = validateFilters(nextFilters);

      if (validationMessage) {
        setFilterError(validationMessage);

        return;
      }

      setFilterError("");
      setError("");
      setLoading(true);
      setPage(0);
      setAppliedFilters(nextFilters);

      if (syncWithUrl) {
        updateUrl(nextFilters, 0);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [filters, syncWithUrl, updateUrl]);

  useEffect(() => {
    if (!syncWithUrl) {
      return undefined;
    }
    function handlePopState() {
      const params = new URLSearchParams(window.location.search);
      const nextPage = normalizePage(params.get("page"));
      setPage((currentPage) =>
        currentPage === nextPage ? currentPage : nextPage,
      );
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [syncWithUrl]);

  useEffect(() => {
    let cancelled = false;

    async function fetchSchedules() {
      setLoading(true);
      setError("");

      try {
        const result = await openingScheduleService.list({
          ...appliedFilters,
          page,
          size: pageSize,
        });

        if (cancelled) {
          return;
        }

        const nextClasses = Array.isArray(result?.content)
          ? result.content
          : [];

        const totalElements = Math.max(0, toNumber(result?.totalElements, 0));

        const totalPages = Math.max(1, toNumber(result?.totalPages, 1));

        if (page >= totalPages && totalElements > 0) {
          const lastPage = totalPages - 1;
          setPage(lastPage);
          if (syncWithUrl) {
            updateUrl(appliedFilters, lastPage);
          }
          return;
        }

        setClasses(nextClasses);
        setPageInfo({
          totalPages,
          totalElements,
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
  }, [appliedFilters, page, pageSize, refreshKey, syncWithUrl, updateUrl]);

  function handleReset() {
    setError("");
    setFilterError("");
    setFilters({
      ...DEFAULT_FILTERS,
    });
  }

  function handlePageChange(nextPage) {
    const isInvalidPage =
      !Number.isInteger(nextPage) ||
      nextPage < 0 ||
      nextPage >= pageInfo.totalPages ||
      nextPage === page;

    if (isInvalidPage) {
      return;
    }

    setLoading(true);
    setError("");
    setPage(nextPage);

    if (syncWithUrl) {
      updateUrl(appliedFilters, nextPage);
    }

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

  const content = (
    <>
      {showHero && (
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
      )}

      <OpeningScheduleFilters
        filters={filters}
        onChange={setFilters}
        onReset={handleReset}
      />

      {filterError && (
        <p className="opening-filters__error" role="alert">
          {filterError}
        </p>
      )}

      {!loading && !error && (
        <div className="opening-page__result">
          <strong>{pageInfo.totalElements}</strong>

          {" upcoming classes"}
        </div>
      )}

      {loading && (
        <div className="opening-state" role="status" aria-live="polite">
          <LoaderCircle className="opening-spinner" size={38} />

          <p>Loading opening schedule...</p>
        </div>
      )}

      {!loading && error && (
        <div className="opening-state opening-state--error" role="alert">
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
                detailState={detailState}
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
                    aria-current={index === page ? "page" : undefined}
                    aria-label={`Go to page ${index + 1}`}
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
    </>
  );

  if (embedded) {
    return <div className="opening-catalog-embedded">{content}</div>;
  }

  return <main className="opening-page">{content}</main>;
}
