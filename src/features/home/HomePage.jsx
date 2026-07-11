import {
    ArrowRight,
    SunMedium,
    Zap,
} from "lucide-react";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle";
import { CourseListPage } from "../course/pages/CourseListPage";
import { CourseCard } from "../course/components/CourseCard";
import { BrandLogo } from "../../shared/components/SiteHeader";

const HERO_POPULAR_COURSE = {
    id: "react-nang-cao-kien-truc-frontend",
    slug: "react-nang-cao-kien-truc-frontend",
    title: "React nâng cao và kiến trúc Frontend",
    description: "Tổ chức ứng dụng React có khả năng mở rộng với routing, state management, testing và tối ưu hiệu năng.",
    category: { name: "Programming" },
    isFree: true,
    price: 10000,
};

function Logo() {
    return <BrandLogo />;
}

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
                {/* Hero Section - Figma Design */}
                <section className="hero">
                    {/* Decorative purple circle (bottom left) */}
                    <div className="hero-decor-circle" />

                    {/* Main content container */}
                    <div className="container hero-main-container">
                        {/* Left column: Content */}
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

                            {/* CTA Buttons */}
                            <div className="hero-buttons">
                                <a
                                    href="/register"
                                    className="hero-btn hero-btn-primary"
                                >
                                    Start Learning!
                                </a>
                                <a
                                    href="#courses"
                                    className="hero-btn hero-btn-outline"
                                >
                                    Explore Courses
                                </a>
                            </div>

                            {/* Social Proof */}
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

                        {/* Right column: Illustration */}
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

                            <div className="hero-illustration-frame">
                                <svg
                                    viewBox="0 0 462 401"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="hero-illustration-svg"
                                >
                                    {/* Background blob */}
                                    <ellipse
                                        cx="230"
                                        cy="200"
                                        rx="220"
                                        ry="180"
                                        fill="#cfe3ff"
                                    />

                                    {/* Floor lines */}
                                    <line
                                        x1="20"
                                        y1="320"
                                        x2="450"
                                        y2="320"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />
                                    <line
                                        x1="40"
                                        y1="340"
                                        x2="440"
                                        y2="340"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />

                                    {/* Plant pot */}
                                    <rect
                                        x="60"
                                        y="290"
                                        width="70"
                                        height="40"
                                        fill="#5d56d4"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />
                                    {/* Plant leaves */}
                                    <path
                                        d="M75 290 Q70 240 85 220 Q90 250 95 290"
                                        fill="#5d56d4"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />
                                    <path
                                        d="M95 290 Q100 230 115 215 Q120 250 115 290"
                                        fill="#5d56d4"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />
                                    <path
                                        d="M85 290 Q95 250 105 235 Q115 270 110 290"
                                        fill="#5d56d4"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />

                                    {/* Computer/Screen */}
                                    <rect
                                        x="200"
                                        y="80"
                                        width="120"
                                        height="100"
                                        rx="8"
                                        fill="#fff"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />
                                    {/* Screen content - profile icon */}
                                    <circle
                                        cx="240"
                                        cy="115"
                                        r="12"
                                        fill="#5d56d4"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />
                                    <path
                                        d="M220 160 Q240 145 260 160"
                                        fill="#5d56d4"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />
                                    {/* Screen content - bars */}
                                    <line
                                        x1="270"
                                        y1="105"
                                        x2="305"
                                        y2="105"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />
                                    <line
                                        x1="270"
                                        y1="120"
                                        x2="295"
                                        y2="120"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />
                                    <line
                                        x1="270"
                                        y1="135"
                                        x2="300"
                                        y2="135"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />

                                    {/* Screen stand */}
                                    <line
                                        x1="260"
                                        y1="180"
                                        x2="260"
                                        y2="200"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />
                                    <line
                                        x1="230"
                                        y1="200"
                                        x2="290"
                                        y2="200"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />

                                    {/* Person body */}
                                    <path
                                        d="M280 200 L290 280 L360 290 L380 250 L390 200 L390 180 L280 180 Z"
                                        fill="#2e2e2e"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />

                                    {/* Person head */}
                                    <circle
                                        cx="335"
                                        cy="155"
                                        r="25"
                                        fill="#fff"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />
                                    {/* Hair */}
                                    <path
                                        d="M315 145 Q320 125 335 125 Q355 125 360 150"
                                        fill="#5d56d4"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />

                                    {/* Arms holding tablet */}
                                    <path
                                        d="M290 220 L250 200 L240 240"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                        fill="#fff"
                                    />
                                    <path
                                        d="M380 220 L390 250 L370 270"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                        fill="#fff"
                                    />

                                    {/* Tablet/book in hands */}
                                    <rect
                                        x="220"
                                        y="225"
                                        width="80"
                                        height="55"
                                        rx="4"
                                        fill="#fff"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />
                                    <line
                                        x1="260"
                                        y1="225"
                                        x2="260"
                                        y2="280"
                                        stroke="#2e2e2e"
                                        strokeWidth="3"
                                    />
                                    <circle
                                        cx="245"
                                        cy="250"
                                        r="8"
                                        fill="#5d56d4"
                                    />
                                    <circle
                                        cx="275"
                                        cy="250"
                                        r="8"
                                        fill="#5d56d4"
                                    />

                                    {/* Decorative dots */}
                                    <circle cx="40" cy="60" r="4" fill="#5d56d4" />
                                    <circle cx="60" cy="80" r="3" fill="#5d56d4" />
                                    <circle cx="30" cy="100" r="3" fill="#5d56d4" />
                                    <circle cx="420" cy="80" r="4" fill="#5d56d4" />
                                    <circle cx="440" cy="100" r="3" fill="#5d56d4" />
                                    <circle cx="410" cy="120" r="3" fill="#5d56d4" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Bottom divider */}
                    <div className="hero-divider" />
                </section>

                {/* Popular Courses Section - Figma Design */}
                <section className="courses-section" id="courses">
                    <div className="container">
                        <div className="courses-heading">
                            <h2>Popular Courses</h2>
                            <p>
                                Start with practical programs designed to build
                                confidence and capability.
                            </p>
                        </div>

                        <CourseListPage
                            embedded
                            showHero={false}
                            showFilters={false}
                            showAdvancedFilters={true}
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
                                <p>Get answers grounded in your approved course materials, 24/7.</p>
                            </article>

                            <article className="feature-roadmap__item feature-roadmap__item--analysis">
                                <h3>Weakness Analysis</h3>
                                <p>See the topics and skills that need your attention after every test.</p>
                            </article>

                            <article className="feature-roadmap__item feature-roadmap__item--review">
                                <h3>Personalized Review</h3>
                                <p>Receive focused recommendations based on your actual performance.</p>
                            </article>

                            <article className="feature-roadmap__item feature-roadmap__item--flashcards">
                                <h3>Smart Flashcards</h3>
                                <p>Review key concepts with efficient, active-recall practice.</p>
                            </article>

                        </div>

                        <div className="feature-cta">
                            <div className="feature-cta__text">
                                <h3>
                                    <span>
                                        Ready to make every learning
                                    </span>
                                    <span>moment count?</span>
                                </h3>
                                <p>
                                    Explore a course today or discover how
                                    Smart Learnly can support your training
                                    center.
                                </p>
                            </div>
                            <a className="feature-cta__button" href="#courses">
                                <span>Explore courses</span>
                                <ArrowRight size={17} />
                            </a>
                        </div>
                    </div>
                </section>

                </main>
            <footer className="site-footer">
                <div className="container footer-top">
                    <div className="footer-brand">
                        <Logo />
                        <p>
                            Smarter learning for people and training centers
                            ready to grow.
                        </p>
                    </div>
                    <div>
                        <strong>Platform</strong>
                        <a href="#features">Features</a>
                        <a href="#courses">Courses</a>
                        <a href="#how-it-works">How it works</a>
                    </div>
                    <div>
                        <strong>Solutions</strong>
                        <a href="#centers">For trainees</a>
                        <a href="#centers">For educators</a>
                        <a href="#centers">For centers</a>
                    </div>
                    <div>
                        <strong>Company</strong>
                        <a href="#about">About</a>
                        <a href="mailto:hello@smartlearnly.com">Contact</a>
                        <a href="/login">Log in</a>
                    </div>
                </div>
                <div className="container footer-bottom">
                    <span>© 2026 Smart Learnly Platform</span>
                    <span>Learn smarter. Achieve faster.</span>
                </div>
            </footer>
        </div>
    );
}
