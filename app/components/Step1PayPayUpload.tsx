import { AlertCircle } from "lucide-react";
import { useState } from "react";
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
  const [fileInputVersion, setFileInputVersion] = useState(0);

  const handleFileChange = (files: FileList | null) => {
    onFileSelected(files?.[0] ?? null);
  };

  const handleClearFile = () => {
    setFileInputVersion((version) => version + 1);
    onFileSelected(null);
  };

  return (
    <section aria-labelledby="paypay-upload-title">
      <div className="mb-3 flex items-start gap-3">
        <div className="step-number flex size-7 shrink-0 items-center justify-center bg-accent text-xs font-bold text-accent-ink">
          1
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 id="paypay-upload-title" className="text-sm font-bold text-ink">
              PayPayから書き出した取引履歴
            </h2>
            <span className="shrink-0 text-xs font-semibold text-accent">
              必須
            </span>
          </div>
        </div>
      </div>

      <CsvFilePicker
        key={fileInputVersion}
        id="paypay-csv-input"
        selectedLabel={file?.name}
        selectedMeta={stats ? <FileStatsSummary stats={stats} /> : undefined}
        tone={error ? "error" : "success"}
        emptyLabel="取引履歴を選ぶ"
        onFilesSelected={handleFileChange}
        onClear={handleClearFile}
      />

      {error && (
        <div
          className="status-error mt-3 flex gap-2 border px-3 py-3 text-sm"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}
    </section>
  );
}
