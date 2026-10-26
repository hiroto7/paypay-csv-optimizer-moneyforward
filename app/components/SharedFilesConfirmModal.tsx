import { AlertTriangle, Check, Share2, X } from "lucide-react";
import type { ReactNode } from "react";
import FileStatsSummary from "~/components/FileStatsSummary";
import Modal from "~/components/Modal";
import RecordCoverageNotice, {
  type RecordCoverage,
} from "~/components/RecordCoverageNotice";
import type { SharedFilesPreview } from "~/hooks/useInputFilesStore";

interface SharedFilesConfirmModalProps {
  preview: SharedFilesPreview;
  // 取り込み記録があり、入出金履歴を読み込む場合だけ渡す。
  coverage: RecordCoverage | null;
  hasImportedRecords: boolean;
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
      <h3 className="flex items-center gap-1.5 border-b border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-bold text-zinc-600">
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
  coverage,
  hasImportedRecords,
  onConfirm,
  onCancel,
}: SharedFilesConfirmModalProps) {
  const { fileCount, payPay, currentPayPayFile, unusedPayPayFiles, mfme } =
    preview;
  const loadableCount = (payPay ? 1 : 0) + mfme.length;
  const skipped = [
    ...unusedPayPayFiles.map((file) => ({
      name: file.name,
      reason: "PayPayの取引履歴は1つだけ使います。期間が新しいほうを使います。",
    })),
    ...preview.rejected,
  ];
  const resetsRecords = mfme.length > 0 && hasImportedRecords;
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
      <div className="min-h-0 space-y-3 overflow-y-auto px-5 py-4">
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
            <p>
              {currentPayPayFile
                ? "今のPayPayの取引履歴と置き換えます。"
                : "この取引履歴で作業します。"}
              {hasImportedRecords &&
                !resetsRecords &&
                "保存した明細の記録はそのまま使います。"}
            </p>
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
            {resetsRecords && coverage ? (
              <>
                <p className="text-zinc-700">
                  読み込むと、この端末の「MoneyForward MEで保存した」記録（
                  {coverage.recordCount}
                  件）をリセットし、今後は入出金履歴をもとに登録済みの明細を判断します。
                </p>
                <RecordCoverageNotice coverage={coverage} />
              </>
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
            <ul className="space-y-1.5">
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
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-10 w-full items-center justify-center border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 sm:w-auto"
        >
          {loadableCount === 0 ? "閉じる" : "やめる"}
        </button>
        {loadableCount > 0 && (
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700 sm:w-auto"
          >
            <Share2 className="size-4" aria-hidden="true" />
            {resetsRecords ? "読み込んで記録をリセットする" : "読み込む"}
          </button>
        )}
      </div>
    </Modal>
  );
}
