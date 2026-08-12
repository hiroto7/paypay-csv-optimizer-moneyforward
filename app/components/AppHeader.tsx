import { Link, NavLink } from "react-router";

export default function AppHeader() {
  return (
    <header className="border-b border-rule-strong bg-paper">
      <div className="app-container flex min-h-16 items-center justify-between gap-3">
        <Link
          to="/"
          className="interactive flex min-h-11 min-w-0 items-center gap-2.5 whitespace-nowrap"
          aria-label="PP2MF ホーム"
        >
          <img
            src="/pwa-icon.svg"
            alt=""
            className="size-8 shrink-0"
            aria-hidden="true"
          />
          <span className="type-display text-lg font-bold tracking-[-0.035em] text-ink">
            PP2MF
          </span>
        </Link>
        <nav aria-label="主要" className="flex items-center gap-1 sm:gap-3">
          {[
            { to: "/guide", label: "使い方" },
            { to: "/privacy", label: "プライバシー" },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `interactive inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-2 text-sm font-semibold sm:px-3 ${
                  isActive
                    ? "border-accent text-ink"
                    : "border-transparent text-ink-2"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
