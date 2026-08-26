import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Layers,
  LoaderCircle,
  PlayCircle,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import { getAccessToken } from "@/services";
import { enrollmentService } from "@/features/enrollment";
import { learningService } from "@/features/learning";
import { checkoutService } from "@/features/checkout";
import { useToast } from "@/shared/components/ui";
import { ScheduleCalendar } from "@/shared/components/scheduleCalendar";
import { formatDate, formatPrice, toNumber } from "@/shared/utils/formatters";
import { isHtmlContent } from "@/features/course/utils/lesson-content";
import { isLessonPublished } from "@/features/course/utils/lesson-status";
import { LearningLessonMedia } from "@/features/course/components/LearningLessonMedia";
import { openingScheduleService } from "../services/openingScheduleService";
import "../opening-schedule.css";
import "@/features/course/pages/CoursePreviewLessonsPage.css";

const DETAIL_DATE_OPTIONS = {
  day: "2-digit",
  month: "long",
  year: "numeric",
};

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs}s`;
}

function groupBySection(lessons) {
  const map = new Map();
  for (const lesson of lessons) {
    const key = lesson.sectionId || "no-section";
    if (!map.has(key)) {
      map.set(key, {
        sectionId: lesson.sectionId,
        sortOrder: lesson.sectionSortOrder ?? 0,
        lessons: [],
      });
    }
    map.get(key).lessons.push(lesson);
  }
  const sections = Array.from(map.values()).sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  for (const section of sections) {
    section.lessons.sort(
      (a, b) => (a.lessonSortOrder ?? 0) - (b.lessonSortOrder ?? 0),
    );
  }
  return sections;
}

function LessonIcon({ type }) {
  const t = (type || "").toLowerCase();
  if (t.includes("video")) return <PlayCircle size={18} />;
  if (t.includes("quiz") || t.includes("test")) return <FileText size={18} />;
  if (t.includes("flashcard")) return <Layers size={18} />;
  return <BookOpen size={18} />;
}

function PreviewLessonContent({ lesson }) {
  if (!lesson) return null;
  const type = (lesson.lessonType || "").toLowerCase();

  return (
    <div className="preview-lesson-content">
      <header className="preview-lesson-content__head">
        <div className="preview-lesson-content__icon">
          <LessonIcon type={lesson.lessonType} />
        </div>
        <div>
          <h3 className="preview-lesson-content__title">{lesson.title}</h3>
          <div className="preview-lesson-content__meta">
            <span>
              <Clock3 size={13} aria-hidden="true" />{" "}
              {formatDuration(lesson.durationSeconds)}
            </span>
            {lesson.lessonType && (
              <span className="preview-chip">{lesson.lessonType}</span>
            )}
          </div>
        </div>
      </header>

      {type.includes("video") && <LearningLessonMedia lesson={lesson} />}

      {lesson.content &&
        (isHtmlContent(lesson.content) ? (
          <div
            className="preview-lesson-content__body preview-lesson-content__rich-content"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(lesson.content, {
                ADD_ATTR: [
                  "target",
                  "rel",
                  "class",
                  "controls",
                  "preload",
                  "poster",
                  "width",
                  "height",
                  "type",
                  "data-summary-video",
                ],
              }),
            }}
          />
        ) : (
          <div className="preview-lesson-content__body preview-lesson-content__rich-content">
            {lesson.content
              .split("\n")
              .map((line, idx) =>
                line.trim() ? (
                  <p key={idx}>{line}</p>
                ) : (
                  <br key={idx} />
                ),
              )}
          </div>
        ))}

      {lesson.attachmentUrl && (
        <a
          className="preview-lesson-content__attachment"
          href={lesson.attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FileText size={16} aria-hidden="true" /> Download attached material
        </a>
      )}
    </div>
  );
}

export function OpeningScheduleDetailPage() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [classItem, setClassItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewCourse, setPreviewCourse] = useState(null);
  const [previewLessons, setPreviewLessons] = useState([]);
  const [activePreviewLessonId, setActivePreviewLessonId] = useState(null);

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

  useEffect(() => {
    let cancelled = false;
    const courseId = classItem?.courseId;

    if (!courseId) {
      setPreviewCourse(null);
      setPreviewLessons([]);
      setActivePreviewLessonId(null);
      setPreviewError("");
      setPreviewLoading(false);
      return undefined;
    }

    async function loadPreview() {
      setPreviewLoading(true);
      setPreviewError("");

      try {
        const data = await learningService.getPreviewContent(courseId);
        if (cancelled) return;

        setPreviewCourse(
          data
            ? {
                id: data.courseId || courseId,
                title: data.courseTitle || classItem?.courseTitle || "",
                description:
                  data.courseDescription ||
                  data.description ||
                  classItem?.courseDescription ||
                  "",
              }
            : {
                id: courseId,
                title: classItem?.courseTitle || "",
                description: classItem?.courseDescription || "",
              },
        );

        const allLessons =
          data?.sections?.flatMap((section) =>
            (section.lessons || [])
              .filter((lesson) =>
                isLessonPublished(lesson, { allowMissingStatus: false }),
              )
              .map((lesson) => ({
                ...lesson,
                sectionId: lesson.sectionId ?? section.sectionId,
                sectionTitle: lesson.sectionTitle ?? section.title,
                sectionSortOrder:
                  lesson.sectionSortOrder ?? section.sortOrder ?? 0,
                lessonSortOrder:
                  lesson.lessonSortOrder ?? lesson.sortOrder ?? 0,
              })),
          ) || [];

        setPreviewLessons(allLessons);
        setActivePreviewLessonId(
          allLessons.length > 0 ? allLessons[0].lessonId : null,
        );
      } catch (requestError) {
        if (cancelled) return;
        setPreviewCourse({
          id: courseId,
          title: classItem?.courseTitle || "",
          description: classItem?.courseDescription || "",
        });
        setPreviewLessons([]);
        setActivePreviewLessonId(null);
        setPreviewError(
          requestError?.message || "Could not load course preview lessons.",
        );
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    }

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [classItem?.courseId, classItem?.courseTitle, classItem?.courseDescription]);

  const previewSections = useMemo(
    () => groupBySection(previewLessons),
    [previewLessons],
  );
  const activePreviewLesson = useMemo(
    () =>
      previewLessons.find((lesson) => lesson.lessonId === activePreviewLessonId) ||
      previewLessons[0] ||
      null,
    [previewLessons, activePreviewLessonId],
  );

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
      // OFFLINE CLASS MIỄN PHÍ
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

      // OFFLINE CLASS CÓ PHÍ
      const checkout = await checkoutService.checkoutClass(
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

  const courseTitle =
    previewCourse?.title || classItem.courseTitle || "Associated course";
  const courseDescription =
    previewCourse?.description || classItem.courseDescription || "";

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
                {courseTitle}
              </Link>
            ) : (
              <span className="opening-detail__chip">{courseTitle}</span>
            )}

            <span className="opening-detail__eyebrow">Offline class</span>

            <h1 className="opening-detail__title">{classItem.className}</h1>
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

          <section className="opening-detail__section">
            <div className="opening-detail__section-head">
              <div>
                <h2 className="opening-detail__section-title">Course overview</h2>
                <p className="opening-detail__section-sub">
                  Full course information linked to this opening class.
                </p>
              </div>
              {classItem.courseId && (
                <Link
                  to={`/courses/${classItem.courseId}/preview`}
                  className="opening-detail__back"
                >
                  Open full preview
                </Link>
              )}
            </div>

            <div className="opening-detail__course-overview">
              <h3 className="opening-detail__course-title">{courseTitle}</h3>
              {courseDescription ? (
                <p className="opening-detail__course-description">
                  {courseDescription}
                </p>
              ) : (
                <p className="opening-detail__section-sub">
                  No course description is available for this class yet.
                </p>
              )}
            </div>
          </section>

          <section className="opening-detail__section">
            <div className="opening-detail__section-head">
              <div>
                <h2 className="opening-detail__section-title">
                  Preview lessons
                </h2>
                <p className="opening-detail__section-sub">
                  Sample lessons marked as preview so you can explore course
                  content before registering.
                </p>
              </div>
            </div>

            {previewLoading ? (
              <div className="opening-state">
                <LoaderCircle className="opening-spinner" size={28} />
                <p>Loading preview lessons...</p>
              </div>
            ) : previewError && previewLessons.length === 0 ? (
              <div className="opening-state opening-state--error">
                <AlertCircle size={28} />
                <p>{previewError}</p>
              </div>
            ) : previewLessons.length === 0 ? (
              <div className="opening-state">
                <p>
                  This course does not have any preview lessons yet. Mark
                  lessons as preview from the content management section.
                </p>
              </div>
            ) : (
              <div className="preview-layout opening-detail__preview-layout">
                <aside className="preview-layout__sidebar">
                  {previewSections.map((section) => (
                    <div
                      key={section.sectionId || "no-section"}
                      className="preview-section"
                    >
                      <div className="preview-section__header">
                        Section{" "}
                        {section.sortOrder ? section.sortOrder : ""}
                      </div>
                      <ul className="preview-section__list">
                        {section.lessons.map((lesson) => {
                          const isActive =
                            lesson.lessonId === activePreviewLesson?.lessonId;
                          return (
                            <li key={lesson.lessonId}>
                              <button
                                type="button"
                                className={
                                  "preview-section__item" +
                                  (isActive
                                    ? " preview-section__item--active"
                                    : "")
                                }
                                onClick={() =>
                                  setActivePreviewLessonId(lesson.lessonId)
                                }
                              >
                                <span className="preview-section__icon">
                                  <LessonIcon type={lesson.lessonType} />
                                </span>
                                <span className="preview-section__copy">
                                  <span className="preview-section__title">
                                    {lesson.title}
                                  </span>
                                  <small>
                                    {formatDuration(lesson.durationSeconds)}
                                  </small>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </aside>

                <section className="preview-layout__main">
                  <PreviewLessonContent lesson={activePreviewLesson} />
                </section>
              </div>
            )}
          </section>
        </div>

        <aside className="opening-detail__sidecard">
          <div className="opening-detail__sidecard-thumb">
            {classItem.courseThumbnailUrl ? (
              <img
                src={classItem.courseThumbnailUrl}
                alt={courseTitle}
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
              <strong className="opening-detail__price">
                {formatPrice(classItem.price, isFreeClass)}
              </strong>
            </div>

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
