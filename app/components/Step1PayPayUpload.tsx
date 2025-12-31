import { useRef, useState } from "react";
import type { FileStats } from "~/services/csv-processor";

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

interface Step1PayPayUploadProps {
  payPayFile: File | null;
  onFileChange: (files: FileList | null) => void;
  paypayStats: FileStats | null;
}

export default function Step1PayPayUpload({
  payPayFile,
  onFileChange,
  paypayStats,
}: Step1PayPayUploadProps) {
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
        1. PayPayの取引履歴CSVを選択
      </h2>
      <label
        htmlFor="paypay-csv-input"
        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors block ${
          isDragging
            ? "border-red-500 bg-red-500/10"
            : "border-slate-600 hover:border-red-400"
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          id="paypay-csv-input"
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={(e) => onFileChange(e.target.files)}
          className="sr-only"
        />
        <p className="text-slate-400 pointer-events-none">
          {payPayFile
            ? payPayFile.name
            : "ファイルをドラッグ＆ドロップするか、ここをクリックして選択"}
        </p>
      </label>
      {paypayStats && (
        <div className="mt-4 space-y-1 text-sm text-slate-400">
          <p>読み込み件数: {paypayStats.count}件</p>
          {paypayStats.startDate && paypayStats.endDate && (
            <p>
              明細の期間:{" "}
              <PeriodDisplay
                startDate={paypayStats.startDate}
                endDate={paypayStats.endDate}
              />
            </p>
          )}
        </div>
      )}
    </div>
  );
}
