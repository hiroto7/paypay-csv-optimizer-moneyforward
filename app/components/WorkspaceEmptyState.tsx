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
    <div className="flex min-h-80 flex-col items-center justify-center px-6 py-10 text-center sm:min-h-[520px] sm:py-12">
      <div className="flex size-12 items-center justify-center bg-zinc-100 text-zinc-600">
        <FileCheck2 className="size-6" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-zinc-950">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-600">
        {description}
      </p>
      {!hasPayPay && (
        <ul className="mt-3 max-w-md list-disc space-y-1 pl-5 text-left text-sm leading-6 text-zinc-600">
          <li>
            PayPay残高とPayPayポイントを併用した支払いは、支払い方法ごとの明細に分けて、それぞれ別の口座へ登録できます。
          </li>
          <li>明細が多い場合は、取り込み用ファイルを100件ごとに分割します。</li>
        </ul>
      )}
    </div>
  );
}
