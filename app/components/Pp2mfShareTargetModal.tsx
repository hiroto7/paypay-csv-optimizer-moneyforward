import { ArrowRight, FileText, Share2 } from "lucide-react";
import Modal from "~/components/Modal";

interface Pp2mfShareTargetModalProps {
  fileName: string;
  onShareAgain: () => void;
  onCancel: () => void;
}

// 取り込み用CSVを、共有シートでMoneyForward MEではなくPP2MFへ共有してしまったときの案内。
export default function Pp2mfShareTargetModal({
  fileName,
  onShareAgain,
  onCancel,
}: Pp2mfShareTargetModalProps) {
  return (
    <Modal title="共有先にPP2MFが選ばれました" dismissible={false}>
      <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-4 text-sm leading-6 text-zinc-700">
        <p>
          「{fileName}」は、MoneyForward
          MEに取り込むためのファイルです。共有シートでは
          <strong className="text-zinc-950">MoneyForward ME</strong>
          を選んでください。
        </p>
        <figure
          className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 border border-zinc-200 bg-zinc-50 px-3 py-4"
          aria-label="取り込み用CSVを共有シートでMoneyForward MEへ渡す流れ"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex size-11 items-center justify-center bg-white ring-1 ring-zinc-200">
              <FileText className="size-6 text-zinc-600" aria-hidden="true" />
            </span>
            <span className="text-xs font-semibold leading-4">
              取り込み用CSV
            </span>
          </div>
          <ArrowRight className="size-4 text-zinc-400" aria-hidden="true" />
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex size-11 items-center justify-center bg-white ring-1 ring-zinc-200">
              <Share2 className="size-6 text-zinc-600" aria-hidden="true" />
            </span>
            <span className="text-xs font-semibold leading-4">共有シート</span>
          </div>
          <ArrowRight className="size-4 text-zinc-400" aria-hidden="true" />
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="flex size-11 items-center justify-center bg-orange-500 text-sm font-extrabold text-white ring-2 ring-red-600 ring-offset-2">
              ME
            </span>
            <span className="text-xs font-semibold leading-4">
              MoneyForward ME
            </span>
          </div>
        </figure>
      </div>
      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-10 w-full items-center justify-center border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 sm:w-auto"
        >
          取り込みをやめる
        </button>
        <button
          type="button"
          onClick={onShareAgain}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700 sm:w-auto"
        >
          <Share2 className="size-4" aria-hidden="true" />
          もう一度共有する
        </button>
      </div>
    </Modal>
  );
}
