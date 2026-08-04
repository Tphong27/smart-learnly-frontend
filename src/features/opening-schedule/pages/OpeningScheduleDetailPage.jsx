import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  enrollmentService,
  getAccessToken,
  openingScheduleService,
  orderService,
} from "@/services";
import { useToast } from "@/shared/components/ui";
import { ScheduleCalendar } from "@/shared/components/scheduleCalendar";
import { formatDate, formatPrice, toNumber } from "@/shared/utils/formatters";
import "../opening-schedule.css";

const DETAIL_DATE_OPTIONS = {
  day: "2-digit",
  month: "long",
  year: "numeric",
};

export function OpeningScheduleDetailPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [classItem, setClassItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const backTarget = location.state?.from || "/opening-schedule";
  const backLabel = location.state?.backLabel || "Back to Opening Schedule";

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      setLoading(true);
      setError("");

      try {
        const result = await openingScheduleService.getDetail(classId);

        if (!cancelled) {
          setClassItem(result);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError?.message || "Could not load class detail.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (classId) {
      loadDetail();
    }

    return () => {
      cancelled = true;
    };
  }, [classId]);

  async function handleRegister() {
    if (!getAccessToken()) {
      navigate("/login", {
        state: {
          from: `/opening-schedule/${classId}`,
        },
      });

      return;
    }

    if (!classItem?.courseId) {
      toast.error("Course information is missing.");
      return;
    }

    if (!classItem?.classId) {
      toast.error("Class information is missing.");
      return;
    }

    if (String(classItem.status || "").toUpperCase() !== "UPCOMING") {
      toast.error("This class is not open for registration.");
      return;
    }

    if (Number(classItem.availableSlots || 0) <= 0) {
      toast.error("This class is already full.");
      return;
    }

    if (
      classItem.price === null ||
      classItem.price === undefined ||
      classItem.price === ""
    ) {
      toast.error("Class price is not configured.");
      return;
    }

    const classPrice = Number(classItem.price);

    if (!Number.isFinite(classPrice) || classPrice < 0) {
      toast.error("Class price is invalid.");
      return;
    }

    setSubmitting(true);

    try {
      //OFFLINE CLASS MIỄN PHÍ
      if (classPrice === 0) {
        const enrollment = await enrollmentService.enrollFreeClass(
          classItem.classId,
        );

        if (enrollment?.alreadyEnrolled) {
          toast.success("You are already enrolled in this class.");
        } else if (enrollment?.reactivated) {
          toast.success("Your class enrollment has been reactivated.");
        } else {
          toast.success("Class enrollment completed.");
        }

        navigate(
          `/learning/courses/${classItem.courseId}` +
            `?classId=${classItem.classId}`,
        );

        return;
      }

      //OFFLINE CLASS CÓ PHÍ
      const checkout = await orderService.checkoutClass(
        classItem.courseId,
        classItem.classId,
      );

      toast.success("Class checkout created.");

      navigate(`/checkout/${checkout.orderId}`, {
        state: {
          checkout,
          expectedCourse: {
            itemType: "CLASS",
            courseId: classItem.courseId,
            classId: classItem.classId,
            title: classItem.courseTitle,
            className: classItem.className,
            trainerName: classItem.trainerName,
            scheduleDescription: classItem.scheduleDescription,
            startDate: classItem.startDate,
            endDate: classItem.endDate,
            displayPrice: classItem.price,
            currency: "VND",
          },
        },
      });
    } catch (requestError) {
      toast.error(
        requestError?.message || "Could not register for this class.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="opening-detail">
        <div className="opening-state">
          <LoaderCircle className="opening-spinner" size={38} />

          <p>Loading class detail...</p>
        </div>
      </main>
    );
  }

  if (error || !classItem) {
    return (
      <main className="opening-detail">
        <div className="opening-state opening-state--error">
          <AlertCircle size={42} />

          <p>{error || "Opening class was not found."}</p>

          <Link
            to={backTarget}
            className="opening-button opening-button--primary"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {backLabel}
          </Link>
        </div>
      </main>
    );
  }

  const availableSlots = toNumber(classItem.availableSlots, 0);
  const normalizedClassPrice =
    classItem.price === null ||
    classItem.price === undefined ||
    classItem.price === ""
      ? Number.NaN
      : Number(classItem.price);
  const hasValidClassPrice =
    Number.isFinite(normalizedClassPrice) && normalizedClassPrice >= 0;
  const isFreeClass = hasValidClassPrice && normalizedClassPrice === 0;
  const canRegister =
    String(classItem.status || "").toUpperCase() === "UPCOMING" &&
    availableSlots > 0 &&
    hasValidClassPrice;

  return (
    <main className="opening-detail">
      <div className="opening-detail__hero">
        <div className="opening-detail__hero-main">
          <Link to={backTarget} className="opening-detail__back">
            <ArrowLeft size={14} aria-hidden="true" />
            {backLabel}
          </Link>

          <section className="opening-detail__hero-card">
            {classItem.courseSlug ? (
              <Link
                to={`/courses/${classItem.courseSlug}`}
                className="opening-detail__chip"
              >
                {classItem.courseTitle}
              </Link>
            ) : (
              <span className="opening-detail__chip">
                {classItem.courseTitle}
              </span>
            )}

            <span className="opening-detail__eyebrow">Offline class</span>

            <h1 className="opening-detail__title">{classItem.className}</h1>

            <p className="opening-detail__lede">
              Join this scheduled offline class and access the associated course
              learning content after registration.
            </p>

            <div className="opening-detail__meta">
              <span className="opening-detail__meta-item">
                <UserRound size={15} aria-hidden="true" />
                {classItem.trainerName || "Trainer not assigned"}
              </span>

              <span className="opening-detail__meta-item">
                <CalendarDays size={15} aria-hidden="true" />
                {formatDate(classItem.startDate, "vi-VN", DETAIL_DATE_OPTIONS)}
                {" – "}
                {formatDate(classItem.endDate, "vi-VN", DETAIL_DATE_OPTIONS)}
              </span>

              <span className="opening-detail__meta-item">
                <Users size={15} aria-hidden="true" />
                {availableSlots} places remaining
              </span>
            </div>
          </section>

          <section className="opening-detail__section">
            <div className="opening-detail__section-head">
              <div>
                <h2 className="opening-detail__section-title">
                  Class information
                </h2>

                <p className="opening-detail__section-sub">
                  Review the trainer, class duration, availability and weekly
                  schedule before registering.
                </p>
              </div>
            </div>

            <div className="opening-detail__information">
              <article className="opening-detail__information-item">
                <UserRound size={18} aria-hidden="true" />

                <div>
                  <small>Trainer</small>
                  <strong>
                    {classItem.trainerName || "Trainer not assigned"}
                  </strong>
                </div>
              </article>

              <article className="opening-detail__information-item">
                <CalendarDays size={18} aria-hidden="true" />

                <div>
                  <small>Duration</small>
                  <strong>
                    {formatDate(
                      classItem.startDate,
                      "vi-VN",
                      DETAIL_DATE_OPTIONS,
                    )}
                    {" – "}
                    {formatDate(
                      classItem.endDate,
                      "vi-VN",
                      DETAIL_DATE_OPTIONS,
                    )}
                  </strong>
                </div>
              </article>

              <article className="opening-detail__information-item">
                <Users size={18} aria-hidden="true" />

                <div>
                  <small>Availability</small>
                  <strong>
                    {availableSlots} of {classItem.maxStudents} places remaining
                  </strong>
                </div>
              </article>

              <article className="opening-detail__information-item">
                <BookOpen size={18} aria-hidden="true" />

                <div>
                  <small>Learning mode</small>
                  <strong>Offline class</strong>
                </div>
              </article>

              <article className="opening-detail__information-item opening-detail__information-item--schedule">
                <Clock3 size={18} aria-hidden="true" />

                <div className="opening-detail__schedule-content">
                  <small>Weekly schedule</small>

                  <ScheduleCalendar
                    scheduleDescription={classItem.scheduleDescription}
                    emptyText="Schedule not available"
                  />
                </div>
              </article>
            </div>
          </section>
        </div>

        <aside className="opening-detail__sidecard">
          <div className="opening-detail__sidecard-thumb">
            {classItem.courseThumbnailUrl ? (
              <img
                src={classItem.courseThumbnailUrl}
                alt={classItem.courseTitle}
              />
            ) : (
              <div className="opening-detail__sidecard-thumb-fallback">
                <BookOpen size={48} aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="opening-detail__sidecard-body">
            <span
              className={
                canRegister
                  ? "opening-detail__status opening-detail__status--available"
                  : "opening-detail__status opening-detail__status--unavailable"
              }
            >
              {canRegister
                ? "Open for registration"
                : availableSlots <= 0
                  ? "Class full"
                  : "Registration unavailable"}
            </span>

            <div className="opening-detail__price-block">
              <span>Class tuition</span>

              <strong className="opening-detail__price">
                {formatPrice(classItem.price, isFreeClass)}
              </strong>
            </div>

            <p className="opening-detail__sidecard-copy">
              {isFreeClass
                ? "Registration is free and grants access to this class's course content."
                : "Payment registers you for this offline class and grants access to its course content."}
            </p>

            <button
              type="button"
              className="opening-button opening-button--primary opening-detail__register"
              disabled={!canRegister || submitting}
              aria-busy={submitting}
              onClick={handleRegister}
            >
              {submitting
                ? isFreeClass
                  ? "Registering..."
                  : "Creating checkout..."
                : canRegister
                  ? isFreeClass
                    ? "Register for free"
                    : "Register and pay"
                  : "Registration unavailable"}
            </button>

            <ul className="opening-detail__sidecard-list">
              <li>
                <CheckCircle2 size={15} aria-hidden="true" />
                Access to the associated course content
              </li>

              <li>
                <CheckCircle2 size={15} aria-hidden="true" />
                Trainer-led offline learning schedule
              </li>

              <li>
                <CheckCircle2 size={15} aria-hidden="true" />
                Class capacity is limited to {classItem.maxStudents} learners
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
