import Modal from "~/components/Modal";
import RecordResetNotice from "~/components/RecordResetNotice";
import type { MfmeChangePreview } from "~/hooks/useInputFilesStore";

interface MfmeChangeConfirmModalProps {
  preview: MfmeChangePreview;
  // リセットする「MoneyForward MEで保存した」記録の件数。
  recordCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function MfmeChangeConfirmModal({
  preview,
  recordCount,
  onConfirm,
  onCancel,
}: MfmeChangeConfirmModalProps) {
  const isRemoval = preview.kind === "remove";

  return (
    <Modal title="保存した明細の記録をリセットしますか？" onClose={onCancel}>
      <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-4">
        <div className="space-y-2 text-sm leading-6 text-zinc-700">
          <RecordResetNotice kind={preview.kind} recordCount={recordCount} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-10 w-full items-center justify-center border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 sm:w-auto"
        >
          やめる
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex min-h-10 w-full items-center justify-center bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700 sm:w-auto"
        >
          {isRemoval ? "リセットして削除する" : "リセットして追加する"}
        </button>
      </div>
    </Modal>
  );
}
