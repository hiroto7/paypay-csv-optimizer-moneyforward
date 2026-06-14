import {
  Check,
  Download,
  FileCheck2,
  FileSearch,
  Share2,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

export const USAGE_GUIDE_DISMISSED_KEY =
  "paypay-csv-optimizer:usage-guide-dismissed";

type UsageGuideProps = {
  installPromptEvent: BeforeInstallPromptEvent | null;
  isInstallAvailable: boolean;
  showInstallGuide: boolean;
  isOpen: boolean;
  showIntro: boolean;
  onClose: () => void;
  onDismissIntro: () => void;
  onInstall: () => Promise<void>;
  onOpen: () => void;
};

const steps = [
  {
    title: "PayPay CSVを読み込む",
    description:
      "PayPayから取得した取引履歴CSVを選択します。インストール済みの対応環境では、PayPayやファイルアプリの共有シートからこのアプリへCSVを渡すこともできます。",
    icon: Upload,
  },
  {
    title: "既存明細を除外する",
    description:
      "すでに取り込み済みの明細がある場合は、MoneyForward MEからエクスポートしたCSVを追加します。除外が不要ならスキップできます。",
    icon: FileSearch,
  },
  {
    title: "生成したCSVを取り込む",
    description:
      "支払い方法ごと、100件ごとに分割されたCSVをMoneyForward MEへ取り込みます。カードや銀行口座など、PayPay以外で直接連携済みの支払い方法は通常取り込まないでください。",
    icon: FileCheck2,
  },
] as const;

export default function UsageGuide({
  installPromptEvent,
  isInstallAvailable,
  showInstallGuide,
  isOpen,
  showIntro,
  onClose,
  onDismissIntro,
  onInstall,
  onOpen,
}: UsageGuideProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    closeButtonRef.current?.focus();

    return () => previouslyFocusedElement?.focus();
  }, [isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

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
      {showIntro && (
        <section
          className="mb-5 flex flex-col gap-4 border border-red-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          aria-labelledby="usage-intro-title"
        >
          <div className="flex min-w-0 gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center bg-red-50 text-red-700">
              <Share2 className="size-4.5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="usage-intro-title"
                className="text-sm font-bold text-zinc-950"
              >
                初めて使う方へ
              </h2>
              <p className="mt-1 text-xs leading-5 text-zinc-600">
                CSVの準備から取り込みまでの流れと、スマホの共有シートから直接読み込む方法を確認できます。
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <button
              type="button"
              onClick={onDismissIntro}
              className="h-9 px-3 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            >
              閉じる
            </button>
            <button
              type="button"
              onClick={onOpen}
              className="h-9 bg-zinc-900 px-4 text-xs font-semibold text-white hover:bg-zinc-700"
            >
              使い方を見る
            </button>
          </div>
        </section>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4">
          <div
            ref={dialogRef}
            className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto border border-zinc-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="usage-guide-title"
            aria-describedby="usage-guide-description"
            onKeyDown={handleKeyDown}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2
                  id="usage-guide-title"
                  className="text-lg font-bold text-zinc-950"
                >
                  このアプリの使い方
                </h2>
                <p
                  id="usage-guide-description"
                  className="mt-1 text-xs text-zinc-500"
                >
                  CSVは端末のブラウザ内で処理されます
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="inline-flex size-8 shrink-0 items-center justify-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                aria-label="使い方を閉じる"
                title="閉じる"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <ol className="divide-y divide-zinc-200 px-5 sm:px-6">
              {steps.map(({ title, description, icon: Icon }, index) => (
                <li
                  key={title}
                  className="grid grid-cols-[36px_1fr] gap-3 py-5"
                >
                  <div className="flex size-9 items-center justify-center bg-zinc-100 text-zinc-700">
                    <Icon className="size-4.5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-950">
                      {index + 1}. {title}
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-zinc-600">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {showInstallGuide && (
              <section className="border-t border-zinc-200 bg-zinc-50 px-5 py-5 sm:px-6">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center bg-white text-zinc-700">
                    <Smartphone className="size-4.5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-zinc-950">
                      スマホで使うならインストールが便利です
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-zinc-600">
                      対応するAndroid等では、インストールするとPayPayやファイルアプリからCSVを共有するときに、このアプリを共有先として選べます。選択したCSVは次回起動時にも復元されます。
                    </p>

                    {isInstallAvailable ? (
                      <button
                        type="button"
                        onClick={() => void onInstall()}
                        disabled={!installPromptEvent}
                        className="mt-4 inline-flex h-9 items-center gap-2 bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                      >
                        <Download className="size-4" aria-hidden="true" />
                        アプリをインストール
                      </button>
                    ) : (
                      <div className="mt-3 border-l-2 border-zinc-300 pl-3 text-xs leading-5 text-zinc-600">
                        <p>
                          インストールボタンが表示されない場合は、ブラウザのメニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。
                        </p>
                        <p className="mt-1">
                          iPhone /
                          iPadではSafariの共有メニューから「ホーム画面に追加」を選べます。共有先としての表示可否はOSとブラウザにより異なります。
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            <section className="border-t border-zinc-200 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center bg-zinc-100 text-zinc-700">
                  <Check className="size-4.5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">
                    重複登録・口座間違いの確認
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-zinc-600">
                    画面上部の切り替えから、取り込み済み明細の重複や別口座への登録候補を確認できます。このアプリがMoneyForward
                    ME上の明細を自動で変更・削除することはありません。
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
