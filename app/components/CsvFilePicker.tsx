import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";

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
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 border border-zinc-300 bg-white px-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-zinc-700"
          >
            {input}
            <RefreshCw className="size-3.5" aria-hidden="true" />
            {changeLabel}
          </label>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 border border-red-200 bg-white px-2 text-xs font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            {clearLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <label
      htmlFor={id}
      className="group flex min-h-14 cursor-pointer items-center justify-center gap-2 border border-zinc-300 bg-white px-4 text-center hover:bg-zinc-50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-zinc-700"
    >
      {input}
      <UploadCloud
        className="size-4 text-zinc-500 group-hover:text-zinc-700"
        aria-hidden="true"
      />
      <span className="text-sm font-semibold text-zinc-700">{emptyLabel}</span>
    </label>
  );
}
