import { useState, useEffect } from "react";
import {
    ArrowRight,
    BookOpen,
    BrainCircuit,
    ClipboardCheck,
    FileQuestion,
    Layers3,
    Menu,
    MessageCircleMore,
    Play,
    Search,
    Target,
    TrendingUp,
    X,
    Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle";
import { CourseListPage } from "../course/pages/CourseListPage";

const features = [
    {
        icon: MessageCircleMore,
        title: "AI Study Chatbot",
        text: "Get answers grounded in your approved course materials.",
    },
    {
        icon: BrainCircuit,
        title: "Weakness Analysis",
        text: "See the topics and skills that need your attention after every test.",
    },
    {
        icon: Target,
        title: "Personalized Review",
        text: "Receive focused recommendations based on your actual performance.",
    },
    {
        icon: Layers3,
        title: "Smart Flashcards",
        text: "Review key concepts with efficient, active-recall practice.",
    },
    {
        icon: FileQuestion,
        title: "AI Content Generation",
        text: "Help trainers draft questions and flashcards with human review.",
    },
    {
        icon: TrendingUp,
        title: "Performance Dashboard",
        text: "Monitor class progress and identify learners at risk early.",
    },
];

const steps = [
    {
        icon: BookOpen,
        title: "Choose your path",
        text: "Find the right public course or join your assigned class.",
    },
    {
        icon: Play,
        title: "Learn with support",
        text: "Study lessons and materials with contextual AI guidance.",
    },
    {
        icon: ClipboardCheck,
        title: "Practice actively",
        text: "Use tests, assignments, and flashcards to build confidence.",
    },
    {
        icon: TrendingUp,
        title: "Improve with focus",
        text: "Review your weaknesses and act on personalized recommendations.",
    },
];

function Logo() {
    return (
        <a className="brand" href="#top" aria-label="Smart Learnly home">
            <span className="brand-mark">
                <Zap size={18} strokeWidth={2.6} />
            </span>
            <span>Smart Learnly</span>
        </a>
    );
}

function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const closeMenu = () => setMenuOpen(false);

    return (
        <header className={`site-header${scrolled ? " scrolled" : ""}`}>
            <div className="container header-inner">
                <Logo />
                <button
                    className="menu-button"
                    type="button"
                    aria-label="Toggle navigation"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    {menuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
                <nav
                    className={menuOpen ? "main-nav is-open" : "main-nav"}
                    aria-label="Main navigation"
                >
                    <a href="#courses" onClick={closeMenu}>
                        Courses
                    </a>
                    <a href="#features" onClick={closeMenu}>
                        Features
                    </a>
                    <a href="#centers" onClick={closeMenu}>
                        For Centers
                    </a>
                    <a href="#how-it-works" onClick={closeMenu}>
                        How It Works
                    </a>
                    <a href="#about" onClick={closeMenu}>
                        About
                    </a>
                    <span className="nav-actions">
                        <a className="button button-ghost" href="/login">
                            Log in
                        </a>
                        <a
                            className="button button-primary button-small"
                            href="/register"
                        >
                            Register
                        </a>
                    </span>
                </nav>
            </div>
        </header>
    );
}

function SectionHeading({ eyebrow, title, text, align = "center" }) {
    return (
        <div
            className={`section-heading ${align === "left" ? "align-left" : ""}`}
        >
            <span className="eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
            {text && <p>{text}</p>}
        </div>
    );
}

function TypingAnimation({
    texts,
    typingSpeed = 80,
    deletingSpeed = 40,
    pauseDuration = 2000,
}) {
    const [displayText, setDisplayText] = useState("");
    const [textIndex, setTextIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const currentText = texts[textIndex];

        const timeout = setTimeout(
            () => {
                if (!isDeleting) {
                    setDisplayText(
                        currentText.substring(0, displayText.length + 1),
                    );
                    if (displayText.length === currentText.length) {
                        setTimeout(() => setIsDeleting(true), pauseDuration);
                        return;
                    }
                } else {
                    setDisplayText(
                        currentText.substring(0, displayText.length - 1),
                    );
                    if (displayText.length === 1) {
                        setIsDeleting(false);
                        setTextIndex((prev) => (prev + 1) % texts.length);
                    }
                }
            },
            isDeleting ? deletingSpeed : typingSpeed,
        );

        return () => clearTimeout(timeout);
    }, [
        displayText,
        isDeleting,
        textIndex,
        texts,
        typingSpeed,
        deletingSpeed,
        pauseDuration,
    ]);

    return (
        <span className="typing-text">
            {displayText}
            <span className="typing-cursor">|</span>
        </span>
    );
}

export function HomePage() {
    useDocumentTitle("Learn smarter. Achieve faster.");
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");

    const handleSearch = (query) => {
        setSearchQuery(query);
    };

    const handleSearchSubmit = () => {
        const currentUrl = new URL(window.location.href);
        if (searchQuery.trim()) {
            currentUrl.searchParams.set("keyword", searchQuery.trim());
        } else {
            currentUrl.searchParams.delete("keyword");
        }
        navigate(currentUrl.pathname + currentUrl.search);
        const coursesSection = document.getElementById("courses");
        if (coursesSection) {
            coursesSection.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <div className="landing-page" id="top">
            <Header />
            <main>
                <section className="hero">
                    <div className="hero-glow hero-glow-one" />
                    <div className="hero-glow hero-glow-two" />
                    <div className="container">
                        <div className="hero-copy">
                            <h1>
                                Learn smarter.
                                <br />
                                <TypingAnimation
                                    texts={[
                                        "Achieve faster.",
                                        "Grow stronger.",
                                        "Excel daily.",
                                    ]}
                                    typingSpeed={100}
                                    deletingSpeed={50}
                                    pauseDuration={2500}
                                />
                            </h1>
                            <p>
                                Personalized learning, practice, and progress
                                tracking built for modern trainees, trainers,
                                and training centers.
                            </p>
                            <div className="hero-search">
                                <div className="search-input-wrapper">
                                    <Search size={20} className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search for courses..."
                                        value={searchQuery}
                                        onChange={(e) =>
                                            handleSearch(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                handleSearchSubmit();
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="search-btn"
                                        onClick={handleSearchSubmit}
                                        onMouseMove={(e) => {
                                            const btn = e.currentTarget;
                                            const rect =
                                                btn.getBoundingClientRect();
                                            const x = e.clientX - rect.left;
                                            const y = e.clientY - rect.top;
                                            const centerX = rect.width / 2;
                                            const centerY = rect.height / 2;
                                            const rotateX = (y - centerY) / 8;
                                            const rotateY = (centerX - x) / 8;
                                            btn.style.transform = `perspective(400px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px) scale(1.02)`;
                                            btn.style.boxShadow = `${(centerX - x) / 4}px ${(centerY - y) / 4}px 20px rgba(47, 104, 221, 0.4)`;
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform =
                                                "";
                                            e.currentTarget.style.boxShadow =
                                                "";
                                        }}
                                        aria-label="Search"
                                    >
                                        Search
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="courses-section section" id="courses">
                    <div className="container">
                        <div className="courses-heading">
                            <SectionHeading
                                eyebrow="Explore learning"
                                title="Courses made for real progress"
                                text="Start with practical programs designed to build confidence and capability."
                                align="left"
                            />
                            <a className="text-link" href="/learning/courses">
                                Browse all courses <ArrowRight size={16} />
                            </a>
                        </div>

                        <CourseListPage
                            embedded
                            showHero={false}
                            showFilters={true}
                            showToolbar={true}
                            pageSize={6}
                            detailState={{
                                from: "/",
                                fromHash: "#courses",
                                backLabel: "Back to homepage",
                            }}
                        />
                    </div>
                </section>

                <section className="feature-section section" id="features">
                    <div className="container">
                        <SectionHeading
                            eyebrow="Everything works together"
                            title="Intelligence where it makes a difference"
                            text="Practical tools that help learners improve and educators make better decisions."
                        />
                        <div className="feature-grid">
                            {features.map(
                                ({ icon: Icon, title, text }, index) => (
                                    <article
                                        className="feature-card"
                                        key={title}
                                    >
                                        <span className={`feature-number`}>
                                            0{index + 1}
                                        </span>
                                        <span className="feature-icon">
                                            <Icon size={21} />
                                        </span>
                                        <h3>{title}</h3>
                                        <p>{text}</p>
                                    </article>
                                ),
                            )}
                        </div>
                    </div>
                </section>

                <section className="process-section section" id="how-it-works">
                    <div className="container process-grid">
                        <div className="process-intro">
                            <SectionHeading
                                eyebrow="How it works"
                                title="A simple loop for lasting progress"
                                text="Smart Learnly turns every learning activity into a clear next step, helping effort become measurable growth."
                                align="left"
                            />
                            <a
                                className="button button-primary"
                                href="/register"
                            >
                                Start your learning journey{" "}
                                <ArrowRight size={16} />
                            </a>
                        </div>
                        <div className="steps-list">
                            {steps.map(({ icon: Icon, title, text }, index) => (
                                <article className="step-item" key={title}>
                                    <span className="step-number">
                                        0{index + 1}
                                    </span>
                                    <span className="step-icon">
                                        <Icon size={20} />
                                    </span>
                                    <div>
                                        <h3>{title}</h3>
                                        <p>{text}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="cta-section">
                    <div className="container cta-card">
                        <div>
                            <span className="eyebrow">
                                Your next step starts here
                            </span>
                            <h2>Ready to make every learning moment count?</h2>
                            <p>
                                Explore a course today or discover how Smart
                                Learnly can support your training center.
                            </p>
                        </div>
                        <div className="cta-actions">
                            <a
                                className="button button-primary button-large"
                                href="#courses"
                            >
                                Explore courses <ArrowRight size={17} />
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
