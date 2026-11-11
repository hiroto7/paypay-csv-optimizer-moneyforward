import { Check, LoaderCircle } from "lucide-react";
import Modal from "~/components/Modal";

interface MfImportGuideModalProps {
  accountName: string;
  isSharing: boolean;
  onImported: () => void;
  onCancel: () => void;
}

export default function MfImportGuideModal({
  accountName,
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
          {
            instruction:
              "PP2MFに戻り、この画面の「MoneyForward MEで保存した」を押す",
            description: "押すと、次回から今回の明細を自動で除外します",
          },
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
