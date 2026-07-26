import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import CsvFilePicker from "~/components/CsvFilePicker";
import FileStatsSummary from "~/components/FileStatsSummary";
import type { FileStats } from "~/services/csv-date";

interface Step2MfmeFilterProps {
  files: File[];
  stats: FileStats | null;
  error: string;
  onFilesSelected: (files: File[]) => void;
  localImportedStats: FileStats;
}

const combineStats = (first: FileStats, second: FileStats): FileStats => ({
  count: first.count + second.count,
  startDate:
    !first.startDate ||
    (second.startDate !== null && second.startDate < first.startDate)
      ? second.startDate
      : first.startDate,
  endDate:
    !first.endDate ||
    (second.endDate !== null && second.endDate > first.endDate)
      ? second.endDate
      : first.endDate,
});

export default function Step2MfmeFilter({
  files,
  stats,
  error,
  onFilesSelected,
  localImportedStats,
}: Step2MfmeFilterProps) {
  const [fileInputVersion, setFileInputVersion] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const clearFiles = () => {
    setFileInputVersion((version) => version + 1);
    onFilesSelected([]);
  };

  const selectedLabel =
    files.length === 1
      ? files[0]?.name
      : files.length > 1
        ? `${files.length}ファイル`
        : undefined;
  const mfmeStats = stats ?? {
    count: 0,
    startDate: null,
    endDate: null,
  };
  const combinedStats = combineStats(mfmeStats, localImportedStats);

  return (
    <section aria-labelledby="mfme-upload-title">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center bg-blue-700 text-xs font-bold text-white">
          2
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2
              id="mfme-upload-title"
              className="text-sm font-bold text-zinc-950"
            >
              MoneyForward MEから書き出した入出金履歴
            </h2>
            <span className="shrink-0 text-xs text-zinc-500">任意</span>
          </div>
        </div>
      </div>

      <CsvFilePicker
        key={fileInputVersion}
        id="mfme-csv-input"
        multiple
        emptyLabel="入出金履歴を選ぶ"
        selectedLabel={selectedLabel}
        selectedMeta={stats ? <FileStatsSummary stats={stats} /> : undefined}
        tone={error ? "error" : "success"}
        onFilesSelected={(selectedFiles) => {
          const nextFiles = Array.from(selectedFiles ?? []);
          if (nextFiles.length > 0) onFilesSelected(nextFiles);
        }}
        onClear={clearFiles}
      />

      {error && (
        <div
          className="mt-3 flex gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {combinedStats.count > 0 && (
        <div className="mt-4 border border-zinc-200 bg-zinc-50">
          <div className="px-3 py-3">
            <p className="text-xs font-medium text-zinc-600">
              登録済みとして扱う明細
            </p>
            <div className="mt-1">
              <FileStatsSummary stats={combinedStats} />
            </div>
            <button
              type="button"
              aria-expanded={showBreakdown}
              aria-controls="registered-record-breakdown"
              onClick={() => setShowBreakdown((current) => !current)}
              className="mt-2 inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
            >
              {showBreakdown ? (
                <ChevronUp className="size-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-3.5" aria-hidden="true" />
              )}
              {showBreakdown ? "内訳を閉じる" : "内訳を見る"}
            </button>
          </div>

          {showBreakdown && (
            <div
              id="registered-record-breakdown"
              className="divide-y divide-zinc-200 border-t border-zinc-200 bg-white"
            >
              {stats && stats.count > 0 && (
                <div className="px-3 py-3 text-xs">
                  <p className="font-semibold text-zinc-800">
                    入出金履歴から読み込んだ明細
                  </p>
                  <p className="mt-0.5 text-zinc-500">{files.length}ファイル</p>
                  <div className="mt-1.5">
                    <FileStatsSummary stats={stats} />
                  </div>
                </div>
              )}
              {localImportedStats.count > 0 && (
                <div className="px-3 py-3 text-xs">
                  <p className="font-semibold text-zinc-800">
                    このアプリの取り込み記録
                  </p>
                  <p className="mt-0.5 leading-5 text-zinc-500">
                    「MoneyForward MEで保存した」を押した明細
                  </p>
                  <div className="mt-1.5">
                    <FileStatsSummary stats={localImportedStats} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
