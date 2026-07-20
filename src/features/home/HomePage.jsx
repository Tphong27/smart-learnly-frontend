import {
    ArrowRight,
    SunMedium,
    Zap,
} from "lucide-react";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle";
import { Button } from "../../shared/components/ui";
import { CourseListPage } from "../course/pages/CourseListPage";
import { CourseCard } from "../course/components/CourseCard";
import { OpeningSchedulePage } from "../opening-schedule";

const HERO_POPULAR_COURSE = {
    id: "react-nang-cao-kien-truc-frontend",
    slug: "react-nang-cao-kien-truc-frontend",
    title: "React nâng cao và kiến trúc Frontend",
    description: "Tổ chức ứng dụng React có khả năng mở rộng với routing, state management, testing và tối ưu hiệu năng.",
    category: { name: "Programming" },
    isFree: true,
    price: 10000,
};

function RoadStop({ className }) {
    return (
        <span className={`feature-road__stop ${className}`} aria-hidden="true">
            <SunMedium size={42} strokeWidth={2.2} />
            <Zap className="feature-road__stop-zap" size={16} fill="currentColor" />
        </span>
    );
}

export function HomePage() {
    useDocumentTitle("Learn smarter. Achieve faster.");

    return (
        <div className="landing-page" id="top">
            <main>
                <section className="hero">
                    <div className="hero-decor-circle" />

                    <div className="container hero-main-container">
                        <div className="hero-content">
                            <h1 className="hero-heading">
                                Learning skill for a{" "}
                                <span className="hero-heading-underline">
                                    better career
                                </span>
                            </h1>

                            <p className="hero-description">
                                Personalized learning, practice, and progress
                                tracking built for modern trainees, trainers,
                                and training centers.
                            </p>

                            <div className="hero-buttons">
                                <Button to="/register" size="lg">
                                    Start Learning!
                                </Button>
                                <Button href="#courses" variant="outline" size="lg">
                                    Explore Courses
                                </Button>
                            </div>

                            <div className="hero-social-proof">
                                <div className="hero-avatars">
                                    <div className="hero-avatar">
                                        <img src="/avatars/student1.jpg" alt="" />
                                    </div>
                                    <div className="hero-avatar">
                                        <img src="/avatars/student2.jpg" alt="" />
                                    </div>
                                    <div className="hero-avatar">
                                        <img src="/avatars/student3.jpg" alt="" />
                                    </div>
                                </div>
                                <span className="hero-social-text">
                                    +100K Students like Smart Learnly
                                </span>
                            </div>
                        </div>

                        <div className="hero-illustration">
                            <CourseCard
                                course={HERO_POPULAR_COURSE}
                                viewMode="grid"
                                highlightLabel="Most enrolled"
                                detailState={{
                                    from: "/",
                                    fromHash: "#top",
                                    backLabel: "Back to homepage",
                                }}
                            />
                        </div>
                    </div>
                </section>

                <section className="courses-section" id="courses">
                    <div className="container">
                        <div className="courses-heading">
                            <h2>Popular Courses</h2>
                        </div>

                        <CourseListPage
                            embedded
                            showHero={false}
                            showFilters={false}
                            showAdvancedFilters
                            pageSize={6}
                            cardVariant="popular"
                            detailState={{
                                from: "/",
                                fromHash: "#courses",
                                backLabel: "Back to homepage",
                            }}
                        />
                    </div>
                </section>

                <section
                    className="opening-home-section"
                    id="opening-schedule"
                >
                    <div className="container">
                        <div className="courses-heading">
                            <div>
                                <h2>Upcoming Classes</h2>
                            </div>
                        </div>

                        <OpeningSchedulePage
                            embedded
                            showHero={false}
                            pageSize={3}
                            detailState={{
                                from: "/#opening-schedule",
                                backLabel: "Back to homepage",
                            }}
                        />
                    </div>
                </section>

                <section className="feature-section" id="features">
                    <div className="feature-section__inner">
                        <h2 className="feature-section__title" id="learning-intelligence-title">
                            <span>Intelligence where it makes a</span>
                            <span>difference</span>
                        </h2>

                        <div
                            className="feature-roadmap"
                            aria-labelledby="learning-intelligence-title"
                        >
                            <svg
                                className="feature-roadmap__road"
                                viewBox="0 0 1489 791"
                                preserveAspectRatio="none"
                                aria-hidden="true"
                            >
                                <path
                                    className="feature-roadmap__road-outline"
                                    d="M -36 62 H 1238 C 1365 62 1460 158 1460 220 C 1460 292 1365 340 1238 340 H 892 C 814 340 766 393 766 471 V 791"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    className="feature-roadmap__road-surface"
                                    d="M -36 62 H 1238 C 1365 62 1460 158 1460 220 C 1460 292 1365 340 1238 340 H 892 C 814 340 766 393 766 471 V 791"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    className="feature-roadmap__road-dashes"
                                    d="M -36 62 H 1238 C 1365 62 1460 158 1460 220 C 1460 292 1365 340 1238 340 H 892 C 814 340 766 393 766 471 V 791"
                                    fill="none"
                                    strokeLinecap="butt"
                                />
                            </svg>

                            <RoadStop className="feature-road__stop--chatbot" />
                            <RoadStop className="feature-road__stop--analysis" />
                            <RoadStop className="feature-road__stop--review" />
                            <RoadStop className="feature-road__stop--flashcards" />

                            <article className="feature-roadmap__item feature-roadmap__item--chatbot">
                                <h3>AI Study Chatbot</h3>
                                <p>Get answers grounded in your approved course materials.</p>
                            </article>
                            <article className="feature-roadmap__item feature-roadmap__item--analysis">
                                <h3>Weakness Analysis</h3>
                                <p>See the topics and skills that need attention after every test.</p>
                            </article>
                            <article className="feature-roadmap__item feature-roadmap__item--review">
                                <h3>Personalized Review</h3>
                                <p>Receive focused recommendations based on your performance.</p>
                            </article>
                            <article className="feature-roadmap__item feature-roadmap__item--flashcards">
                                <h3>Smart Flashcards</h3>
                                <p>Review key concepts with efficient active-recall practice.</p>
                            </article>
                        </div>

                        <div className="feature-cta">
                            <div className="feature-cta__text">
                                <h3>
                                    <span>Ready to make every learning</span>
                                    <span>moment count?</span>
                                </h3>
                                <p>
                                    Explore a course today or discover how Smart Learnly can
                                    support your training center.
                                </p>
                            </div>
                            <a className="feature-cta__button" href="#courses">
                                <span>Explore courses</span>
                                <ArrowRight size={17} aria-hidden="true" />
                            </a>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}