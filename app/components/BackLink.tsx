import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

export default function BackLink() {
  return (
    <Link
      to="/"
      className="mb-5 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
    >
      <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
      アプリに戻る
    </Link>
  );
}
