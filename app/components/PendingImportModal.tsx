import { Check, ChevronDown, Share2 } from "lucide-react";
import { useState } from "react";
import Modal from "~/components/Modal";
import type { PendingImport } from "~/services/local-exclusion-store";

interface PendingImportModalProps {
  pendingImport: PendingImport;
  // 確認が終わるまで読み込みを後回しにしている、共有で受け取ったファイル。
  deferredFileNames?: string[];
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

export default function PendingImportModal({
  pendingImport,
  deferredFileNames = [],
  onConfirm,
  onDiscard,
}: PendingImportModalProps) {
  const { accountName, sharedAt, transactions } = pendingImport;
  const newestFirst = [...transactions].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <Modal title="前回の取り込みを保存しましたか？" dismissible={false}>
      <div className="min-h-0 overflow-y-auto px-5">
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
          {deferredFileNames.length > 0 && (
            <p className="flex gap-2 border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs leading-5 text-zinc-600">
              <Share2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                共有されたファイル（{deferredFileNames.join("、")}
                ）は、この確認のあとで読み込みます。
              </span>
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex min-h-10 w-full items-center justify-center border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 sm:w-auto"
        >
          保存していない
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700 sm:w-auto"
        >
          <Check className="size-4" aria-hidden="true" />
          MoneyForward MEで保存した
        </button>
      </div>
    </Modal>
  );
}
