import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Pagination from "@/shared/components/Pagination";
import { enrollmentService } from "@/features/enrollment";
import { categoryService } from "../services/categoryService";
import { courseCatalogService } from "../services/courseCatalogService";
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
  defaultSort = "POPULAR",
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
  const sort = searchParams.get("sort") || defaultSort;
  const requestedPage = Number(searchParams.get("page") || 0);
  const page =
    Number.isInteger(requestedPage) && requestedPage >= 0 ? requestedPage : 0;
  const priceFilter = PRICE_RANGES[priceRange] || {};

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      try {
        const data = await categoryService.listPublic();
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
        ? await enrollmentService.getMyEnrolledCourseIds()
        : new Set();

      const allItems = [];
      let backendPage = 0;
      let hasMorePages = true;

      while (hasMorePages) {
        const pageData = await courseCatalogService.listWithDetails({
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
          data = await courseCatalogService.listWithDetails({
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
      sort: sort === defaultSort ? "" : sort,
      page: String(page),
      ...nextValues,
    };

    Object.keys(next).forEach((key) => {
      if (
        !next[key] ||
        next[key] === "0" ||
        (key === "sort" && next[key] === defaultSort)
      ) {
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
      sort: value === defaultSort ? "" : value,
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

  const discoveryMode = !embedded;
  const hasCatalogFilters = Boolean(
    keyword ||
      categorySlug ||
      priceRange ||
      onSale ||
      featured ||
      sort !== defaultSort,
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
          <h1>Courses</h1>
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

            <Pagination
              page={pageInfo.page + 1}
              totalPages={pageInfo.totalPages}
              totalItems={pageInfo.totalElements}
              size={pageSize}
              onPageChange={(nextPage) =>
                updateQuery({ page: String(nextPage - 1) })
              }
              ariaLabel="Course pagination"
            />
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
