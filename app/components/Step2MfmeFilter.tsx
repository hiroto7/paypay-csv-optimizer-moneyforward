import { useRef, useState } from "react";
import type { MfFileStats } from "~/services/csv-processor";
import { createMfmeExclusionSet } from "~/services/csv-processor";
import { readFilesAsText } from "~/utils/file-reader";

const PeriodDisplay = ({
  startDate,
  endDate,
}: {
  startDate: Date;
  endDate: Date;
}) => {
  const dtf = new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
  });
  return <>{dtf.formatRange(startDate, endDate)}</>;
};

export type MfmeParsedData = {
  exclusionSet: Set<string>;
  stats: Omit<MfFileStats, "duplicates">;
};

interface Step2MfmeFilterProps {
  onDataParsed: (data: MfmeParsedData | null) => void;
  duplicates?: number;
  totalTransactions?: number | undefined;
}

export default function Step2MfmeFilter({
  onDataParsed,
  duplicates,
  totalTransactions,
}: Step2MfmeFilterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [mfmeFiles, setMfmeFiles] = useState<FileList | null>(null);
  const [isMfmeSkipped, setIsMfmeSkipped] = useState(false);
  const [mfStats, setMfStats] = useState<Omit<
    MfFileStats,
    "duplicates"
  > | null>(null);
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (files: FileList | null) => {
    setMfmeFiles(files);
    if (files && files.length > 0) {
      setIsMfmeSkipped(false);
    }

    if (!files || files.length === 0) {
      onDataParsed(null);
      setMfStats(null);
      setError("");
      return;
    }

    setError("");

    try {
      const contents = await readFilesAsText(files, "Shift_JIS");
      const result = createMfmeExclusionSet(contents);

      if (result.stats.count === 0) {
        throw new Error(
          "マネーフォワード MEのCSVファイルから取引を読み込めませんでした。正しいファイルを選択しているか確認してください。",
        );
      }

      // count > 0 だが exclusionSet.size === 0 の場合:
      // - 正常なMFMEのCSVだが、すべて「計算対象 = 0」の可能性がある（エラーにしない）
      // - または誤ったCSV（PayPayなど）の可能性がある
      // stats.count > 0 かつ exclusionSet.size === 0 かつ startDate/endDate が null の場合は誤ったCSV
      if (result.exclusionSet.size === 0 && result.stats.count > 0) {
        if (result.stats.startDate === null && result.stats.endDate === null) {
          throw new Error(
            "マネーフォワード MEのCSVファイルから取引を読み込めませんでした。正しいファイルを選択しているか確認してください。",
          );
        }
      }

      setMfStats(result.stats);
      onDataParsed(result);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("マネーフォワード MEのCSVファイルの読み込みに失敗しました。");
      }
      onDataParsed(null);
    }
  };

  const handleSkip = () => {
    setIsMfmeSkipped(true);
    setMfmeFiles(null);
    onDataParsed({
      exclusionSet: new Set(),
      stats: { count: 0, startDate: null, endDate: null },
    });
    setMfStats(null);
    setError("");
  };

  const handleUndo = () => {
    setIsMfmeSkipped(false);
    onDataParsed(null);
    setMfStats(null);
    setError("");
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-lg p-6 md:p-8">
      <h2 className="text-2xl font-bold text-slate-100 mb-4">
        2. 既に登録済みの取引を除外（任意）
      </h2>
      <p className="text-sm text-slate-400 mb-4">
        マネーフォワード
        MEのアプリまたはWebサイトからエクスポートした取引履歴CSVを選択してください。既に登録済みの取引が自動で除外されます。
      </p>

      {!isMfmeSkipped ? (
        <>
          <p className="text-sm font-semibold text-yellow-300 mb-4">
            ⚠️ 既に取り込み済みの取引がある場合は、ここでCSVを選択してください
          </p>
          <label
            htmlFor="mfme-csv-input"
            className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors block ${
              isDragging
                ? "border-purple-500 bg-purple-500/10"
                : "border-slate-600 hover:border-purple-400"
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              id="mfme-csv-input"
              ref={inputRef}
              type="file"
              accept=".csv"
              multiple
              onChange={(e) => handleFileChange(e.target.files)}
              className="sr-only"
            />
            <p className="text-slate-400 pointer-events-none">
              {mfmeFiles && mfmeFiles.length > 0
                ? `${mfmeFiles.length}個のファイルを選択中`
                : "ここにファイルをドラッグ＆ドロップ（複数選択可）"}
            </p>
          </label>
          {mfStats && mfStats.count > 0 && (
            <div className="mt-4 space-y-1 text-sm text-slate-400">
              <p>読み込み件数: {mfStats.count}件</p>
              {mfStats.startDate && mfStats.endDate && (
                <p>
                  明細の期間:{" "}
                  <PeriodDisplay
                    startDate={mfStats.startDate}
                    endDate={mfStats.endDate}
                  />
                </p>
              )}
              {duplicates !== undefined && (
                <p>重複として除外: {duplicates}件</p>
              )}
            </div>
          )}
          {(!mfmeFiles || mfmeFiles.length === 0) && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleSkip}
                className="w-full px-4 py-3 bg-slate-700 text-slate-200 rounded-lg font-semibold hover:bg-slate-600 transition-colors"
              >
                取り込み済み取引の除外をスキップ
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-slate-300 font-semibold mb-1">
                ✓ 取り込み済み取引の除外をスキップしました
              </p>
              <p className="text-sm text-slate-400">
                全ての取引が変換対象となります
              </p>
            </div>
            <button
              type="button"
              onClick={handleUndo}
              className="px-3 py-1.5 text-sm bg-slate-600 text-slate-200 rounded hover:bg-slate-500 transition-colors whitespace-nowrap"
            >
              やり直す
            </button>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-4 bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
          <p>
            <strong>エラー:</strong> {error}
          </p>
        </div>
      )}
      {!error &&
        totalTransactions !== undefined &&
        duplicates !== undefined &&
        totalTransactions > 0 &&
        duplicates === totalTransactions && (
          <div className="mt-4 bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
            <p>
              <strong>エラー:</strong>{" "}
              変換できる取引が見つかりませんでした。全ての取引が既に取り込み済みでないか確認してください。
            </p>
          </div>
        )}
    </div>
  );
}
