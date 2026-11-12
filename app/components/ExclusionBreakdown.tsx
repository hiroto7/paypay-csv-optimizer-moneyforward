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
  const excludedCount = savedBeforeCount + mfmeMatchedCount;
  const newCount = totalCount - excludedCount;
  const excluded = [
    {
      label: "「MoneyForward MEで保存した」を押した明細",
      count: savedBeforeCount,
    },
    { label: "入出金履歴に登録済みの明細", count: mfmeMatchedCount },
  ].filter(({ count }) => count > 0);

  return (
    <div>
      <p className="text-sm font-bold text-zinc-950">
        {excludedCount === 0
          ? `PayPayの取引履歴の${totalCount}件を取り込みます`
          : `PayPayの取引履歴の${totalCount}件のうち、未登録の${newCount}件を取り込みます`}
      </p>
      {excluded.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-xs text-zinc-600">
          {excluded.map(({ label, count }) => (
            <li key={label} className="flex items-center gap-2">
              <span>{label}</span>
              <span className="ml-auto tabular-nums">{count}件</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
