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

type InstalledRelatedApp = {
  platform: string;
  url?: string;
};

const isPp2mfInstalled = async (): Promise<boolean> => {
  const getInstalledRelatedApps = (
    navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<InstalledRelatedApp[]>;
    }
  ).getInstalledRelatedApps;
  if (!getInstalledRelatedApps) return false;

  const installedApps = await getInstalledRelatedApps.call(navigator);
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
