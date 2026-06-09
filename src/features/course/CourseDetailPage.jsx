import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CalendarDays,
    CheckCircle2,
    Clock3,
    GraduationCap,
    Layers3,
    Send,
    Star,
    Users,
} from "lucide-react";
import { useState } from "react";
import {
    addCourseFeedback,
    getCourseFeedbackWithLocal,
} from "@/data/demo/demoTraineeRuntime";
import { Link, useNavigate, useParams } from "react-router-dom";
import { demoClasses } from "@/data/demo";
import { getDemoEnrollmentByCourse } from "@/data/demo/demoRuntime";
import {
    getLifecycleCourseById,
    getLifecycleModules,
} from "@/data/demo/courseLifecycleRuntime";
import { isCoursePublished } from "@/data/demo/courseLifecycle";
import { PageState } from "@/shared/components/PageState";
import { ProgressBar } from "@/shared/components/ProgressBar";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { getCurrentUser } from "@/services";
import { useDemoPageState } from "@/shared/hooks/useDemoPageState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";

function formatPrice(course) {
    if (!course?.price) return "Free";

    return (
        new Intl.NumberFormat("vi-VN").format(course.price) +
        " " +
        course.currency
    );
}

function formatDate(value) {
    if (!value) return "Not scheduled";

    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(value));
}

function getAverageRating(feedbackList, fallbackRating) {
    if (feedbackList.length === 0) return fallbackRating || null;

    const total = feedbackList.reduce(
        (sum, feedback) => sum + feedback.rating,
        0,
    );

    return Number((total / feedbackList.length).toFixed(1));
}

function CourseClassList({ classes }) {
    return (
        <aside className="demo-card course-detail-side-panel">
            <div className="demo-row demo-row--between">
                <div>
                    <span className="demo-kicker">Available classes</span>
                    <h2>Class schedule</h2>
                </div>

                <span className="demo-count-badge">{classes.length}</span>
            </div>

            {classes.length === 0 ? (
                <PageState
                    state="empty"
                    title="No classes yet"
                    description="This course has no scheduled class in demo data."
                />
            ) : (
                <div className="demo-list">
                    {classes.map((classItem) => (
                        <article key={classItem.id} className="demo-list-item">
                            <div>
                                <strong>{classItem.name}</strong>
                                <small>Trainer: {classItem.trainerName}</small>
                                <small>
                                    {formatDate(classItem.startDate)} -{" "}
                                    {formatDate(classItem.endDate)}
                                </small>
                                <small>{classItem.traineeCount} trainees</small>
                            </div>

                            <StatusBadge status={classItem.status} />
                        </article>
                    ))}
                </div>
            )}
        </aside>
    );
}

function FeedbackSection({ courseId, feedbackList, averageRating, onCreated }) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");

    const handleSubmit = () => {
        if (!comment.trim()) return;

        addCourseFeedback({
            courseId,
            rating,
            comment: comment.trim(),
        });

        setComment("");
        setRating(5);
        onCreated();
    };

    return (
        <section className="demo-card">
            <div className="demo-row demo-row--between">
                <div>
                    <span className="demo-kicker">Learner feedback</span>
                    <h2>Feedback and rating</h2>
                </div>

                <span className="demo-rating demo-rating--large">
                    <Star size={17} />
                    {averageRating || "New"}
                </span>
            </div>

            <section className="course-flow-form-section">
                <div className="course-flow-form-grid course-flow-form-grid--compact">
                    <label className="course-flow-field">
                        <span>Your rating</span>
                        <select
                            value={rating}
                            onChange={(event) =>
                                setRating(Number(event.target.value))
                            }
                        >
                            <option value={5}>5 - Excellent</option>
                            <option value={4}>4 - Good</option>
                            <option value={3}>3 - Average</option>
                            <option value={2}>2 - Needs improvement</option>
                            <option value={1}>1 - Poor</option>
                        </select>
                    </label>
                </div>

                <label className="course-flow-field">
                    <span>Your feedback</span>
                    <textarea
                        rows="4"
                        value={comment}
                        placeholder="Share your learning experience..."
                        onChange={(event) => setComment(event.target.value)}
                    />
                </label>

                <button
                    type="button"
                    className="demo-primary-action"
                    onClick={handleSubmit}
                >
                    <Send size={16} />
                    Submit feedback
                </button>
            </section>

            {feedbackList.length === 0 ? (
                <PageState
                    state="empty"
                    title="No feedback yet"
                    description="Learner feedback will appear here after the course has reviews."
                />
            ) : (
                <div className="demo-list">
                    {feedbackList.map((feedback) => (
                        <article key={feedback.id} className="demo-list-item">
                            <div>
                                <strong>{feedback.learnerName}</strong>
                                <small>{formatDate(feedback.createdAt)}</small>
                                <p>{feedback.comment}</p>
                            </div>

                            <span className="demo-rating">
                                <Star size={14} />
                                {feedback.rating}
                            </span>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

function ModuleSection({ modules }) {
    return (
        <section className="demo-card">
            <div>
                <span className="demo-kicker">Course content</span>
                <h2>Modules and lessons</h2>
            </div>

            {modules.length === 0 ? (
                <PageState
                    state="empty"
                    title="No modules yet"
                    description="Published course modules will appear here."
                />
            ) : (
                <div className="course-module-list">
                    {modules.map((module) => (
                        <article key={module.id} className="course-module-card">
                            <div className="demo-row demo-row--between">
                                <div>
                                    <strong>{module.title}</strong>
                                    <small>
                                        {module.lessons.length} lessons
                                    </small>
                                </div>

                                <StatusBadge status={module.status} />
                            </div>

                            <div className="course-lesson-list">
                                {module.lessons.map((lesson) => (
                                    <div
                                        key={lesson.id}
                                        className="course-lesson-item"
                                    >
                                        <span>
                                            <BookOpen size={15} />
                                        </span>

                                        <div>
                                            <strong>{lesson.title}</strong>
                                            <small>
                                                {lesson.type} ·{" "}
                                                {lesson.durationMinutes} minutes
                                            </small>
                                            <p>{lesson.summary}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

export function CourseDetailPage() {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { loading, error } = useDemoPageState();

    const course = getLifecycleCourseById(courseId);
    const modules = getLifecycleModules(courseId);
    const currentUser = getCurrentUser();
    const enrollment = currentUser
        ? getDemoEnrollmentByCourse(courseId, currentUser.id)
        : null;

    const classes = demoClasses.filter(
        (classItem) => classItem.courseId === courseId,
    );

    const [, setFeedbackVersion] = useState(0);

    const feedbackList = getCourseFeedbackWithLocal(courseId);

    const averageRating = getAverageRating(feedbackList, course?.rating);

    useDocumentTitle(course ? course.title : "Course detail");

    const handleBackToCatalog = () => {
        navigate("/");

        window.setTimeout(() => {
            document.getElementById("courses")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }, 0);
    };

    if (loading) {
        return (
            <PageState
                state="loading"
                title="Loading course detail"
                description="Checking course modules, classes, feedback, and enrollment state."
            />
        );
    }

    if (error) {
        return (
            <PageState
                state="error"
                title="Course unavailable"
                description={error.message}
            />
        );
    }

    if (!course || !isCoursePublished(course)) {
        return (
            <PageState
                state="empty"
                title="Course not found"
                description="This course is not published or does not exist in demo data."
            />
        );
    }

    return (
        <main className="demo-page">
            <button
                type="button"
                className="demo-link-button"
                onClick={handleBackToCatalog}
            >
                <ArrowLeft size={16} />
                Back to catalog
            </button>

            <section className="course-detail-hero">
                <div>
                    <span className="demo-kicker">{course.category}</span>
                    <h1>{course.title}</h1>
                    <p>{course.shortDescription}</p>

                    <div className="demo-meta-grid demo-meta-grid--wide">
                        <span>
                            <GraduationCap size={16} /> {course.level}
                        </span>

                        <span>
                            <Layers3 size={16} />{" "}
                            {course.moduleCount || course.modules || 0} modules
                        </span>

                        <span>
                            <BookOpen size={16} />{" "}
                            {course.lessonCount || course.lessons || 0} lessons
                        </span>

                        <span>
                            <Clock3 size={16} /> {course.duration}
                        </span>

                        <span>
                            <Star size={16} /> {averageRating || "New"}
                        </span>
                    </div>
                </div>

                <aside className="demo-card course-detail-panel">
                    <StatusBadge
                        status={enrollment?.status || "not enrolled"}
                        tone={enrollment ? enrollment.status : "not-enrolled"}
                    />

                    <span className="demo-kicker">Course price</span>
                    <strong>{formatPrice(course)}</strong>

                    <div className="lesson-content__media">
                        <BookOpen size={34} />
                        <span>Preview video placeholder</span>
                    </div>

                    <div className="course-detail-price-meta">
                        <span>
                            <Users size={15} />
                            {course.learnerCount || course.enrolledCount}{" "}
                            enrolled learners
                        </span>

                        <span>
                            <CalendarDays size={15} />
                            Updated {formatDate(course.updatedAt)}
                        </span>
                    </div>

                    {enrollment ? (
                        <>
                            <ProgressBar
                                value={enrollment.progress}
                                label="Course progress"
                            />

                            <Link
                                className="demo-primary-action"
                                to={`/learning/${course.id}`}
                            >
                                Go to Learning <ArrowRight size={16} />
                            </Link>
                        </>
                    ) : (
                        <Link
                            className="demo-primary-action"
                            to={`/checkout/${course.id}`}
                        >
                            Buy Now <ArrowRight size={16} />
                        </Link>
                    )}

                    <div className="course-includes-list">
                        <strong>Course includes</strong>
                        <span>Video lessons</span>
                        <span>Reading materials</span>
                        <span>AI assistant</span>
                        <span>AI flashcards</span>
                        <span>AI practice tests</span>
                        <span>Certificate mock</span>
                    </div>
                </aside>
            </section>

            <section className="course-detail-layout">
                <div className="course-detail-main">
                    <section className="demo-card">
                        <span className="demo-kicker">
                            What you will achieve
                        </span>
                        <h2>Learning outcomes</h2>

                        <ul className="demo-check-list">
                            {(
                                course.learningOutcomes ||
                                course.outcomes ||
                                []
                            ).map((outcome) => (
                                <li key={outcome}>
                                    <CheckCircle2 size={17} /> {outcome}
                                </li>
                            ))}
                        </ul>
                    </section>

                    <ModuleSection modules={modules} />

                    <section className="demo-card">
                        <span className="demo-kicker">Requirements</span>
                        <h2>Before you start</h2>
                        <p>{course.requirements}</p>
                    </section>

                    <section className="demo-card">
                        <span className="demo-kicker">Description</span>
                        <h2>About this course</h2>
                        <p>{course.fullDescription}</p>
                    </section>

                    <section className="demo-card">
                        <span className="demo-kicker">AI learning support</span>
                        <h2>Study with SLP AI support</h2>
                        <div className="demo-chip-list">
                            <span>Ask AI about lessons</span>
                            <span>Generate flashcards</span>
                            <span>Create practice tests</span>
                            <span>Save key points</span>
                        </div>
                    </section>

                    <FeedbackSection
                        courseId={course.id}
                        feedbackList={feedbackList}
                        averageRating={averageRating}
                        onCreated={() =>
                            setFeedbackVersion((current) => current + 1)
                        }
                    />
                </div>

                <CourseClassList classes={classes} />
            </section>
        </main>
    );
}
