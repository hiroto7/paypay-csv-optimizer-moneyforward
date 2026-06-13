import {
  AlertCircle,
  CalendarDays,
  CircleOff,
  Database,
  RotateCcw,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import CsvDropzone from "~/components/CsvDropzone";
import PeriodDisplay from "~/components/PeriodDisplay";
import type { CsvRecord } from "~/services/csv-schema";
import { createMfmeExclusionSet, type MfFileStats } from "~/services/mfme-csv";
import { readFilesAsTextAuto } from "~/utils/file-reader";

export type MfmeParsedData = {
  exclusionCounts: Map<string, number>;
  stats: Omit<MfFileStats, "duplicates">;
  records: CsvRecord[];
};

interface Step2MfmeFilterProps {
  onDataParsed: (data: MfmeParsedData | null) => void;
  duplicates?: number | undefined;
  totalTransactions?: number | undefined;
  allowSkip: boolean;
}

export default function Step2MfmeFilter({
  onDataParsed,
  duplicates,
  totalTransactions,
  allowSkip,
}: Step2MfmeFilterProps) {
  const [mfmeFiles, setMfmeFiles] = useState<File[]>([]);
  const [fileInputVersion, setFileInputVersion] = useState(0);
  const [isMfmeSkipped, setIsMfmeSkipped] = useState(false);
  const [mfStats, setMfStats] = useState<Omit<
    MfFileStats,
    "duplicates"
  > | null>(null);
  const [error, setError] = useState<string>("");
  const fileSelectionVersion = useRef(0);

  const handleFileChange = async (files: FileList | null) => {
    const selectionVersion = ++fileSelectionVersion.current;
    const selectedFiles = Array.from(files ?? []);
    setMfmeFiles(selectedFiles);
    if (selectedFiles.length > 0) {
      setIsMfmeSkipped(false);
    }

    if (selectedFiles.length === 0) {
      onDataParsed(null);
      setMfStats(null);
      setError("");
      return;
    }

    setError("");

    try {
      const contents = await readFilesAsTextAuto(selectedFiles);
      const result = createMfmeExclusionSet(contents);

      if (selectionVersion !== fileSelectionVersion.current) {
        return;
      }

      if (
        result.stats.count === 0 ||
        (result.exclusionCounts.size === 0 &&
          result.stats.startDate === null &&
          result.stats.endDate === null)
      ) {
        throw new Error(
          "MoneyForward MEの明細を読み込めませんでした。エクスポートしたCSVか確認してください。",
        );
      }

      setMfStats(result.stats);
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
      setMfStats(null);
      onDataParsed(null);
    }
  };

  const handleSkip = () => {
    fileSelectionVersion.current++;
    setIsMfmeSkipped(true);
    setMfmeFiles([]);
    setFileInputVersion((version) => version + 1);
    onDataParsed({
      exclusionCounts: new Map(),
      stats: { count: 0, startDate: null, endDate: null },
      records: [],
    });
    setMfStats(null);
    setError("");
  };

  const handleClearFiles = () => {
    fileSelectionVersion.current++;
    setMfmeFiles([]);
    setFileInputVersion((version) => version + 1);
    onDataParsed(null);
    setMfStats(null);
    setError("");
  };

  const handleUndo = () => {
    fileSelectionVersion.current++;
    setIsMfmeSkipped(false);
    onDataParsed(null);
    setMfStats(null);
    setError("");
  };

  const allTransactionsExcluded =
    allowSkip &&
    !error &&
    totalTransactions !== undefined &&
    duplicates !== undefined &&
    totalTransactions > 0 &&
    duplicates === totalTransactions;

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
            <span className="text-xs text-zinc-500">
              {allowSkip ? "任意" : "必須"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            {allowSkip
              ? "取り込み済み明細の除外に使用"
              : "重複・別口座取り込みの照合対象"}
          </p>
        </div>
      </div>

      {isMfmeSkipped && allowSkip ? (
        <div className="flex items-start justify-between gap-3 border border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="flex gap-2">
            <CircleOff
              className="mt-0.5 size-4 shrink-0 text-zinc-600"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-zinc-800">
                既存明細の除外なし
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">
                PayPayの全取引を変換します
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUndo}
            className="inline-flex size-8 shrink-0 items-center justify-center border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"
            title="選択をやり直す"
            aria-label="選択をやり直す"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          <CsvDropzone
            key={fileInputVersion}
            id="mfme-csv-input"
            multiple
            fileLabel={
              mfmeFiles.length > 0
                ? `${mfmeFiles.length}ファイル選択済み`
                : undefined
            }
            prompt="MoneyForward ME CSVを選択"
            onFilesSelected={handleFileChange}
          />

          {mfmeFiles.length > 0 && (
            <button
              type="button"
              onClick={handleClearFiles}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              <X className="size-3.5" aria-hidden="true" />
              ファイルの選択を解除
            </button>
          )}

          {allowSkip && mfmeFiles.length === 0 && (
            <button
              type="button"
              onClick={handleSkip}
              className="mt-2 w-full px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            >
              既存明細を除外せずにCSVを作成
            </button>
          )}
        </>
      )}

      {mfStats && mfStats.count > 0 && (
        <div className="mt-3 space-y-1 text-xs text-zinc-600">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Database className="size-3.5" aria-hidden="true" />
              {mfStats.count}件
            </span>
            {mfStats.startDate && mfStats.endDate && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                <PeriodDisplay
                  startDate={mfStats.startDate}
                  endDate={mfStats.endDate}
                />
              </span>
            )}
          </div>
          {allowSkip && duplicates !== undefined && duplicates > 0 && (
            <p className="font-semibold text-emerald-700">
              {duplicates}件を取り込み済みとして除外
            </p>
          )}
        </div>
      )}

      {(error || allTransactionsExcluded) && (
        <div
          className="mt-3 flex gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            {error ||
              "変換対象がありません。すべての取引が取り込み済みの可能性があります。"}
          </p>
        </div>
      )}
    </section>
  );
}
