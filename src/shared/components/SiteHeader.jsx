import { useEffect, useState } from "react";
import { Menu, X, Zap } from "lucide-react";

// Brand logo dùng chung cho header và footer của các trang public.
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

// Header dùng chung cho các trang public (homepage, course detail, ...).
// Các liên kết điều hướng trỏ về "/#section" để hoạt động được từ mọi trang.
export function SiteHeader() {
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
                <BrandLogo />
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
                    <a href="/#courses" onClick={closeMenu}>
                        Courses
                    </a>
                    <a href="/#features" onClick={closeMenu}>
                        Features
                    </a>
                    <a href="/#centers" onClick={closeMenu}>
                        For Centers
                    </a>
                    <a href="/#how-it-works" onClick={closeMenu}>
                        How It Works
                    </a>
                    <a href="/#about" onClick={closeMenu}>
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
