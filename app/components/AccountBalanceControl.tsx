import { ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import type { AccountBalance } from "~/services/local-exclusion-store";
import type { ProcessedCsvChunk } from "~/services/paypay-csv";

interface AccountBalanceControlProps {
  accountName: string;
  chunks: readonly ProcessedCsvChunk[];
  balance: AccountBalance | undefined;
  onSetBalance: (accountName: string, amount: number) => void;
  onClearBalance: (accountName: string) => void;
}

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const parseBalance = (value: string): number | null => {
  const normalized = value.replaceAll(",", "").trim();
  if (!/^-?\d+$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) ? amount : null;
};

export default function AccountBalanceControl({
  accountName,
  chunks,
  balance,
  onSetBalance,
  onClearBalance,
}: AccountBalanceControlProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftBalance, setDraftBalance] = useState("");
  const [error, setError] = useState("");
  const inputId = useId();
  const errorId = useId();
  const pendingDelta = chunks.reduce(
    (total, chunk) => (chunk.imported ? total : total + chunk.balanceDelta),
    0,
  );
  const projectedBalance =
    balance === undefined ? null : balance.amount + pendingDelta;

  const startEditing = () => {
    setDraftBalance(String(balance?.amount ?? ""));
    setError("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraftBalance("");
    setError("");
    setIsEditing(false);
  };

  const saveBalance = () => {
    const amount = parseBalance(draftBalance);
    if (amount === null) {
      setError("残高は整数で入力してください。");
      return;
    }
    onSetBalance(accountName, amount);
    cancelEditing();
  };

  if (!isEditing) {
    if (!balance) {
      return (
        <button
          type="button"
          onClick={startEditing}
          className="inline-flex min-h-8 items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-950"
          aria-label={`${accountName}の現在残高を設定`}
        >
          <Plus className="size-3.5" aria-hidden="true" />
          残高を設定
        </button>
      );
    }

    return (
      <div className="flex min-h-8 flex-wrap items-center gap-1.5 text-xs">
        <span className="text-zinc-500">残高</span>
        <span className="font-semibold text-zinc-800">
          {currencyFormatter.format(balance.amount)}
        </span>
        {pendingDelta !== 0 && projectedBalance !== null && (
          <>
            <ArrowRight className="size-3 text-zinc-400" aria-hidden="true" />
            <span
              className="font-semibold text-zinc-950"
              title="全件取り込み後の見込み残高"
            >
              {currencyFormatter.format(projectedBalance)}
            </span>
          </>
        )}
        <button
          type="button"
          onClick={startEditing}
          className="inline-flex size-7 items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
          aria-label={`${accountName}の現在残高を編集`}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <form
      className="w-full sm:w-auto"
      onSubmit={(event) => {
        event.preventDefault();
        saveBalance();
      }}
    >
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label htmlFor={inputId} className="sr-only">
          MoneyForward MEの現在残高
        </label>
        <div className="flex">
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            value={draftBalance}
            onChange={(event) => {
              setDraftBalance(event.target.value);
              setError("");
            }}
            className="h-8 w-28 border border-zinc-300 px-2 text-right text-xs font-semibold outline-none focus:border-red-600"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
          <span className="flex h-8 items-center border-y border-r border-zinc-300 bg-zinc-50 px-2 text-xs text-zinc-500">
            円
          </span>
        </div>
        <button
          type="submit"
          className="min-h-8 bg-zinc-900 px-3 text-xs font-semibold text-white hover:bg-zinc-700"
        >
          保存
        </button>
        <button
          type="button"
          onClick={cancelEditing}
          className="min-h-8 px-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100"
        >
          キャンセル
        </button>
        {balance && (
          <button
            type="button"
            onClick={() => {
              onClearBalance(accountName);
              cancelEditing();
            }}
            className="inline-flex size-8 items-center justify-center text-zinc-400 hover:bg-zinc-100 hover:text-red-700"
            aria-label={`${accountName}の残高設定を解除`}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      {error && (
        <p
          id={errorId}
          className="mt-1 text-right text-xs text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}
    </form>
  );
}
