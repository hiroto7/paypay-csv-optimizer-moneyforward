import { FileCheck2 } from "lucide-react";

interface WorkspaceEmptyStateProps {
  hasPayPay: boolean;
  hasOutput: boolean;
}

export default function WorkspaceEmptyState({
  hasPayPay,
  hasOutput,
}: WorkspaceEmptyStateProps) {
  const conversionIsEmpty = hasPayPay && !hasOutput;

  const title = (() => {
    if (!hasPayPay) return "PayPayから書き出した取引履歴を選んでください";
    return "作成する明細はありません";
  })();

  const description = (() => {
    if (!hasPayPay)
      return "選んだ明細を支払い方法ごとに分け、MoneyForward MEに取り込めるファイルを作ります。";
    if (conversionIsEmpty) {
      return "すべての取引が、登録済みとして扱う明細に含まれている可能性があります。";
    }
    return "";
  })();

  return (
    <div className="flex min-h-64 flex-col justify-center px-5 py-8 sm:min-h-80 sm:px-8">
      <div className="flex max-w-2xl items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center bg-paper-3 text-ink-2">
          <FileCheck2 className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-7 text-ink">{title}</h2>
          <p className="mt-1 text-base leading-7 text-ink-2">{description}</p>
        </div>
      </div>
      {!hasPayPay && (
        <div className="ml-0 mt-5 max-w-2xl sm:ml-[52px]">
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
            <li>
              PayPay残高とPayPayポイントを併用した支払いは、支払い方法ごとの明細に分けて、それぞれ別の口座へ登録できます。
            </li>
            <li>
              明細が多い場合は、取り込み用ファイルを100件ごとに分割します。
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
