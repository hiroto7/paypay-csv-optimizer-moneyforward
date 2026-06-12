import { useState } from "react";

type DropzoneTone = "red" | "purple";

const toneClasses: Record<DropzoneTone, { active: string; idle: string }> = {
  red: {
    active: "border-red-500 bg-red-500/10",
    idle: "border-slate-600 hover:border-red-400",
  },
  purple: {
    active: "border-purple-500 bg-purple-500/10",
    idle: "border-slate-600 hover:border-purple-400",
  },
};

interface CsvDropzoneProps {
  id: string;
  multiple?: boolean;
  tone: DropzoneTone;
  label: string;
  onFilesSelected: (files: FileList | null) => void;
}

export default function CsvDropzone({
  id,
  multiple = false,
  tone,
  label,
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

  const classes = toneClasses[tone];

  return (
    <label
      htmlFor={id}
      className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors block ${
        isDragging ? classes.active : classes.idle
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
      <p className="text-slate-400 pointer-events-none">{label}</p>
    </label>
  );
}
