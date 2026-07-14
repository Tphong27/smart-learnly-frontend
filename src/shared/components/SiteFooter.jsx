import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import { SmartLearnlyMark } from "./SmartLearnlyMark";
import "./SiteFooter.css";

const footerGroups = [
  {
    title: "Platform",
    links: [
      { label: "Explore courses", href: "/#courses" },
      { label: "Learning tools", href: "/#features" },
    ],
  },
  {
    title: "Your workspace",
    links: [
      { label: "Dashboard", to: "/dashboard" },
      { label: "My learning", to: "/learning/courses" },
      { label: "Profile", to: "/profile" },
    ],
  },
  {
    title: "Get started",
    links: [
      { label: "Create account", to: "/register" },
      { label: "Log in", to: "/login" },
    ],
  },
];

function FooterLink({ link }) {
  if (link.to) return <Link to={link.to}>{link.label}</Link>;
  return <a href={link.href}>{link.label}</a>;
}

export function SiteFooter() {
  const currentYear = new Date().getFullYear();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    function updateBackToTopVisibility() {
      setShowBackToTop(window.scrollY > 480);
    }

    updateBackToTopVisibility();
    window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateBackToTopVisibility);
  }, []);

  function scrollToTop() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <footer className="global-site-footer">
      <div className="global-site-footer__inner">
        <div className="global-site-footer__main">
          <div className="global-site-footer__brand-column">
            <Link className="global-site-footer__brand" to="/" aria-label="Smart Learnly home">
              <SmartLearnlyMark className="global-site-footer__brand-mark" />
              <span>Smart Learnly</span>
            </Link>

            <p>
              A focused learning space for trainees, educators, and training centers ready to grow.
            </p>

          </div>

          <nav className="global-site-footer__navigation" aria-label="Footer navigation">
            {footerGroups.map((group) => (
              <div className="global-site-footer__group" key={group.title}>
                <h2>{group.title}</h2>
                <div className="global-site-footer__links">
                  {group.links.map((link) => (
                    <FooterLink key={link.label} link={link} />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="global-site-footer__bottom">
          <div className="global-site-footer__legal">
            <span>© {currentYear} Smart Learnly Platform</span>
          </div>

          <button
            type="button"
            className={`global-site-footer__top-button${showBackToTop ? " global-site-footer__top-button--visible" : ""}`}
            onClick={scrollToTop}
            aria-label="Back to top"
            title="Back to top"
          >
            <ArrowUp size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </footer>
  );
}
