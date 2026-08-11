import { Link } from "react-router";

export default function AppFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-4 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>PP2MF</p>
        <nav aria-label="補足情報" className="flex flex-wrap gap-x-4 gap-y-1">
          <Link
            to="/guide"
            className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
          >
            使い方
          </Link>
          <Link
            to="/privacy"
            className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
          >
            プライバシーについて
          </Link>
          <a
            href="https://github.com/hiroto7/paypay-csv-optimizer-moneyforward"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
