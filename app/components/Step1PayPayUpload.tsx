import { AlertCircle, CalendarDays, ReceiptText } from "lucide-react";
import { useRef, useState } from "react";
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
  const fileSelectionVersion = useRef(0);

  const handleFileChange = async (files: FileList | null) => {
    const selectionVersion = ++fileSelectionVersion.current;
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

      if (selectionVersion !== fileSelectionVersion.current) {
        return;
      }

      if (result.transactions.length === 0) {
        throw new Error(
          "PayPayの取引を読み込めませんでした。エクスポートしたCSVか確認してください。",
        );
      }

      setPaypayStats(result.stats);
      onDataParsed(result);
    } catch (err) {
      if (selectionVersion !== fileSelectionVersion.current) {
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "PayPay CSVの読み込みに失敗しました。",
      );
      setPaypayStats(null);
      onDataParsed(null);
    }
  };

  return (
    <section aria-labelledby="paypay-upload-title">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center bg-red-50 text-red-600">
          <ReceiptText className="size-4" aria-hidden="true" />
        </div>
        <div>
          <h2
            id="paypay-upload-title"
            className="text-sm font-bold text-zinc-950"
          >
            PayPay取引履歴
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">変換・照合の基準データ</p>
        </div>
      </div>

      <CsvDropzone
        id="paypay-csv-input"
        fileLabel={payPayFile?.name}
        prompt="PayPay CSVを選択"
        onFilesSelected={handleFileChange}
      />

      {paypayStats && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
          <span className="inline-flex items-center gap-1.5">
            <ReceiptText className="size-3.5" aria-hidden="true" />
            {paypayStats.count}件
          </span>
          {paypayStats.startDate && paypayStats.endDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              <PeriodDisplay
                startDate={paypayStats.startDate}
                endDate={paypayStats.endDate}
              />
            </span>
          )}
        </div>
      )}

      {error && (
        <div
          className="mt-3 flex gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}
    </section>
  );
}
