import { AlertTriangle, CheckCircle2, ListChecks } from "lucide-react";
import type { MfmeReviewCandidate } from "~/services/mfme-reconciliation";

interface AuditResultsProps {
  candidates: MfmeReviewCandidate[];
}

export default function AuditResults({ candidates }: AuditResultsProps) {
  if (candidates.length === 0) {
    return (
      <section
        className="px-5 py-5 text-left"
        aria-labelledby="audit-result-title"
      >
        <div className="flex items-start gap-3">
          <span className="status-success flex size-11 shrink-0 items-center justify-center border">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              id="audit-result-title"
              className="text-base font-bold text-foreground"
            >
              読み込んだ入出金履歴の範囲では修正候補は見つかりませんでした
            </h2>
            <p className="mt-1 text-sm leading-6 text-foreground-subtle">
              PayPay明細と完全一致しない要確認明細はありません。
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="audit-result-title">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-warning" aria-hidden="true" />
          <h2
            id="audit-result-title"
            className="text-base font-bold text-foreground"
          >
            要確認明細 {candidates.length}件
          </h2>
        </div>
        <p className="mt-1 text-sm text-foreground-subtle">
          内容と口座をMoneyForward MEで確認してください
        </p>
      </div>

      <div className="status-warning border-b px-5 py-4 text-sm leading-6">
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

      <div>
        <table className="audit-table text-sm" aria-label="要確認明細">
          <thead>
            <tr className="border-b border-border bg-surface text-xs text-foreground-subtle">
              <th className="px-5 py-3 text-left font-semibold">日付</th>
              <th className="px-3 py-3 text-left font-semibold">内容</th>
              <th className="px-3 py-3 text-right font-semibold">金額</th>
              <th className="px-5 py-3 text-left font-semibold">口座</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {candidates.map((candidate) => (
              <tr key={candidate.key}>
                <td
                  data-label="日付"
                  className="whitespace-nowrap px-5 py-3 text-foreground-subtle"
                >
                  {candidate.date}
                </td>
                <td
                  data-label="内容"
                  className="px-3 py-3 font-medium text-foreground"
                >
                  {candidate.content}
                </td>
                <td
                  data-label="金額"
                  className="type-data whitespace-nowrap px-3 py-3 text-right text-foreground-subtle"
                >
                  {Number(candidate.amount).toLocaleString("ja-JP")}円
                </td>
                <td
                  data-label="口座"
                  className="px-5 py-3 text-foreground-subtle"
                >
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
