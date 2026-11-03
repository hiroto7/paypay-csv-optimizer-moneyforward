import { ListChecks } from "lucide-react";
import type { MfmeReviewCandidate } from "~/services/mfme-reconciliation";

interface ReviewCandidateListProps {
  candidates: MfmeReviewCandidate[];
}

export default function ReviewCandidateList({
  candidates,
}: ReviewCandidateListProps) {
  return (
    <div>
      <div className="flex gap-2 border-y border-amber-200 bg-amber-50 px-5 py-4 text-xs leading-5 text-amber-950 sm:px-7">
        <ListChecks className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-bold">MoneyForward MEで確認する手順</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            <li>明細の内容と口座を確認する</li>
            <li>重複など、不要な明細だけを削除する</li>
            <li>必要な明細で口座だけが違う場合は、口座を変更する</li>
          </ol>
        </div>
      </div>
      <ul className="divide-y divide-zinc-200" aria-label="要確認の明細">
        {candidates.map((candidate) => (
          <li
            key={candidate.key}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 px-5 py-3 text-sm sm:px-7"
          >
            <span className="break-words font-medium text-zinc-900">
              {candidate.content}
            </span>
            <span className="text-right tabular-nums text-zinc-800">
              {Number(candidate.amount).toLocaleString("ja-JP")}円
            </span>
            <span className="text-xs tabular-nums text-zinc-500">
              {candidate.date}
            </span>
            <span className="text-right text-xs text-zinc-600">
              口座：{candidate.actualInstitution}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
