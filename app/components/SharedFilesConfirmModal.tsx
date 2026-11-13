import { AlertTriangle, Check, X } from "lucide-react";
import type { ReactNode } from "react";
import Button from "~/components/Button";
import FileStatsSummary from "~/components/FileStatsSummary";
import Modal, { ModalBody, ModalFooter } from "~/components/Modal";
import RecordResetNotice from "~/components/RecordResetNotice";
import type { SharedFilesPreview } from "~/hooks/useInputFilesStore";

interface SharedFilesConfirmModalProps {
  preview: SharedFilesPreview;
  // 取り込み記録があり、入出金履歴を読み込む場合だけ渡す。
  // 入出金履歴を読み込むとリセットする「MoneyForward MEで保存した」記録の件数。
  recordCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function FileGroup({
  icon,
  title,
  muted = false,
  children,
}: {
  icon: ReactNode;
  title: string;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="border border-zinc-200">
      <h3 className="flex items-center gap-1.5 border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-bold leading-5 text-zinc-600">
        {icon}
        {title}
      </h3>
      <div
        className={`space-y-2 px-3 py-2.5 text-xs leading-5 ${
          muted ? "text-zinc-500" : "text-zinc-600"
        }`}
      >
        {children}
      </div>
    </section>
  );
}

export default function SharedFilesConfirmModal({
  preview,
  recordCount,
  onConfirm,
  onCancel,
}: SharedFilesConfirmModalProps) {
  const { fileCount, payPay, unusedPayPayFiles, mfme } = preview;
  const loadableCount = (payPay ? 1 : 0) + mfme.length;
  const skipped = [
    ...unusedPayPayFiles.map((file) => ({
      name: file.name,
      reason: "期間が古い取引履歴です。",
    })),
    ...preview.rejected,
  ];
  const resetsRecords = mfme.length > 0 && recordCount > 0;
  const title =
    loadableCount === 0
      ? "共有されたファイルを読み込めませんでした"
      : fileCount === 1
        ? "このファイルを読み込みますか？"
        : `${loadableCount}件を読み込みますか？`;

  return (
    <Modal
      title={title}
      description={`共有されたファイル ${fileCount}件`}
      onClose={onCancel}
    >
      <ModalBody className="space-y-3">
        {payPay && (
          <FileGroup
            icon={
              <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
            }
            title="PayPayの取引履歴"
          >
            <div>
              <p className="break-all text-sm font-semibold text-zinc-900">
                {payPay.file.name}
              </p>
              <FileStatsSummary stats={payPay.data.stats} />
            </div>
          </FileGroup>
        )}

        {mfme.length > 0 && (
          <FileGroup
            icon={
              resetsRecords ? (
                <AlertTriangle
                  className="size-3.5 text-amber-600"
                  aria-hidden="true"
                />
              ) : (
                <Check
                  className="size-3.5 text-emerald-600"
                  aria-hidden="true"
                />
              )
            }
            title="MoneyForward MEの入出金履歴"
          >
            {mfme.map(({ file, data, replaces }) => (
              <div key={file.name}>
                <p className="break-all text-sm font-semibold text-zinc-900">
                  {file.name}
                </p>
                <FileStatsSummary stats={data.stats} />
                {replaces && <p>同じ名前のファイルと置き換えます。</p>}
              </div>
            ))}
            {resetsRecords ? (
              <div className="space-y-1 border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-950">
                <p className="font-bold">保存した明細の記録をリセットします</p>
                <RecordResetNotice kind="add" recordCount={recordCount} />
              </div>
            ) : (
              <p>登録済みの明細の除外に使います。</p>
            )}
          </FileGroup>
        )}

        {skipped.length > 0 && (
          <FileGroup
            icon={<X className="size-3.5" aria-hidden="true" />}
            title="読み込まないファイル"
            muted
          >
            <ul className="space-y-1">
              {skipped.map(({ name, reason }) => (
                <li key={`${name}:${reason}`}>
                  <span className="break-all font-semibold text-zinc-700">
                    {name}
                  </span>
                  ：{reason}
                </li>
              ))}
            </ul>
          </FileGroup>
        )}
      </ModalBody>

      <ModalFooter>
        <Button onClick={onCancel}>
          {loadableCount === 0 ? "閉じる" : "やめる"}
        </Button>
        {loadableCount > 0 && (
          <Button variant="primary" onClick={onConfirm}>
            {resetsRecords ? "リセットして読み込む" : "読み込む"}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
