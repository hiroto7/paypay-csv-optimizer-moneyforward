import { Pencil, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import type { AccountBalance } from "~/services/local-exclusion-store";

interface AccountBalanceControlProps {
  accountName: string;
  pendingDelta: number;
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
  pendingDelta,
  balance,
  onSetBalance,
  onClearBalance,
}: AccountBalanceControlProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftBalance, setDraftBalance] = useState("");
  const [error, setError] = useState("");
  const inputId = useId();
  const errorId = useId();
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
    return (
      <div className="grid w-full gap-2 text-xs sm:w-auto">
        <dl className="grid gap-1">
          <div className="flex min-h-6 flex-wrap items-baseline justify-between gap-x-3">
            <dt className="text-foreground-subtle">現在残高</dt>
            <dd className="type-data font-semibold text-foreground">
              {balance === undefined
                ? "未設定"
                : currencyFormatter.format(balance.amount)}
            </dd>
          </div>
          <div className="flex min-h-6 flex-wrap items-baseline justify-between gap-x-3">
            <dt className="text-foreground-subtle">取り込み後の見込み残高</dt>
            <dd className="type-data font-semibold text-foreground">
              {projectedBalance === null
                ? "—"
                : currencyFormatter.format(projectedBalance)}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={startEditing}
          className="control-button button-secondary interactive w-full gap-1.5 text-xs sm:w-auto sm:justify-self-end"
          aria-label={
            balance === undefined
              ? `${accountName}の現在残高を設定`
              : `${accountName}の現在残高を編集`
          }
        >
          {balance === undefined ? (
            <Plus className="size-3.5" aria-hidden="true" />
          ) : (
            <Pencil className="size-3.5" aria-hidden="true" />
          )}
          {balance === undefined ? "残高を設定" : "残高を編集"}
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
      <div className="grid gap-2">
        <div className="grid gap-1">
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-foreground-subtle"
          >
            現在残高
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
              className="type-data h-11 w-28 border border-border-strong bg-background px-3 text-right text-sm font-semibold text-foreground"
              aria-label="MoneyForward MEの現在残高"
              aria-invalid={error ? true : undefined}
              aria-describedby={errorId}
            />
            <span className="flex h-11 items-center border-y border-r border-border-strong bg-surface px-3 text-sm text-foreground-subtle">
              円
            </span>
          </div>
        </div>
        <div className="flex min-h-6 flex-wrap items-baseline justify-between gap-x-3 text-xs">
          <span className="text-foreground-subtle">取り込み後の見込み残高</span>
          <span className="type-data font-semibold text-foreground">
            {projectedBalance === null
              ? "—"
              : currencyFormatter.format(projectedBalance)}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="submit"
            className="control-button button-primary interactive text-xs"
          >
            保存
          </button>
          <button
            type="button"
            onClick={cancelEditing}
            className="control-button button-quiet interactive text-xs"
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
              className="icon-control button-danger interactive"
              aria-label={`${accountName}の残高設定を解除`}
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      <p
        id={errorId}
        className="field-message mt-2 text-left text-xs"
        role={error ? "alert" : undefined}
      >
        {error}
      </p>
    </form>
  );
}
