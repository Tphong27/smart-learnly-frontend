import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/shared/components/ui";
import { SmartLearnlyMark } from "./SmartLearnlyMark";
import { HeaderCourseSearch } from "./HeaderCourseSearch";

// Header component - Figma Neubrutalism Design
export function SiteHeader() {
  const [isCompact, setIsCompact] = useState(() => window.scrollY > 24);

  useEffect(() => {
    let frameId = null;

    function handleScroll() {
      if (frameId) return;

      frameId = window.requestAnimationFrame(() => {
        const shouldCompact = window.scrollY > 24;
        setIsCompact((current) =>
          current === shouldCompact ? current : shouldCompact,
        );
        frameId = null;
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <header
      className={`site-header${isCompact ? " site-header--compact" : ""}`}
    >
      <div className="header-container">
        {/* Logo */}
        <a href="/" className="header-logo" aria-label="Smart Learnly home">
          <SmartLearnlyMark className="header-logo-icon" />
          <span className="header-logo-text">Smart Learnly</span>
        </a>

        <HeaderCourseSearch
          includeOpeningClasses
          placeholder="Search courses, classes, topics, or skills..."
          classDetailPath="/opening-schedule"
          classReturnPath="/#opening-schedule"
          classBackLabel="Back to homepage"
        />
        
        {/* Navigation */}
        <nav className="header-nav">
          <button className="header-categories-btn">
            <span>Categories</span>
            <ChevronDown size={16} />
          </button>

          <Button to="/login" variant="outline">
            Log in
          </Button>
          <Button to="/register">Register</Button>
        </nav>
      </div>
    </header>
  );
}

// Brand Logo component (for footer)
export function BrandLogo() {
  return (
    <a className="brand" href="/" aria-label="Smart Learnly home">
      <SmartLearnlyMark className="brand-mark" />
      <span>Smart Learnly</span>
    </a>
  );
}
