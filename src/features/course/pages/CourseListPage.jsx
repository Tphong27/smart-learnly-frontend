import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { courseService } from "@/services";
import { CourseCard } from "../components/CourseCard";
import { CourseFilters } from "../components/CourseFilters";
import { CourseListToolbar } from "../components/CourseListToolbar";
import "../course.css";

const DEFAULT_PAGE_SIZE = 3;

export function CourseListPage({
  embedded = false,
  showHero = true,
  pageSize = DEFAULT_PAGE_SIZE,
  showToolbar = true,
  showFilters = true,
  detailState,
  excludeEnrolled = false,
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

  function hasAccessToken() {
    const token = localStorage.getItem("accessToken");
    return token && token !== "undefined" && token !== "null";
  }

  const keyword = searchParams.get("keyword") || "";
  const categorySlug = searchParams.get("categorySlug") || "";
  const page = Number(searchParams.get("page") || 0);

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
          });
        } else {
          data = await courseService.getPublicCoursesWithDetails({
            page,
            size: pageSize,
            keyword,
            categorySlug,
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
  }, [keyword, categorySlug, page, pageSize, excludeEnrolled]);

  function updateQuery(nextValues) {
    const next = {
      keyword,
      categorySlug,
      page: String(page),
      ...nextValues,
    };

    Object.keys(next).forEach((key) => {
      if (!next[key] || next[key] === "0") {
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

  function handleViewModeChange(mode) {
    setViewMode(mode);
    localStorage.setItem("courseViewMode", mode);
  }

  const pageNumbers = useMemo(() => {
    return Array.from({ length: pageInfo.totalPages }, (_, index) => index);
  }, [pageInfo.totalPages]);

  const content = (
    <>
      {showHero && (
        <section className="course-hero">
          <span className="course-hero__eyebrow">Course catalog</span>
          <h1>Explore courses that match your learning goals</h1>
          <p>
            Browse published courses, filter by category, and open course
            details before enrollment.
          </p>
        </section>
      )}

      <section
        className={
          embedded ? "course-panel course-panel--embedded" : "course-panel"
        }
      >
        {showFilters && (
          <CourseFilters
            keyword={keyword}
            categorySlug={categorySlug}
            categories={categories}
            onKeywordChange={handleKeywordChange}
            onCategoryChange={handleCategoryChange}
          />
        )}

        {showToolbar && (
          <CourseListToolbar
            totalElements={pageInfo.totalElements}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />
        )}

        {loading && (
          <div className="course-state">
            <p>Loading courses...</p>
          </div>
        )}

        {!loading && error && (
          <div className="course-state course-state--error">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => updateQuery({ page: String(page) })}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && courses.length === 0 && (
          <div className="course-state">
            <h2>No courses found</h2>
            <p>Try another keyword or category.</p>
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
                />
              ))}
            </div>

            {pageInfo.totalPages > 1 && (
              <nav className="course-pagination" aria-label="Course pagination">
                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    className={pageNumber === pageInfo.page ? "is-active" : ""}
                    onClick={() => updateQuery({ page: String(pageNumber) })}
                  >
                    {pageNumber + 1}
                  </button>
                ))}
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

  return <main className="course-page">{content}</main>;
}
