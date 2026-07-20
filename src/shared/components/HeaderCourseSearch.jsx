import { useEffect, useRef, useState } from "react";
import { BookOpen, CalendarDays, LoaderCircle, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { courseService, openingScheduleService } from "@/services";

function SuggestionThumbnail({ imageUrl, type = "course" }) {
  const [imageFailed, setImageFailed] = useState(false);

  if (imageUrl && !imageFailed) {
    return (
      <img
        className="header-search__course-thumbnail"
        src={imageUrl}
        alt=""
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span className="header-search__course-thumbnail header-search__course-thumbnail--fallback">
      {type === "class" ? (
        <CalendarDays size={20} aria-hidden="true" />
      ) : (
        <BookOpen size={20} aria-hidden="true" />
      )}
    </span>
  );
}

export function HeaderCourseSearch({
  catalogPath = "/",
  catalogHash = "#courses",
  placeholder = "Search courses, classes, topics, or skills...",
  backLabel = "Back to homepage",

  includeOpeningClasses = false,
  classDetailPath = "/opening-schedule",
  classReturnPath = "/#opening-schedule",
  classBackLabel = "Back to Opening Schedule",
}) {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeOption, setActiveOption] = useState(0);

  const normalizedQuery = query.trim();
  const hasSearchQuery = normalizedQuery.length >= 2;

  const visibleClasses = includeOpeningClasses ? classes : [];
  const hasAnyResults = courses.length > 0 || visibleClasses.length > 0;

  const searchTargetLabel = includeOpeningClasses
    ? "courses and classes"
    : "courses";

  useEffect(() => {
    if (!hasSearchQuery) {
      return undefined;
    }

    let cancelled = false;

    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        /*
         * Course và class được gọi song song.
         * Promise.allSettled được dùng để:
         * - API class lỗi vẫn có thể hiện course.
         * - API course lỗi vẫn có thể hiện class.
         */
        const [courseResult, classResult] = await Promise.allSettled([
          courseService.getPublicCourses({
            keyword: normalizedQuery,
            page: 0,
            size: 5,
          }),

          includeOpeningClasses
            ? openingScheduleService.list({
                keyword: normalizedQuery,
                page: 0,
                size: 5,
              })
            : Promise.resolve(null),
        ]);

        if (cancelled) {
          return;
        }

        const nextCourses =
          courseResult.status === "fulfilled" &&
          Array.isArray(courseResult.value?.items)
            ? courseResult.value.items
            : [];

        const nextClasses =
          includeOpeningClasses &&
          classResult.status === "fulfilled" &&
          Array.isArray(classResult.value?.content)
            ? classResult.value.content
            : [];

        setCourses(nextCourses);
        setClasses(nextClasses);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [hasSearchQuery, includeOpeningClasses, normalizedQuery]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!searchRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  function getCatalogUrl() {
    const separator = catalogPath.includes("?") ? "&" : "?";

    return (
      `${catalogPath}${separator}` +
      `keyword=${encodeURIComponent(normalizedQuery)}` +
      catalogHash
    );
  }

  function submitSearch() {
    if (!hasSearchQuery) {
      return;
    }

    /*
     * URL keyword dùng chung cho:
     * - Popular Courses
     * - Upcoming Classes
     *
     * OpeningSchedulePage sẽ được đồng bộ keyword
     * ở bước tiếp theo.
     */
    navigate(getCatalogUrl());
    setIsOpen(false);
  }

  function selectCourse(course) {
    const courseIdentifier = course.slug || course.id;

    if (!courseIdentifier) {
      return;
    }

    navigate(`/courses/${courseIdentifier}`, {
      state: {
        from: catalogPath,
        fromHash: catalogHash,
        backLabel,
      },
    });

    setIsOpen(false);
  }

  function selectClass(classItem) {
    if (!classItem?.classId) {
      return;
    }

    navigate(`${classDetailPath}/${classItem.classId}`, {
      state: {
        from: classReturnPath,
        backLabel: classBackLabel,
      },
    });

    setIsOpen(false);
  }

  function selectActiveSuggestion() {
    if (activeOption <= 0) {
      submitSearch();
      return;
    }

    if (activeOption <= courses.length) {
      selectCourse(courses[activeOption - 1]);
      return;
    }

    const classIndex = activeOption - courses.length - 1;

    const selectedClass = visibleClasses[classIndex];

    if (selectedClass) {
      selectClass(selectedClass);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (!hasSearchQuery) {
      return;
    }

    const optionCount = 1 + courses.length + visibleClasses.length;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);

      setActiveOption((current) => Math.min(current + 1, optionCount - 1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setActiveOption((current) => Math.max(current - 1, 0));
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (isOpen) {
        selectActiveSuggestion();
        return;
      }

      submitSearch();
    }
  }

  function clearSearch() {
    setQuery("");
    setCourses([]);
    setClasses([]);
    setActiveOption(0);
    setIsOpen(false);
  }

  return (
    <div className="header-search-wrapper" ref={searchRef}>
      <form
        className="header-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
      >
        <Search size={18} className="header-search-icon" aria-hidden="true" />

        <input
          type="search"
          value={query}
          placeholder={placeholder}
          className="header-search-input"
          role="combobox"
          aria-label={
            includeOpeningClasses
              ? "Search courses and classes"
              : "Search courses"
          }
          aria-autocomplete="list"
          aria-controls="header-search-results"
          aria-expanded={isOpen && hasSearchQuery}
          aria-activedescendant={
            isOpen && hasSearchQuery
              ? `header-search-option-${activeOption}`
              : undefined
          }
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveOption(0);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (hasSearchQuery) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
        />

        {query && (
          <button
            type="button"
            className="header-search__clear"
            onClick={clearSearch}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </form>

      {isOpen && hasSearchQuery && (
        <div
          className="header-search__menu"
          id="header-search-results"
          role="listbox"
          aria-label={`Search ${searchTargetLabel}`}
        >
          <button
            type="button"
            id="header-search-option-0"
            role="option"
            aria-selected={activeOption === 0}
            className={`header-search__search-action${
              activeOption === 0 ? " is-active" : ""
            }`}
            onMouseEnter={() => setActiveOption(0)}
            onClick={submitSearch}
          >
            <Search size={18} />

            <span>
              Search {searchTargetLabel} for{" "}
              <strong>“{normalizedQuery}”</strong>
            </span>
          </button>

          {isLoading ? (
            <div className="header-search__status" role="status">
              <LoaderCircle size={18} className="header-search__spinner" />
              Finding {searchTargetLabel}…
            </div>
          ) : (
            <>
              {courses.length > 0 && (
                <div className="header-search__course-list">
                  <p className="header-search__label">Courses</p>

                  {courses.map((course, index) => {
                    const optionIndex = index + 1;

                    return (
                      <button
                        type="button"
                        key={course.id || course.slug}
                        id={`header-search-option-${optionIndex}`}
                        role="option"
                        aria-selected={activeOption === optionIndex}
                        className={`header-search__course-result${
                          activeOption === optionIndex ? " is-active" : ""
                        }`}
                        onMouseEnter={() => setActiveOption(optionIndex)}
                        onClick={() => selectCourse(course)}
                      >
                        <SuggestionThumbnail
                          imageUrl={course.avatarUrl}
                          type="course"
                        />

                        <span className="header-search__course-copy">
                          <strong>{course.title}</strong>

                          <small>
                            Course · {course.category?.name || "General"}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {visibleClasses.length > 0 && (
                <div className="header-search__course-list">
                  <p className="header-search__label">Classes</p>

                  {visibleClasses.map((classItem, index) => {
                    const optionIndex = courses.length + index + 1;

                    return (
                      <button
                        type="button"
                        key={classItem.classId}
                        id={`header-search-option-${optionIndex}`}
                        role="option"
                        aria-selected={activeOption === optionIndex}
                        className={`header-search__course-result${
                          activeOption === optionIndex ? " is-active" : ""
                        }`}
                        onMouseEnter={() => setActiveOption(optionIndex)}
                        onClick={() => selectClass(classItem)}
                      >
                        <SuggestionThumbnail
                          imageUrl={classItem.courseThumbnailUrl}
                          type="class"
                        />

                        <span className="header-search__course-copy">
                          <strong>{classItem.className}</strong>

                          <small>
                            Class ·{" "}
                            {classItem.courseTitle || "Course unavailable"}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {!hasAnyResults && (
                <div className="header-search__status" role="status">
                  No courses or classes found. Press Enter to view the full
                  search result.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}