import { CheckCircle2, Download, Share2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

const isStandalone = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true;

export default function CsvShareGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsInstalled(isStandalone());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setInstallError(null);
    };
    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setInstallError(null);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButtonRef.current?.focus();

    return () => previouslyFocusedElement?.focus();
  }, [isOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    setInstallError(null);
  }, []);

  const install = useCallback(async () => {
    if (!installPromptEvent) return;

    try {
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      setInstallPromptEvent(null);
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
      }
      close();
    } catch (error) {
      console.error("Failed to show install prompt:", error);
      setInstallPromptEvent(null);
      setInstallError(
        "インストール画面を開けませんでした。ブラウザのメニューからインストールできるか確認してください。",
      );
    }
  }, [close, installPromptEvent]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
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
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex min-h-8 items-center gap-1.5 text-xs font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
      >
        <Share2 className="size-3.5" aria-hidden="true" />
        CSVを共有して読み込む方法
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
          <div
            ref={dialogRef}
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col border border-zinc-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="csv-share-guide-title"
            aria-describedby="csv-share-guide-description"
            onKeyDown={handleKeyDown}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
              <div>
                <h2
                  id="csv-share-guide-title"
                  className="text-base font-bold text-zinc-950"
                >
                  CSVを共有して読み込む
                </h2>
                <p
                  id="csv-share-guide-description"
                  className="mt-1 text-xs text-zinc-500"
                >
                  ファイル選択画面で探し直さずにPP2MFへ渡せます
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                className="inline-flex size-8 shrink-0 items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                aria-label="閉じる"
                title="閉じる"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto">
              <div className="space-y-4 px-5 py-5 text-sm leading-6 text-zinc-600">
                <p>
                  対応する端末・ブラウザでは、PP2MFをインストールすると、CSVファイルの共有先にPP2MFが表示されます。PayPayの取引履歴とMoneyForward
                  MEの入出金履歴を、ファイル選択画面で探し直さずに読み込めます。
                </p>

                <ol className="divide-y divide-zinc-200 border-y border-zinc-200">
                  {[
                    "PP2MFをインストールする",
                    "読み込みたいCSVファイルで「共有」を選ぶ",
                    "共有先からPP2MFを選ぶ",
                  ].map((instruction, index) => (
                    <li
                      key={instruction}
                      className="grid grid-cols-[28px_1fr] gap-3 py-3"
                    >
                      <span className="flex size-7 items-center justify-center bg-zinc-100 text-xs font-bold text-zinc-700">
                        {index + 1}
                      </span>
                      <span className="pt-0.5 text-zinc-700">
                        {instruction}
                      </span>
                    </li>
                  ))}
                </ol>

                {isInstalled ? (
                  <div className="flex gap-2 border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-900">
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <p>
                      PP2MFをインストール済みです。CSVファイルの共有先からPP2MFを選んでください。
                    </p>
                  </div>
                ) : installPromptEvent ? (
                  <button
                    type="button"
                    onClick={() => void install()}
                    className="inline-flex min-h-10 items-center gap-2 bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700"
                  >
                    <Download className="size-4" aria-hidden="true" />
                    PP2MFをインストール
                  </button>
                ) : (
                  <p className="border-l-2 border-zinc-300 pl-3 text-xs leading-5 text-zinc-600">
                    インストールボタンが表示されない場合は、ブラウザのメニューに「アプリをインストール」または「ホーム画面に追加」があるか確認してください。
                  </p>
                )}

                {installError && (
                  <p
                    className="border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800"
                    role="alert"
                  >
                    {installError}
                  </p>
                )}

                <p className="text-xs leading-5 text-zinc-500">
                  共有先として利用できるかどうかは、端末・OS・ブラウザによって異なります。
                </p>
              </div>
            </div>

            <div className="flex shrink-0 justify-end border-t border-zinc-200 bg-zinc-50 px-5 py-4">
              <button
                type="button"
                onClick={close}
                className="min-h-9 border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
