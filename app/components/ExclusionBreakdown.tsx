interface ExclusionBreakdownProps {
  totalCount: number;
  savedBeforeCount: number;
  mfmeMatchedCount: number;
}

export default function ExclusionBreakdown({
  totalCount,
  savedBeforeCount,
  mfmeMatchedCount,
}: ExclusionBreakdownProps) {
  const newCount = totalCount - savedBeforeCount - mfmeMatchedCount;
  const segments = [
    {
      label: "前回までに保存した明細",
      count: savedBeforeCount,
      className: "bg-blue-600",
      excluded: true,
    },
    {
      label: "入出金履歴に登録済みの明細",
      count: mfmeMatchedCount,
      className: "bg-blue-300",
      excluded: true,
    },
    {
      label: "まだ登録していない明細",
      count: newCount,
      className: "bg-zinc-900",
      excluded: false,
    },
  ].filter(({ count }) => count > 0);

  return (
    <div>
      <p className="text-sm font-bold text-zinc-950">
        {newCount === totalCount
          ? `取り込み対象の明細${totalCount}件を取り込みます`
          : `取り込み対象の明細${totalCount}件のうち、${newCount}件を取り込みます`}
      </p>
      {totalCount > 0 && (
        <div className="mt-2 flex h-2.5 overflow-hidden" aria-hidden="true">
          {segments.map(({ label, count, className }) => (
            <span
              key={label}
              className={className}
              style={{ width: `${(count / totalCount) * 100}%` }}
            />
          ))}
        </div>
      )}
      <ul className="mt-2 space-y-0.5 text-xs text-zinc-600">
        {segments.map(({ label, count, className, excluded }) => (
          <li key={label} className="flex items-center gap-2">
            <span className={`size-2.5 shrink-0 ${className}`} />
            <span>{label}</span>
            <span
              className={`ml-auto tabular-nums ${
                excluded ? "text-zinc-500" : "font-bold text-zinc-900"
              }`}
            >
              {count}件{excluded ? "を除外" : ""}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[11px] leading-4 text-zinc-500">
        取り込み対象は、支払い方法が「PayPay」で始まる明細です。併用払いは支払い方法ごとに分けて数えます。
      </p>
    </div>
  );
}
