import { useState } from "react";
import CsvDropzone from "~/components/CsvDropzone";
import PeriodDisplay from "~/components/PeriodDisplay";
import type { FileStats, PayPayTransaction } from "~/services/csv-processor";
import { extractTransactionsFromPayPayCsv } from "~/services/csv-processor";
import { readFileAsTextAuto } from "~/utils/file-reader";

export type PayPayParsedData = {
  transactions: PayPayTransaction[];
  stats: FileStats;
  headers: string[];
};

interface Step1PayPayUploadProps {
  onDataParsed: (data: PayPayParsedData | null) => void;
}

export default function Step1PayPayUpload({
  onDataParsed,
}: Step1PayPayUploadProps) {
  const [payPayFile, setPayPayFile] = useState<File | null>(null);
  const [paypayStats, setPaypayStats] = useState<FileStats | null>(null);
  const [error, setError] = useState<string>("");

  const handleFileChange = async (files: FileList | null) => {
    const file = files?.[0] ?? null;
    setPayPayFile(file);

    if (!file) {
      onDataParsed(null);
      setPaypayStats(null);
      setError("");
      return;
    }

    setError("");

    try {
      const content = await readFileAsTextAuto(file);
      const result = extractTransactionsFromPayPayCsv(content);

      if (result.transactions.length === 0) {
        throw new Error(
          "PayPayのCSVファイルから取引を読み込めませんでした。正しいファイルを選択しているか確認してください。",
        );
      }

      setPaypayStats(result.stats);
      onDataParsed(result);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("PayPayのCSVファイルの読み込みに失敗しました。");
      }
      onDataParsed(null);
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 shadow-lg p-6 md:p-8">
      <h2 className="text-2xl font-bold text-slate-100 mb-4">
        1. PayPayの取引履歴CSVを選択
      </h2>
      <CsvDropzone
        id="paypay-csv-input"
        tone="red"
        label={
          payPayFile
            ? payPayFile.name
            : "ファイルをドラッグ＆ドロップするか、ここをクリックして選択"
        }
        onFilesSelected={handleFileChange}
      />
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
      {error && (
        <div className="mt-4 bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
          <p>
            <strong>エラー:</strong> {error}
          </p>
        </div>
      )}
    </div>
  );
}
