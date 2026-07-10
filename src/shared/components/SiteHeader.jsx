import { useEffect, useState } from "react";
import { Zap, Search, ChevronDown } from "lucide-react";

// Header component - Figma Neubrutalism Design
export function SiteHeader() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="site-header">
            <div className="header-container">
                {/* Logo */}
                <a
                    href="/"
                    className="header-logo"
                    aria-label="Smart Learnly home"
                >
                    <span className="header-logo-icon">
                        <Zap size={18} strokeWidth={2.5} />
                    </span>
                    <span className="header-logo-text">Smart Learnly</span>
                </a>

                {/* Search Bar */}
                <div className="header-search">
                    <Search size={18} className="header-search-icon" />
                    <input
                        type="text"
                        placeholder="Search any courses..."
                        className="header-search-input"
                    />
                </div>

                {/* Navigation */}
                <nav className="header-nav">
                    <button className="header-categories-btn">
                        <span>Categories</span>
                        <ChevronDown size={16} />
                    </button>

                    <a href="/login" className="header-btn header-btn-outline">
                        Log in
                    </a>
                    <a
                        href="/register"
                        className="header-btn header-btn-primary"
                    >
                        Register
                    </a>
                </nav>
            </div>
        </header>
    );
}

// Brand Logo component (for footer)
export function BrandLogo() {
    return (
        <a className="brand" href="/" aria-label="Smart Learnly home">
            <span className="brand-mark">
                <Zap size={18} strokeWidth={2.6} />
            </span>
            <span>Smart Learnly</span>
        </a>
    );
}
