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
        className={`border px-3 py-3 ${
          isError
            ? "border-red-200 bg-red-50"
            : "border-emerald-200 bg-emerald-50/70"
        }`}
      >
        {input}
        <div className="flex min-w-0 items-start gap-2.5">
          {isError ? (
            <AlertCircle
              className="mt-0.5 size-5 shrink-0 text-red-600"
              aria-hidden="true"
            />
          ) : (
            <CheckCircle2
              className="mt-0.5 size-5 shrink-0 text-emerald-700"
              aria-hidden="true"
            />
          )}
          <div className="min-w-0 flex-1">
            <p
              className={`break-words text-sm font-semibold ${
                isError ? "text-red-900" : "text-emerald-950"
              }`}
            >
              {selectedLabel}
            </p>
            {selectedMeta && (
              <div
                className={`mt-1 text-xs ${
                  isError ? "text-red-700" : "text-emerald-800"
                }`}
              >
                {selectedMeta}
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/10 pt-3">
          <label
            htmlFor={id}
            className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            入れ替える
          </label>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 px-3 text-xs font-semibold text-red-700 hover:bg-red-100/60"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            削除
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
      className={`group flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-5 py-6 text-center transition-colors ${
        isDragging
          ? "border-red-500 bg-red-50"
          : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-white"
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
        <FileText className="size-6 text-red-600" aria-hidden="true" />
      ) : (
        <UploadCloud
          className="size-6 text-zinc-500 transition-colors group-hover:text-zinc-700"
          aria-hidden="true"
        />
      )}
      <span className="text-sm font-semibold text-zinc-700">{emptyLabel}</span>
      <span className="text-xs text-zinc-500">
        CSVファイル / ドラッグ＆ドロップ対応
      </span>
    </label>
  );
}
