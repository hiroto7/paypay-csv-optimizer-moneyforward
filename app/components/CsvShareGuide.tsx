import {
  ArrowRight,
  Check,
  Download,
  FileText,
  LoaderCircle,
  Share2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Modal from "~/components/Modal";
import PwaInstallDebugPanel from "~/components/PwaInstallDebugPanel";
import {
  isPwaInstallDebugEnabled,
  recordPwaInstallDebug,
} from "~/utils/pwa-install-debug";

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

const isStandalone = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches;

export default function CsvShareGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);
  const [hasInstalledInSession, setHasInstalledInSession] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const isInstalled = isStandaloneMode || hasInstalledInSession;

  useEffect(() => {
    setIsStandaloneMode(isStandalone());
    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    recordPwaInstallDebug("listeners-mounted", undefined, {
      navigationType: navigation?.type ?? "unknown",
    });

    const handleBeforeInstallPrompt = (event: Event) => {
      recordPwaInstallDebug("beforeinstallprompt", event);
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setInstallError(null);
    };
    const handleAppInstalled = (event: Event) => {
      recordPwaInstallDebug("appinstalled", event);
      setInstallPromptEvent(null);
      setInstallError(null);
      setIsInstalling(false);
      setHasInstalledInSession(true);
    };
    const handlePageHide = (event: PageTransitionEvent) => {
      recordPwaInstallDebug("pagehide", event, {
        persisted: event.persisted,
      });
    };
    const handleVisibilityChange = (event: Event) => {
      recordPwaInstallDebug("visibilitychange", event);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsInstalling(false);
    setInstallError(null);
  }, []);

  const install = useCallback(async () => {
    if (!installPromptEvent) return;

    try {
      recordPwaInstallDebug("install-button-click");
      setIsInstalling(true);
      setInstallError(null);
      await installPromptEvent.prompt();
      recordPwaInstallDebug("prompt-returned");
      const choice = await installPromptEvent.userChoice;
      recordPwaInstallDebug("user-choice", undefined, {
        outcome: choice.outcome,
        platform: choice.platform,
      });
      setInstallPromptEvent(null);
      if (choice.outcome === "dismissed") {
        setIsInstalling(false);
      }
    } catch (error) {
      console.error("Failed to show install prompt:", error);
      recordPwaInstallDebug("install-error", undefined, {
        message: error instanceof Error ? error.message : String(error),
      });
      setInstallPromptEvent(null);
      setIsInstalling(false);
      setInstallError(
        "インストール画面を開けませんでした。ブラウザのメニューからインストールできるか確認してください。",
      );
    }
  }, [installPromptEvent]);

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
          description="PayPayやMoneyForward MEからダウンロードしたCSVを、保存先から探し直さずに読み込めます"
          onClose={close}
        >
          <div className="min-h-0 overflow-y-auto">
            <div className="space-y-4 px-5 py-5 text-sm leading-6 text-zinc-600">
              <figure
                className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 border border-zinc-200 bg-zinc-50 px-3 py-4"
                aria-label="ダウンロードしたCSVをPP2MFで読み込む流れ"
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
                    共有シート
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

              <ol className="divide-y divide-zinc-200 border-y border-zinc-200">
                {[
                  isInstalled
                    ? "PP2MFはインストール済みです"
                    : "PP2MFをインストールする",
                  "PayPayまたはMoneyForward MEからCSVをダウンロードする",
                  "共有シートでPP2MFを選ぶ",
                ].map((instruction, index) => (
                  <li
                    key={instruction}
                    className={`grid grid-cols-[28px_1fr] gap-3 py-3 ${
                      index === 0 && isInstalling
                        ? "font-semibold text-zinc-950"
                        : ""
                    }`}
                  >
                    <span
                      className={`flex size-7 items-center justify-center text-xs font-bold ${
                        index === 0 && isInstalled
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {index === 0 && isInstalling ? (
                        <LoaderCircle
                          className="size-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : index === 0 && isInstalled ? (
                        <Check className="size-4" aria-hidden="true" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <span className="text-zinc-700">{instruction}</span>

                      {index === 0 &&
                      !isInstalled &&
                      (isInstalling || installPromptEvent) ? (
                        <button
                          type="button"
                          onClick={() => void install()}
                          disabled={isInstalling}
                          className={`mt-2 inline-flex min-h-10 items-center gap-2 px-4 text-sm font-semibold ${
                            isInstalling
                              ? "cursor-wait bg-zinc-200 text-zinc-500"
                              : "bg-zinc-900 text-white hover:bg-zinc-700"
                          }`}
                        >
                          {isInstalling ? (
                            <LoaderCircle
                              className="size-4 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Download className="size-4" aria-hidden="true" />
                          )}
                          {isInstalling ? "インストール中" : "インストールする"}
                        </button>
                      ) : index === 0 && !isInstalled ? (
                        <p className="mt-2 border-l-2 border-zinc-300 pl-3 text-xs leading-5 text-zinc-600">
                          ブラウザのメニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。
                        </p>
                      ) : null}

                      {index === 0 && installError && (
                        <p
                          className="mt-2 border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800"
                          role="alert"
                        >
                          {installError}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>

              <p className="text-xs leading-5 text-zinc-500">
                端末・OS・ブラウザによっては、PP2MFが共有先に表示されない場合があります。
              </p>

              {isPwaInstallDebugEnabled() && <PwaInstallDebugPanel />}
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
