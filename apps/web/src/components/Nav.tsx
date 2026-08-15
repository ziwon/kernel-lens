import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { Logo } from "./Logo.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";
import { frame } from "../lib/frame.ts";

const primary = [
  { to: "/topics", label: "Topics" },
  { to: "/vendors", label: "Vendors" },
  { to: "/digests", label: "Digests" },
  { to: "/blog", label: "Analysis" },
];

const secondary = [
  { to: "/about", label: "About" },
  { to: "/about/methodology", label: "Methodology" },
  { to: "/support", label: "Support" },
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
];

/** Active state is weight plus a 1px bottom rule — no filled pills (DESIGN.md 8.1). */
function navLinkClass({ isActive }: { isActive: boolean }) {
  return `focus-ring inline-flex h-[60px] items-center border-b transition-colors ${
    isActive
      ? "border-accent font-medium text-ink"
      : "border-transparent text-ink-secondary hover:text-ink"
  }`;
}

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-canvas">
      <div className={`${frame} flex h-[60px] items-center justify-between gap-6`}>
        <Link to="/" className="focus-ring flex shrink-0 items-center gap-2.5">
          <Logo />
          <span className="text-[1.0625rem] font-semibold tracking-[-0.02em] text-ink">
            Kernel Lens
          </span>
          <span className="hidden border-l border-border pl-2.5 text-small text-ink-muted xl:inline">
            A clearer view into Linux kernel development
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <nav aria-label="Primary" className="hidden items-center gap-6 text-small md:flex">
            {primary.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <Link
              to="/search"
              className="focus-ring inline-flex size-11 items-center justify-center text-ink-secondary transition-colors hover:text-ink"
              aria-label="Search"
              title="Search"
            >
              <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
                <circle cx="10.5" cy="10.5" r="6" stroke="currentColor" strokeWidth="1.5" />
                <line
                  x1="15"
                  y1="15"
                  x2="20"
                  y2="20"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </Link>

            <ThemeToggle />

            <a
              href="https://github.com/ziwon/lkmlens"
              target="_blank"
              rel="noreferrer"
              className="focus-ring hidden size-11 items-center justify-center text-ink-secondary transition-colors hover:text-ink md:inline-flex"
              aria-label="Kernel Lens on GitHub"
              title="GitHub"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="size-5" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
            </a>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="focus-ring inline-flex size-11 items-center justify-center text-ink-secondary transition-colors hover:text-ink md:hidden"
            >
              <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
                {menuOpen ? (
                  <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="5" y1="5" x2="19" y2="19" />
                    <line x1="19" y1="5" x2="5" y2="19" />
                  </g>
                ) : (
                  <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="20" y2="17" />
                  </g>
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Full-width panel rather than a tiny dropdown (DESIGN.md 8.3). */}
      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Site"
          className="border-t border-border bg-surface md:hidden"
        >
          <div className={`${frame} py-2`}>
            <ul className="border-b border-border">
              {primary.map((item) => (
                <li key={item.to} className="border-t border-border first:border-t-0">
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `focus-ring flex min-h-11 items-center py-3 text-body ${
                        isActive ? "font-medium text-ink" : "text-ink-secondary"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 py-3">
              {secondary.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="focus-ring inline-flex min-h-11 items-center text-small text-ink-muted"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="https://github.com/ziwon/lkmlens"
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex min-h-11 items-center text-small text-ink-muted"
                >
                  GitHub ↗
                </a>
              </li>
            </ul>
          </div>
        </nav>
      )}
    </header>
  );
}
