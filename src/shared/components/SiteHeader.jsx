import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    BookOpen,
    ChevronDown,
    LoaderCircle,
    Search,
    X,
} from "lucide-react";
import { courseService } from "@/services";
import { Button } from "@/shared/components/ui";
import { SmartLearnlyMark } from "./SmartLearnlyMark";

function CourseSuggestionThumbnail({ course }) {
    const [imageFailed, setImageFailed] = useState(false);

    if (course.avatarUrl && !imageFailed) {
        return (
            <img
                className="header-search__course-thumbnail"
                src={course.avatarUrl}
                alt=""
                onError={() => setImageFailed(true)}
            />
        );
    }

    return (
        <span className="header-search__course-thumbnail header-search__course-thumbnail--fallback">
            <BookOpen size={20} />
        </span>
    );
}

// Header component - Figma Neubrutalism Design
export function SiteHeader() {
    const navigate = useNavigate();
    const searchRef = useRef(null);
    const [isCompact, setIsCompact] = useState(() => window.scrollY > 24);
    const [query, setQuery] = useState("");
    const [courses, setCourses] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeOption, setActiveOption] = useState(0);

    const normalizedQuery = query.trim();
    const hasSearchQuery = normalizedQuery.length >= 2;

    useEffect(() => {
        if (!hasSearchQuery) {
            return undefined;
        }

        let cancelled = false;
        const timeoutId = window.setTimeout(async () => {
            setIsLoading(true);

            try {
                const result = await courseService.getPublicCourses({
                    keyword: normalizedQuery,
                    page: 0,
                    size: 5,
                });

                if (!cancelled) {
                    setCourses(result.items || []);
                }
            } catch {
                if (!cancelled) {
                    setCourses([]);
                }
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
    }, [hasSearchQuery, normalizedQuery]);

    useEffect(() => {
        function handlePointerDown(event) {
            if (!searchRef.current?.contains(event.target)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, []);

    useEffect(() => {
        let frameId = null;

        function handleScroll() {
            if (frameId) return;

            frameId = window.requestAnimationFrame(() => {
                const shouldCompact = window.scrollY > 24;
                setIsCompact((current) =>
                    current === shouldCompact ? current : shouldCompact,
                );
                frameId = null;
            });
        }

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (frameId) window.cancelAnimationFrame(frameId);
        };
    }, []);

    function submitSearch() {
        if (!hasSearchQuery) return;

        navigate(`/?keyword=${encodeURIComponent(normalizedQuery)}#courses`);
        setIsOpen(false);
    }

    function selectCourse(course) {
        const coursePath = `/courses/${course.slug || course.id}`;
        navigate(coursePath, {
            state: {
                from: "/",
                fromHash: "#courses",
                backLabel: "Back to homepage",
            },
        });
        setIsOpen(false);
    }

    function handleKeyDown(event) {
        if (event.key === "Escape") {
            setIsOpen(false);
            return;
        }

        if (!hasSearchQuery) return;

        const optionCount = courses.length + 1;

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

            if (isOpen && activeOption > 0) {
                selectCourse(courses[activeOption - 1]);
                return;
            }

            submitSearch();
        }
    }

    function clearSearch() {
        setQuery("");
        setCourses([]);
        setIsOpen(false);
    }

    return (
        <header className={`site-header${isCompact ? " site-header--compact" : ""}`}>
            <div className="header-container">
                {/* Logo */}
                <a
                    href="/"
                    className="header-logo"
                    aria-label="Smart Learnly home"
                >
                    <SmartLearnlyMark className="header-logo-icon" />
                    <span className="header-logo-text">Smart Learnly</span>
                </a>

                <div className="header-search-wrapper" ref={searchRef}>
                    <form
                        className="header-search"
                        role="search"
                        onSubmit={(event) => {
                            event.preventDefault();
                            submitSearch();
                        }}
                    >
                        <Search size={18} className="header-search-icon" />
                        <input
                            type="search"
                            value={query}
                            placeholder="Search courses, topics, or skills..."
                            className="header-search-input"
                            role="combobox"
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
                                if (hasSearchQuery) setIsOpen(true);
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
                            aria-label="Course search suggestions"
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
                                    Search courses for <strong>“{normalizedQuery}”</strong>
                                </span>
                            </button>

                            {isLoading ? (
                                <div className="header-search__status" role="status">
                                    <LoaderCircle size={18} className="header-search__spinner" />
                                    Finding courses…
                                </div>
                            ) : courses.length > 0 ? (
                                <div className="header-search__course-list">
                                    <p className="header-search__label">Courses</p>
                                    {courses.map((course, index) => (
                                        <button
                                            type="button"
                                            key={course.id || course.slug}
                                            id={`header-search-option-${index + 1}`}
                                            role="option"
                                            aria-selected={activeOption === index + 1}
                                            className={`header-search__course-result${
                                                activeOption === index + 1
                                                    ? " is-active"
                                                    : ""
                                            }`}
                                            onMouseEnter={() => setActiveOption(index + 1)}
                                            onClick={() => selectCourse(course)}
                                        >
                                            <CourseSuggestionThumbnail course={course} />
                                            <span className="header-search__course-copy">
                                                <strong>{course.title}</strong>
                                                <small>
                                                    Course · {course.category?.name || "General"}
                                                </small>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="header-search__status" role="status">
                                    No courses found. Press Enter to view the full catalog.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="header-nav">
                    <button className="header-categories-btn">
                        <span>Categories</span>
                        <ChevronDown size={16} />
                    </button>

                    <Button to="/login" variant="outline">
                        Log in
                    </Button>
                    <Button to="/register">
                        Register
                    </Button>
                </nav>
            </div>
        </header>
    );
}

// Brand Logo component (for footer)
export function BrandLogo() {
    return (
        <a className="brand" href="/" aria-label="Smart Learnly home">
            <SmartLearnlyMark className="brand-mark" />
            <span>Smart Learnly</span>
        </a>
    );
}
