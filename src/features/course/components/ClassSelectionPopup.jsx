import { ScheduleCalendar } from "../../../shared/components/scheduleCalendar/ScheduleCalendar";

function formatStatus(status) {
  if (!status) return "Unknown";

  return String(status)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ClassSelectionPopup({
  classes,
  buyNowLoading,
  checkoutClassId,
  isClassSelectable,
  onClose,
  onSelectClass,
}) {
  return (
    <div
      className="course-detail__modal-backdrop"
      role="presentation"
      onClick={() => {
        if (!buyNowLoading) {
          onClose();
        }
      }}
    >
      <div
        className="course-detail__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="class-checkout-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="course-detail__modal-header">
          <div>
            <h2 id="class-checkout-title">Choose a class</h2>
            <p>Select one available class to start learning.</p>
          </div>

          <button
            type="button"
            className="course-detail__modal-close"
            onClick={onClose}
            disabled={buyNowLoading}
            aria-label="Close class selection popup"
          >
            ×
          </button>
        </div>

        {classes.length === 0 ? (
          <div className="admin-empty">
            No available classes are open for this course yet.
          </div>
        ) : (
          <div className="course-detail__modal-class-list">
            {classes.map((classItem) => {
              const selectable = isClassSelectable(classItem);
              const isProcessing =
                checkoutClassId === classItem.id && buyNowLoading;

              return (
                <article
                  key={classItem.id}
                  className="course-detail__modal-class-card"
                >
                  <div className="course-detail__class-card-top">
                    <div className="course-detail__class-title-block">
                      <h3>{classItem.className}</h3>

                      <div className="course-detail__trainer-status-row">
                        <div className="course-detail__trainer-row">
                          <span>Trainer </span>

                          {classItem.trainerId ? (
                            <a
                              className="course-detail__trainer-link"
                              href={`/trainers/${classItem.trainerId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(event) => {
                                event.stopPropagation();

                                if (buyNowLoading) {
                                  event.preventDefault();
                                }
                              }}
                              aria-disabled={buyNowLoading}
                            >
                              {classItem.trainerName || "View trainer profile"}
                            </a>
                          ) : (
                            <strong>To be assigned</strong>
                          )}
                        </div>

                        <span
                          className={`course-detail__class-status course-detail__class-status--${String(
                            classItem.status || "unknown",
                          ).toLowerCase()}`}
                        >
                          {formatStatus(classItem.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="course-detail__class-info-grid">
                    <div className="course-detail__class-info-item">
                      <span>Start date </span>
                      <strong>{formatDate(classItem.startDate)}</strong>
                    </div>

                    <div className="course-detail__class-info-item">
                      <span>End date </span>
                      <strong>{formatDate(classItem.endDate)}</strong>
                    </div>

                    <div className="course-detail__class-info-item">
                      <span>Enrollment </span>
                      <strong>
                        {classItem.activeEnrollmentCount ?? 0}/
                        {classItem.maxStudents ?? 0}
                      </strong>
                    </div>
                  </div>

                  <div className="course-detail__class-schedule-block">
                    <div className="course-detail__class-schedule-title">
                      Schedule
                    </div>

                    <ScheduleCalendar
                      scheduleDescription={classItem.scheduleDescription}
                    />
                  </div>

                  <button
                    type="button"
                    className="button button--primary button--md course-detail__modal-select"
                    disabled={!selectable || buyNowLoading}
                    onClick={() => onSelectClass(classItem)}
                  >
                    {isProcessing
                      ? "Processing..."
                      : selectable
                        ? "Choose this class"
                        : "Class unavailable"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
