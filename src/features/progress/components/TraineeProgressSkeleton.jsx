const COURSE_ROWS = 3;

export function TraineeProgressSkeleton() {
  return (
    <div
      className="progress-skeleton"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading your learning progress...</span>

      <header className="progress-page-heading" aria-hidden="true">
        <div className="progress-skeleton__stack">
          <span className="sl-loading-skeleton progress-skeleton__page-title" />
          <span className="sl-loading-skeleton progress-skeleton__page-copy" />
        </div>
        <span className="sl-loading-skeleton progress-skeleton__enrollment-count" />
      </header>

      <section
        className="progress-overview progress-skeleton__overview"
        aria-hidden="true"
      >
        <div className="progress-overview__main progress-skeleton__overview-main">
          <div className="progress-overview__label">
            <span className="sl-loading-skeleton progress-skeleton__overview-label" />
            <span className="sl-loading-skeleton progress-skeleton__overview-value" />
          </div>
          <span className="sl-loading-skeleton progress-skeleton__progress-bar" />
        </div>

        <div className="progress-overview__stats progress-skeleton__stats">
          {[0, 1, 2].map((item) => (
            <div key={item}>
              <span className="sl-loading-skeleton progress-skeleton__stat-label" />
              <span className="sl-loading-skeleton progress-skeleton__stat-value" />
            </div>
          ))}
        </div>
      </section>

      <section
        className="progress-course-section progress-skeleton__courses"
        aria-hidden="true"
      >
        <div className="progress-tabs-panel__top">
          <div className="progress-skeleton__tabs">
            <span className="sl-loading-skeleton progress-skeleton__tab" />
            <span className="sl-loading-skeleton progress-skeleton__tab" />
          </div>
          <span className="sl-loading-skeleton progress-skeleton__result-count" />
        </div>

        <div className="progress-filter-bar">
          <span className="sl-loading-skeleton progress-skeleton__control" />
          <span className="sl-loading-skeleton progress-skeleton__control" />
        </div>

        <div className="course-progress-list">
          {Array.from({ length: COURSE_ROWS }).map((_, index) => (
            <article className="course-progress-card" key={index}>
              <div className="course-progress-card__top">
                <span className="sl-loading-skeleton course-progress-card__thumbnail" />

                <div className="course-progress-card__info progress-skeleton__stack">
                  <div className="course-progress-card__heading-row">
                    <div className="progress-skeleton__stack">
                      <span className="sl-loading-skeleton progress-skeleton__course-meta" />
                      <span className="sl-loading-skeleton progress-skeleton__course-title" />
                    </div>
                    <span className="sl-loading-skeleton progress-skeleton__status" />
                  </div>

                  <div className="course-progress-card__progress-row">
                    <div className="course-progress-card__progress-copy">
                      <span className="sl-loading-skeleton progress-skeleton__progress-copy" />
                      <span className="sl-loading-skeleton progress-skeleton__progress-value" />
                    </div>
                    <span className="sl-loading-skeleton progress-skeleton__progress-bar" />
                  </div>

                  <span className="sl-loading-skeleton progress-skeleton__metrics" />

                  <div className="course-progress-card__actions">
                    <span className="sl-loading-skeleton progress-skeleton__button" />
                    <span className="sl-loading-skeleton progress-skeleton__button" />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
