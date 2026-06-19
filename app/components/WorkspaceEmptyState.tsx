import { ArrowRight, Check, FileCheck2, FileSearch } from "lucide-react";

export type AppMode = "convert" | "audit";

interface WorkspaceEmptyStateProps {
  mode: AppMode;
  hasPayPay: boolean;
  hasMfme: boolean;
  hasOutput: boolean;
}

export default function WorkspaceEmptyState({
  mode,
  hasPayPay,
  hasMfme,
  hasOutput,
}: WorkspaceEmptyStateProps) {
  const isAudit = mode === "audit";
  const conversionIsEmpty = !isAudit && hasPayPay && !hasOutput;

  const title = (() => {
    if (!hasPayPay) return "PayPay CSVを選択してください";
    if (conversionIsEmpty) return "変換対象の取引はありません";
    if (!hasMfme) return "MoneyForward ME CSVを選択してください";
    return "明細を照合できます";
  })();

  const description = (() => {
    if (!hasPayPay) {
      return isAudit
        ? "照合するPayPay取引履歴とMoneyForward ME明細のCSVを選択してください。"
        : "PayPayの併用払いを分割し、MoneyForward MEへ取り込める100件単位のCSVを作成します。MoneyForward ME CSVは任意です。";
    }
    if (conversionIsEmpty) {
      return "すべての取引がMoneyForward ME明細または「保存した」の記録に含まれている可能性があります。";
    }
    if (!hasMfme) {
      return isAudit
        ? "PayPay取引履歴と比較するMoneyForward ME明細のCSVを選択してください。"
        : "MoneyForward ME CSVは任意です。未選択の場合はPayPayの全明細を出力します。";
    }
    return "PayPayの取引履歴とMoneyForward MEの明細を比較し、重複や別口座への取り込み候補を表示します。";
  })();

  return (
    <div className="flex min-h-80 flex-col items-center justify-center px-6 py-10 text-center sm:min-h-[520px] sm:py-12">
      <div className="flex size-12 items-center justify-center bg-zinc-100 text-zinc-600">
        {isAudit ? (
          <FileSearch className="size-6" aria-hidden="true" />
        ) : (
          <FileCheck2 className="size-6" aria-hidden="true" />
        )}
      </div>
      <h2 className="mt-4 text-lg font-bold text-zinc-950">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-600">
        {description}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold">
        <span
          className={`inline-flex items-center gap-1.5 ${
            hasPayPay ? "text-emerald-700" : "text-zinc-400"
          }`}
        >
          {hasPayPay ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <span className="size-1.5 bg-zinc-300" />
          )}
          PayPay CSV
          {!isAudit && <span className="font-normal text-zinc-400">必須</span>}
        </span>
        {isAudit && (
          <ArrowRight className="size-3.5 text-zinc-300" aria-hidden="true" />
        )}
        <span
          className={`inline-flex items-center gap-1.5 ${
            hasMfme ? "text-emerald-700" : "text-zinc-400"
          }`}
        >
          {hasMfme ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <span className="size-1.5 bg-zinc-300" />
          )}
          MoneyForward ME CSV
          {!isAudit && <span className="font-normal text-zinc-400">任意</span>}
        </span>
      </div>
    </div>
  );
}
