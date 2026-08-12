import { CalendarDays, ReceiptText } from "lucide-react";
import PeriodDisplay from "~/components/PeriodDisplay";
import type { FileStats } from "~/services/csv-date";

interface FileStatsSummaryProps {
  stats: FileStats;
}

export default function FileStatsSummary({ stats }: FileStatsSummaryProps) {
  return (
    <span className="type-data flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
      <span className="inline-flex items-center gap-1">
        <ReceiptText className="size-3.5 text-muted" aria-hidden="true" />
        {stats.count}件
      </span>
      {stats.startDate && stats.endDate && (
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3.5 text-muted" aria-hidden="true" />
          <PeriodDisplay startDate={stats.startDate} endDate={stats.endDate} />
        </span>
      )}
    </span>
  );
}
