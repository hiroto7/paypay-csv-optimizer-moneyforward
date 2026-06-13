import { X } from "lucide-react";

interface ClearFileSelectionButtonProps {
  onClick: () => void;
}

export default function ClearFileSelectionButton({
  onClick,
}: ClearFileSelectionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
    >
      <X className="size-3.5" aria-hidden="true" />
      ファイルの選択を解除
    </button>
  );
}
