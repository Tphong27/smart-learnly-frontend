const COURSE_ROWS = 3;

export function TraineeDashboardSkeleton() {
    return (
        <div
            className="trainee-dashboard-skeleton"
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <span className="sr-only">Loading your learning space...</span>

            <section
                className="trainee-dashboard-momentum trainee-dashboard-skeleton__momentum"
                aria-hidden="true"
            >
                <div className="trainee-dashboard-momentum__intro">
                    <span className="sl-loading-skeleton trainee-dashboard-skeleton__icon" />
                    <div className="trainee-dashboard-skeleton__stack">
                        <span className="sl-loading-skeleton trainee-dashboard-skeleton__line trainee-dashboard-skeleton__line--heading" />
                        <span className="sl-loading-skeleton trainee-dashboard-skeleton__line trainee-dashboard-skeleton__line--copy" />
                    </div>
                </div>

                <div className="trainee-dashboard-momentum__progress">
                    <span className="sl-loading-skeleton trainee-dashboard-skeleton__ring" />
                    <div className="trainee-dashboard-skeleton__stack trainee-dashboard-skeleton__stack--compact">
                        <span className="sl-loading-skeleton trainee-dashboard-skeleton__line trainee-dashboard-skeleton__line--metric" />
                        <span className="sl-loading-skeleton trainee-dashboard-skeleton__line trainee-dashboard-skeleton__line--label" />
                    </div>
                </div>

                <div className="trainee-dashboard-momentum__stats">
                    {[0, 1].map((item) => (
                        <div key={item} className="trainee-dashboard-skeleton__stat">
                            <span className="sl-loading-skeleton trainee-dashboard-skeleton__stat-value" />
                            <span className="sl-loading-skeleton trainee-dashboard-skeleton__line trainee-dashboard-skeleton__line--label" />
                        </div>
                    ))}
                </div>
            </section>

            <section
                className="trainee-dashboard-feature trainee-dashboard-skeleton__feature"
                aria-hidden="true"
            >
                <span className="sl-loading-skeleton trainee-dashboard-feature__image trainee-dashboard-skeleton__feature-image" />
                <div className="trainee-dashboard-feature__content trainee-dashboard-skeleton__feature-content">
                    <span className="sl-loading-skeleton trainee-dashboard-skeleton__line trainee-dashboard-skeleton__line--eyebrow" />
                    <span className="sl-loading-skeleton trainee-dashboard-skeleton__line trainee-dashboard-skeleton__line--category" />
                    <span className="sl-loading-skeleton trainee-dashboard-skeleton__line trainee-dashboard-skeleton__line--title" />
                    <span className="sl-loading-skeleton trainee-dashboard-skeleton__line trainee-dashboard-skeleton__line--title-short" />
                    <div className="trainee-dashboard-skeleton__feature-meta">
                        <span className="sl-loading-skeleton trainee-dashboard-skeleton__line trainee-dashboard-skeleton__line--metric" />
                        <span className="sl-loading-skeleton trainee-dashboard-skeleton__line trainee-dashboard-skeleton__line--metric" />
                    </div>
                    <span className="sl-loading-skeleton trainee-dashboard-skeleton__progress" />
                    <div className="trainee-dashboard-skeleton__actions">
                        <span className="sl-loading-skeleton trainee-dashboard-skeleton__button" />
                        <span className="sl-loading-skeleton trainee-dashboard-skeleton__button" />
                    </div>
                </div>
            </section>

            <section
                className="trainee-dashboard-summary trainee-dashboard-skeleton__summary"
                aria-hidden="true"
            >
                {[0, 1, 2, 3].map((item) => (
                    <div key={item}>
                        <span className="sl-loading-skeleton trainee-dashboard-skeleton__line trainee-dashboard-skeleton__line--summary-label" />
                        <span className="sl-loading-skeleton trainee-dashboard-skeleton__summary-value" />
                    </div>
                ))}
            </section>

            <section
                className="trainee-dashboard-course-section trainee-dashboard-skeleton__courses"
                aria-hidden="true"
            >
                <div className="trainee-dashboard-section-heading">
                    <span className="sl-loading-skeleton trainee-dashboard-skeleton__section-title" />
                    <span className="sl-loading-skeleton trainee-dashboard-skeleton__section-link" />
                </div>

                <div className="trainee-dashboard-course-list">
                    {Array.from({ length: COURSE_ROWS }).map((_, index) => (
                        <article className="trainee-dashboard-course-row" key={index}>
                            <span className="sl-loading-skeleton trainee-dashboard-course-image" />

                            <div className="trainee-dashboard-course-row__content trainee-dashboard-skeleton__stack">
                                <span className="sl-loading-skeleton trainee-dashboard-skeleton__line trainee-dashboard-skeleton__line--category" />
                                <span className="sl-loading-skeleton trainee-dashboard-skeleton__line trainee-dashboard-skeleton__line--course-title" />
                                <span className="sl-loading-skeleton trainee-dashboard-skeleton__line trainee-dashboard-skeleton__line--course-copy" />
                            </div>

                            <div className="trainee-dashboard-course-row__progress trainee-dashboard-skeleton__stack">
                                <div className="trainee-dashboard-skeleton__course-progress-copy">
                                    <span className="sl-loading-skeleton trainee-dashboard-skeleton__line trainee-dashboard-skeleton__line--label" />
                                    <span className="sl-loading-skeleton trainee-dashboard-skeleton__line trainee-dashboard-skeleton__line--label-short" />
                                </div>
                                <span className="sl-loading-skeleton trainee-dashboard-skeleton__progress" />
                            </div>

                            <div className="trainee-dashboard-course-row__action">
                                <span className="sl-loading-skeleton trainee-dashboard-skeleton__button trainee-dashboard-skeleton__button--row" />
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}
