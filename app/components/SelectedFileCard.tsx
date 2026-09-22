import { Trash2 } from "lucide-react";
import FileStatsSummary from "~/components/FileStatsSummary";
import type { FileStats } from "~/services/csv-date";

interface SelectedFileCardProps {
  fileName: string;
  stats: FileStats | null;
  onRemove: () => void;
}

export default function SelectedFileCard({
  fileName,
  stats,
  onRemove,
}: SelectedFileCardProps) {
  return (
    <div className="border border-emerald-200 bg-emerald-50/70 p-2.5">
      <div className="flex min-w-0 items-start gap-2">
        <p className="min-w-0 flex-1 break-words pt-2 text-sm font-semibold text-emerald-950">
          {fileName}
        </p>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${fileName}を削除`}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1 px-1 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          削除
        </button>
      </div>
      {stats && (
        <div className="mt-0.5 text-xs text-emerald-800">
          <FileStatsSummary stats={stats} />
        </div>
      )}
    </div>
  );
}
