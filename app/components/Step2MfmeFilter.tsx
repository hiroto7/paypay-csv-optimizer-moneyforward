import { useRef, useState } from "react";
import type { MfFileStats } from "~/services/csv-processor";

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

interface Step2MfmeFilterProps {
  mfmeFiles: FileList | null;
  isMfmeSkipped: boolean;
  onFileChange: (files: FileList | null) => void;
  onSkip: () => void;
  onUndo: () => void;
  mfStats: MfFileStats | null;
}

export default function Step2MfmeFilter({
  mfmeFiles,
  isMfmeSkipped,
  onFileChange,
  onSkip,
  onUndo,
  mfStats,
}: Step2MfmeFilterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    onFileChange(e.dataTransfer.files);
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
              onChange={(e) => onFileChange(e.target.files)}
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
              <p>重複として除外: {mfStats.duplicates}件</p>
            </div>
          )}
          {(!mfmeFiles || mfmeFiles.length === 0) && (
            <div className="mt-4">
              <button
                onClick={onSkip}
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
              onClick={onUndo}
              className="px-3 py-1.5 text-sm bg-slate-600 text-slate-200 rounded hover:bg-slate-500 transition-colors whitespace-nowrap"
            >
              やり直す
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
