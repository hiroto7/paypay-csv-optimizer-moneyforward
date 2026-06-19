import {
  AlertCircle,
  CalendarDays,
  Check,
  Database,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import CsvDropzone from "~/components/CsvDropzone";
import PeriodDisplay from "~/components/PeriodDisplay";
import type { FileStats } from "~/services/csv-date";
import type { CsvRecord } from "~/services/csv-schema";
import { countExclusions } from "~/services/local-exclusion-store";
import { createMfmeExclusionSet } from "~/services/mfme-csv";
import { readFilesAsTextAuto } from "~/utils/file-reader";

export type MfmeParsedData = {
  exclusionCounts: Map<string, number>;
  exclusionStats: FileStats;
  stats: FileStats;
  records: CsvRecord[];
};

interface Step2MfmeFilterProps {
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onDataParsed: (data: MfmeParsedData | null) => void;
  localImportedRecordCount: number;
}

export default function Step2MfmeFilter({
  files,
  onFilesSelected,
  onDataParsed,
  localImportedRecordCount,
}: Step2MfmeFilterProps) {
  const [fileInputVersion, setFileInputVersion] = useState(0);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [error, setError] = useState("");
  const fileSelectionVersion = useRef(0);
  const lastProcessedFiles = useRef<File[] | null>(null);

  const processFiles = useCallback(
    async (selectedFiles: File[]) => {
      const selectionVersion = ++fileSelectionVersion.current;

      if (selectedFiles.length === 0) {
        setStats(null);
        setError("");
        onDataParsed(null);
        return;
      }

      setError("");

      try {
        const result = createMfmeExclusionSet(
          await readFilesAsTextAuto(selectedFiles),
        );

        if (selectionVersion !== fileSelectionVersion.current) {
          return;
        }
        if (countExclusions(result.exclusionCounts) === 0) {
          throw new Error(
            "MoneyForward MEの明細を読み込めませんでした。エクスポートしたCSVか確認してください。",
          );
        }

        setStats(result.stats);
        onDataParsed(result);
      } catch (err) {
        if (selectionVersion !== fileSelectionVersion.current) {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "MoneyForward ME CSVの読み込みに失敗しました。",
        );
        setStats(null);
        onDataParsed(null);
      }
    },
    [onDataParsed],
  );

  useEffect(() => {
    if (files === lastProcessedFiles.current) {
      return;
    }
    lastProcessedFiles.current = files;
    void processFiles(files);
  }, [files, processFiles]);

  const clearFiles = () => {
    fileSelectionVersion.current++;
    setFileInputVersion((version) => version + 1);
    onFilesSelected([]);
  };

  return (
    <section aria-labelledby="mfme-upload-title">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center bg-blue-50 text-blue-700">
          <Database className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2
              id="mfme-upload-title"
              className="text-sm font-bold text-zinc-950"
            >
              MoneyForward ME明細
            </h2>
            <span className="text-xs text-zinc-500">任意</span>
          </div>
          <p className="mt-0.5 text-xs leading-5 text-zinc-500">
            変換では登録済み明細の除外、確認では照合に使用
          </p>
        </div>
      </div>

      {files.length > 0 && stats ? (
        <div className="border-y border-zinc-200 py-3">
          <div className="flex items-start gap-2">
            <Check
              className="mt-0.5 size-4 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {files.length}ファイルを読み込み済み
              </p>
              <p className="mt-1 text-xs leading-5 text-zinc-600">
                この明細を変換と確認の両方で使用します。
              </p>
            </div>
          </div>

          <dl className="mt-3 grid gap-2 text-xs text-zinc-600">
            <div className="flex items-center justify-between gap-3">
              <dt>明細</dt>
              <dd className="font-semibold text-zinc-900">{stats.count}件</dd>
            </div>
            {stats.startDate && stats.endDate && (
              <div className="flex items-center justify-between gap-3">
                <dt>期間</dt>
                <dd className="inline-flex items-center gap-1.5 font-semibold text-zinc-900">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  <PeriodDisplay
                    startDate={stats.startDate}
                    endDate={stats.endDate}
                  />
                </dd>
              </div>
            )}
            {localImportedRecordCount > 0 && (
              <div className="flex items-center justify-between gap-3">
                <dt>「保存した」の記録</dt>
                <dd className="font-semibold text-zinc-900">
                  {localImportedRecordCount}件
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-4">
            <CsvDropzone
              key={fileInputVersion}
              id="mfme-csv-input"
              multiple
              prompt="MoneyForward ME CSVを入れ替える"
              onFilesSelected={(selectedFiles) => {
                const nextFiles = Array.from(selectedFiles ?? []);
                if (nextFiles.length > 0) {
                  onFilesSelected(nextFiles);
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={clearFiles}
            className="mt-2 inline-flex min-h-8 w-full items-center justify-center gap-2 px-2 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            MoneyForward ME CSVを削除
          </button>
        </div>
      ) : (
        <CsvDropzone
          key={fileInputVersion}
          id="mfme-csv-input"
          multiple
          fileLabel={
            files.length > 0 ? `${files.length}ファイル選択済み` : undefined
          }
          prompt="MoneyForward ME CSVを選択"
          onFilesSelected={(selectedFiles) => {
            const nextFiles = Array.from(selectedFiles ?? []);
            if (nextFiles.length > 0) {
              onFilesSelected(nextFiles);
            }
          }}
        />
      )}

      {error && (
        <>
          <div
            className="mt-3 flex gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800"
            role="alert"
          >
            <AlertCircle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <p>{error}</p>
          </div>
          <button
            type="button"
            onClick={clearFiles}
            className="mt-2 inline-flex min-h-8 w-full items-center justify-center gap-2 px-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
          >
            選択を解除
          </button>
        </>
      )}
    </section>
  );
}
