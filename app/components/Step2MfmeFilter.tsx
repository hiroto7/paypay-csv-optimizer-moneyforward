import { AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import CsvFilePicker from "~/components/CsvFilePicker";
import FileStatsSummary from "~/components/FileStatsSummary";
import type { FileStats } from "~/services/csv-date";

interface Step2MfmeFilterProps {
  files: File[];
  stats: FileStats | null;
  error: string;
  onFilesAdded: (files: File[]) => void;
  onFilesCleared: () => void;
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
  onFilesAdded,
  onFilesCleared,
  localImportedStats,
}: Step2MfmeFilterProps) {
  const [fileInputVersion, setFileInputVersion] = useState(0);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const clearFiles = () => {
    setFileInputVersion((version) => version + 1);
    onFilesCleared();
  };

  const selectedLabel =
    files.length > 0 ? `${files.length}ファイル` : undefined;
  const mfmeStats = stats ?? {
    count: 0,
    startDate: null,
    endDate: null,
  };
  const combinedStats = combineStats(mfmeStats, localImportedStats);

  return (
    <section aria-labelledby="mfme-upload-title">
      <div className="mb-3 flex items-start gap-3">
        <div className="step-number flex size-7 shrink-0 items-center justify-center bg-accent text-xs font-bold text-accent-ink">
          2
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 id="mfme-upload-title" className="text-sm font-bold text-ink">
              MoneyForward MEから書き出した入出金履歴
            </h2>
            <span className="shrink-0 text-xs text-muted">任意</span>
          </div>
        </div>
      </div>

      <CsvFilePicker
        key={fileInputVersion}
        id="mfme-csv-input"
        multiple
        emptyLabel="入出金履歴を選ぶ"
        selectedLabel={selectedLabel}
        selectedMeta={
          files.length > 0 ? (
            <>
              {stats && <FileStatsSummary stats={stats} />}
              <div className={stats ? "mt-2" : undefined}>
                <p className="font-semibold">読み込み済みファイル</p>
                <ul className="mt-1 space-y-0.5">
                  {files.map((file) => (
                    <li key={file.name} className="break-words">
                      {file.name}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : undefined
        }
        tone={error ? "error" : "success"}
        changeLabel="追加する"
        clearLabel="すべて削除"
        onFilesSelected={(selectedFiles) => {
          const nextFiles = Array.from(selectedFiles ?? []);
          if (nextFiles.length > 0) {
            setFileInputVersion((version) => version + 1);
            onFilesAdded(nextFiles);
          }
        }}
        onClear={clearFiles}
      />

      {error && (
        <div
          className="status-error mt-3 flex gap-2 border px-3 py-3 text-sm"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {combinedStats.count > 0 && (
        <div className="mt-4 border-y border-rule bg-paper-2">
          <div className="px-3 py-3">
            <p className="text-xs font-medium text-muted">
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
              className="interactive control-link mt-1 gap-1 px-0 text-xs"
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
              className="divide-y divide-rule border-t border-rule bg-paper"
            >
              {stats && stats.count > 0 && (
                <div className="px-3 py-3 text-xs">
                  <p className="font-semibold text-ink">
                    入出金履歴から読み込んだ明細
                  </p>
                  <p className="mt-0.5 text-muted">{files.length}ファイル</p>
                  <div className="mt-1.5">
                    <FileStatsSummary stats={stats} />
                  </div>
                </div>
              )}
              {localImportedStats.count > 0 && (
                <div className="px-3 py-3 text-xs">
                  <p className="font-semibold text-ink">
                    このアプリの取り込み記録
                  </p>
                  <p className="mt-0.5 leading-5 text-muted">
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
