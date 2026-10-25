import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { useState } from "react";
import Modal from "~/components/Modal";
import type { PendingImport } from "~/services/local-exclusion-store";

export type ImportConfirmationMode = "sharing" | "shared" | "resumed";

interface ImportConfirmationModalProps {
  mode: ImportConfirmationMode;
  pendingImport: PendingImport;
  onConfirm: () => void;
  onDiscard: () => void;
}

// 直近の共有を指すため、年は今年でない場合だけ表示する（例: 7月25日 15:00）。
const formatSharedAt = (sharedAt: number) => {
  const date = new Date(sharedAt);
  return date.toLocaleString("ja-JP", {
    ...(date.getFullYear() !== new Date().getFullYear() && {
      year: "numeric",
    }),
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatAmount = (amount: number) => `${amount.toLocaleString("ja-JP")}円`;

// MoneyForward MEの明細一覧は新しい順に並ぶため、先頭の数件で保存されたかを確かめてもらう。
const CHECK_TRANSACTION_COUNT = 3;

function TransactionList({
  transactions,
}: {
  transactions: PendingImport["transactions"];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  // 同じ明細キーの取引が複数あるため、何件目かを含めて区別する。
  const occurrences = new Map<string, number>();
  const rows = transactions.map((transaction) => {
    const occurrence = (occurrences.get(transaction.key) ?? 0) + 1;
    occurrences.set(transaction.key, occurrence);
    return { ...transaction, rowKey: `${transaction.key}#${occurrence}` };
  });
  const visibleRows = isExpanded
    ? rows
    : rows.slice(0, CHECK_TRANSACTION_COUNT);
  const hiddenCount = rows.length - visibleRows.length;

  return (
    <div className="border-y border-zinc-200 text-sm text-zinc-800">
      <ul className="divide-y divide-zinc-100">
        {visibleRows.map(({ rowKey, date, content, amount }) => (
          <li
            key={rowKey}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 py-1.5"
          >
            <span className="tabular-nums">{date}</span>
            <span className="break-all">{content}</span>
            <span className="tabular-nums">{formatAmount(amount)}</span>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex w-full items-center justify-center gap-1 border-t border-zinc-100 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
        >
          <ChevronDown className="size-3.5" aria-hidden="true" />
          残り{hiddenCount}件を表示
        </button>
      )}
    </div>
  );
}

function ShareSteps({
  accountName,
  isSharing,
}: {
  accountName: string;
  isSharing: boolean;
}) {
  return (
    <ol className="divide-y divide-zinc-200">
      {[
        { instruction: "共有シートでMoneyForward MEを選ぶ" },
        { instruction: "「CSVを読み込む」を押す" },
        {
          instruction: "MoneyForward MEを開く",
          description: "自動的に「読み込んだ明細」画面が開きます",
        },
        {
          instruction: `「支出元・入金先一括変更」で「${accountName}」を選ぶ`,
        },
        { instruction: "内容を確認して右上の「保存」を押す" },
        {
          instruction:
            "PP2MFに戻り、この画面の「MoneyForward MEで保存した」を押す",
          description: "押すと、次回から今回の明細を自動で除外します",
        },
      ].map(({ instruction, description }, index) => {
        const isShareStep = index === 0;
        return (
          <li
            key={instruction}
            className={`grid grid-cols-[28px_minmax(0,1fr)] items-start gap-3 py-4 text-sm ${
              isShareStep && isSharing
                ? "font-semibold text-zinc-950"
                : "text-zinc-700"
            }`}
          >
            <span
              className={`flex size-7 items-center justify-center text-xs font-bold ${
                isShareStep && !isSharing
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-zinc-100 text-zinc-700"
              }`}
            >
              {isShareStep ? (
                isSharing ? (
                  <LoaderCircle
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Check className="size-4" aria-hidden="true" />
                )
              ) : (
                index + 1
              )}
            </span>
            <div
              className={
                description === undefined
                  ? "flex min-h-7 min-w-0 items-center"
                  : "min-w-0"
              }
            >
              <span className="block leading-5">{instruction}</span>
              {description !== undefined && (
                <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function ImportConfirmationModal({
  mode,
  pendingImport,
  onConfirm,
  onDiscard,
}: ImportConfirmationModalProps) {
  const isSharing = mode === "sharing";
  const isResumed = mode === "resumed";
  const { accountName, sharedAt, transactions } = pendingImport;
  const newestFirst = [...transactions].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <Modal
      title={
        isResumed
          ? "前回の取り込みを保存しましたか？"
          : "MoneyForward MEに取り込む"
      }
      dismissible={false}
    >
      <div className="min-h-0 overflow-y-auto px-5">
        {isResumed ? (
          <div className="space-y-4 py-4">
            <p className="text-sm leading-6 text-zinc-700">
              {formatSharedAt(sharedAt)}に「{accountName}」の明細
              {transactions.length}
              件を共有しましたが、「MoneyForward
              MEで保存した」が押されていません。
            </p>
            <div className="space-y-3 border-t border-zinc-200 pt-4">
              <p className="text-xs leading-5 text-zinc-600">
                覚えていない場合は、MoneyForward MEで「{accountName}
                」の明細を開き、次の明細があるか確かめてください。
              </p>
              <TransactionList transactions={newestFirst} />
            </div>
          </div>
        ) : (
          <ShareSteps accountName={accountName} isSharing={isSharing} />
        )}
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onDiscard}
          disabled={isSharing}
          className={`inline-flex min-h-10 w-full items-center justify-center border px-4 text-sm font-semibold sm:w-auto ${
            isSharing
              ? "cursor-wait border-zinc-200 bg-zinc-100 text-zinc-400"
              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          {isResumed ? "保存していない" : "取り込みをやめる"}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSharing}
          className={`inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 text-sm font-semibold sm:w-auto ${
            isSharing
              ? "cursor-wait bg-zinc-200 text-zinc-500"
              : "bg-zinc-900 text-white hover:bg-zinc-700"
          }`}
        >
          {isSharing ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="size-4" aria-hidden="true" />
          )}
          {isSharing ? "共有シートを表示中" : "MoneyForward MEで保存した"}
        </button>
      </div>
    </Modal>
  );
}
