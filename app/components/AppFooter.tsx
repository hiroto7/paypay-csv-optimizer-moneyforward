import { Code2, ExternalLink } from "lucide-react";
import { Link } from "react-router";

const GITHUB_REPOSITORY_URL =
  "https://github.com/hiroto7/paypay-csv-optimizer-moneyforward";

export default function AppFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>PayPay / MoneyForward MEの非公式ツールです。</p>
        <nav
          aria-label="サイト情報"
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          <Link
            to="/privacy"
            className="font-medium underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900"
          >
            プライバシーについて
          </Link>
          <a
            href={GITHUB_REPOSITORY_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-medium underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900"
          >
            <Code2 className="size-3.5" aria-hidden="true" />
            GitHub
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        </nav>
      </div>
    </footer>
  );
}
