import CsvFilePicker from "~/components/CsvFilePicker";
import ErrorAlert from "~/components/ErrorAlert";
import FileStatsSummary from "~/components/FileStatsSummary";
import StepCard from "~/components/StepCard";
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
  const errorAlert = error ? (
    <ErrorAlert>
      <p>{error}</p>
    </ErrorAlert>
  ) : null;

  if (!file) {
    return (
      <StepCard number={1} title="PayPayの取引履歴を選ぶ" status="current">
        <div className="space-y-3">
          <CsvFilePicker
            id="paypay-csv-input"
            label="PayPayの取引履歴を選ぶ"
            onFilesSelected={(files) => {
              const nextFile = files?.[0];
              if (nextFile) onFileSelected(nextFile);
            }}
          />
          {errorAlert}
        </div>
      </StepCard>
    );
  }

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
            className="inline-flex min-h-9 items-center text-xs font-semibold text-red-700 underline decoration-red-200 underline-offset-4 hover:text-red-900"
          >
            削除
          </button>
        </>
      }
    >
      {errorAlert ?? undefined}
    </StepCard>
  );
}
