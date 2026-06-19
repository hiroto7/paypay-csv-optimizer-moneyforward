import { AlertCircle, CalendarDays, ReceiptText } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import CsvFilePicker from "~/components/CsvFilePicker";
import PeriodDisplay from "~/components/PeriodDisplay";
import type { FileStats } from "~/services/csv-date";
import {
  extractTransactionsFromPayPayCsv,
  type PayPayTransaction,
} from "~/services/paypay-csv";
import { readFileAsTextAuto } from "~/utils/file-reader";

export type PayPayParsedData = {
  transactions: PayPayTransaction[];
  stats: FileStats;
  headers: string[];
};

interface Step1PayPayUploadProps {
  file: File | null;
  onFileSelected: (file: File | null) => void;
  onDataParsed: (data: PayPayParsedData | null) => void;
}

export default function Step1PayPayUpload({
  file,
  onFileSelected,
  onDataParsed,
}: Step1PayPayUploadProps) {
  const [paypayStats, setPaypayStats] = useState<FileStats | null>(null);
  const [error, setError] = useState<string>("");
  const [fileInputVersion, setFileInputVersion] = useState(0);
  const fileSelectionVersion = useRef(0);
  const lastProcessedFile = useRef<File | null>(null);

  const processFile = useCallback(
    async (file: File | null) => {
      const selectionVersion = ++fileSelectionVersion.current;

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
            : "PayPayから書き出した取引履歴を読み込めませんでした。",
        );
        setPaypayStats(null);
        onDataParsed(null);
      }
    },
    [onDataParsed],
  );

  const handleFileChange = (files: FileList | null) => {
    onFileSelected(files?.[0] ?? null);
  };

  useEffect(() => {
    if (file === lastProcessedFile.current) {
      return;
    }

    lastProcessedFile.current = file;
    void processFile(file);
  }, [file, processFile]);

  const handleClearFile = () => {
    setFileInputVersion((version) => version + 1);
    onFileSelected(null);
  };

  return (
    <section aria-labelledby="paypay-upload-title">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center bg-red-600 text-xs font-bold text-white">
          1
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2
              id="paypay-upload-title"
              className="text-sm font-bold text-zinc-950"
            >
              PayPayから書き出した取引履歴
            </h2>
            <span className="shrink-0 text-xs font-medium text-red-700">
              必須
            </span>
          </div>
        </div>
      </div>

      <CsvFilePicker
        key={fileInputVersion}
        id="paypay-csv-input"
        selectedLabel={file?.name}
        selectedMeta={
          paypayStats ? (
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <ReceiptText className="size-3.5" aria-hidden="true" />
                {paypayStats.count}件
              </span>
              {paypayStats.startDate && paypayStats.endDate && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  <PeriodDisplay
                    startDate={paypayStats.startDate}
                    endDate={paypayStats.endDate}
                  />
                </span>
              )}
            </span>
          ) : undefined
        }
        tone={error ? "error" : "success"}
        emptyLabel="取引履歴を選ぶ"
        onFilesSelected={handleFileChange}
        onClear={handleClearFile}
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
    </section>
  );
}
