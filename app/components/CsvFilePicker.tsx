import { UploadCloud } from "lucide-react";

interface CsvFilePickerProps {
  id: string;
  multiple?: boolean;
  label: string;
  // primaryは画面の主な操作、linkは要約の横に置く小さな操作に使う。
  variant?: "default" | "primary" | "link";
  onFilesSelected: (files: FileList | null) => void;
}

const variantClassNames = {
  default: {
    label:
      "h-9 justify-center border border-zinc-300 bg-white px-4 hover:bg-zinc-50",
    icon: "size-4 text-zinc-500 group-hover:text-zinc-700",
    text: "text-sm font-semibold text-zinc-700",
  },
  primary: {
    label: "h-12 justify-center bg-red-600 px-4 hover:bg-red-700",
    icon: "size-4 text-white",
    text: "text-sm font-bold text-white",
  },
  link: {
    label: "min-h-9 px-1",
    icon: "hidden",
    text: "text-xs font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 group-hover:text-zinc-950",
  },
} as const;

export default function CsvFilePicker({
  id,
  multiple = false,
  label,
  variant = "default",
  onFilesSelected,
}: CsvFilePickerProps) {
  const classNames = variantClassNames[variant];

  return (
    <label
      htmlFor={id}
      className={`group flex cursor-pointer items-center gap-2 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-zinc-700 ${classNames.label}`}
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
      <UploadCloud className={classNames.icon} aria-hidden="true" />
      <span className={classNames.text}>{label}</span>
    </label>
  );
}
