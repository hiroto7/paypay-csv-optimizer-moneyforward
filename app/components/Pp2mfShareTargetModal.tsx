import { FileText, Share2, Smartphone } from "lucide-react";
import Button from "~/components/Button";
import { FlowArrow, FlowFigure, FlowNode } from "~/components/FlowFigure";
import Modal, { ModalBody, ModalFooter } from "~/components/Modal";

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
      <ModalBody className="space-y-4 text-sm leading-6 text-zinc-700">
        <p>
          「{fileName}」は、MoneyForward
          MEに取り込むためのファイルです。共有シートでは
          <strong className="text-zinc-950">MoneyForward ME</strong>
          を選んでください。
        </p>
        <FlowFigure
          label="取り込み用CSVを共有シートでMoneyForward MEへ渡す流れ"
          className="border border-zinc-200 bg-zinc-50 px-3 py-4"
        >
          <FlowNode label="取り込み用CSV" icon={FileText} />
          <FlowArrow />
          <FlowNode label="共有シート" icon={Share2} />
          <FlowArrow />
          <FlowNode label="MoneyForward ME" icon={Smartphone} highlighted />
        </FlowFigure>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onCancel}>取り込みをやめる</Button>
        <Button variant="primary" onClick={onShareAgain}>
          <Share2 className="size-4" aria-hidden="true" />
          もう一度共有する
        </Button>
      </ModalFooter>
    </Modal>
  );
}
