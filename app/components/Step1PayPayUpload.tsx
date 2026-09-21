import { AlertCircle, Trash2 } from "lucide-react";
import CsvFilePicker from "~/components/CsvFilePicker";
import FileStatsSummary from "~/components/FileStatsSummary";
import type { FileStats } from "~/services/csv-date";

interface Step1PayPayUploadProps {
  file: File | null;
  stats: FileStats | null;
  error: string;
  onFileSelected: (file: File | null) => void;
}

export default function Step1PayPayUpload({
  file,
  stats,
  error,
  onFileSelected,
}: Step1PayPayUploadProps) {
  const handleFileChange = (files: FileList | null) => {
    if (files?.[0]) onFileSelected(files[0]);
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

      {file ? (
        <div className="border border-emerald-200 bg-emerald-50/70 p-2.5">
          <div className="flex min-w-0 items-start gap-2">
            <p className="min-w-0 flex-1 break-words pt-2 text-sm font-semibold text-emerald-950">
              {file.name}
            </p>
            <button
              type="button"
              onClick={() => onFileSelected(null)}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1 px-1 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              削除
            </button>
          </div>
          {stats && (
            <div className="mt-0.5 text-xs text-emerald-800">
              <FileStatsSummary stats={stats} />
            </div>
          )}
        </div>
      ) : (
        <CsvFilePicker
          id="paypay-csv-input"
          label="取引履歴を選ぶ"
          onFilesSelected={handleFileChange}
        />
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
