import { ArrowRight, Check, Download, FileText, Share2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Modal from "~/components/Modal";

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
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);
  const [hasInstalledInSession, setHasInstalledInSession] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);

  useEffect(() => {
    setIsStandaloneMode(isStandalone());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setInstallError(null);
    };
    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setInstallError(null);
      setHasInstalledInSession(true);
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
        setHasInstalledInSession(true);
        close();
      }
    } catch (error) {
      console.error("Failed to show install prompt:", error);
      setInstallPromptEvent(null);
      setInstallError(
        "インストール画面を開けませんでした。ブラウザのメニューからインストールできるか確認してください。",
      );
    }
  }, [close, installPromptEvent]);

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
        <Modal
          title="CSVを共有して読み込む"
          description="ファイル選択に加えて、共有シートからもCSVを読み込めます"
          onClose={close}
        >
          <div className="min-h-0 overflow-y-auto">
            <div className="space-y-4 px-5 py-5 text-sm leading-6 text-zinc-600">
              <figure
                className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 border border-zinc-200 bg-zinc-50 px-3 py-4"
                aria-label="CSVファイルを共有してPP2MFへ渡す流れ"
              >
                <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                  <span className="flex size-11 items-center justify-center bg-white shadow-sm ring-1 ring-zinc-200">
                    <FileText
                      className="size-6 text-zinc-600"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="text-xs font-semibold leading-4 text-zinc-700">
                    CSVファイル
                  </span>
                </div>
                <ArrowRight
                  className="size-4 shrink-0 text-zinc-400"
                  aria-hidden="true"
                />
                <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                  <span className="flex size-11 items-center justify-center bg-white shadow-sm ring-1 ring-zinc-200">
                    <Share2
                      className="size-6 text-zinc-600"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="text-xs font-semibold leading-4 text-zinc-700">
                    共有
                  </span>
                </div>
                <ArrowRight
                  className="size-4 shrink-0 text-zinc-400"
                  aria-hidden="true"
                />
                <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                  <img
                    src="/pwa-icon.svg"
                    alt=""
                    className="size-11 shadow-sm"
                  />
                  <span className="text-xs font-semibold leading-4 text-zinc-700">
                    PP2MF
                  </span>
                </div>
              </figure>

              <p>
                PP2MFをインストールすると、PayPayやMoneyForward
                MEから書き出したCSVを、ファイル選択画面で探し直さずに読み込めます。CSVの「共有」からPP2MFを選ぶだけです。
              </p>

              <ol className="divide-y divide-zinc-200 border-y border-zinc-200">
                {[
                  isStandaloneMode
                    ? "PP2MFはインストール済みです"
                    : "PP2MFをインストールする",
                  "読み込みたいCSVファイルで「共有」を選ぶ",
                  "共有シートでPP2MFを選ぶ",
                ].map((instruction, index) => (
                  <li
                    key={instruction}
                    className="grid grid-cols-[28px_1fr] gap-3 py-3"
                  >
                    <span
                      className={`flex size-7 items-center justify-center text-xs font-bold ${
                        index === 0 && isStandaloneMode
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {index === 0 && isStandaloneMode ? (
                        <Check className="size-4" aria-hidden="true" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="pt-0.5 text-zinc-700">{instruction}</span>
                  </li>
                ))}
              </ol>

              {!isStandaloneMode &&
              !hasInstalledInSession &&
              installPromptEvent ? (
                <button
                  type="button"
                  onClick={() => void install()}
                  className="inline-flex min-h-10 items-center gap-2 bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-700"
                >
                  <Download className="size-4" aria-hidden="true" />
                  PP2MFをインストール
                </button>
              ) : !isStandaloneMode && !hasInstalledInSession ? (
                <p className="border-l-2 border-zinc-300 pl-3 text-xs leading-5 text-zinc-600">
                  インストールボタンが表示されない場合は、ブラウザのメニューに「アプリをインストール」または「ホーム画面に追加」があるか確認してください。
                </p>
              ) : null}

              {installError && (
                <p
                  className="border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800"
                  role="alert"
                >
                  {installError}
                </p>
              )}

              <p className="text-xs leading-5 text-zinc-500">
                端末・OS・ブラウザによっては、PP2MFが共有先に表示されない場合があります。
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
        </Modal>
      )}
    </>
  );
}
