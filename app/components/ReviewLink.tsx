import { SearchCheck } from "lucide-react";
import { Link } from "react-router";

interface ReviewLinkProps {
  // 両方のファイルがあるときだけ求められる件数。求められないときはnull。
  candidateCount: number | null;
}

export default function ReviewLink({ candidateCount }: ReviewLinkProps) {
  return (
    <Link
      to="/review"
      className="group inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-950"
    >
      <SearchCheck className="size-3.5" aria-hidden="true" />
      <span className="underline decoration-zinc-300 underline-offset-4">
        重複登録・口座間違いを確認する
      </span>
      {candidateCount !== null && candidateCount > 0 && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
          {candidateCount}件
        </span>
      )}
    </Link>
  );
}
