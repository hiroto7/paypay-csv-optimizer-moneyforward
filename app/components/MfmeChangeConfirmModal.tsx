import FileStatsSummary from "~/components/FileStatsSummary";
import Modal from "~/components/Modal";
import RecordCoverageNotice, {
  type RecordCoverage,
} from "~/components/RecordCoverageNotice";
import type { MfmeChangePreview } from "~/hooks/useInputFilesStore";

interface MfmeChangeConfirmModalProps {
  preview: MfmeChangePreview;
  coverage: RecordCoverage;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function MfmeChangeConfirmModal({
  preview,
  coverage,
  onConfirm,
  onCancel,
}: MfmeChangeConfirmModalProps) {
  const isRemoval = preview.kind === "remove";

  return (
    <Modal title="保存した明細の記録をリセットしますか？" onClose={onCancel}>
      <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-4">
        <div className="border border-zinc-200 px-3 py-2.5">
          <p className="text-xs text-zinc-500">
            {isRemoval ? "削除する入出金履歴" : "追加する入出金履歴"}
          </p>
          <ul className="mt-1 space-y-1.5">
            {preview.files.map(({ name, stats }) => (
              <li key={name}>
                <p className="break-all text-sm font-semibold text-zinc-900">
                  {name}
                </p>
                {stats && (
                  <div className="text-xs text-zinc-500">
                    <FileStatsSummary stats={stats} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm leading-6 text-zinc-700">
          MoneyForward MEの入出金履歴を変更すると、この端末の「MoneyForward
          MEで保存した」記録（{coverage.recordCount}
          件）をリセットし、今後は入出金履歴をもとに登録済みの明細を判断します。
        </p>
        <RecordCoverageNotice coverage={coverage} />
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
