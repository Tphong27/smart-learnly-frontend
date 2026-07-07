import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  Layers,
  PlayCircle,
  Sparkles,
  Star,
} from "lucide-react";
import { useToast } from "@/shared/components/ui";
// import { SiteHeader } from "@/shared/components/SiteHeader";
import {
  formatVnd,
  getDiscountPercent,
  getDisplayPrice,
  getOriginalPrice,
  hasValidDiscount,
} from "../utils/course-price";
import { isLessonPublished } from "../utils/lesson-status";
import { courseService, orderService, enrollmentService } from "@/services";
import { ClassSelectionPopup } from "../components/ClassSelectionPopup";
import "../../admin/admin-shared.css";
import "./CourseDetailPage.css";

function LessonIcon({ type }) {
  const t = (type || "").toLowerCase();
  if (t.includes("video")) return <PlayCircle size={16} />;
  if (t.includes("quiz") || t.includes("test")) return <FileText size={16} />;
  if (t.includes("flashcard")) return <Layers size={16} />;
  return <BookOpen size={16} />;
}

export function CourseDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const toast = useToast();
  const location = useLocation();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [classPopupOpen, setClassPopupOpen] = useState(false);
  const [checkoutClassId, setCheckoutClassId] = useState(null);
  const [freeEnrollLoading, setFreeEnrollLoading] = useState(false);

  function hasAccessToken() {
    const token = localStorage.getItem("accessToken");
    return token && token !== "undefined" && token !== "null";
  }

  const backTo = location.state?.from
    ? `${location.state.from}${location.state.fromHash || ""}`
    : "/#courses";

  const backLabel = location.state?.backLabel || "Back to courses";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setIsEnrolled(false);

      try {
        const data = await courseService.getPublicDetail(slug);

        if (cancelled) return;

        setCourse(data);

        if (hasAccessToken()) {
          try {
            const enrolled = await courseService.isCourseEnrolled(
              data?.id || data?.slug || slug,
            );

            if (!cancelled) {
              setIsEnrolled(enrolled);
            }
          } catch {
            if (!cancelled) {
              setIsEnrolled(false);
            }
          }
        }
      } catch (err) {
        if (cancelled) return;

        const message = err?.message || "Could not load this course.";
        setError(message);
        toast.error(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (slug) {
      load();
    }

    return () => {
      cancelled = true;
    };
  }, [slug, toast]);

  if (loading) {
    return (
      <div className="course-detail">
        <div className="admin-loading">Loading course...</div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="course-detail">
        <div className="admin-error">{error || "Course not found."}</div>
        <Link to={backTo} className="course-detail__back-link">
          <ArrowLeft size={14} /> {backLabel}
        </Link>
      </div>
    );
  }

  const objectives = course.learningObjectives || [];
  const modules = (course.modules || [])
    .map((module) => ({
      ...module,
      lessons: (module.lessons || []).filter((lesson) =>
        isLessonPublished(lesson),
      ),
    }))
    .filter((module) => (module.lessons || []).length > 0);
  const classes = course.classes || [];
  const totalLessons = modules.reduce(
    (sum, m) => sum + (m.lessons?.length || 0),
    0,
  );
  const previewLessons = modules.flatMap((m) =>
    (m.lessons || []).filter((l) => l.preview || l.isPreview),
  );
  const originalPrice = getOriginalPrice(course);
  const displayPrice = getDisplayPrice(course);
  const hasDiscount = hasValidDiscount(course);
  const discountPercent = getDiscountPercent(course);

  function isFreeCourse(courseData) {
    return courseData?.isFree === true || Number(courseData?.price || 0) <= 0;
  }

  function getCourseId() {
    return course?.id;
  }

  function isClassSelectable(classItem) {
    const status = String(classItem?.status || "").toUpperCase();
    const availableSlots = Number(classItem?.availableSlots ?? 0);

    return (
      status !== "CANCELLED" && status !== "COMPLETED" && availableSlots > 0
    );
  }

  function ensureAuthenticated() {
    if (hasAccessToken()) {
      return true;
    }

    navigate("/login", {
      state: {
        from: `/courses/${course.slug || course.id}`,
      },
    });

    return false;
  }

  async function handleFreeEnroll(classItem) {
    if (!ensureAuthenticated()) return;

    const courseId = getCourseId();

    if (!courseId) {
      toast.error("Course information is missing.");
      return;
    }

    if (!classItem?.id) {
      toast.error("Please choose a class before enrollment.");
      return;
    }

    if (!isClassSelectable(classItem)) {
      toast.error("This class is not available for enrollment.");
      return;
    }

    setCheckoutClassId(classItem.id);
    setFreeEnrollLoading(true);

    try {
      const enrollment = await enrollmentService.enrollFree({
        courseId,
        classId: classItem.id,
      });

      setIsEnrolled(true);
      setClassPopupOpen(false);

      toast.success(
        enrollment?.alreadyEnrolled
          ? "You are already enrolled in this course and class."
          : "Enrollment completed successfully.",
      );

      navigate(`/learning/courses/${courseId}?classId=${classItem.id}`);
    } catch (err) {
      toast.error(err?.message || "Could not enroll in this free course.");
    } finally {
      setFreeEnrollLoading(false);
      setCheckoutClassId(null);
    }
  }

  function handleBuyNowClick() {
    if (!ensureAuthenticated()) return;

    if (classes.length === 0) {
      toast.error("This course does not have any available class yet.");
      return;
    }

    setClassPopupOpen(true);
  }

  async function handleCheckoutSelectedClass(classItem) {
    if (!ensureAuthenticated()) return;

    const courseId = getCourseId();

    if (!courseId) {
      toast.error("Course information is missing.");
      return;
    }

    if (!classItem?.id) {
      toast.error("Class information is missing.");
      return;
    }

    if (!isClassSelectable(classItem)) {
      toast.error(
        isFreeCourse(course)
          ? "This class is not available for enrollment."
          : "This class is not available for checkout.",
      );
      return;
    }

    if (isFreeCourse(course)) {
      await handleFreeEnroll(classItem);
      return;
    }

    setCheckoutClassId(classItem.id);
    setBuyNowLoading(true);

    try {
      const checkout = await orderService.checkout({
        courseId,
        classId: classItem.id,
      });

      toast.success("Checkout created.");

      navigate(`/checkout/${checkout.orderId}`, {
        state: {
          checkout,
          expectedCourse: {
            courseId,
            classId: classItem.id,
            title: course.title,
            className: classItem.className,
            trainerName: classItem.trainerName,
            scheduleDescription: classItem.scheduleDescription,
            startDate: classItem.startDate,
            endDate: classItem.endDate,
            originalPrice,
            displayPrice,
            hasDiscount,
            discountPercent,
            currency: course.currency ?? "VND",
          },
        },
      });
    } catch (err) {
      toast.error(err?.message || "Could not start checkout.");
    } finally {
      setBuyNowLoading(false);
      setCheckoutClassId(null);
    }
  }

  return (
    <div className="course-detail">
      <div className="course-detail__hero">
        <div className="course-detail__hero-main">
          <Link to={backTo} className="course-detail__back-link">
            <ArrowLeft size={14} /> {backLabel}
          </Link>

          {course.category && (
            <Link
              to={`/?category=${course.category.slug}`}
              className="course-detail__chip"
            >
              {course.category.name}
            </Link>
          )}

          <h1 className="course-detail__title">{course.title}</h1>

          {course.description && (
            <p className="course-detail__lede">{course.description}</p>
          )}

          <div className="course-detail__meta">
            {course.featured && (
              <span className="course-detail__badge course-detail__badge--featured">
                <Star size={14} /> Featured
              </span>
            )}
            <span className="course-detail__meta-item">
              <BookOpen size={14} /> {modules.length}{" "}
              {modules.length === 1 ? "module" : "modules"}
            </span>
            <span className="course-detail__meta-item">
              <Clock3 size={14} /> {totalLessons}{" "}
              {totalLessons === 1 ? "lesson" : "lessons"}
            </span>
            {previewLessons.length > 0 && (
              <span className="course-detail__meta-item">
                <Sparkles size={14} /> {previewLessons.length} Preview available
              </span>
            )}
          </div>
        </div>

        <aside className="course-detail__sidecard">
          <div className="course-detail__sidecard-thumb">
            {course.avatarUrl ? (
              <img src={course.avatarUrl} alt={course.title} />
            ) : (
              <div className="course-detail__sidecard-thumb-fallback">
                <BookOpen size={32} />
              </div>
            )}
          </div>
          <div className="course-detail__sidecard-body">
            <div className="course-detail__price-block">
              {hasDiscount ? (
                <>
                  <div className="course-detail__price-row">
                    <span className="course-detail__price-current">
                      <span>Discount price</span>
                      {formatVnd(displayPrice)}
                    </span>

                    <span className="course-detail__discount-badge">
                      -{discountPercent}%
                    </span>
                  </div>

                  <div className="course-detail__price-original">
                    <span>Original price</span>
                    <s>{formatVnd(originalPrice)}</s>
                  </div>
                </>
              ) : (
                <div className="course-detail__price-current">
                  <span>Course price</span>
                  {formatVnd(displayPrice)}
                </div>
              )}
            </div>
            {!isEnrolled && (
              <div className="course-detail__action-grid">
                <button
                  type="button"
                  onClick={handleBuyNowClick}
                  disabled={buyNowLoading || freeEnrollLoading}
                  className="button button--primary course-detail__cta"
                >
                  {freeEnrollLoading || buyNowLoading
                    ? "Processing..."
                    : isFreeCourse(course)
                      ? "Enroll Now"
                      : "Buy Now"}
                </button>

                <Link
                  to={`/courses/${course.id || course.slug}/preview`}
                  className="button button--primary course-detail__cta"
                >
                  Preview Lesson
                </Link>
              </div>
            )}
            {isEnrolled && (
              <div className="course-detail__enrolled-box">
                <CheckCircle2 size={18} />
                <div>
                  <strong>You are already enrolled in this course.</strong>
                  <span>You can continue learning from My Courses.</span>
                </div>
              </div>
            )}

            <ul className="course-detail__sidecard-list">
              <li>
                <CheckCircle2 size={14} /> Lifetime access to course materials
              </li>
              <li>
                <CheckCircle2 size={14} /> Sample lessons available before
                enrollment
              </li>
              <li>
                <CheckCircle2 size={14} /> Updated curriculum aligned with
                industry needs
              </li>
            </ul>
          </div>
        </aside>
      </div>

      {objectives.length > 0 && (
        <section className="course-detail__section">
          <h2 className="course-detail__section-title">What you will learn</h2>
          <ul className="course-detail__objectives">
            {objectives.map((obj) => (
              <li key={obj.id}>
                <CheckCircle2 size={16} />
                <div>
                  {obj.code && <strong>{obj.code}</strong>}
                  <span>{obj.description}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="course-detail__section">
        <h2 className="course-detail__section-title">Course content</h2>
        <p className="course-detail__section-sub">
          {modules.length} {modules.length === 1 ? "module" : "modules"} ·{" "}
          {totalLessons} {totalLessons === 1 ? "lesson" : "lessons"}
        </p>

        {modules.length === 0 ? (
          <div className="admin-empty">No modules have been published yet.</div>
        ) : (
          <ol className="course-detail__modules">
            {modules
              .slice()
              .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
              .map((mod, idx) => (
                <li key={mod.id} className="course-detail__module">
                  <div className="course-detail__module-head">
                    <span className="course-detail__module-index">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="course-detail__module-title">
                        {mod.title}
                      </h3>
                      <small>
                        {mod.lessons?.length || 0}{" "}
                        {(mod.lessons?.length || 0) === 1
                          ? "lesson"
                          : "lessons"}
                      </small>
                    </div>
                  </div>

                  <ul className="course-detail__lessons">
                    {(mod.lessons || [])
                      .slice()
                      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
                      .map((lesson) => (
                        <li key={lesson.id} className="course-detail__lesson">
                          <span className="course-detail__lesson-icon">
                            <LessonIcon type={lesson.lessonType} />
                          </span>
                          <span className="course-detail__lesson-title">
                            {lesson.title}
                          </span>
                          {lesson.preview && (
                            <span className="course-detail__lesson-tag">
                              Preview
                            </span>
                          )}
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
          </ol>
        )}
      </section>

      <section className="course-detail__cta-row">
        <div>
          <h3>Ready to dive in?</h3>
          <p>
            Try the free preview lessons before committing to the full course.
          </p>
        </div>
        <Link
          to={`/courses/${course.id || course.slug}/preview`}
          className="button button--primary button--md"
        >
          Start preview
        </Link>
      </section>

      {classPopupOpen && (
        <ClassSelectionPopup
          classes={classes}
          buyNowLoading={buyNowLoading || freeEnrollLoading}
          checkoutClassId={checkoutClassId}
          isClassSelectable={isClassSelectable}
          onClose={() => setClassPopupOpen(false)}
          onSelectClass={handleCheckoutSelectedClass}
        />
      )}
    </div>
  );
}
