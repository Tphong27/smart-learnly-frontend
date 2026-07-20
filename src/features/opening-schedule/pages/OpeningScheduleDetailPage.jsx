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
import {
  useEffect,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  openingScheduleService,
  orderService,
} from "@/services";
import {
  useToast,
} from "@/shared/components/ui";
import "../opening-schedule.css";

function formatMoney(value) {
  const amount = Number(value || 0);

  if (amount <= 0) {
    return "Free";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value) {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function hasAccessToken() {
  const token =
    localStorage.getItem("accessToken");

  return Boolean(
    token &&
      token !== "undefined" &&
      token !== "null",
  );
}

export function OpeningScheduleDetailPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [classItem, setClassItem] =
    useState(null);
  const [loading, setLoading] =
    useState(true);
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      setLoading(true);
      setError("");

      try {
        const result =
          await openingScheduleService
            .getDetail(classId);

        if (!cancelled) {
          setClassItem(result);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError?.message ||
              "Could not load class detail.",
          );
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
    if (!hasAccessToken()) {
      navigate("/login", {
        state: {
          from:
            `/opening-schedule/${classId}`,
        },
      });

      return;
    }

    if (!classItem?.courseId) {
      toast.error(
        "Course information is missing.",
      );
      return;
    }

    if (!classItem?.classId) {
      toast.error(
        "Class information is missing.",
      );
      return;
    }

    if (
      String(
        classItem.status || "",
      ).toUpperCase() !== "UPCOMING"
    ) {
      toast.error(
        "This class is not open for registration.",
      );
      return;
    }

    if (
      Number(
        classItem.availableSlots || 0,
      ) <= 0
    ) {
      toast.error(
        "This class is already full.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const checkout =
        await orderService.checkoutClass(
          classItem.courseId,
          classItem.classId,
        );

      toast.success(
        "Class checkout created.",
      );

      navigate(
        `/checkout/${checkout.orderId}`,
        {
          state: {
            checkout,
            expectedCourse: {
              itemType: "CLASS",
              courseId:
                classItem.courseId,
              classId:
                classItem.classId,
              title:
                classItem.courseTitle,
              className:
                classItem.className,
              trainerName:
                classItem.trainerName,
              scheduleDescription:
                classItem.scheduleDescription,
              startDate:
                classItem.startDate,
              endDate:
                classItem.endDate,
              displayPrice:
                classItem.price,
              currency: "VND",
            },
          },
        },
      );
    } catch (requestError) {
      toast.error(
        requestError?.message ||
          "Could not start class checkout.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="opening-detail">
        <div className="opening-state">
          <LoaderCircle
            className="opening-spinner"
            size={38}
          />

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

          <p>
            {error ||
              "Opening class was not found."}
          </p>

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

  const availableSlots = Number(
    classItem.availableSlots || 0,
  );

  const canRegister =
    String(
      classItem.status || "",
    ).toUpperCase() === "UPCOMING" &&
    availableSlots > 0 &&
    classItem.price !== null &&
    classItem.price !== undefined;

  const backTarget =
    location.state?.from ||
    "/opening-schedule";

  const backLabel =
    location.state?.backLabel ||
    "Back to Opening Schedule";

  return (
    <main className="opening-detail">
      <Link
        to={backTarget}
        className="opening-detail__back"
      >
        <ArrowLeft size={17} />
        {backLabel}
      </Link>

      <section className="opening-detail__layout">
        <div className="opening-detail__main">
          <div className="opening-detail__hero">
            {classItem.courseThumbnailUrl ? (
              <img
                src={
                  classItem.courseThumbnailUrl
                }
                alt={classItem.courseTitle}
              />
            ) : (
              <div className="opening-detail__image-fallback">
                <BookOpen size={58} />
              </div>
            )}

            <div>
              <span className="opening-page__eyebrow">
                Offline class
              </span>

              <p className="opening-detail__course">
                {classItem.courseTitle}
              </p>

              <h1>
                {classItem.className}
              </h1>
            </div>
          </div>

          <section className="opening-detail__section">
            <h2>Class information</h2>

            <div className="opening-detail__information">
              <div>
                <UserRound size={20} />

                <span>
                  <small>Trainer</small>
                  <strong>
                    {classItem.trainerName ||
                      "Not assigned"}
                  </strong>
                </span>
              </div>

              <div>
                <CalendarDays size={20} />

                <span>
                  <small>Duration</small>
                  <strong>
                    {formatDate(
                      classItem.startDate,
                    )}
                    {" – "}
                    {formatDate(
                      classItem.endDate,
                    )}
                  </strong>
                </span>
              </div>

              <div>
                <Clock3 size={20} />

                <span>
                  <small>Schedule</small>
                  <strong>
                    {classItem.scheduleDescription ||
                      "Not scheduled"}
                  </strong>
                </span>
              </div>

              <div>
                <Users size={20} />

                <span>
                  <small>Availability</small>
                  <strong>
                    {availableSlots} of{" "}
                    {classItem.maxStudents}{" "}
                    places remaining
                  </strong>
                </span>
              </div>
            </div>
          </section>
        </div>

        <aside className="opening-detail__checkout">
          <span>Class tuition</span>

          <strong className="opening-detail__price">
            {formatMoney(
              classItem.price,
            )}
          </strong>

          <p>
            This payment registers you for
            the selected offline class and
            grants access to its course
            learning content.
          </p>

          <button
            type="button"
            className="opening-button opening-button--primary opening-detail__register"
            disabled={
              !canRegister ||
              submitting
            }
            onClick={handleRegister}
          >
            {submitting
              ? "Creating checkout..."
              : canRegister
                ? "Register this class"
                : "Registration unavailable"}
          </button>
        </aside>
      </section>
    </main>
  );
}