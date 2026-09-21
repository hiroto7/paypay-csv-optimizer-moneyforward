import { UploadCloud } from "lucide-react";

interface CsvFilePickerProps {
  id: string;
  multiple?: boolean;
  label: string;
  onFilesSelected: (files: FileList | null) => void;
}

export default function CsvFilePicker({
  id,
  multiple = false,
  label,
  onFilesSelected,
}: CsvFilePickerProps) {
  return (
    <label
      htmlFor={id}
      className="group flex h-9 cursor-pointer items-center justify-center gap-2 border border-zinc-300 bg-white px-4 text-center hover:bg-zinc-50 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-zinc-700"
    >
      <input
        id={id}
        type="file"
        accept=".csv"
        multiple={multiple}
        onChange={(event) => {
          onFilesSelected(event.target.files);
          event.target.value = "";
        }}
        className="sr-only"
      />
      <UploadCloud
        className="size-4 text-zinc-500 group-hover:text-zinc-700"
        aria-hidden="true"
      />
      <span className="text-sm font-semibold text-zinc-700">{label}</span>
    </label>
  );
}
