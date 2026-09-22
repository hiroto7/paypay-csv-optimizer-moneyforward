import { AlertCircle } from "lucide-react";
import CsvFilePicker from "~/components/CsvFilePicker";
import SelectedFileCard from "~/components/SelectedFileCard";
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
        <SelectedFileCard
          fileName={file.name}
          stats={stats}
          onRemove={() => onFileSelected(null)}
        />
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
