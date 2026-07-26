import { AlertTriangle, CheckCircle2, ListChecks } from "lucide-react";
import type { MfmeReviewCandidate } from "~/services/mfme-reconciliation";

interface AuditResultsProps {
  candidates: MfmeReviewCandidate[];
}

export default function AuditResults({ candidates }: AuditResultsProps) {
  if (candidates.length === 0) {
    return (
      <section
        className="flex min-h-96 flex-col items-center justify-center px-6 py-12 text-center"
        aria-labelledby="audit-result-title"
      >
        <div className="flex size-12 items-center justify-center bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </div>
        <h2
          id="audit-result-title"
          className="mt-4 text-lg font-bold text-zinc-950"
        >
          読み込んだ入出金履歴の範囲では修正候補は見つかりませんでした
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-zinc-600">
          PayPay明細と完全一致しない要確認明細はありません。
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="audit-result-title">
      <div className="border-b border-zinc-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-600" aria-hidden="true" />
          <h2
            id="audit-result-title"
            className="text-base font-bold text-zinc-950"
          >
            要確認明細 {candidates.length}件
          </h2>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          内容と口座をMoneyForward MEで確認してください
        </p>
      </div>

      <div className="border-b border-amber-200 bg-amber-50 px-5 py-4 text-xs leading-5 text-amber-950">
        <div className="flex gap-2">
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
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[640px] w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
              <th className="px-5 py-3 text-left font-semibold">日付</th>
              <th className="px-3 py-3 text-left font-semibold">内容</th>
              <th className="px-3 py-3 text-right font-semibold">金額</th>
              <th className="px-5 py-3 text-left font-semibold">口座</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {candidates.map((candidate) => (
              <tr key={candidate.key} className="hover:bg-zinc-50">
                <td className="whitespace-nowrap px-5 py-3 text-zinc-600">
                  {candidate.date}
                </td>
                <td className="max-w-64 px-3 py-3 font-medium text-zinc-800">
                  {candidate.content}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-zinc-700">
                  {Number(candidate.amount).toLocaleString("ja-JP")}円
                </td>
                <td className="px-5 py-3 text-zinc-700">
                  {candidate.actualInstitution}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
