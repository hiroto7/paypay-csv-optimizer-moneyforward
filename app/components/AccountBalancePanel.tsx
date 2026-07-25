import { Calculator, Pencil, Plus, Trash2, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import type { AccountBalance } from "~/services/local-exclusion-store";
import type { PayPayTransaction, ProcessedResult } from "~/services/paypay-csv";

interface AccountBalancePanelProps {
  transactions: readonly PayPayTransaction[];
  processedChunks: ProcessedResult;
  accountBalances: ReadonlyMap<string, AccountBalance>;
  onSetBalance: (accountName: string, amount: number) => void;
  onClearBalance: (accountName: string) => void;
}

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const signedCurrencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
  signDisplay: "always",
});

const updatedAtFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const isPayPayMethod = (name: string) => name.startsWith("PayPay");

const sortAccountNames = (
  accountNames: string[],
  activeAccountNames: ReadonlySet<string>,
) =>
  accountNames.sort((first, second) => {
    const firstGroup = activeAccountNames.has(first)
      ? isPayPayMethod(first)
        ? 0
        : 1
      : 2;
    const secondGroup = activeAccountNames.has(second)
      ? isPayPayMethod(second)
        ? 0
        : 1
      : 2;
    return (
      firstGroup - secondGroup ||
      first.localeCompare(second, "ja", { numeric: true })
    );
  });

const parseBalance = (value: string): number | null => {
  const normalized = value.replaceAll(",", "").trim();
  if (!/^-?\d+$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) ? amount : null;
};

export default function AccountBalancePanel({
  transactions,
  processedChunks,
  accountBalances,
  onSetBalance,
  onClearBalance,
}: AccountBalancePanelProps) {
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [draftBalance, setDraftBalance] = useState("");
  const [error, setError] = useState("");

  const activeAccountNames = useMemo(
    () => new Set(transactions.map((transaction) => transaction.paymentMethod)),
    [transactions],
  );
  const accountNames = useMemo(
    () =>
      sortAccountNames(
        [...new Set([...activeAccountNames, ...accountBalances.keys()])],
        activeAccountNames,
      ),
    [accountBalances, activeAccountNames],
  );
  const pendingDeltas = useMemo(
    () =>
      new Map(
        Object.entries(processedChunks).map(([name, chunks]) => [
          name,
          chunks.reduce(
            (total, chunk) =>
              chunk.imported ? total : total + chunk.balanceDelta,
            0,
          ),
        ]),
      ),
    [processedChunks],
  );

  const startEditing = (accountName: string) => {
    setEditingAccount(accountName);
    setDraftBalance(String(accountBalances.get(accountName)?.amount ?? ""));
    setError("");
  };

  const cancelEditing = () => {
    setEditingAccount(null);
    setDraftBalance("");
    setError("");
  };

  const saveBalance = (accountName: string) => {
    const amount = parseBalance(draftBalance);
    if (amount === null) {
      setError("残高は整数で入力してください。");
      return;
    }
    onSetBalance(accountName, amount);
    cancelEditing();
  };

  return (
    <section
      className="border border-zinc-200 bg-white"
      aria-labelledby="account-balance-title"
    >
      <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <WalletCards className="size-5 text-red-600" aria-hidden="true" />
            <h2
              id="account-balance-title"
              className="text-base font-bold text-zinc-950"
            >
              口座残高
            </h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            MoneyForward
            MEの現在残高を設定すると、取り込み後の残高を確認できます
          </p>
        </div>
        {accountNames.length > 0 && (
          <span className="text-xs font-medium text-zinc-500">
            {accountNames.length}口座
          </span>
        )}
      </div>

      {accountNames.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <Calculator
            className="mx-auto size-7 text-zinc-400"
            aria-hidden="true"
          />
          <p className="mt-3 text-sm font-semibold text-zinc-700">
            PayPayの取引履歴を選ぶと口座が表示されます
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            設定した残高はこの端末に保存されます
          </p>
        </div>
      ) : (
        <div className="grid gap-px bg-zinc-200 sm:grid-cols-2 xl:grid-cols-3">
          {accountNames.map((accountName) => {
            const balance = accountBalances.get(accountName);
            const pendingDelta = pendingDeltas.get(accountName) ?? 0;
            const projectedBalance =
              balance === undefined ? null : balance.amount + pendingDelta;
            const isEditing = editingAccount === accountName;
            const isSavedOnly = !activeAccountNames.has(accountName);

            return (
              <article key={accountName} className="bg-white p-4">
                <div className="flex min-h-8 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-zinc-950">
                      {accountName}
                    </h3>
                    {isSavedOnly && (
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        現在のCSVにはありません
                      </p>
                    )}
                  </div>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => startEditing(accountName)}
                      className="inline-flex size-8 shrink-0 items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                      aria-label={`${accountName}の現在残高を${
                        balance ? "編集" : "設定"
                      }`}
                    >
                      {balance ? (
                        <Pencil className="size-4" aria-hidden="true" />
                      ) : (
                        <Plus className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <form
                    className="mt-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      saveBalance(accountName);
                    }}
                  >
                    <label
                      htmlFor="account-balance-input"
                      className="text-xs font-semibold text-zinc-700"
                    >
                      MoneyForward MEの現在残高
                    </label>
                    <div className="mt-1 flex">
                      <input
                        id="account-balance-input"
                        type="text"
                        inputMode="numeric"
                        value={draftBalance}
                        onChange={(event) => {
                          setDraftBalance(event.target.value);
                          setError("");
                        }}
                        className="min-w-0 flex-1 border border-zinc-300 px-3 py-2 text-right text-sm font-semibold outline-none focus:border-red-600"
                        aria-invalid={error ? true : undefined}
                        aria-describedby={
                          error ? "account-balance-error" : undefined
                        }
                      />
                      <span className="flex items-center border-y border-r border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-500">
                        円
                      </span>
                    </div>
                    {error && (
                      <p
                        id="account-balance-error"
                        className="mt-1.5 text-xs text-red-700"
                        role="alert"
                      >
                        {error}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap justify-between gap-2">
                      {balance ? (
                        <button
                          type="button"
                          onClick={() => {
                            onClearBalance(accountName);
                            cancelEditing();
                          }}
                          className="inline-flex min-h-8 items-center gap-1.5 px-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-red-700"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          設定解除
                        </button>
                      ) : (
                        <span />
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="min-h-8 border border-zinc-300 px-3 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
                        >
                          キャンセル
                        </button>
                        <button
                          type="submit"
                          className="min-h-8 bg-zinc-900 px-3 text-xs font-semibold text-white hover:bg-zinc-700"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="mt-3">
                    <p className="text-[11px] font-medium text-zinc-500">
                      MoneyForward ME現在残高
                    </p>
                    <p className="mt-0.5 text-xl font-bold tracking-tight text-zinc-950">
                      {balance
                        ? currencyFormatter.format(balance.amount)
                        : "未設定"}
                    </p>
                    {balance && (
                      <p className="mt-1 text-[10px] text-zinc-400">
                        更新: {updatedAtFormatter.format(balance.updatedAt)}
                      </p>
                    )}

                    <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-200 pt-3">
                      <div>
                        <dt className="text-[11px] text-zinc-500">
                          取り込み待ち
                        </dt>
                        <dd
                          className={`mt-0.5 text-sm font-semibold ${
                            pendingDelta < 0
                              ? "text-red-700"
                              : pendingDelta > 0
                                ? "text-emerald-700"
                                : "text-zinc-700"
                          }`}
                        >
                          {signedCurrencyFormatter.format(pendingDelta)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-zinc-500">
                          全件反映後
                        </dt>
                        <dd className="mt-0.5 text-sm font-semibold text-zinc-900">
                          {projectedBalance === null
                            ? "—"
                            : currencyFormatter.format(projectedBalance)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
