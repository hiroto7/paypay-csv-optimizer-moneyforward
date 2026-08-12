import { Link } from "react-router";

export default function AppFooter() {
  return (
    <footer className="border-t border-rule-strong bg-paper">
      <div className="app-container py-3 text-sm text-muted">
        <nav
          aria-label="補足情報"
          className="flex flex-wrap items-center gap-x-1 sm:gap-x-3"
        >
          <Link to="/guide" className="control-link interactive px-2">
            使い方
          </Link>
          <Link to="/privacy" className="control-link interactive px-2">
            プライバシーについて
          </Link>
          <a
            href="https://github.com/hiroto7/paypay-csv-optimizer-moneyforward"
            target="_blank"
            rel="noreferrer"
            className="control-link interactive px-2"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
