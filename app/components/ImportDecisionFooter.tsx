import { Check, LoaderCircle } from "lucide-react";

interface ImportDecisionFooterProps {
  discardLabel: string;
  onDiscard: () => void;
  onConfirm: () => void;
  // 共有シートの表示中は、どちらも押せないようにする。
  isSharing?: boolean;
}

export default function ImportDecisionFooter({
  discardLabel,
  onDiscard,
  onConfirm,
  isSharing = false,
}: ImportDecisionFooterProps) {
  return (
    <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onDiscard}
        disabled={isSharing}
        className={`inline-flex min-h-10 w-full items-center justify-center border px-4 text-sm font-semibold sm:w-auto ${
          isSharing
            ? "cursor-wait border-zinc-200 bg-zinc-100 text-zinc-400"
            : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
        }`}
      >
        {discardLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isSharing}
        className={`inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 text-sm font-semibold sm:w-auto ${
          isSharing
            ? "cursor-wait bg-zinc-200 text-zinc-500"
            : "bg-zinc-900 text-white hover:bg-zinc-700"
        }`}
      >
        {isSharing ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Check className="size-4" aria-hidden="true" />
        )}
        {isSharing ? "共有シートを表示中" : "MoneyForward MEで保存した"}
      </button>
    </div>
  );
}
