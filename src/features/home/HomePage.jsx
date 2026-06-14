import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  Building2,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileQuestion,
  GraduationCap,
  Layers3,
  Menu,
  MessageCircleMore,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle";
import { featuredCourses } from "../../mocks/landingPage";

const challenges = [
  {
    icon: Target,
    title: "Learners need direction",
    text: "Studying hard is not enough when you do not know what to review next.",
    tone: "blue",
  },
  {
    icon: Clock3,
    title: "Trainers lose valuable time",
    text: "Creating questions, flashcards, and thoughtful feedback takes hours.",
    tone: "violet",
  },
  {
    icon: BarChart3,
    title: "Centers lack visibility",
    text: "Scattered tools make progress and dropout risk difficult to understand.",
    tone: "orange",
  },
];

const solutions = [
  {
    icon: GraduationCap,
    eyebrow: "For trainees",
    title: "A learning path that adapts",
    text: "Learn, practice, and understand exactly where to focus next.",
    items: [
      "AI-supported study",
      "Weakness-based review",
      "Smart flashcard practice",
    ],
    tone: "blue",
  },
  {
    icon: Users,
    eyebrow: "For trainers & SMEs",
    title: "More time for teaching",
    text: "Create learning content faster while keeping educators in control.",
    items: [
      "AI-assisted question creation",
      "Draft feedback workflows",
      "Human review before publish",
    ],
    tone: "violet",
  },
  {
    icon: Building2,
    eyebrow: "For centers & admins",
    title: "One clear operational view",
    text: "Connect classes, learning outcomes, and business operations.",
    items: [
      "Class performance insights",
      "Churn-risk monitoring",
      "Enrollment and reporting",
    ],
    tone: "teal",
  },
];

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

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
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
            <a className="button button-primary button-small" href="/register">
              Get started <ArrowRight size={15} />
            </a>
          </span>
        </nav>
      </div>
    </header>
  );
}

function DashboardPreview() {
  return (
    <div
      className="dashboard-wrap"
      aria-label="Smart Learnly learning dashboard preview"
    >
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="dashboard-card">
        <div className="dashboard-topbar">
          <div className="dashboard-brand">
            <Zap size={14} fill="currentColor" /> SLP
          </div>
          <div className="dashboard-search">Search your learning...</div>
          <div className="dashboard-avatar">AN</div>
        </div>
        <div className="dashboard-body">
          <aside className="dashboard-sidebar">
            <span className="sidebar-dot active" />
            <span className="sidebar-dot" />
            <span className="sidebar-dot" />
            <span className="sidebar-dot" />
            <span className="sidebar-dot" />
          </aside>
          <div className="dashboard-content">
            <div className="preview-welcome">
              <div>
                <span className="preview-kicker">Welcome back, Alex</span>
                <strong>Keep up the momentum.</strong>
              </div>
              <span className="streak">
                <Sparkles size={12} /> 7 day streak
              </span>
            </div>
            <div className="preview-grid">
              <div className="preview-panel progress-panel">
                <div className="preview-panel-heading">
                  <span>Course progress</span>
                  <strong>78%</strong>
                </div>
                <div className="progress-ring">
                  <span>
                    78<small>%</small>
                  </span>
                </div>
                <div className="mini-legend">
                  <span />
                  <small>12 of 16 lessons completed</small>
                </div>
              </div>
              <div className="preview-panel focus-panel">
                <span className="preview-kicker">Recommended next</span>
                <div className="focus-icon">
                  <BrainCircuit size={20} />
                </div>
                <strong>Review JavaScript closures</strong>
                <small>Based on your latest practice test</small>
                <button type="button">
                  Start review <ChevronRight size={12} />
                </button>
              </div>
            </div>
            <div className="preview-bottom">
              <div>
                <span className="preview-kicker">Weekly activity</span>
                <strong>6h 42m</strong>
              </div>
              <div className="bars" aria-hidden="true">
                {[40, 65, 48, 82, 67, 92, 74].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="floating-card floating-score">
        <span className="floating-icon">
          <TrendingUp size={16} />
        </span>
        <span>
          <small>Readiness score</small>
          <strong>+14% this month</strong>
        </span>
      </div>
      <div className="floating-card floating-ai">
        <span className="floating-icon violet">
          <Bot size={17} />
        </span>
        <span>
          <small>Study assistant</small>
          <strong>Ready when you are</strong>
        </span>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, text, align = "center" }) {
  return (
    <div className={`section-heading ${align === "left" ? "align-left" : ""}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

function CourseCard({ course }) {
  return (
    <article className="course-card">
      <div className={`course-cover ${course.accent}`}>
        <span className="course-category">{course.category}</span>
        <div className="course-cover-art">
          <span>
            <BookOpen size={28} />
          </span>
          <span>
            <Sparkles size={18} />
          </span>
        </div>
      </div>
      <div className="course-card-body">
        <div className="course-meta">
          <span>{course.level}</span>
          <span>
            <Star size={13} fill="currentColor" /> {course.rating}
          </span>
        </div>
        <h3>{course.title}</h3>
        <p>{course.description}</p>
        <div className="course-details">
          <span>
            <BookOpen size={14} /> {course.lessons} lessons
          </span>
          <span>
            <Clock3 size={14} /> {course.duration}
          </span>
        </div>
        <a href="/courses">
          View course <ArrowRight size={15} />
        </a>
      </div>
    </article>
  );
}

export function HomePage() {
  useDocumentTitle("Learn smarter. Achieve faster.");

  return (
    <div className="landing-page" id="top">
      <Header />
      <main>
        <section className="hero">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="hero-badge">
                <Sparkles size={14} /> Learning that knows what comes next
              </div>
              <h1>
                Learn smarter.
                <br />
                <span>Achieve faster.</span>
              </h1>
              <p>
                Personalized learning, practice, and progress tracking built for
                modern trainees, trainers, and training centers.
              </p>
              <div className="hero-actions">
                <a
                  className="button button-primary button-large"
                  href="/courses"
                >
                  Explore courses <ArrowRight size={17} />
                </a>
                <a
                  className="button button-secondary button-large"
                  href="#how-it-works"
                >
                  <span className="play-icon">
                    <Play size={13} fill="currentColor" />
                  </span>{" "}
                  See how it works
                </a>
              </div>
              <div className="hero-trust">
                <span className="avatar-stack">
                  <i>AM</i>
                  <i>JL</i>
                  <i>TK</i>
                  <i>+</i>
                </span>
                <span>
                  <strong>Built for every learning role</strong>
                  <small>From first lesson to measurable outcomes</small>
                </span>
              </div>
            </div>
            <DashboardPreview />
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
              <a className="text-link" href="/courses">
                Browse all courses <ArrowRight size={16} />
              </a>
            </div>
            <div className="course-grid">
              {featuredCourses.map((course) => (
                <CourseCard course={course} key={course.title} />
              ))}
            </div>
          </div>
        </section>

        <section className="challenge-section section">
          <div className="container">
            <SectionHeading
              eyebrow="The challenge"
              title="Learning should not feel like guesswork"
              text="Smart Learnly brings the scattered parts of training together, so every person can act with clarity."
            />
            <div className="challenge-grid">
              {challenges.map(({ icon: Icon, title, text, tone }) => (
                <article className="challenge-card" key={title}>
                  <span className={`icon-box ${tone}`}>
                    <Icon size={22} />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="solution-section section" id="centers">
          <div className="container">
            <SectionHeading
              eyebrow="One connected platform"
              title="A clearer way to learn, teach, and grow"
              text="More than a place to store content, Smart Learnly connects the full learning journey."
            />
            <div className="learning-loop">
              {[
                "Learning materials",
                "Assessment",
                "Weakness diagnosis",
                "Personalized review",
                "Progress insights",
              ].map((item, index) => (
                <div className="loop-item" key={item}>
                  <span>{index + 1}</span>
                  <strong>{item}</strong>
                  {index < 4 && <ChevronRight size={17} />}
                </div>
              ))}
            </div>
            <div className="solution-grid">
              {solutions.map(
                ({ icon: Icon, eyebrow, title, text, items, tone }) => (
                  <article className={`solution-card ${tone}`} key={title}>
                    <span className="solution-icon">
                      <Icon size={24} />
                    </span>
                    <span className="solution-eyebrow">{eyebrow}</span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                    <ul>
                      {items.map((item) => (
                        <li key={item}>
                          <Check size={15} /> {item}
                        </li>
                      ))}
                    </ul>
                    <a
                      href={eyebrow === "For trainees" ? "/courses" : "#about"}
                    >
                      Learn more <ArrowRight size={15} />
                    </a>
                  </article>
                ),
              )}
            </div>
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
              {features.map(({ icon: Icon, title, text }, index) => (
                <article className="feature-card" key={title}>
                  <span className={`feature-number`}>0{index + 1}</span>
                  <span className="feature-icon">
                    <Icon size={21} />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
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
              <a className="button button-primary" href="/register">
                Start your learning journey <ArrowRight size={16} />
              </a>
            </div>
            <div className="steps-list">
              {steps.map(({ icon: Icon, title, text }, index) => (
                <article className="step-item" key={title}>
                  <span className="step-number">0{index + 1}</span>
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

        <section className="trust-section section" id="about">
          <div className="container trust-card">
            <div className="trust-visual">
              <div className="shield-outer">
                <div className="shield-inner">
                  <ShieldCheck size={42} />
                </div>
              </div>
              <span className="trust-float trust-float-one">
                <Check size={15} /> Trainer reviewed
              </span>
              <span className="trust-float trust-float-two">
                <Check size={15} /> Ready to publish
              </span>
            </div>
            <div className="trust-copy">
              <span className="eyebrow eyebrow-light">
                AI with accountability
              </span>
              <h2>
                Technology supports educators. It does not replace their
                judgment.
              </h2>
              <p>
                AI-generated learning content and feedback remain drafts until
                reviewed by qualified Trainers or Subject Matter Experts.
              </p>
              <div className="trust-points">
                <span>
                  <Check size={16} /> Human review before publication
                </span>
                <span>
                  <Check size={16} /> Course-grounded AI support
                </span>
                <span>
                  <Check size={16} /> Clear draft and approval status
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="container cta-card">
            <div>
              <span className="eyebrow">Your next step starts here</span>
              <h2>Ready to make every learning moment count?</h2>
              <p>
                Explore a course today or discover how Smart Learnly can support
                your training center.
              </p>
            </div>
            <div className="cta-actions">
              <a className="button button-primary button-large" href="/courses">
                Explore courses <ArrowRight size={17} />
              </a>
              <a
                className="button button-secondary button-large"
                href="mailto:hello@smartlearnly.com"
              >
                Request a demo
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
              Smarter learning for people and training centers ready to grow.
            </p>
          </div>
          <div>
            <strong>Platform</strong>
            <a href="#features">Features</a>
            <a href="/courses">Courses</a>
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
