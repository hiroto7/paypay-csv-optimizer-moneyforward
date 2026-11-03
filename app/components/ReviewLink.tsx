import { SearchCheck } from "lucide-react";
import { Link } from "react-router";

interface ReviewLinkProps {
  candidateCount: number;
}

export default function ReviewLink({ candidateCount }: ReviewLinkProps) {
  return (
    <Link
      to="/review"
      className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
    >
      <SearchCheck className="size-3.5" aria-hidden="true" />
      重複登録・口座間違いを確認する
      {candidateCount > 0 && (
        <span className="rounded-full bg-amber-100 px-1.5 text-[11px] font-bold text-amber-800 no-underline">
          {candidateCount}件
        </span>
      )}
    </Link>
  );
}
