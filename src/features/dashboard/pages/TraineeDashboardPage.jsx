import { useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    CheckCircle2,
    CirclePlay,
    GraduationCap,
    Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui";
import {
    courseService,
    traineeProgressService,
} from "@/services";
import "./TraineeDashboardPage.css";

const EMPTY_METRIC = { completed: 0, total: 0, percent: 0 };

function getCourseId(course) {
    return course?.courseId || course?.id || "";
}

function getClassId(course) {
    return course?.classId || course?.enrolledClass?.id || "";
}

function getLearningPath(course) {
    const courseId = getCourseId(course);
    const classId = getClassId(course);

    if (!courseId) return "/learning/progress";
    if (!classId) return `/learning/courses/${courseId}`;

    return `/learning/courses/${courseId}?classId=${classId}`;
}

function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function createProgressMap(progressCourses = []) {
    const byCourseAndClass = new Map();
    const byCourse = new Map();

    progressCourses.forEach((course) => {
        const courseId = getCourseId(course);
        const classId = getClassId(course);
        if (!courseId) return;

        byCourseAndClass.set(`${courseId}:${classId}`, course);
        if (!byCourse.has(String(courseId)))
            byCourse.set(String(courseId), course);
    });

    return { byCourseAndClass, byCourse };
}

function enrichCourse(course, progressMap) {
    const courseId = getCourseId(course);
    const classId = getClassId(course);
    const progress =
        progressMap.byCourseAndClass.get(`${courseId}:${classId}`) ||
        progressMap.byCourse.get(String(courseId)) ||
        {};

    return {
        ...course,
        ...progress,
        id: course.id || progress.id || progress.courseId,
        courseId,
        classId: classId || progress.classId || "",
        title: course.title || progress.title || "Untitled course",
        categoryName:
            course.category?.name || progress.categoryName || "Course",
        className: course.enrolledClass?.className || progress.className || "",
        trainerName: course.enrolledClass?.trainerName || "",
        thumbnailUrl: course.avatarUrl || progress.thumbnailUrl || "",
        accessAllowed:
            course.accessAllowed !== false && progress.accessAllowed !== false,
        accessBlockedReason:
            course.accessBlockedReason || progress.accessBlockedReason || "",
        overallPercent: toNumber(progress.overallPercent),
        courseStatus: progress.courseStatus || "IN_PROGRESS",
        lesson: progress.lesson || EMPTY_METRIC,
    };
}

function getItemCount(course) {
    const lesson = course.lesson || EMPTY_METRIC;
    return `${toNumber(lesson.completed)} of ${toNumber(lesson.total)} lessons`;
}

function isCompleted(course) {
    return course.courseStatus === "COMPLETED" || course.overallPercent >= 100;
}

function CourseThumbnail({ course, className = "" }) {
    return (
        <div className={`trainee-dashboard-course-image ${className}`}>
            {course.thumbnailUrl ? (
                <img src={course.thumbnailUrl} alt="" />
            ) : (
                <BookOpen size={28} aria-hidden="true" />
            )}
        </div>
    );
}

function ProgressLine({ value }) {
    const percent = Math.min(100, Math.max(0, toNumber(value)));
    return (
        <div
            className="trainee-dashboard-progress"
            role="progressbar"
            aria-label={`Course progress: ${percent}%`}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={percent}
        >
            <span style={{ width: `${percent}%` }} />
        </div>
    );
}

export function TraineeDashboardPage() {
    const [courses, setCourses] = useState([]);
    const [progress, setProgress] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let mounted = true;

        async function loadDashboard() {
            setLoading(true);
            setError("");

            const [courseResult, progressResult] = await Promise.allSettled([
                courseService.getMyCourses(),
                traineeProgressService.getMyProgress(),
            ]);

            if (!mounted) return;

            if (courseResult.status === "rejected") {
                setError(
                    courseResult.reason?.message ||
                        "Could not load your learning dashboard.",
                );
                setCourses([]);
                setProgress(null);
            } else {
                setCourses(
                    Array.isArray(courseResult.value) ? courseResult.value : [],
                );
                setProgress(
                    progressResult.status === "fulfilled"
                        ? progressResult.value
                        : null,
                );
            }

            setLoading(false);
        }

        loadDashboard();

        return () => {
            mounted = false;
        };
    }, [reloadKey]);

    const dashboard = useMemo(() => {
        const progressMap = createProgressMap(progress?.courses || []);
        const enrolledCourses = courses.map((course) =>
            enrichCourse(course, progressMap),
        );
        const activeCourses = enrolledCourses
            .filter((course) => !isCompleted(course))
            .sort((left, right) => right.overallPercent - left.overallPercent);
        const accessibleActiveCourses = activeCourses.filter(
            (course) => course.accessAllowed,
        );
        const featuredCourse =
            accessibleActiveCourses[0] || activeCourses[0] || null;
        const completedCourses =
            progress?.completedCourses ??
            enrolledCourses.filter(isCompleted).length;
        const overallProgress = enrolledCourses.length
            ? Math.round(
                  enrolledCourses.reduce(
                      (sum, course) => sum + course.overallPercent,
                      0,
                  ) / enrolledCourses.length,
              )
            : 0;

        return {
            activeCourses,
            completedCourses,
            featuredCourse,
            overallProgress,
        };
    }, [courses, progress]);

    return (
        <main className="trainee-dashboard-page">
            {loading && (
                <div
                    className="trainee-dashboard-state"
                    role="status"
                    aria-live="polite"
                >
                    Loading your learning space…
                </div>
            )}

            {!loading && error && (
                <div
                    className="trainee-dashboard-state trainee-dashboard-state--error"
                    role="alert"
                >
                    <strong>We could not load your dashboard.</strong>
                    <span>{error}</span>
                    <Button
                        onClick={() => setReloadKey((current) => current + 1)}
                    >
                        Try again
                    </Button>
                </div>
            )}

            {!loading && !error && dashboard.featuredCourse && (
                <section
                    className="trainee-dashboard-feature"
                    aria-labelledby="continue-learning-title"
                >
                    <CourseThumbnail
                        course={dashboard.featuredCourse}
                        className="trainee-dashboard-feature__image"
                    />

                    <div className="trainee-dashboard-feature__content">
                        <span className="trainee-dashboard-feature__eyebrow">
                            <CirclePlay size={16} aria-hidden="true" /> Continue
                            learning
                        </span>
                        <p className="trainee-dashboard-feature__category">
                            {dashboard.featuredCourse.categoryName}
                            {dashboard.featuredCourse.className
                                ? ` · ${dashboard.featuredCourse.className}`
                                : ""}
                        </p>
                        <h2 id="continue-learning-title">
                            {dashboard.featuredCourse.title}
                        </h2>
                        <div className="trainee-dashboard-feature__progress-copy">
                            <span>
                                {getItemCount(dashboard.featuredCourse)}
                            </span>
                            <strong>
                                {dashboard.featuredCourse.overallPercent}%
                                complete
                            </strong>
                        </div>
                        <ProgressLine
                            value={dashboard.featuredCourse.overallPercent}
                        />
                        {!dashboard.featuredCourse.accessAllowed && (
                            <p className="trainee-dashboard-feature__notice">
                                {dashboard.featuredCourse.accessBlockedReason ||
                                    "Course access is currently unavailable."}
                            </p>
                        )}
                        <div className="trainee-dashboard-feature__actions">
                            {dashboard.featuredCourse.accessAllowed ? (
                                <Button
                                    to={getLearningPath(
                                        dashboard.featuredCourse,
                                    )}
                                    rightIcon={<ArrowRight size={17} />}
                                >
                                    {dashboard.featuredCourse.overallPercent > 0
                                        ? "Continue learning"
                                        : "Start course"}
                                </Button>
                            ) : null}
                            <Button
                                to={`/courses/${dashboard.featuredCourse.slug || dashboard.featuredCourse.id}`}
                                variant="outline"
                            >
                                View course
                            </Button>
                        </div>
                    </div>
                </section>
            )}

            {!loading && !error && courses.length > 0 && (
                <section
                    className="trainee-dashboard-stat-grid"
                    aria-label="Learning summary"
                >
                    <article className="trainee-dashboard-stat-card">
                        <GraduationCap size={21} aria-hidden="true" />
                        <div>
                            <strong>{dashboard.activeCourses.length}</strong>
                            <span>Active courses</span>
                        </div>
                    </article>
                    <article className="trainee-dashboard-stat-card trainee-dashboard-stat-card--success">
                        <CheckCircle2 size={21} aria-hidden="true" />
                        <div>
                            <strong>{dashboard.completedCourses}</strong>
                            <span>Completed</span>
                        </div>
                    </article>
                    <article className="trainee-dashboard-stat-card trainee-dashboard-stat-card--progress">
                        <BarChart3 size={21} aria-hidden="true" />
                        <div>
                            <strong>{dashboard.overallProgress}%</strong>
                            <span>Overall progress</span>
                        </div>
                    </article>
                </section>
            )}

            {!loading && !error && dashboard.activeCourses.length > 0 && (
                <section
                    className="trainee-dashboard-course-section"
                    aria-labelledby="active-courses-title"
                >
                    <div className="trainee-dashboard-section-heading">
                        <div>
                            <h2 id="active-courses-title">Active learning</h2>
                        </div>
                        <Link
                            to="/learning/progress"
                            className="trainee-dashboard-text-link"
                        >
                            View all <ArrowRight size={16} />
                        </Link>
                    </div>

                    <div className="trainee-dashboard-course-grid">
                        {dashboard.activeCourses.slice(0, 3).map((course) => (
                            <article
                                className="trainee-dashboard-course-card"
                                key={`${course.id}:${course.classId || "course"}`}
                            >
                                <CourseThumbnail course={course} />
                                <div className="trainee-dashboard-course-card__body">
                                    <span>{course.categoryName}</span>
                                    <h3>{course.title}</h3>
                                    <p>
                                        {course.className
                                            ? `${course.className}${course.trainerName ? ` · ${course.trainerName}` : ""}`
                                            : "Self-paced course"}
                                    </p>
                                    <div className="trainee-dashboard-course-card__progress-label">
                                        <span>
                                            {course.overallPercent}% complete
                                        </span>
                                        <span>{getItemCount(course)}</span>
                                    </div>
                                    <ProgressLine
                                        value={course.overallPercent}
                                    />
                                    {course.accessAllowed ? (
                                        <Button
                                            to={getLearningPath(course)}
                                            size="sm"
                                            fullWidth
                                            rightIcon={<ArrowRight size={16} />}
                                        >
                                            {course.overallPercent > 0
                                                ? "Continue"
                                                : "Start course"}
                                        </Button>
                                    ) : (
                                        <span className="trainee-dashboard-card-blocked">
                                            Access unavailable
                                        </span>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {!loading && !error && courses.length === 0 && (
                <section className="trainee-dashboard-empty">
                    <Sparkles size={28} aria-hidden="true" />
                    <h2>Start your learning journey</h2>
                    <p>
                        You have not enrolled in a course yet. Find a course
                        that fits your next goal.
                    </p>
                    <Button
                        to="/learning/courses"
                        rightIcon={<ArrowRight size={17} />}
                    >
                        Browse course catalog
                    </Button>
                </section>
            )}

            {!loading && !error && courses.length > 0 && (
                <section
                    className="trainee-dashboard-quick-actions"
                    aria-labelledby="quick-actions-title"
                >
                    <div>
                        <span className="trainee-dashboard__eyebrow">
                            Practice and review
                        </span>
                        <h2 id="quick-actions-title">Quick actions</h2>
                        <p>
                            Choose the learning activity that helps you make
                            progress today.
                        </p>
                    </div>
                    <div className="trainee-dashboard-quick-actions__links">
                        <Link to="/learning/flashcards">
                            <BookOpen size={18} /> Practice flashcards{" "}
                            <ArrowRight size={16} />
                        </Link>
                        <Link to="/learning/tests">
                            <CheckCircle2 size={18} /> View my tests{" "}
                            <ArrowRight size={16} />
                        </Link>
                        <Link to="/learning/progress">
                            <BarChart3 size={18} /> Review progress{" "}
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </section>
            )}
        </main>
    );
}
