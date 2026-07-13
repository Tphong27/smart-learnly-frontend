import { useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    CheckCircle2,
    CirclePlay,
    Flame,
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

function CourseThumbnail({ course, className = "", loading = "lazy" }) {
    return (
        <div className={`trainee-dashboard-course-image ${className}`}>
            {course.thumbnailUrl ? (
                <img
                    src={course.thumbnailUrl}
                    alt=""
                    loading={loading}
                    decoding="async"
                />
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

function MomentumRing({ value }) {
    const percent = Math.min(100, Math.max(0, Math.round(toNumber(value))));

    return (
        <div
            className="trainee-dashboard-momentum__ring"
            role="progressbar"
            aria-label={`Overall lesson progress: ${percent}%`}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={percent}
        >
            <svg viewBox="0 0 44 44" aria-hidden="true">
                <circle className="trainee-dashboard-momentum__ring-track" cx="22" cy="22" r="18" />
                <circle
                    className="trainee-dashboard-momentum__ring-value"
                    cx="22"
                    cy="22"
                    r="18"
                    pathLength="100"
                    strokeDasharray="100"
                    strokeDashoffset={100 - percent}
                />
            </svg>
            <strong>{percent}%</strong>
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
        const lessonTotals = enrolledCourses.reduce(
            (total, course) => ({
                completed:
                    total.completed + toNumber(course.lesson?.completed),
                lessons: total.lessons + toNumber(course.lesson?.total),
            }),
            { completed: 0, lessons: 0 },
        );
        const lessonProgress = lessonTotals.lessons
            ? Math.round(
                  (lessonTotals.completed / lessonTotals.lessons) * 100,
              )
            : overallProgress;

        return {
            activeCourses,
            completedCourses,
            featuredCourse,
            lessonCompleted: lessonTotals.completed,
            lessonProgress,
            lessonTotal: lessonTotals.lessons,
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

            {!loading && !error && courses.length > 0 && (
                <section
                    className="trainee-dashboard-momentum"
                    aria-labelledby="learning-momentum-title"
                >
                    <div className="trainee-dashboard-momentum__intro">
                        <span className="trainee-dashboard-momentum__icon">
                            <Flame size={22} aria-hidden="true" />
                        </span>
                        <div>
                            <h2 id="learning-momentum-title">
                                Keep your learning momentum
                            </h2>
                            <p>
                                {dashboard.completedCourses >= courses.length
                                    ? "Great work—your enrolled courses are complete."
                                    : dashboard.lessonTotal > 0
                                      ? "Complete one more lesson today and keep moving toward your goal."
                                      : "Start your next lesson to build your learning momentum."}
                            </p>
                        </div>
                    </div>

                    <div className="trainee-dashboard-momentum__progress">
                        <MomentumRing value={dashboard.lessonProgress} />
                        <div>
                            <strong>
                                {dashboard.lessonCompleted}/
                                {dashboard.lessonTotal} lessons
                            </strong>
                            <span>completed</span>
                        </div>
                    </div>

                    <dl className="trainee-dashboard-momentum__stats">
                        <div>
                            <dd>{dashboard.activeCourses.length}</dd>
                            <dt>Active courses</dt>
                        </div>
                        <div>
                            <dd>{dashboard.completedCourses}</dd>
                            <dt>Completed</dt>
                        </div>
                    </dl>
                </section>
            )}

            {!loading && !error && dashboard.featuredCourse && (
                <section
                    className="trainee-dashboard-feature"
                    aria-labelledby="continue-learning-title"
                >
                    <CourseThumbnail
                        course={dashboard.featuredCourse}
                        className="trainee-dashboard-feature__image"
                        loading="eager"
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
                    className="trainee-dashboard-summary"
                    aria-label="Learning summary"
                >
                    <div>
                        <span>Enrolled courses</span>
                        <strong>{courses.length}</strong>
                    </div>
                    <div>
                        <span>Active learning</span>
                        <strong>{dashboard.activeCourses.length}</strong>
                    </div>
                    <div>
                        <span>Courses completed</span>
                        <strong>{dashboard.completedCourses}</strong>
                    </div>
                    <div>
                        <span>Average progress</span>
                        <strong>{dashboard.overallProgress}%</strong>
                    </div>
                </section>
            )}

            {!loading && !error && dashboard.activeCourses.length > 0 && (
                <section
                    className="trainee-dashboard-course-section"
                    aria-labelledby="active-courses-title"
                >
                    <div className="trainee-dashboard-section-heading">
                        <h2 id="active-courses-title">My learning</h2>
                        <Link
                            to="/learning/progress"
                            className="trainee-dashboard-text-link"
                        >
                            View all <ArrowRight size={16} />
                        </Link>
                    </div>

                    <div className="trainee-dashboard-course-list">
                        {dashboard.activeCourses.slice(0, 4).map((course) => (
                            <article
                                className="trainee-dashboard-course-row"
                                key={`${course.id}:${course.classId || "course"}`}
                            >
                                <CourseThumbnail course={course} />
                                <div className="trainee-dashboard-course-row__content">
                                    <span className="trainee-dashboard-course-row__category">
                                        {course.categoryName}
                                    </span>
                                    <h3>{course.title}</h3>
                                    <p>
                                        {course.className
                                            ? `${course.className}${course.trainerName ? ` · ${course.trainerName}` : ""}`
                                            : "Self-paced course"}
                                    </p>
                                </div>
                                <div className="trainee-dashboard-course-row__progress">
                                    <div className="trainee-dashboard-course-card__progress-label">
                                        <span>
                                            {course.overallPercent}% complete
                                        </span>
                                        <span>{getItemCount(course)}</span>
                                    </div>
                                    <ProgressLine
                                        value={course.overallPercent}
                                    />
                                </div>
                                <div className="trainee-dashboard-course-row__action">
                                    {course.accessAllowed ? (
                                        <Button
                                            to={getLearningPath(course)}
                                            size="sm"
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
                    <h2 id="quick-actions-title">Quick links</h2>
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
