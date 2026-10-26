import { Check, History, LoaderCircle } from "lucide-react";
import Modal from "~/components/Modal";

interface MfImportGuideModalProps {
  accountName: string;
  transactionCount: number;
  isSharing: boolean;
  onImported: () => void;
  onCancel: () => void;
}

export default function MfImportGuideModal({
  accountName,
  transactionCount,
  isSharing,
  onImported,
  onCancel,
}: MfImportGuideModalProps) {
  return (
    <Modal title="MoneyForward MEに取り込む" dismissible={false}>
      <ol className="min-h-0 overflow-y-auto divide-y divide-zinc-200 px-5">
        {[
          { instruction: "共有シートでMoneyForward MEを選ぶ" },
          { instruction: "「CSVを読み込む」を押す" },
          {
            instruction: "MoneyForward MEを開く",
            description: "自動的に「読み込んだ明細」画面が開きます",
          },
          {
            instruction: `「支出元・入金先一括変更」で「${accountName}」を選ぶ`,
          },
          { instruction: "内容を確認して右上の「保存」を押す" },
        ].map(({ instruction, description }, index) => {
          const isShareStep = index === 0;
          return (
            <li
              key={instruction}
              className={`grid grid-cols-[28px_minmax(0,1fr)] items-start gap-3 py-4 text-sm ${
                isShareStep && isSharing
                  ? "font-semibold text-zinc-950"
                  : "text-zinc-700"
              }`}
            >
              <span
                className={`flex size-7 items-center justify-center text-xs font-bold ${
                  isShareStep && !isSharing
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {isShareStep ? (
                  isSharing ? (
                    <LoaderCircle
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Check className="size-4" aria-hidden="true" />
                  )
                ) : (
                  index + 1
                )}
              </span>
              <div
                className={
                  description === undefined
                    ? "flex min-h-7 min-w-0 items-center"
                    : "min-w-0"
                }
              >
                <span className="block leading-5">{instruction}</span>
                {description !== undefined && (
                  <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mx-5 mb-4 shrink-0 border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="flex items-center gap-1.5 text-sm font-bold text-blue-950">
          <History className="size-4 shrink-0" aria-hidden="true" />
          保存したら、PP2MFに戻って下のボタンを押してください
        </p>
        <p className="mt-1 text-xs leading-5 text-zinc-700">
          この{transactionCount}
          件をこの端末に記録し、次回からは自動で除外します。押さないと、次回も取り込み用CSVに含まれます。
        </p>
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSharing}
          className={`inline-flex min-h-10 w-full items-center justify-center border px-4 text-sm font-semibold sm:w-auto ${
            isSharing
              ? "cursor-wait border-zinc-200 bg-zinc-100 text-zinc-400"
              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
          }`}
        >
          取り込みをやめる
        </button>
        <button
          type="button"
          onClick={onImported}
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
    </Modal>
  );
}
