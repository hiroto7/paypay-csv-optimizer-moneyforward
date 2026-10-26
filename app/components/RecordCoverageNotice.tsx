import { AlertTriangle, CheckCircle2 } from "lucide-react";
import PeriodDisplay from "~/components/PeriodDisplay";
import type { FileStats } from "~/services/csv-date";

export type RecordCoverage = {
  recordCount: number;
  coveredCount: number;
  uncoveredStats: FileStats;
};

// 取り込み記録をリセットする前に、変更後の入出金履歴で登録済みと判断できる件数を示す。
// 記録のキーは照合用に正規化しているため、明細の内容は表示せず件数と期間だけにする。
export default function RecordCoverageNotice({
  coverage,
}: {
  coverage: RecordCoverage;
}) {
  const { recordCount, coveredCount, uncoveredStats } = coverage;

  return (
    <div className="space-y-1.5 text-xs leading-5">
      <p className="flex gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-950">
        <CheckCircle2
          className="mt-0.5 size-4 shrink-0 text-emerald-600"
          aria-hidden="true"
        />
        <span>
          記録{recordCount}件のうち{coveredCount}
          件は、変更後の入出金履歴に含まれています。
        </span>
      </p>
      {uncoveredStats.count > 0 && (
        <p className="flex gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-amber-600"
            aria-hidden="true"
          />
          <span>
            含まれていない{uncoveredStats.count}件
            {uncoveredStats.startDate && uncoveredStats.endDate && (
              <>
                （
                <PeriodDisplay
                  startDate={uncoveredStats.startDate}
                  endDate={uncoveredStats.endDate}
                />
                ）
              </>
            )}
            は、リセット後は登録済みとして扱いません。
          </span>
        </p>
      )}
    </div>
  );
}
