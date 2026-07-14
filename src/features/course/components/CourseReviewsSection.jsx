const MOCK_REVIEWS = [
  {
    id: 1,
    name: "Ashutosh",
    initial: "A",
    color: "#7C3AED",
    rating: 5,
    timeAgo: "9 days ago",
    content:
      "Passed my PMP today. AT/AT/AT. Videos and the slides added for each section are very good material. Besides this course I would highly recommend getting his Book as well....",
    hasShowMore: true,
  },
  {
    id: 2,
    name: "Suraj",
    initial: "S",
    color: "#6366F1",
    rating: 5,
    timeAgo: "29 days ago",
    content:
      "I'm happy to share that I have successfully cleared my PMP exam! A special thanks to Andrew. The exam was largely scenario based and I found some of the questions quite tricky. However, the knowledge and...",
    hasShowMore: true,
  },
  {
    id: 3,
    name: "Louisa",
    initial: "L",
    color: "#4F46E5",
    rating: 5,
    timeAgo: "3 months ago",
    content:
      "Thank you Andrew for keeping it simple to understand. This training course is broken down methodically for anyone at any PM experience level to understand. Yesterday, I passed the PMP exam. Thank you for being part of my journey!",
    hasShowMore: false,
  },
  {
    id: 4,
    name: "Eric",
    initial: "E",
    color: "#8B5CF6",
    rating: 5,
    timeAgo: "3 months ago",
    content:
      "I don't like that I'm being asked to rate this course before I've taken the PMP Exam. I can't tell you how well it prepared for the PMP Exam until after I've taken the exam.",
    hasShowMore: false,
  },
];

const STARS = "★".repeat(5);

export function CourseReviewsSection() {
  return (
    <section className="course-reviews">
      <h2 className="course-reviews__title">
        <span className="course-reviews__star">★</span>
        4.7 course rating · 191K ratings
      </h2>

      <div className="course-reviews__grid">
        {MOCK_REVIEWS.map((review, index) => (
          <article
            key={review.id}
            className="course-reviews__card"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="course-reviews__card-body">
              <div
                className="course-reviews__avatar"
                style={{ backgroundColor: review.color }}
              >
                {review.initial}
              </div>
              <div className="course-reviews__main">
                <div className="course-reviews__name-row">
                  <div className="course-reviews__reviewer">
                    <strong>{review.name}</strong>
                    <div className="course-reviews__rating-line">
                      <span className="course-reviews__stars">{STARS}</span>
                      <span className="course-reviews__time">{review.timeAgo}</span>
                    </div>
                  </div>
                  <span className="course-reviews__menu" aria-hidden="true">
                    ⋮
                  </span>
                </div>
                <p className="course-reviews__content">{review.content}</p>
                {review.hasShowMore && (
                  <button type="button" className="course-reviews__show-more">
                    Show more
                  </button>
                )}
                <div className="course-reviews__helpful">
                  <span>Helpful?</span>
                  <button type="button" aria-label="Helpful">
                    ♡
                  </button>
                  <button type="button" aria-label="Not helpful">
                    ♡
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <button type="button" className="course-reviews__show-all">
        Show all reviews
      </button>
    </section>
  );
}