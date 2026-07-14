import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { courseService } from "@/services";
import { CourseCard } from "../components/CourseCard";
import { CourseCatalogFilterMenu } from "../components/CourseCatalogFilterMenu";
import {
  CourseCatalogActions,
  CourseCatalogToolbar,
} from "../components/CourseCatalogToolbar";
import { CourseFilters } from "../components/CourseFilters";
import { CourseListToolbar } from "../components/CourseListToolbar";
import "../course.css";
import "./CourseListPage.css";

const DEFAULT_PAGE_SIZE = 3;

const PRICE_RANGES = {
  FREE: { minPrice: 0, maxPrice: 0 },
  UNDER_500K: { minPrice: 1, maxPrice: 500000 },
  BETWEEN_500K_AND_1M: { minPrice: 500000, maxPrice: 1000000 },
  OVER_1M: { minPrice: 1000001 },
};

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, value) => ({
      type: "page",
      value,
    }));
  }

  const pageSet = new Set([0, totalPages - 1]);
  const windowStart = currentPage <= 2 ? 1 : currentPage - 1;
  const windowEnd = currentPage >= totalPages - 3 ? totalPages - 2 : currentPage + 1;

  for (let value = windowStart; value <= windowEnd; value += 1) {
    if (value > 0 && value < totalPages - 1) pageSet.add(value);
  }

  const pages = Array.from(pageSet).sort((left, right) => left - right);
  const items = [];

  pages.forEach((value, index) => {
    const previous = pages[index - 1];
    if (index > 0 && value - previous > 1) {
      items.push({ type: "ellipsis", key: `ellipsis-${previous}-${value}` });
    }
    items.push({ type: "page", value });
  });

  return items;
}

function CourseCatalogSkeleton() {
  return (
    <div className="course-catalog-skeleton" role="status" aria-live="polite">
      <span className="sr-only">Loading courses...</span>
      {["one", "two", "three", "four", "five", "six"].map((item) => (
        <div className="course-catalog-skeleton__card" key={item} aria-hidden="true">
          <span className="course-catalog-skeleton__image" />
          <span className="course-catalog-skeleton__line course-catalog-skeleton__line--short" />
          <span className="course-catalog-skeleton__line" />
          <span className="course-catalog-skeleton__line" />
          <span className="course-catalog-skeleton__line course-catalog-skeleton__line--price" />
        </div>
      ))}
    </div>
  );
}

export function CourseListPage({
  embedded = false,
  showHero = true,
  pageSize = DEFAULT_PAGE_SIZE,
  showToolbar = true,
  showFilters = true,
  detailState,
  excludeEnrolled = false,
  cardVariant = "default",
  showAdvancedFilters = false,
}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    page: 0,
    size: pageSize,
    totalElements: 0,
    totalPages: 1,
  });
  const [viewMode, setViewMode] = useState(
    localStorage.getItem("courseViewMode") || "grid",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  function hasAccessToken() {
    const token = localStorage.getItem("accessToken");
    return token && token !== "undefined" && token !== "null";
  }

  const keyword = searchParams.get("keyword") || "";
  const categorySlug = searchParams.get("categorySlug") || "";
  const priceRange = searchParams.get("priceRange") || "";
  const onSale = searchParams.get("onSale") === "true";
  const featured = searchParams.get("featured") === "true";
  const sort = searchParams.get("sort") || "POPULAR";
  const requestedPage = Number(searchParams.get("page") || 0);
  const page =
    Number.isInteger(requestedPage) && requestedPage >= 0 ? requestedPage : 0;
  const priceFilter = PRICE_RANGES[priceRange] || {};

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      try {
        const data = await courseService.getCategories();
        if (mounted) {
          setCategories(Array.isArray(data) ? data : []);
        }
      } catch {
        if (mounted) {
          setCategories([]);
        }
      }
    }

    loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadAllCatalogExcludingEnrolled({
      currentPage,
      size,
      keyword,
      categorySlug,
      minPrice,
      maxPrice,
      onSale,
      featured,
      sort,
    }) {
      const enrolledIds = hasAccessToken()
        ? await courseService.getMyEnrolledCourseIds()
        : new Set();

      const allItems = [];
      let backendPage = 0;
      let hasMorePages = true;

      while (hasMorePages) {
        const pageData = await courseService.getPublicCoursesWithDetails({
          page: backendPage,
          size,
          keyword,
          categorySlug,
          minPrice,
          maxPrice,
          onSale,
          featured,
          sort,
        });

        const pageItems = Array.isArray(pageData.items) ? pageData.items : [];

        allItems.push(...pageItems);

        const totalPages = Number(pageData.totalPages || 1);

        backendPage += 1;
        hasMorePages = backendPage < totalPages;
      }

      const uniqueItemsMap = new Map();

      allItems.forEach((course) => {
        const key = course.id || course.slug;

        if (key) {
          uniqueItemsMap.set(key, course);
        }
      });

      const uniqueItems = Array.from(uniqueItemsMap.values());

      const filteredItems = uniqueItems.filter((course) => {
        return !enrolledIds.has(course.id);
      });

      const totalElements = filteredItems.length;
      const totalPages = Math.max(1, Math.ceil(totalElements / size));

      const safePage = Math.min(currentPage, totalPages - 1);
      const startIndex = safePage * size;
      const endIndex = startIndex + size;

      return {
        items: filteredItems.slice(startIndex, endIndex),
        page: safePage,
        size,
        totalElements,
        totalPages,
      };
    }

    async function loadCourses() {
      setLoading(true);
      setError("");

      try {
        let data;

        if (excludeEnrolled) {
          data = await loadAllCatalogExcludingEnrolled({
            currentPage: page,
            size: pageSize,
            keyword,
            categorySlug,
            minPrice: priceFilter.minPrice,
            maxPrice: priceFilter.maxPrice,
            onSale,
            featured,
            sort,
          });
        } else {
          data = await courseService.getPublicCoursesWithDetails({
            page,
            size: pageSize,
            keyword,
            categorySlug,
            minPrice: priceFilter.minPrice,
            maxPrice: priceFilter.maxPrice,
            onSale,
            featured,
            sort,
          });
        }

        if (mounted) {
          setCourses(Array.isArray(data.items) ? data.items : []);
          setPageInfo(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err?.message || "Can not load courses right now.");
          setCourses([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadCourses();

    return () => {
      mounted = false;
    };
  }, [
    keyword,
    categorySlug,
    page,
    pageSize,
    excludeEnrolled,
    priceFilter.maxPrice,
    priceFilter.minPrice,
    onSale,
    featured,
    sort,
    retryKey,
  ]);

  function updateQuery(nextValues) {
    const next = {
      keyword,
      categorySlug,
      priceRange,
      onSale: onSale ? "true" : "",
      featured: featured ? "true" : "",
      sort: sort === "POPULAR" ? "" : sort,
      page: String(page),
      ...nextValues,
    };

    Object.keys(next).forEach((key) => {
      if (!next[key] || next[key] === "0" || next[key] === "POPULAR") {
        delete next[key];
      }
    });

    setSearchParams(next);
  }

  function handleKeywordChange(value) {
    updateQuery({
      keyword: value,
      page: "0",
    });
  }

  function handleCategoryChange(value) {
    updateQuery({
      categorySlug: value,
      page: "0",
    });
  }

  function handlePriceRangeChange(value) {
    updateQuery({
      priceRange: value,
      page: "0",
    });
  }

  function handleSaleChange(value) {
    updateQuery({
      onSale: value ? "true" : "",
      page: "0",
    });
  }

  function handleFeaturedChange(value) {
    updateQuery({
      featured: value ? "true" : "",
      page: "0",
    });
  }

  function handleSortChange(value) {
    updateQuery({
      sort: value === "POPULAR" ? "" : value,
      page: "0",
    });
  }

  function clearAdvancedFilters() {
    updateQuery({
      categorySlug: "",
      priceRange: "",
      onSale: "",
      featured: "",
      sort: "",
      page: "0",
    });
  }

  function handleViewModeChange(mode) {
    setViewMode(mode);
    localStorage.setItem("courseViewMode", mode);
  }

  const paginationItems = useMemo(
    () => getPaginationItems(pageInfo.page, pageInfo.totalPages),
    [pageInfo.page, pageInfo.totalPages],
  );
  const discoveryMode = !embedded;
  const hasCatalogFilters = Boolean(
    keyword ||
      categorySlug ||
      priceRange ||
      onSale ||
      featured ||
      sort !== "POPULAR",
  );

  function clearCatalogMenuFilters() {
    updateQuery({
      priceRange: "",
      onSale: "",
      featured: "",
      page: "0",
    });
  }

  function clearAllCatalogFilters() {
    updateQuery({
      keyword: "",
      categorySlug: "",
      priceRange: "",
      onSale: "",
      featured: "",
      sort: "",
      page: "0",
    });
  }

  const content = (
    <>
      {showHero && (
        <section className="course-hero course-hero--catalog">
          <h1>Course Catalog</h1>
          <p>
            Explore practical courses and find the right next step for your
            learning goals.
          </p>
        </section>
      )}

      <section
        className={
          embedded
            ? "course-panel course-panel--embedded"
            : "course-panel course-panel--discovery"
        }
      >
        {(showFilters || showToolbar) && discoveryMode && (
          <div className="course-catalog-search-row">
            {showFilters && (
              <>
                <CourseFilters
                  key={keyword}
                  keyword={keyword}
                  categorySlug={categorySlug}
                  categories={categories}
                  onKeywordChange={handleKeywordChange}
                  onCategoryChange={handleCategoryChange}
                  debounceMs={350}
                  showCategory={false}
                />
                <CourseCatalogFilterMenu
                  priceRange={priceRange}
                  onPriceRangeChange={handlePriceRangeChange}
                  onSale={onSale}
                  onSaleChange={handleSaleChange}
                  featured={featured}
                  onFeaturedChange={handleFeaturedChange}
                  onClearFilters={clearCatalogMenuFilters}
                />
              </>
            )}
            {showToolbar && (
              <CourseCatalogActions
                sort={sort}
                onSortChange={handleSortChange}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
              />
            )}
          </div>
        )}

        {showFilters && !discoveryMode && (
          <CourseFilters
            keyword={keyword}
            categorySlug={categorySlug}
            categories={categories}
            onKeywordChange={handleKeywordChange}
            onCategoryChange={handleCategoryChange}
          />
        )}

        {showToolbar && discoveryMode && (
          <CourseCatalogToolbar
            categories={categories}
            categorySlug={categorySlug}
            onCategoryChange={handleCategoryChange}
          />
        )}

        {showToolbar && !discoveryMode && (
          <CourseListToolbar
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            showFilter={!showFilters}
            categories={categories}
            categorySlug={categorySlug}
            onCategoryChange={handleCategoryChange}
            showAdvancedFilters={showAdvancedFilters}
            priceRange={priceRange}
            onPriceRangeChange={handlePriceRangeChange}
            onSale={onSale}
            onSaleChange={handleSaleChange}
            featured={featured}
            onFeaturedChange={handleFeaturedChange}
            sort={sort}
            onSortChange={handleSortChange}
            onClearFilters={clearAdvancedFilters}
          />
        )}

        {loading && discoveryMode && <CourseCatalogSkeleton />}

        {loading && !discoveryMode && (
          <div className="course-state" role="status" aria-live="polite">
            <p>Loading courses...</p>
          </div>
        )}

        {!loading && error && (
          <div className="course-state course-state--error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setRetryKey((current) => current + 1)}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="course-state">
            <h2>No courses found</h2>
            <p>Try another keyword or category.</p>
            {discoveryMode && hasCatalogFilters && (
              <button type="button" onClick={clearAllCatalogFilters}>
                Clear all filters
              </button>
            )}
          </div>
        )}

        {!loading && !error && courses.length > 0 && (
          <>
            <div className={`course-list course-list--${viewMode}`}>
              {courses.map((course) => (
                <CourseCard
                  key={course.id || course.slug}
                  course={course}
                  viewMode={viewMode}
                  detailState={detailState}
                  variant={cardVariant}
                />
              ))}
            </div>

            {pageInfo.totalPages > 1 && (
              <nav className="course-pagination" aria-label="Course pagination">
                <button
                  type="button"
                  disabled={pageInfo.page <= 0}
                  onClick={() => updateQuery({ page: String(pageInfo.page - 1) })}
                  aria-label="Go to previous course page"
                >
                  <ChevronLeft size={17} aria-hidden="true" />
                  <span>Previous</span>
                </button>
                {paginationItems.map((item) =>
                  item.type === "ellipsis" ? (
                    <span
                      className="course-pagination__ellipsis"
                      key={item.key}
                      aria-hidden="true"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item.value}
                      type="button"
                      className={item.value === pageInfo.page ? "is-active" : ""}
                      onClick={() => updateQuery({ page: String(item.value) })}
                      aria-label={`Go to course page ${item.value + 1}`}
                      aria-current={
                        item.value === pageInfo.page ? "page" : undefined
                      }
                    >
                      {item.value + 1}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  disabled={pageInfo.page >= pageInfo.totalPages - 1}
                  onClick={() => updateQuery({ page: String(pageInfo.page + 1) })}
                  aria-label="Go to next course page"
                >
                  <span>Next</span>
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
              </nav>
            )}
          </>
        )}
      </section>
    </>
  );

  if (embedded) {
    return <div className="course-catalog-embedded">{content}</div>;
  }

  return <main className="course-page course-page--catalog">{content}</main>;
}
