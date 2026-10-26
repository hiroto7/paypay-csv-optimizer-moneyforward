import { AlertCircle } from "lucide-react";
import CsvFilePicker from "~/components/CsvFilePicker";
import FileStatsSummary from "~/components/FileStatsSummary";
import StepCard from "~/components/StepCard";
import type { FileStats } from "~/services/csv-date";

interface Step1PayPayUploadProps {
  file: File;
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
  return (
    <StepCard
      number={1}
      title="PayPayの取引履歴"
      status="done"
      summary={
        <>
          <p className="break-all font-semibold text-zinc-800">{file.name}</p>
          {stats && <FileStatsSummary stats={stats} />}
        </>
      }
      actions={
        <>
          <CsvFilePicker
            id="paypay-csv-input"
            label="変更"
            variant="link"
            onFilesSelected={(files) => {
              const nextFile = files?.[0];
              if (nextFile) onFileSelected(nextFile);
            }}
          />
          <button
            type="button"
            onClick={() => onFileSelected(null)}
            aria-label={`${file.name}を削除`}
            className="inline-flex min-h-9 items-center px-1 text-xs font-semibold text-red-700 underline decoration-red-200 underline-offset-4 hover:text-red-900"
          >
            削除
          </button>
        </>
      }
    >
      {error ? (
        <div
          className="flex gap-2 border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : undefined}
    </StepCard>
  );
}
