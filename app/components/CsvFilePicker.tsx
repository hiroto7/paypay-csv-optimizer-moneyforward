import {
  AlertCircle,
  CheckCircle2,
  FileText,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useState } from "react";

interface CsvFilePickerProps {
  id: string;
  multiple?: boolean;
  emptyLabel: string;
  selectedLabel?: string | undefined;
  selectedMeta?: React.ReactNode;
  tone?: "success" | "error";
  changeLabel?: string;
  clearLabel?: string;
  onFilesSelected: (files: FileList | null) => void;
  onClear: () => void;
}

export default function CsvFilePicker({
  id,
  multiple = false,
  emptyLabel,
  selectedLabel,
  selectedMeta,
  tone = "success",
  changeLabel = "入れ替える",
  clearLabel = "削除",
  onFilesSelected,
  onClear,
}: CsvFilePickerProps) {
  const [isDragging, setIsDragging] = useState(false);

  const input = (
    <input
      id={id}
      type="file"
      accept=".csv"
      multiple={multiple}
      onChange={(event) => onFilesSelected(event.target.files)}
      className="sr-only"
    />
  );

  if (selectedLabel) {
    const isError = tone === "error";
    return (
      <div
        className={`border-y px-3 py-3 ${
          isError ? "status-error" : "status-success"
        }`}
      >
        {input}
        <div className="flex min-w-0 items-start gap-2.5">
          {isError ? (
            <AlertCircle
              className="mt-0.5 size-5 shrink-0 text-error"
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2
              className="mt-0.5 size-5 shrink-0 text-success"
              aria-hidden="true"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-semibold">{selectedLabel}</p>
            {selectedMeta && <div className="mt-1 text-xs">{selectedMeta}</div>}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-rule pt-3">
          <label
            htmlFor={id}
            className="interactive control-button button-secondary cursor-pointer gap-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            {changeLabel}
          </label>
          <button
            type="button"
            onClick={onClear}
            className="interactive control-button button-danger gap-1.5 text-xs"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            {clearLabel}
          </button>
        </div>
      </div>
    );
  }

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  return (
    <label
      htmlFor={id}
      className={`interactive group flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-5 py-6 text-center ${
        isDragging
          ? "border-accent bg-paper-3 text-accent"
          : "border-rule-strong bg-paper-2 text-ink-2"
      }`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={handleDragLeave}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        onFilesSelected(event.dataTransfer.files);
      }}
    >
      {input}
      {isDragging ? (
        <FileText className="size-6 text-accent" aria-hidden="true" />
      ) : (
        <UploadCloud className="size-6 text-muted" aria-hidden="true" />
      )}
      <span className="text-sm font-semibold text-ink-2">{emptyLabel}</span>
      <span className="text-xs text-muted">
        CSVファイル / ドラッグ＆ドロップ対応
      </span>
    </label>
  );
}
