import { Check, LoaderCircle } from "lucide-react";
import Modal from "~/components/Modal";

interface MfImportGuideModalProps {
  accountName: string;
  isSharing: boolean;
  onClose: () => void;
  onImported: () => void;
}

export default function MfImportGuideModal({
  accountName,
  isSharing,
  onClose,
  onImported,
}: MfImportGuideModalProps) {
  return (
    <Modal
      title="MoneyForward MEに取り込む"
      description="共有後、MoneyForward MEで口座を指定して保存してください"
      onClose={onClose}
    >
      <ol className="min-h-0 overflow-y-auto divide-y divide-border px-5">
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
              "PP2MFに戻り、この画面の右下の「MoneyForward MEで保存した」を押す",
            description:
              "次回PP2MFを使うとき、今回取り込んだ明細は自動的に除外されるようになります",
          },
        ].map(({ instruction, description }, index) => {
          const isShareStep = index === 0;
          return (
            <li
              key={instruction}
              className={`grid grid-cols-[28px_minmax(0,1fr)] items-start gap-3 py-4 text-sm ${
                isShareStep && isSharing
                  ? "font-semibold text-foreground"
                  : "text-foreground-subtle"
              }`}
            >
              <span
                className={`step-number flex size-7 items-center justify-center border text-xs font-bold ${
                  isShareStep && !isSharing
                    ? "status-success"
                    : "surface-quiet border-border text-foreground-subtle"
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
                  <p className="mt-0.5 text-sm text-foreground-subtle">
                    {description}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-surface px-5 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="control-button button-secondary interactive w-full text-sm sm:w-auto"
        >
          閉じる
        </button>
        <button
          type="button"
          onClick={onImported}
          disabled={isSharing}
          className="control-button button-primary interactive w-full gap-2 text-sm sm:w-auto"
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
