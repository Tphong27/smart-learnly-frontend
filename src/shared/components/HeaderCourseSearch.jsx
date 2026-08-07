import { useEffect, useRef, useState } from "react";
import { BookOpen, CalendarDays, LoaderCircle, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { classroomService } from "@/features/classroom";
import { courseAdminService, courseCatalogService } from "@/features/course";
import { openingScheduleService } from "@/features/opening-schedule";
import {
  canViewClasses,
  normalizeRole,
  ROLES,
} from "@/shared/constants/roles";

/** Hiển thị thumbnail nhỏ cho gợi ý course hoặc class trong ô tìm kiếm. */
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

/** Cung cấp ô tìm kiếm header và điều hướng kết quả theo role hiện tại. */
export function HeaderCourseSearch({
  catalogPath = "/",
  catalogHash = "#courses",
  placeholder = "Search courses, classes, topics, or skills...",
  backLabel = "Back to homepage",
  searchScope = "public",
  userRole,

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
  const [isOpeningResult, setIsOpeningResult] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [activeOption, setActiveOption] = useState(0);

  const normalizedRole = normalizeRole(userRole);
  const isStaffSearch = searchScope === "staff";
  const includeStaffClasses =
    isStaffSearch && canViewClasses(normalizedRole);
  const normalizedQuery = query.trim();
  const hasSearchQuery = normalizedQuery.length >= 2;

  const includesClassResults = isStaffSearch
    ? includeStaffClasses
    : includeOpeningClasses;
  const visibleClasses = includesClassResults ? classes : [];
  const hasAnyResults = courses.length > 0 || visibleClasses.length > 0;
  const resultOptionOffset = isStaffSearch ? 0 : 1;

  const searchTargetLabel = isStaffSearch
    ? includeStaffClasses
      ? "course content and classrooms"
      : "course content"
    : includeOpeningClasses
      ? "courses and classes"
      : "courses";

  useEffect(() => {
    if (!hasSearchQuery) {
      return undefined;
    }

    let cancelled = false;

    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setSearchError("");

      try {
        /*
         * Course và class được gọi song song.
         * Promise.allSettled được dùng để:
         * - API class lỗi vẫn có thể hiện course.
         * - API course lỗi vẫn có thể hiện class.
         */
        const [courseResult, classResult] = await Promise.allSettled([
          isStaffSearch
            ? courseAdminService.list({
                keyword: normalizedQuery,
                page: 0,
                size: 5,
              })
            : courseCatalogService.list({
                keyword: normalizedQuery,
                page: 0,
                size: 5,
              }),

          includesClassResults
            ? isStaffSearch
              ? normalizedRole === ROLES.TRAINER
                ? classroomService.listTrainer({
                    keyword: normalizedQuery,
                    page: 0,
                    size: 5,
                  })
                : classroomService.listAdmin({
                    keyword: normalizedQuery,
                    page: 0,
                    size: 5,
                  })
              : openingScheduleService.list({
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
          includesClassResults &&
          classResult.status === "fulfilled" &&
          Array.isArray(classResult.value?.content)
            ? classResult.value.content
            : [];

        setCourses(nextCourses);
        setClasses(nextClasses);
        setSearchError(
          courseResult.status === "rejected" &&
            (!includesClassResults || classResult.status === "rejected")
            ? "Search is unavailable right now. Please try again."
            : "",
        );
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
  }, [
    hasSearchQuery,
    includesClassResults,
    isStaffSearch,
    normalizedQuery,
    normalizedRole,
  ]);

  useEffect(() => {
    /** Đóng popover khi người dùng bấm ra ngoài vùng tìm kiếm. */
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

  /** Tạo URL catalog với keyword hiện tại để xem toàn bộ kết quả. */
  function getCatalogUrl() {
    const separator = catalogPath.includes("?") ? "&" : "?";

    return (
      `${catalogPath}${separator}` +
      `keyword=${encodeURIComponent(normalizedQuery)}` +
      catalogHash
    );
  }

  /** Điều hướng sang catalog khi submit keyword thủ công. */
  function submitSearch() {
    if (!hasSearchQuery) {
      return;
    }

    if (isStaffSearch) {
      if (hasAnyResults) {
        selectActiveSuggestion();
      }
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

  /** Điều hướng khi chọn một course, tôn trọng quyền và role hiện tại. */
  async function selectCourse(course) {
    const courseIdentifier = course.slug || course.id;

    if (!courseIdentifier) {
      return;
    }

    if (isStaffSearch) {
      if (normalizedRole === ROLES.TRAINER) {
        if (isOpeningResult) return;

        setIsOpeningResult(true);
        setSearchError("");

        try {
          const assignedClasses = await classroomService.listTrainer({
            courseId: course.id,
            page: 0,
            size: 100,
          });
          const classItems = assignedClasses.content || [];
          const assignedClass =
            classItems.find(
              (item) => String(item.status).toLowerCase() === "ongoing",
            ) ||
            classItems.find(
              (item) => String(item.status).toLowerCase() === "upcoming",
            ) ||
            classItems[0];

          if (!assignedClass?.id) {
            throw new Error("No assigned class was found for this course.");
          }

          navigate(
            `/staff/classrooms/${assignedClass.id}/workspace?tab=curriculum`,
          );
          setIsOpen(false);
        } catch (error) {
          setSearchError(
            error?.message || "Could not open the assigned course content.",
          );
        } finally {
          setIsOpeningResult(false);
        }

        return;
      }

      navigate(
        normalizedRole === ROLES.SME
          ? `/staff/courses/${course.id}`
          : `/staff/courses/${course.id}/content`,
      );
      setIsOpen(false);
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

  /** Điều hướng khi chọn một class trong kết quả tìm kiếm. */
  function selectClass(classItem) {
    const classId = classItem?.id || classItem?.classId;

    if (!classId) {
      return;
    }

    if (isStaffSearch) {
      navigate(`/staff/classrooms/${classId}/workspace`);
      setIsOpen(false);
      return;
    }

    navigate(`${classDetailPath}/${classId}`, {
      state: {
        from: classReturnPath,
        backLabel: classBackLabel,
      },
    });

    setIsOpen(false);
  }

  /** Chọn gợi ý đang active bằng bàn phím. */
  function selectActiveSuggestion() {
    if (!isStaffSearch && activeOption === 0) {
      submitSearch();
      return;
    }

    const courseIndex = activeOption - resultOptionOffset;

    if (courseIndex >= 0 && courseIndex < courses.length) {
      selectCourse(courses[courseIndex]);
      return;
    }

    const classIndex = activeOption - resultOptionOffset - courses.length;

    const selectedClass = visibleClasses[classIndex];

    if (selectedClass) {
      selectClass(selectedClass);
    }
  }

  /** Xử lý điều hướng bàn phím trong ô tìm kiếm header. */
  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (!hasSearchQuery) {
      return;
    }

    const optionCount =
      resultOptionOffset + courses.length + visibleClasses.length;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (optionCount === 0) return;
      setIsOpen(true);

      setActiveOption((current) => Math.min(current + 1, optionCount - 1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (optionCount === 0) return;

      setActiveOption((current) => Math.max(current - 1, 0));
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (isOpen) {
        if (hasAnyResults || !isStaffSearch) {
          selectActiveSuggestion();
        }
        return;
      }

      if (isStaffSearch) {
        setIsOpen(true);
      } else {
        submitSearch();
      }
    }
  }

  /** Xóa keyword và reset trạng thái gợi ý. */
  function clearSearch() {
    setQuery("");
    setCourses([]);
    setClasses([]);
    setSearchError("");
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
            `Search ${searchTargetLabel}`
          }
          aria-autocomplete="list"
          aria-controls="header-search-results"
          aria-expanded={isOpen && hasSearchQuery}
          aria-activedescendant={
            isOpen &&
            hasSearchQuery &&
            (!isStaffSearch || hasAnyResults)
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
          {!isStaffSearch && (
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
          )}

          {isLoading || isOpeningResult ? (
            <div className="header-search__status" role="status">
              <LoaderCircle size={18} className="header-search__spinner" />
              {isOpeningResult
                ? "Opening assigned course content…"
                : `Finding ${searchTargetLabel}…`}
            </div>
          ) : searchError ? (
            <div
              className="header-search__status header-search__status--error"
              role="alert"
            >
              {searchError}
            </div>
          ) : (
            <>
              {courses.length > 0 && (
                <div className="header-search__course-list">
                  <p className="header-search__label">
                    {isStaffSearch ? "Course Content" : "Courses"}
                  </p>

                  {courses.map((course, index) => {
                    const optionIndex = index + resultOptionOffset;

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
                          imageUrl={course.thumbnailUrl || course.avatarUrl}
                          type="course"
                        />

                        <span className="header-search__course-copy">
                          <strong>{course.title}</strong>

                          <small>
                            {isStaffSearch ? "Course content" : "Course"} ·{" "}
                            {course.category?.name ||
                              course.categoryName ||
                              "General"}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {visibleClasses.length > 0 && (
                <div className="header-search__course-list">
                  <p className="header-search__label">
                    {isStaffSearch ? "Classrooms" : "Classes"}
                  </p>

                  {visibleClasses.map((classItem, index) => {
                    const optionIndex =
                      courses.length + index + resultOptionOffset;
                    const classId = classItem.id || classItem.classId;

                    return (
                      <button
                        type="button"
                        key={classId}
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
                  {isStaffSearch
                    ? `No accessible ${searchTargetLabel} found.`
                    : "No courses or classes found. Press Enter to view the full search result."}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
