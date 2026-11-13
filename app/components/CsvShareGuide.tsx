import { Check, Download, FileText, LoaderCircle, Share2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Button from "~/components/Button";
import ErrorAlert from "~/components/ErrorAlert";
import { FlowArrow, FlowFigure, FlowNode } from "~/components/FlowFigure";
import Modal, { ModalBody, ModalFooter } from "~/components/Modal";
import { clearInstallPrompt, useInstallPrompt } from "~/utils/install-prompt";

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
  const installPromptEvent = useInstallPrompt();
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

  // 新しいインストールの案内を受け取ったら、前回の失敗の表示を消す。
  useEffect(() => {
    if (installPromptEvent) setInstallError(null);
  }, [installPromptEvent]);

  useEffect(() => {
    const handleAppInstalled = () => {
      setInstallError(null);

      // Android Chromeの実機調査では、承認直後と実インストール後の両方で
      // appinstalledが発火したため、イベントごとに実際の登録状態を確認する。
      void updateInstalledState();
    };

    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
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
      clearInstallPrompt();
      if (choice.outcome === "dismissed") {
        setIsInstalling(false);
      }
    } catch (error) {
      console.error("Failed to show install prompt:", error);
      clearInstallPrompt();
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
        className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
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
          <ModalBody className="space-y-4 text-sm leading-6 text-zinc-600">
            <FlowFigure
              label="ダウンロードしたCSVをPP2MFで読み込む流れ"
              className="border border-zinc-200 bg-zinc-50 px-3 py-4"
            >
              <FlowNode label="CSVファイル" icon={FileText} />
              <FlowArrow />
              <FlowNode label="共有シート" icon={Share2} />
              <FlowArrow />
              <FlowNode label="PP2MF" />
            </FlowFigure>

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
                    <span className="block text-zinc-700">{instruction}</span>

                    {index === 0 &&
                    !isInstalled &&
                    (isInstalling || installPromptEvent) ? (
                      <Button
                        variant="primary"
                        className="mt-2"
                        onClick={() => void install()}
                        disabled={isInstalling}
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
                      </Button>
                    ) : index === 0 && !isInstalled ? (
                      <p className="mt-2 border-l-2 border-zinc-300 pl-3 text-xs leading-5 text-zinc-600">
                        ブラウザのメニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。
                      </p>
                    ) : null}

                    {index === 0 && installError && (
                      <ErrorAlert className="mt-2">
                        <p>{installError}</p>
                      </ErrorAlert>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            <p className="text-xs leading-5 text-zinc-500">
              端末・OS・ブラウザによっては、PP2MFが共有先に表示されない場合があります。
            </p>
          </ModalBody>

          <ModalFooter>
            <Button onClick={close}>閉じる</Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}
