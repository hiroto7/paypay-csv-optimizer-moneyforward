import { Check, LoaderCircle, X } from "lucide-react";
import { useEffect, useRef } from "react";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButtonRef.current?.focus();

    return () => previouslyFocusedElement?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;

    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusableElements || focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
      <div
        ref={dialogRef}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col border border-zinc-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-guide-title"
        aria-describedby="import-guide-description"
        onKeyDown={handleKeyDown}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div>
            <h2
              id="import-guide-title"
              className="text-base font-bold text-zinc-950"
            >
              MoneyForward MEに取り込む
            </h2>
            <p
              id="import-guide-description"
              className="mt-1 text-xs text-zinc-500"
            >
              共有後、MoneyForward MEで口座を指定して保存してください
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex size-8 shrink-0 items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="閉じる"
            title="閉じる"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

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
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {description}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-zinc-200 bg-zinc-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 w-full items-center justify-center border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 sm:w-auto"
          >
            後で確認
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
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Check className="size-4" aria-hidden="true" />
            )}
            {isSharing ? "共有先を選択中" : "MoneyForward MEで保存した"}
          </button>
        </div>
      </div>
    </div>
  );
}
