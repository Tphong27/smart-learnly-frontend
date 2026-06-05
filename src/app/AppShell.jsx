import heroAsset from "../assets/hero.png";

const metrics = [
  { value: "1 place", label: "for courses, classes, payments, and progress" },
  { value: "6 roles", label: "connected across the full training lifecycle" },
  { value: "AI review", label: "built around human approval before publishing" },
];

const capabilities = [
  {
    title: "Course Discovery",
    text: "Guide guests from public catalog browsing to class enrollment and secure payment.",
    status: "SC-01",
  },
  {
    title: "Learning Workspace",
    text: "Give trainees one focused place for lessons, materials, tests, assignments, and flashcards.",
    status: "SC-02",
  },
  {
    title: "AI Study Support",
    text: "Connect RAG-powered answers to approved learning content, not generic guesses.",
    status: "RAG",
  },
  {
    title: "Content Operations",
    text: "Help SMEs generate, review, approve, and publish questions, flashcards, and resources.",
    status: "Review",
  },
  {
    title: "Class Management",
    text: "Track enrollment, payment state, weak topics, class health, and trainer workload.",
    status: "TMO",
  },
  {
    title: "Learning Analytics",
    text: "Surface weakness analysis, review recommendations, readiness, and churn risk signals.",
    status: "Insight",
  },
];

const roleJourneys = [
  "Trainees continue learning, practice weak topics, and ask the AI chatbot for contextual help.",
  "Trainers review submissions, support struggling learners, and finalize AI-drafted feedback.",
  "SMEs manage modules, lessons, materials, question banks, and AI-generated learning assets.",
  "TMOs monitor classes, enrollment, payment status, refunds, and operational dashboards.",
  "Admins configure roles, permissions, AI providers, payment gateways, and audit visibility.",
];

const reviewSteps = [
  "Generate draft content",
  "Check source alignment",
  "Human approval",
  "Publish to learners",
];

export function AppShell() {
  return (
    <main className="landing-page">
      <header className="site-header" aria-label="Primary navigation">
        <a className="brand-link" href="/" aria-label="Smart Learnly home">
          <span className="brand-mark">SLP</span>
          <span>
            <strong>Smart Learnly</strong>
            <small>AI-powered training operations</small>
          </span>
        </a>

        <nav className="site-nav" aria-label="Landing sections">
          <a href="#platform">Platform</a>
          <a href="#roles">Roles</a>
          <a href="#ai-review">AI Review</a>
          <a href="#start">Get Started</a>
        </nav>

        <a className="header-action" href="/courses">
          Explore Courses
        </a>
      </header>

      <section className="hero-section">
        <div className="hero-bg" aria-hidden="true">
          <span className="hero-grid-line line-one" />
          <span className="hero-grid-line line-two" />
        </div>

        <div className="hero-content">
          <p className="eyebrow">Smart Learnly Platform</p>
          <h1>Centralize professional training with AI-assisted learning.</h1>
          <p className="hero-copy">
            SLP brings course discovery, enrollment, payments, learning delivery,
            assessments, flashcards, assignments, AI study support, and analytics
            into one governed web platform.
          </p>

          <div className="hero-actions" aria-label="Main actions">
            <a className="button button-primary" href="/classes">
              Browse Classes
            </a>
            <a className="button button-secondary" href="/auth/register">
              Create Account
            </a>
          </div>
        </div>

        <div className="hero-visual" aria-label="Smart Learnly dashboard preview">
          <div className="dashboard-shell">
            <aside className="preview-sidebar">
              <span className="preview-logo">SLP</span>
              <span className="preview-nav active" />
              <span className="preview-nav" />
              <span className="preview-nav" />
              <span className="preview-nav short" />
            </aside>

            <section className="preview-workspace">
              <div className="preview-topbar">
                <div>
                  <span className="preview-kicker">Trainee Dashboard</span>
                  <strong>Exam readiness</strong>
                </div>
                <span className="preview-pill">Ready 82%</span>
              </div>

              <div className="preview-grid">
                <article className="preview-panel wide">
                  <div className="panel-heading">
                    <span>Learning progress</span>
                    <strong>64%</strong>
                  </div>
                  <div className="progress-track">
                    <span className="progress-fill" />
                  </div>
                  <div className="mini-chart" aria-hidden="true">
                    <span style={{ height: "34%" }} />
                    <span style={{ height: "58%" }} />
                    <span style={{ height: "44%" }} />
                    <span style={{ height: "76%" }} />
                    <span style={{ height: "68%" }} />
                    <span style={{ height: "88%" }} />
                  </div>
                </article>

                <article className="preview-panel">
                  <span className="panel-label">AI Review Queue</span>
                  <strong>18</strong>
                  <small>draft items waiting</small>
                </article>

                <article className="preview-panel accent">
                  <span className="panel-label">Weak Topic</span>
                  <strong>Payment API</strong>
                  <small>review recommended</small>
                </article>
              </div>
            </section>
          </div>

          <img className="hero-asset" src={heroAsset} alt="" />
        </div>
      </section>

      <section className="metrics-band" aria-label="Platform highlights">
        {metrics.map((metric) => (
          <article key={metric.value}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </article>
        ))}
      </section>

      <section className="section-block" id="platform">
        <div className="section-heading">
          <p className="eyebrow">Platform capabilities</p>
          <h2>Designed around real training center operations.</h2>
          <p>
            The landing experience borrows LearnPlus' clean LMS cards and
            dashboard rhythm, then extends it for SLP's AI, review, and
            operations-first product scope.
          </p>
        </div>

        <div className="capability-grid">
          {capabilities.map((item) => (
            <article className="capability-card" key={item.title}>
              <span>{item.status}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="split-section" id="roles">
        <div className="section-heading compact">
          <p className="eyebrow">Role-aware journeys</p>
          <h2>One platform, different workspaces.</h2>
          <p>
            SLP gives every user a focused path without exposing private
            learning content or administrative workflows to the wrong role.
          </p>
        </div>

        <div className="role-list">
          {roleJourneys.map((item, index) => (
            <article key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="review-section" id="ai-review">
        <div className="review-copy">
          <p className="eyebrow">Human-reviewed AI</p>
          <h2>AI accelerates content, people keep it trustworthy.</h2>
          <p>
            Questions, flashcards, study support, and assignment feedback can
            start with AI. SLP keeps the publish path governed by expert review
            so learners receive approved educational content.
          </p>
        </div>

        <div className="review-flow" aria-label="AI content review workflow">
          {reviewSteps.map((step, index) => (
            <article key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta" id="start">
        <div>
          <p className="eyebrow">Launch the learning lifecycle</p>
          <h2>Start with a course catalog that leads into a complete training platform.</h2>
        </div>
        <div className="cta-actions">
          <a className="button button-primary" href="/courses">
            View Course Catalog
          </a>
          <a className="button button-secondary dark" href="/admin/configuration">
            Configure Platform
          </a>
        </div>
      </section>
    </main>
  );
}
