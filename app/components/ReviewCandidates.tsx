import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ListChecks,
} from "lucide-react";
import { useState } from "react";
import type { MfmeReviewCandidate } from "~/services/mfme-reconciliation";

interface ReviewCandidatesProps {
  candidates: MfmeReviewCandidate[];
}

export default function ReviewCandidates({
  candidates,
}: ReviewCandidatesProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (candidates.length === 0) return null;

  return (
    <section
      className="border border-amber-200 bg-amber-50"
      aria-labelledby="review-candidates-title"
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="review-candidates-content"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-amber-100/60"
      >
        <AlertTriangle
          className="mt-0.5 size-5 shrink-0 text-amber-600"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span
            id="review-candidates-title"
            className="block text-sm font-bold text-zinc-950"
          >
            要確認の明細が{candidates.length}件あります
          </span>
          <span className="mt-0.5 block text-xs leading-5 text-zinc-600">
            重複登録や口座間違いの可能性があります。MoneyForward
            MEで内容と口座を確認してください。
          </span>
        </span>
        {isOpen ? (
          <ChevronUp
            className="mt-0.5 size-5 shrink-0 text-zinc-500"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            className="mt-0.5 size-5 shrink-0 text-zinc-500"
            aria-hidden="true"
          />
        )}
      </button>

      {isOpen && (
        <div
          id="review-candidates-content"
          className="border-t border-amber-200 bg-white"
        >
          <div className="flex gap-2 border-b border-amber-200 bg-amber-50/60 px-4 py-3 text-xs leading-5 text-amber-950">
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
          <ul className="divide-y divide-zinc-200">
            {candidates.map((candidate) => (
              <li
                key={candidate.key}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 px-4 py-2.5 text-sm"
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
      )}
    </section>
  );
}
