import { CheckCircle2, FileText, UploadCloud } from "lucide-react";
import { useState } from "react";

interface CsvDropzoneProps {
  id: string;
  multiple?: boolean;
  fileLabel?: string | undefined;
  prompt: string;
  onFilesSelected: (files: FileList | null) => void;
}

export default function CsvDropzone({
  id,
  multiple = false,
  fileLabel,
  prompt,
  onFilesSelected,
}: CsvDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragLeave = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    onFilesSelected(event.dataTransfer.files);
  };

  return (
    <label
      htmlFor={id}
      className={`group flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-5 py-6 text-center transition-colors ${
        isDragging
          ? "border-red-500 bg-red-50"
          : fileLabel
            ? "border-emerald-300 bg-emerald-50/60 hover:border-emerald-400"
            : "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-white"
      }`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={handleDragLeave}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        id={id}
        type="file"
        accept=".csv"
        multiple={multiple}
        onChange={(event) => onFilesSelected(event.target.files)}
        className="sr-only"
      />
      {fileLabel ? (
        <CheckCircle2 className="size-6 text-emerald-600" aria-hidden="true" />
      ) : isDragging ? (
        <FileText className="size-6 text-red-600" aria-hidden="true" />
      ) : (
        <UploadCloud
          className="size-6 text-zinc-500 transition-colors group-hover:text-zinc-700"
          aria-hidden="true"
        />
      )}
      <span
        className={`max-w-full break-words text-sm font-semibold ${
          fileLabel ? "text-emerald-900" : "text-zinc-700"
        }`}
      >
        {fileLabel ?? prompt}
      </span>
      <span className="text-xs text-zinc-500">
        {fileLabel ? "クリックして変更" : "CSV / ドラッグ＆ドロップ対応"}
      </span>
    </label>
  );
}
