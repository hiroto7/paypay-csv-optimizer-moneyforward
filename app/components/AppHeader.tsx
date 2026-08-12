import { LockKeyhole } from "lucide-react";
import { Link } from "react-router";

export default function AppHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-red-600 focus-visible:outline-offset-2"
        >
          <img
            src="/pwa-icon.svg"
            alt=""
            className="size-9 shrink-0 rounded-lg"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold text-zinc-950 sm:text-base">
              PP2MF
            </span>
            <span className="block truncate text-[10px] leading-4 text-zinc-500 sm:text-xs">
              PayPay CSV Optimizer for MoneyForward ME
            </span>
          </div>
        </Link>
        <div
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-zinc-500"
          title="ブラウザ内で処理"
        >
          <LockKeyhole className="size-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">ブラウザ内で処理</span>
          <span className="sr-only sm:hidden">ブラウザ内で処理</span>
        </div>
      </div>
    </header>
  );
}
