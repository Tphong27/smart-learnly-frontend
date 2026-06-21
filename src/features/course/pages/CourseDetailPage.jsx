import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  PlayCircle,
  Sparkles,
  Star,
} from "lucide-react";
import { useToast } from "@/shared/components/ui";
import {
  formatVnd,
  getDiscountPercent,
  getDisplayPrice,
  getOriginalPrice,
  hasValidDiscount,
} from "../utils/course-price";
import {
  courseService,
  cartService,
  orderService,
  cartPriceCacheService,
} from "@/services";
import "../../admin/admin-shared.css";
import "./CourseDetailPage.css";

function LessonIcon({ type }) {
  const t = (type || "").toLowerCase();
  if (t.includes("video")) return <PlayCircle size={16} />;
  if (t.includes("quiz") || t.includes("test")) return <FileText size={16} />;
  return <BookOpen size={16} />;
}

export function CourseDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [addToCartLoading, setAddToCartLoading] = useState(false);
  const [buyNowLoading, setBuyNowLoading] = useState(false);
  const toast = useToast();
  const location = useLocation();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const backTo = location.state?.from
    ? `${location.state.from}${location.state.fromHash || ""}`
    : "/#courses";

  const backLabel = location.state?.backLabel || "Back to courses";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await courseService.getPublicDetail(slug);
        if (!cancelled) setCourse(data);
      } catch (err) {
        if (cancelled) return;
        const message = err?.message || "Could not load this course.";
        setError(message);
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (slug) load();
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
        <Link to="/" className="course-detail__back-link">
          <ArrowLeft size={14} /> Back to home
        </Link>
      </div>
    );
  }

  const objectives = course.learningObjectives || [];
  const modules = course.modules || [];
  const totalLessons = modules.reduce(
    (sum, m) => sum + (m.lessons?.length || 0),
    0,
  );
  const previewLessons = modules.flatMap((m) =>
    (m.lessons || []).filter((l) => l.preview),
  );
  const originalPrice = getOriginalPrice(course);
  const displayPrice = getDisplayPrice(course);
  const hasDiscount = hasValidDiscount(course);
  const discountPercent = getDiscountPercent(course);

  function hasAccessToken() {
    const token = localStorage.getItem("accessToken");
    return token && token !== "undefined" && token !== "null";
  }

  function isFreeCourse(courseData) {
    return courseData?.isFree === true || Number(courseData?.price || 0) <= 0;
  }

  function getCourseId() {
    return course?.id;
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

  function ensurePaidCourse() {
    if (!isFreeCourse(course)) {
      return true;
    }

    toast.error(
      "Free enrollment is handled by the enrollment flow. Please use the free enrollment action when integrated.",
    );

    return false;
  }

  async function handleAddToCartClick() {
    if (!ensureAuthenticated()) return;
    if (!ensurePaidCourse()) return;

    const courseId = getCourseId();

    if (!courseId) {
      toast.error("Course information is missing.");
      return;
    }

    setAddToCartLoading(true);

    try {
      await cartService.addItem({
        courseId,
        classId: null,
      });

      cartPriceCacheService.saveCourse(course);

      toast.success("Course added to cart.");
      navigate("/cart");
    } catch (err) {
      toast.error(err?.message || "Could not add course to cart.");
    } finally {
      setAddToCartLoading(false);
    }
  }

  async function handleBuyNowClick() {
    if (!ensureAuthenticated()) return;
    if (!ensurePaidCourse()) return;

    const courseId = getCourseId();

    if (!courseId) {
      toast.error("Course information is missing.");
      return;
    }

    setBuyNowLoading(true);

    try {
      await cartService.addItem({
        courseId,
        classId: null,
      });

      cartPriceCacheService.saveCourse(course);

      const latestCart = await cartService.getCart();

      if (!latestCart?.id) {
        throw new Error("Cart is not ready.");
      }

      const checkout = await orderService.checkout(latestCart.id);

      toast.success("Checkout created.");

      navigate(`/checkout/${checkout.orderId}`, {
        state: {
          checkout,
          expectedCourse: {
            courseId,
            title: course.title,
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
            <div className="course-detail__action-grid">
              <button
                type="button"
                onClick={handleBuyNowClick}
                disabled={
                  addToCartLoading || buyNowLoading || isFreeCourse(course)
                }
                className="button button--primary course-detail__cta"
              >
                {buyNowLoading ? "Processing..." : "Buy Now"}
              </button>

              <Link
                to={`/courses/${course.id || course.slug}/preview`}
                className="button button--primary course-detail__cta"
              >
                Preview Lesson
              </Link>

              <button
                type="button"
                onClick={handleAddToCartClick}
                disabled={addToCartLoading || buyNowLoading}
                className="button button--outline course-detail__cta course-detail__cta--full"
              >
                {addToCartLoading
                  ? "Adding..."
                  : isFreeCourse(course)
                    ? "Enroll for free"
                    : "Add to Cart"}
              </button>
            </div>

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
    </div>
  );
}
