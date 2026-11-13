import Button from "~/components/Button";
import Modal, { ModalBody, ModalFooter } from "~/components/Modal";
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
      <ModalBody className="space-y-2 text-sm leading-6 text-zinc-700">
        <RecordResetNotice kind={preview.kind} recordCount={recordCount} />
      </ModalBody>
      <ModalFooter>
        <Button onClick={onCancel}>やめる</Button>
        <Button variant="primary" onClick={onConfirm}>
          {isRemoval ? "リセットして削除する" : "リセットして追加する"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
