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

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

const isPp2mfInstalled = async (): Promise<boolean> => {
  const installedApps = await navigator.getInstalledRelatedApps?.();
  if (!installedApps) return false;

  const manifestUrl = new URL("/manifest.webmanifest", window.location.href);

  return installedApps.some((app) => {
    if (app.platform !== "webapp" || !app.url) return false;

    const installedManifestUrl = new URL(app.url, window.location.href);
    return (
      installedManifestUrl.origin === manifestUrl.origin &&
      installedManifestUrl.pathname === manifestUrl.pathname
    );
  });
};

export default function CsvShareGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasInstalledInSession, setHasInstalledInSession] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);
  const isInstalled = hasInstalledInSession;

  const updateInstalledState = useCallback(async () => {
    try {
      if (await isPp2mfInstalled()) {
        setIsInstalling(false);
        setHasInstalledInSession(true);
      }
    } catch (error) {
      console.error("Failed to check installed related apps:", error);
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setInstallError(null);
    };
    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setInstallError(null);

      // Android Chromeの実機調査では、承認直後と実インストール後の両方で
      // appinstalledが発火したため、イベントごとに実際の登録状態を確認する。
      void updateInstalledState();
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
  }, [updateInstalledState]);

  const open = useCallback(() => {
    setIsOpen(true);
    void updateInstalledState();
  }, [updateInstalledState]);

  const close = useCallback(() => {
    setIsOpen(false);
    setIsInstalling(false);
    setInstallError(null);
  }, []);

  const install = useCallback(async () => {
    if (!installPromptEvent) return;

    try {
      setIsInstalling(true);
      setInstallError(null);
      await installPromptEvent.prompt();
      const choice = await installPromptEvent.userChoice;
      setInstallPromptEvent(null);
      if (choice.outcome === "dismissed") {
        setIsInstalling(false);
      }
    } catch (error) {
      console.error("Failed to show install prompt:", error);
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
        onClick={open}
        className="interactive control-link gap-1.5 text-xs"
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
            <div className="space-y-4 px-5 py-5 text-sm leading-6 text-ink-2">
              <figure
                className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border border-rule bg-paper-2 px-3 py-4"
                aria-label="ダウンロードしたCSVをPP2MFで読み込む流れ"
              >
                <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                  <span className="flex size-11 items-center justify-center border border-rule bg-paper">
                    <FileText
                      className="size-6 text-ink-2"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="text-xs font-semibold leading-4 text-ink-2">
                    CSVファイル
                  </span>
                </div>
                <ArrowRight
                  className="size-4 shrink-0 text-muted"
                  aria-hidden="true"
                />
                <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                  <span className="flex size-11 items-center justify-center border border-rule bg-paper">
                    <Share2 className="size-6 text-ink-2" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-semibold leading-4 text-ink-2">
                    共有シート
                  </span>
                </div>
                <ArrowRight
                  className="size-4 shrink-0 text-muted"
                  aria-hidden="true"
                />
                <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                  <img src="/pwa-icon.svg" alt="" className="size-11" />
                  <span className="text-xs font-semibold leading-4 text-ink-2">
                    PP2MF
                  </span>
                </div>
              </figure>

              <ol className="divide-y divide-rule border-y border-rule">
                {[
                  isInstalled
                    ? "PP2MFはインストール済みです"
                    : "PP2MFをインストールする",
                  "PayPayまたはMoneyForward MEからCSVをダウンロードする",
                  "共有シートでPP2MFを選ぶ",
                ].map((instruction, index) => (
                  <li
                    key={instruction}
                    className={`grid grid-cols-[28px_minmax(0,1fr)] gap-3 py-3 ${
                      index === 0 && isInstalling
                        ? "font-semibold text-ink"
                        : ""
                    }`}
                  >
                    <span
                      className={`step-number flex size-7 items-center justify-center text-xs font-bold ${
                        index === 0 && isInstalled
                          ? "status-success"
                          : "bg-paper-3 text-ink-2"
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
                      <span className="block text-ink-2">{instruction}</span>

                      {index === 0 &&
                      !isInstalled &&
                      (isInstalling || installPromptEvent) ? (
                        <button
                          type="button"
                          onClick={() => void install()}
                          disabled={isInstalling}
                          className={`interactive control-button mt-2 gap-2 text-sm ${
                            isInstalling ? "button-secondary" : "button-primary"
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
                        <p className="mt-2 text-sm leading-6 text-muted">
                          ブラウザのメニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。
                        </p>
                      ) : null}

                      {index === 0 && installError && (
                        <p
                          className="status-error mt-2 border px-3 py-3 text-sm"
                          role="alert"
                        >
                          {installError}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>

              <p className="text-sm leading-6 text-muted">
                端末・OS・ブラウザによっては、PP2MFが共有先に表示されない場合があります。
              </p>
            </div>
          </div>

          <div className="flex shrink-0 justify-end border-t border-rule bg-paper-2 px-5 py-4">
            <button
              type="button"
              onClick={close}
              className="interactive control-button button-secondary text-sm"
            >
              閉じる
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
