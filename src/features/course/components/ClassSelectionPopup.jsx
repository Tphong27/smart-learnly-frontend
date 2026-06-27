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
            <p>Select one available class before checkout.</p>
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
                  <div className="course-detail__class-main">
                    <div>
                      <h3>{classItem.className}</h3>
                      <p>
                        Trainer:
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
                      </p>
                    </div>

                    <span className="course-detail__class-status">
                      {classItem.status}
                    </span>
                  </div>

                  <dl className="course-detail__class-meta">
                    <div>
                      <dt>Schedule</dt>
                      <dd>
                        {classItem.scheduleDescription || "Not specified"}
                      </dd>
                    </div>

                    <div>
                      <dt>Start date</dt>
                      <dd>{classItem.startDate || "Not specified"}</dd>
                    </div>

                    <div>
                      <dt>End date</dt>
                      <dd>{classItem.endDate || "Not specified"}</dd>
                    </div>

                    <div>
                      <dt>Available slots</dt>
                      <dd>
                        {classItem.availableSlots ?? 0}/
                        {classItem.maxStudents ?? 0}
                      </dd>
                    </div>
                  </dl>

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
