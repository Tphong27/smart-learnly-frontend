import { AlertCircle, CalendarDays, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { openingScheduleService } from "@/services";
import { toNumber } from "@/shared/utils/formatters";
import { OpeningScheduleCard } from "../components/OpeningScheduleCard";
import { OpeningScheduleFilters } from "../components/OpeningScheduleFilters";
import { Pagination } from "@/shared/components/Pagination";
import {
  addOneMonthToDateValue,
  createDefaultOpeningScheduleFilters,
  getPriceRangeParams,
  isValidPriceRange,
} from "../utils/opening-schedule-filters";
import "../opening-schedule.css";

function readFiltersFromSearchParams(searchParams) {
  const defaults = createDefaultOpeningScheduleFilters();
  const startFrom = searchParams.get("startFrom") || defaults.startFrom;
  const startTo =
    searchParams.get("startTo") || addOneMonthToDateValue(startFrom);
  const requestedPriceRange = searchParams.get("priceRange") || "";

  return {
    keyword: searchParams.get("keyword") || "",
    startFrom,
    startTo,
    priceRange: isValidPriceRange(requestedPriceRange)
      ? requestedPriceRange
      : "",
  };
}

function normalizePage(value) {
  const requestedPage = toNumber(value, 0);

  return Number.isInteger(requestedPage) && requestedPage >= 0
    ? requestedPage
    : 0;
}

function validateFilters(filters) {
  if (!filters.startFrom) {
    return "Opening-from date is required.";
  }

  if (!filters.startTo) {
    return "Opening-to date is required.";
  }

  if (filters.startFrom > filters.startTo) {
    return "Opening-from date cannot be after opening-to date.";
  }

  if (!isValidPriceRange(filters.priceRange)) {
    return "Selected price range is invalid.";
  }

  return "";
}

function OpeningScheduleSkeleton({ count = 6 }) {
  return (
    <div className="opening-catalog-skeleton" role="status" aria-live="polite">
      <span className="sr-only">Loading opening schedule...</span>

      {Array.from({ length: count }, (_, index) => (
        <article
          className="opening-catalog-skeleton__card"
          key={index}
          aria-hidden="true"
        >
          <span className="opening-catalog-skeleton__image" />
          <div className="opening-catalog-skeleton__body">
            <span className="opening-catalog-skeleton__line opening-catalog-skeleton__line--short" />
            <span className="opening-catalog-skeleton__line" />
            <span className="opening-catalog-skeleton__line" />
            <span className="opening-catalog-skeleton__line opening-catalog-skeleton__line--price" />
          </div>
        </article>
      ))}
    </div>
  );
}

function OpeningSchedulePageContent({
  embedded = false,
  showHero = true,
  pageSize = 12,
  detailState,
  sharedKeyword = "",
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const syncWithUrl = !embedded;
  const initialFilters = syncWithUrl
    ? readFiltersFromSearchParams(searchParams)
    : {
        ...createDefaultOpeningScheduleFilters(),
        keyword: sharedKeyword,
      };
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
        const priceRange = getPriceRangeParams(appliedFilters.priceRange);

        const result = await openingScheduleService.list({
          keyword: appliedFilters.keyword,
          startFrom: appliedFilters.startFrom,
          startTo: appliedFilters.startTo,
          minPrice: priceRange.minPrice,
          maxPrice: priceRange.maxPrice,
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

    //Chỉ cuộn lên đầu khi Opening Schedule là một trang độc lập.
    if (!embedded) {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
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
          <h1>Opening Schedule</h1>
        </section>
      )}

      <section
        className={
          embedded
            ? "opening-panel opening-panel--embedded"
            : "opening-panel opening-panel--discovery"
        }
      >
        <OpeningScheduleFilters
          filters={filters}
          onChange={setFilters}
          showKeywordSearch={!embedded}
        />

        {filterError && (
          <p className="opening-filters__error" role="alert">
            {filterError}
          </p>
        )}

        {loading && !embedded && (
          <OpeningScheduleSkeleton count={Math.min(pageSize, 6)} />
        )}

        {loading && embedded && (
          <div className="opening-state" role="status" aria-live="polite">
            <LoaderCircle className="opening-spinner" size={32} />
            <p>Loading opening schedule...</p>
          </div>
        )}

        {!loading && error && (
          <div className="opening-state opening-state--error" role="alert">
            <AlertCircle size={36} />

            <h2>Opening schedule is unavailable</h2>

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
            <CalendarDays size={40} />

            <h2>No upcoming classes found</h2>

            <p>Try changing the filters or return later for new classes.</p>

            <button
              type="button"
              className="opening-button opening-button--secondary"
            >
              Clear filters
            </button>
          </div>
        )}

        {!loading && !error && classes.length > 0 && (
          <>
            <section
              className="opening-grid"
              aria-label="Upcoming offline classes"
            >
              {classes.map((classItem) => (
                <OpeningScheduleCard
                  key={classItem.classId}
                  classItem={classItem}
                  detailState={detailState}
                />
              ))}
            </section>

            <Pagination
              page={page + 1}
              totalPages={pageInfo.totalPages}
              totalItems={pageInfo.totalElements}
              size={pageSize}
              pageSizeOptions={[pageSize]}
              onPageChange={(nextPage) => handlePageChange(nextPage - 1)}
              disabled={loading}
              ariaLabel="Opening schedule pagination"
              className="opening-pagination"
            />
          </>
        )}
      </section>
    </>
  );

  if (embedded) {
    return <div className="opening-catalog-embedded">{content}</div>;
  }

  return <main className="opening-page">{content}</main>;
}

export function OpeningSchedulePage(props) {
  const [searchParams] = useSearchParams();
  const sharedKeyword = props.embedded
    ? (searchParams.get("keyword") || "").trim()
    : "";

  return (
    <OpeningSchedulePageContent
      key={`opening-schedule-${sharedKeyword}`}
      {...props}
      sharedKeyword={sharedKeyword}
    />
  );
}
