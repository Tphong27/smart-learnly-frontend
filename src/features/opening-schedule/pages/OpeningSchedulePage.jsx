import { AlertCircle, CalendarDays, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { openingScheduleService } from "@/services";
import { OpeningScheduleCard } from "../components/OpeningScheduleCard";
import { OpeningScheduleFilters } from "../components/OpeningScheduleFilters";
import { toNumber } from "@/shared/utils/formatters";
import "../opening-schedule.css";

const DEFAULT_FILTERS = {
  keyword: "",
  startFrom: "",
  startTo: "",
  minPrice: "",
  maxPrice: "",
};

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
  showFilters = true,
  showPagination = true,
  pageSize = 12,
  detailState,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const syncWithUrl = !embedded;
  const [filters, setFilters] = useState({
    keyword: syncWithUrl ? searchParams.get("keyword") || "" : "",
    startFrom: syncWithUrl ? searchParams.get("startFrom") || "" : "",
    startTo: syncWithUrl ? searchParams.get("startTo") || "" : "",
    minPrice: syncWithUrl ? searchParams.get("minPrice") || "" : "",
    maxPrice: syncWithUrl ? searchParams.get("maxPrice") || "" : "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [classes, setClasses] = useState([]);
  const requestedPage = syncWithUrl ? toNumber(searchParams.get("page"), 0) : 0;
  const [page, setPage] = useState(
    Number.isInteger(requestedPage) && requestedPage >= 0 ? requestedPage : 0,
  );
  const [pageInfo, setPageInfo] = useState({ totalPages: 1, totalElements: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const isInitialFilterRender = useRef(true);

  useEffect(() => {
    if (isInitialFilterRender.current) {
      isInitialFilterRender.current = false;
      return undefined;
    }

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
      setLoading(true);
      setError("");

      // Khi thay đổi filter phải quay về trang đầu tiên.
      setPage(0);

      // appliedFilters thay đổi làm effect gọi API chạy lại.
      setAppliedFilters(nextFilters);

      // Embedded catalog trên Home Page không thay đổi URL.
      if (syncWithUrl) {
        const params = new URLSearchParams();

        Object.entries(nextFilters).forEach(([key, value]) => {
          if (value !== "") {
            params.set(key, value);
          }
        });

        setSearchParams(params, {
          replace: true,
        });
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [filters, setSearchParams, syncWithUrl]);

  useEffect(() => {
    let cancelled = false;

    async function fetchSchedules() {
      try {
        const result = await openingScheduleService.list({
          ...appliedFilters,
          page,
          size: pageSize,
        });

        if (cancelled) {
          return;
        }

        setClasses(Array.isArray(result?.content) ? result.content : []);

        setPageInfo({
          totalPages: toNumber(result?.totalPages, 1),
          totalElements: toNumber(result?.totalElements, 0),
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
  }, [appliedFilters, page, pageSize, refreshKey]);

  function updateUrl(nextFilters, nextPage) {
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
  }

  function handleReset() {
    setError("");
    setFilterError("");

    setFilters({
      ...DEFAULT_FILTERS,
    });
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

      {showFilters && (
        <>
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
        </>
      )}

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
                detailState={detailState}
              />
            ))}
          </section>

          {showPagination && pageInfo.totalPages > 1 && (
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
    </>
  );

  if (embedded) {
    return <div className="opening-catalog-embedded">{content}</div>;
  }

  return <main className="opening-page">{content}</main>;
}
