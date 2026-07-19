import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CalendarDays,
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
            to="/opening-schedule"
            className="opening-button opening-button--primary"
          >
            Back to Opening Schedule
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
  const backTarget = location.state?.from || "/opening-schedule";
  const backLabel = location.state?.backLabel || "Back to Opening Schedule";

  return (
    <main className="opening-detail">
      <Link to={backTarget} className="opening-detail__back">
        <ArrowLeft size={17} />
        {backLabel}
      </Link>

      <section className="opening-detail__layout">
        <div className="opening-detail__main">
          <div className="opening-detail__hero">
            {classItem.courseThumbnailUrl ? (
              <img
                src={classItem.courseThumbnailUrl}
                alt={classItem.courseTitle}
              />
            ) : (
              <div className="opening-detail__image-fallback">
                <BookOpen size={58} />
              </div>
            )}

            <div>
              <span className="opening-page__eyebrow">Offline class</span>

              <p className="opening-detail__course">{classItem.courseTitle}</p>

              <h1>{classItem.className}</h1>
            </div>
          </div>

          <section className="opening-detail__section">
            <h2>Class information</h2>

            <div className="opening-detail__information">
              <div>
                <UserRound size={20} />

                <span>
                  <small>Trainer</small>
                  <strong>{classItem.trainerName || "Not assigned"}</strong>
                </span>
              </div>

              <div>
                <CalendarDays size={20} />

                <span>
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
                </span>
              </div>

              <div className="opening-detail__information-item opening-detail__information-item--schedule">
                <Clock3 size={20} />
                <span className="opening-detail__schedule-content">
                  <small>Schedule</small>
                  <ScheduleCalendar
                    scheduleDescription={classItem.scheduleDescription}
                  />
                </span>
              </div>

              <div>
                <Users size={20} />

                <span>
                  <small>Availability</small>
                  <strong>
                    {availableSlots} of {classItem.maxStudents} places remaining
                  </strong>
                </span>
              </div>
            </div>
          </section>
        </div>

        <aside className="opening-detail__checkout">
          <span>Class tuition</span>

          <strong className="opening-detail__price">
            {formatPrice(classItem.price, isFreeClass)}
          </strong>

          <p>
            {isFreeClass
              ? "Registration is free and grants access to this class's course content."
              : "This payment registers you for the selected offline class and grants access to its course learning content."}
          </p>

          <button
            type="button"
            className="opening-button opening-button--primary opening-detail__register"
            disabled={!canRegister || submitting}
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
        </aside>
      </section>
    </main>
  );
}
